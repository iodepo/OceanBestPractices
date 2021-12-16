import { Construct, Duration } from '@aws-cdk/core';
import * as events from '@aws-cdk/aws-events';
import * as eventTargets from '@aws-cdk/aws-events-targets';
import { LambdaSubscription } from '@aws-cdk/aws-sns-subscriptions';
import {
  LambdaDestination,
  SqsDestination,
} from '@aws-cdk/aws-s3-notifications';
import { IFunction } from '@aws-cdk/aws-lambda';
import { IDistribution } from '@aws-cdk/aws-cloudfront';
import { IDomain } from '@aws-cdk/aws-opensearchservice';
import {
  IConnectable,
  InterfaceVpcEndpointAwsService,
  IVpc,
} from '@aws-cdk/aws-ec2';
import IngestLambdas from './lambdas';
import IngestSnsTopics from './sns-topics';
import IngestBuckets from './buckets';
import IngestSqsQueues from './sqs-queues';

interface IngestProps {
  openSearch: IDomain & IConnectable
  stackName: string
  feedReadInterval?: number
  textExtractorFunction: IFunction
  websiteDistribution: IDistribution
  vpc: IVpc
}

export default class Ingest extends Construct {
  constructor(scope: Construct, id: string, props: IngestProps) {
    super(scope, id);

    const {
      openSearch,
      feedReadInterval = 300,
      stackName,
      textExtractorFunction,
      websiteDistribution,
      vpc,
    } = props;

    const buckets = new IngestBuckets(this, 'Buckets', {
      stackName,
      websiteDistribution,
    });

    const snsTopics = new IngestSnsTopics(this, 'SnsTopics', { stackName });

    const sqsQueues = new IngestSqsQueues(this, 'SqsQueues', { stackName });

    const lambdas = new IngestLambdas(this, 'Lambdas', {
      buckets,
      elasticsearchDomain: openSearch,
      feedReadInterval,
      snsTopics,
      sqsQueues,
      stackName,
      textExtractorFunction,
      vpc,
    });

    // Invoke the scheduler function every 5 minutes
    new events.Rule(this, 'FeedReadEventRule', {
      schedule: events.Schedule.rate(Duration.seconds(feedReadInterval)),
      targets: [new eventTargets.LambdaFunction(lambdas.feedIngester)],
    });

    // Invoke the indexer every 1 minute
    new events.Rule(this, 'IndexerEventRule', {
      schedule: events.Schedule.rate(Duration.minutes(1)),
      targets: [new eventTargets.LambdaFunction(lambdas.indexer)],
    });
    // Writes events to the "available document" topic

    // "metadata downloader" lambda is triggered by the
    // "available document" topic
    snsTopics.availableDocument.addSubscription(
      new LambdaSubscription(lambdas.metadataDownloader)
    );
    // "metadata downloader" lambda writes to the "document metadata" bucket

    // The "bitstreams downloader" lambda is triggered when an object is created
    // in the "document metadata" bucket
    buckets.documentMetadata.addObjectCreatedNotification(
      new LambdaDestination(lambdas.bitstreamsDownloader)
    );
    // The "bitstreams downloader" lambda writes an object to the
    // "document source" bucket

    // The "invoke extractor" lambda is triggered when an object is created in
    // the "document source" bucket
    buckets.documentSource.addObjectCreatedNotification(new LambdaDestination(
      lambdas.invokeExtractor
    ));

    // The text extractor writes to S3. When an object is created put
    // a message on the indexer queue.
    buckets.textExtractorDestination.addObjectCreatedNotification(
      new SqsDestination(sqsQueues.indexerQueue)
    );

    // The bitstreams downloader should be able to put a message on the queue.
    // This happens if there we skip text extraction.
    sqsQueues.indexerQueue.grantSendMessages(lambdas.bitstreamsDownloader);

    // The indexer needs to read from the indexer queue.
    const sqsEndpoint = vpc.addInterfaceEndpoint('sqs-gateway', {
      service: InterfaceVpcEndpointAwsService.SQS,
    });
    sqsEndpoint.connections.allowDefaultPortFrom(lambdas.indexer);
    sqsQueues.indexerQueue.grantConsumeMessages(lambdas.indexer);
  }
}
