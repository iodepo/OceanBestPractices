import * as path from 'path';
import {
  Code,
  Function,
  IFunction,
  Runtime,
} from '@aws-cdk/aws-lambda';
import { Construct, Duration } from '@aws-cdk/core';
import { IDomain } from '@aws-cdk/aws-opensearchservice';
import { IConnectable, IVpc, Port } from '@aws-cdk/aws-ec2';
import IngestBuckets from './buckets';
import IngestSnsTopics from './sns-topics';
import IngestSqsQueues from './sqs-queues';

const lambdasPath = path.join(__dirname, '..', '..', 'dist', 'ingest');

interface LambdasProps {
  buckets: IngestBuckets
  elasticsearchDomain: IDomain & IConnectable
  snsTopics: IngestSnsTopics
  sqsQueues: IngestSqsQueues
  textExtractorFunction: IFunction
  stackName: string,
  vpc: IVpc
}

export default class IngestLambdas extends Construct {
  public readonly bitstreamsDownloader: Function;

  public readonly indexer: Function;

  public readonly metadataDownloader: Function;

  public readonly feedIngester: Function;

  public readonly dspaceProxy: Function;

  public readonly indexRectifier: Function;

  public readonly bulkIngester: Function;

  public readonly deleteDocument: Function;

  constructor(scope: Construct, id: string, props: LambdasProps) {
    super(scope, id);

    const {
      buckets,
      elasticsearchDomain,
      snsTopics,
      sqsQueues,
      stackName,
      textExtractorFunction,
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
      timeout: Duration.minutes(15),
      environment: {
        DOCUMENT_METADATA_BUCKET: buckets.documentMetadata.bucketName,
        OPEN_SEARCH_ENDPOINT: openSearchEndpoint,
        INDEXER_QUEUE_URL: sqsQueues.indexerQueue.queueUrl,
      },
      vpc,
    });
    buckets.documentMetadata.grantRead(this.indexer);
    buckets.documentSource.grantRead(this.indexer);
    elasticsearchDomain.connections.allowFrom(this.indexer, Port.tcp(443));
    elasticsearchDomain.grantWrite(this.indexer);

    this.bitstreamsDownloader = new Function(this, 'BitstreamsDownloader', {
      functionName: `${stackName}-ingest-bitstreams-downloader`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'bitstreams-downloader')),
      description: 'Downloads the binary file for a given document UID from the OBP API',
      timeout: Duration.minutes(5),
      memorySize: 1024,
      environment: {
        documentsBucket: buckets.documentSource.bucketName,
        dspaceUrl: dspaceEndpoint,
        indexerQueueUrl: sqsQueues.indexerQueue.queueUrl,
        textractorFunction: textExtractorFunction.functionName,
        textractorTempBucket: buckets.textExtractorTemp.bucketName,
      },
    });
    buckets.documentMetadata.grantRead(this.bitstreamsDownloader);
    buckets.documentSource.grantWrite(this.bitstreamsDownloader);

    this.metadataDownloader = new Function(this, 'MetadataDownloader', {
      functionName: `${stackName}-ingest-metadata-downloader`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'metadata-downloader')),
      description: 'Downloads the metadata for a given document UUID from DSpace',
      timeout: Duration.minutes(5),
      environment: {
        DOCUMENT_METADATA_BUCKET: buckets.documentMetadata.bucketName,
        DSPACE_ENDPOINT: dspaceEndpoint,
      },
    });
    buckets.documentMetadata.grantWrite(this.metadataDownloader);

    this.feedIngester = new Function(this, 'RSSFeedIngester', {
      functionName: `${stackName}-ingest-feed-ingester`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'rss-feed-ingester')),
      description: 'Periodically checks the OBP RSS feed for documents that need indexing.',
      timeout: Duration.minutes(1),
      environment: {
        DSPACE_ENDPOINT: dspaceEndpoint,
        INGEST_TOPIC_ARN: snsTopics.availableDocument.topicArn,
        FEED_INGESTER_PUB_DATE_BUCKET: buckets.feedIngesterPubDate.bucketName,
      },
    });
    snsTopics.availableDocument.grantPublish(this.feedIngester);
    buckets.feedIngesterPubDate.grantRead(this.feedIngester);
    buckets.feedIngesterPubDate.grantWrite(this.feedIngester);

    this.dspaceProxy = new Function(this, 'DSpaceProxy', {
      functionName: `${stackName}-dspace-proxy`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'dspace-proxy')),
      description: 'Proxies requests to DSpace',
      timeout: Duration.minutes(1),
      environment: {
        DSPACE_ENDPOINT: dspaceEndpoint,
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
        INGEST_TOPIC_ARN: snsTopics.availableDocument.topicArn,
        OPEN_SEARCH_ENDPOINT: openSearchEndpoint,
        DSPACE_PROXY_FUNCTION: this.dspaceProxy.functionName,
      },
      vpc,
      allowPublicSubnet: true,
    });
    this.dspaceProxy.grantInvoke(this.indexRectifier);
    elasticsearchDomain.connections.allowFrom(this.indexRectifier, Port.tcp(443));
    elasticsearchDomain.grantReadWrite(this.indexRectifier);
    snsTopics.availableDocument.grantPublish(this.indexRectifier);

    this.bulkIngester = new Function(this, 'BulkIngester', {
      functionName: `${stackName}-bulk-ingester`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'bulk-ingester')),
      description: 'Queues all documents available in DSpace for ingest.',
      timeout: Duration.minutes(15),
      environment: {
        DSPACE_ENDPOINT: dspaceEndpoint,
        INGEST_TOPIC_ARN: snsTopics.availableDocument.topicArn,
      },
    });
    snsTopics.availableDocument.grantPublish(this.bulkIngester);

    this.deleteDocument = new Function(this, 'DeleteDocument', {
      functionName: `${stackName}-delete-document`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_16_X,
      code: Code.fromAsset(path.join(lambdasPath, 'delete-document-handler')),
      description: 'Deletes a document from the documents index for the given UUID. Returns a response which includes the number of deleted documents.',
      timeout: Duration.minutes(5),
      environment: {
        OPEN_SEARCH_ENDPOINT: openSearchEndpoint,
      },
      vpc,
      allowPublicSubnet: true,
    });
    elasticsearchDomain.connections.allowFrom(this.deleteDocument, Port.tcp(443));
    elasticsearchDomain.grantReadWrite(this.deleteDocument);
  }
}
