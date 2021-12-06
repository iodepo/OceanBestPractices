import * as path from 'path';
import {
  Code,
  Function,
  IFunction,
  Runtime,
} from '@aws-cdk/aws-lambda';
import { Construct, Duration } from '@aws-cdk/core';
import { IDomain } from '@aws-cdk/aws-opensearchservice';
import IngestBuckets from './buckets';
import IngestSnsTopics from './sns-topics';

const lambdasPath = path.join(__dirname, '..', '..', 'dist', 'ingest');

interface LambdasProps {
  buckets: IngestBuckets
  elasticsearchDomain: IDomain
  feedReadInterval: number
  snsTopics: IngestSnsTopics
  textExtractorFunction: IFunction
  stackName: string
}

export default class IngestLambdas extends Construct {
  public readonly bitstreamsDownloader: Function;

  public readonly indexer: Function;

  public readonly invokeExtractor: Function;

  public readonly metadataDownloader: Function;

  public readonly feedIngester: Function;

  public readonly indexRectifier: Function;

  public readonly bulkIngester: Function;

  constructor(scope: Construct, id: string, props: LambdasProps) {
    super(scope, id);

    const {
      buckets,
      elasticsearchDomain,
      feedReadInterval = 300,
      snsTopics,
      stackName,
      textExtractorFunction,
    } = props;

    const dspaceEndpoint = 'https://repository.oceanbestpractices.org';

    this.indexer = new Function(this, 'Indexer', {
      functionName: `${stackName}-ingest-indexer`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'indexer')),
      description: 'Responsible for percolating (tagging) and indexing document metadata based on a given document UID',
      timeout: Duration.minutes(5),
      environment: {
        DOCUMENT_METADATA_BUCKET: buckets.documentMetadata.bucketName,
        DOCUMENT_CONTENT_BUCKET: buckets.textExtractorDestination.bucketName,
        ELASTIC_SEARCH_HOST: elasticsearchDomain.domainEndpoint,
      },
    });
    buckets.documentMetadata.grantRead(this.indexer);
    buckets.textExtractorDestination.grantRead(this.indexer);
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
        DSPACE_ENDPOINT: dspaceEndpoint,
        DOCUMENT_BINARY_BUCKET: buckets.documentSource.bucketName,
        INDEXER_FUNCTION_NAME: this.indexer.functionName,
      },
    });
    buckets.documentSource.grantWrite(this.bitstreamsDownloader);
    this.indexer.grantInvoke(this.bitstreamsDownloader);

    this.invokeExtractor = new Function(this, 'InvokeExtractor', {
      functionName: `${stackName}-ingest-invoke-extractor`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'invoke-extractor')),
      description: 'Invokes the text extractor (3rd party library) functions for a given document UID',
      timeout: Duration.seconds(20),
      environment: {
        TEXT_EXTRACTOR_FUNCTION_NAME: textExtractorFunction.functionName,
        TEXT_EXTRACTOR_TEMP_BUCKET: buckets.textExtractorTemp.bucketName,
        TEXT_EXTRACTOR_BUCKET: buckets.textExtractorDestination.bucketName,
      },
    });
    textExtractorFunction.grantInvoke(this.invokeExtractor);

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
        DSPACE_FEED_READ_INTERVAL: feedReadInterval.toString(),
        DSPACE_ENDPOINT: dspaceEndpoint,
        INGEST_TOPIC_ARN: snsTopics.availableDocument.topicArn,
      },
    });
    snsTopics.availableDocument.grantPublish(this.feedIngester);

    this.indexRectifier = new Function(this, 'IndexRectifier', {
      functionName: `${stackName}-index-rectifier`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'index-rectifier')),
      description: 'Performs a diff against the OBP Search Index and DSpace; Updates or removes items as necessary.',
      timeout: Duration.minutes(15),
      environment: {
        INGEST_TOPIC_ARN: snsTopics.availableDocument.topicArn,
        OPEN_SEARCH_ENDPOINT: elasticsearchDomain.domainEndpoint,
        DSPACE_ENDPOINT: dspaceEndpoint,
      },
    });
    snsTopics.availableDocument.grantPublish(this.indexRectifier);

    this.bulkIngester = new Function(this, 'BulkIngester', {
      functionName: `${stackName}-bulk-ingester`,
      handler: 'handler.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'bulk-ingester')),
      description: 'Queues all documents available in DSpace for ingest.',
      timeout: Duration.minutes(15),
      environment: {
        DSPACE_ENDPOINT: dspaceEndpoint,
        INGEST_TOPIC_ARN: snsTopics.availableDocument.topicArn,
      },
    });
    snsTopics.availableDocument.grantPublish(this.indexRectifier);
  }
}
