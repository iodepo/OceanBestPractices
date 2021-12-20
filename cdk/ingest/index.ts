import { Construct, Duration } from '@aws-cdk/core';
import * as events from '@aws-cdk/aws-events';
import * as eventTargets from '@aws-cdk/aws-events-targets';
import { IDistribution } from '@aws-cdk/aws-cloudfront';
import { IDomain } from '@aws-cdk/aws-opensearchservice';
import {
  IConnectable,
  InterfaceVpcEndpointAwsService,
  IVpc,
} from '@aws-cdk/aws-ec2';
import IngestLambdas from './lambdas';
import IngestBuckets from './buckets';
import IngestSqsQueues from './sqs-queues';

interface IngestProps {
  openSearch: IDomain & IConnectable
  stackName: string
  feedReadInterval?: number
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
      websiteDistribution,
      vpc,
    } = props;

    const buckets = new IngestBuckets(this, 'Buckets', {
      stackName,
      websiteDistribution,
    });

    const sqsQueues = new IngestSqsQueues(this, 'SqsQueues', { stackName });

    const lambdas = new IngestLambdas(this, 'Lambdas', {
      buckets,
      elasticsearchDomain: openSearch,
      feedReadInterval,
      sqsQueues,
      stackName,
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

    const sqsEndpoint = vpc.addInterfaceEndpoint('sqs-gateway', {
      service: InterfaceVpcEndpointAwsService.SQS,
    });
    sqsEndpoint.connections.allowDefaultPortFrom(lambdas.indexer);

    sqsQueues.dspaceItemIngestQueue.grantConsumeMessages(lambdas.indexer);
    sqsQueues.dspaceItemIngestQueue.grantSendMessages(lambdas.bulkIngester);
    sqsQueues.dspaceItemIngestQueue.grantSendMessages(lambdas.feedIngester);
    sqsQueues.dspaceItemIngestQueue.grantSendMessages(lambdas.indexRectifier);
  }
}
