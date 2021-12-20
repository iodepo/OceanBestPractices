import * as path from 'path';
import { Code, Function, Runtime } from '@aws-cdk/aws-lambda';
import { Construct, Duration } from '@aws-cdk/core';
import { IDomain } from '@aws-cdk/aws-opensearchservice';
import { IConnectable, IVpc, Port } from '@aws-cdk/aws-ec2';
import IngestBuckets from './buckets';
import IngestSqsQueues from './sqs-queues';

const lambdasPath = path.join(__dirname, '..', '..', 'dist', 'ingest');

interface LambdasProps {
  buckets: IngestBuckets
  elasticsearchDomain: IDomain & IConnectable
  feedReadInterval: number
  sqsQueues: IngestSqsQueues
  stackName: string,
  vpc: IVpc
}

export default class IngestLambdas extends Construct {
  public readonly indexer: Function;

  public readonly feedIngester: Function;

  public readonly indexRectifier: Function;

  public readonly bulkIngester: Function;

  constructor(scope: Construct, id: string, props: LambdasProps) {
    super(scope, id);

    const {
      buckets,
      elasticsearchDomain,
      feedReadInterval = 300,
      sqsQueues,
      stackName,
      vpc,
    } = props;

    const dspaceEndpoint = 'https://repository.oceanbestpractices.org';
    const openSearchEndpoint = `https://${elasticsearchDomain.domainEndpoint}`;

    this.indexer = new Function(this, 'Indexer', {
      allowPublicSubnet: true,
      functionName: `${stackName}-ingest-indexer`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'indexer')),
      description: 'Responsible for percolating (tagging) and indexing document metadata based on a given document UID',
      timeout: Duration.minutes(5),
      environment: {
        DOCUMENT_SOURCE_BUCKET: buckets.documentSource.bucketName,
        DSPACE_ITEM_INGEST_QUEUE_URL: sqsQueues.dspaceItemIngestQueue.queueUrl,
        DSPACE_URL: dspaceEndpoint,
        OPEN_SEARCH_ENDPOINT: openSearchEndpoint,
      },
      vpc,
    });
    buckets.documentSource.grantWrite(this.indexer);
    elasticsearchDomain.connections.allowFrom(this.indexer, Port.tcp(443));
    elasticsearchDomain.grantWrite(this.indexer);

    this.feedIngester = new Function(this, 'RSSFeedIngester', {
      functionName: `${stackName}-ingest-feed-ingester`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'rss-feed-ingester')),
      description: 'Periodically checks the OBP RSS feed for documents that need indexing.',
      timeout: Duration.minutes(1),
      environment: {
        DSPACE_FEED_READ_INTERVAL: feedReadInterval.toString(),
        DSPACE_ENDPOINT: dspaceEndpoint,
        DSPACE_ITEM_INGEST_QUEUE_URL: sqsQueues.dspaceItemIngestQueue.queueUrl,
      },
    });

    this.indexRectifier = new Function(this, 'IndexRectifier', {
      functionName: `${stackName}-index-rectifier`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'index-rectifier')),
      description: 'Performs a diff against the OBP Search Index and DSpace; Updates or removes items as necessary.',
      timeout: Duration.minutes(15),
      environment: {
        DSPACE_ENDPOINT: dspaceEndpoint,
        DSPACE_ITEM_INGEST_QUEUE_URL: sqsQueues.dspaceItemIngestQueue.queueUrl,
        OPEN_SEARCH_ENDPOINT: openSearchEndpoint,
      },
    });

    this.bulkIngester = new Function(this, 'BulkIngester', {
      functionName: `${stackName}-bulk-ingester`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'bulk-ingester')),
      description: 'Queues all documents available in DSpace for ingest.',
      timeout: Duration.minutes(15),
      environment: {
        DSPACE_ENDPOINT: dspaceEndpoint,
        DSPACE_ITEM_INGEST_QUEUE_URL: sqsQueues.dspaceItemIngestQueue.queueUrl,
      },
    });
  }
}
