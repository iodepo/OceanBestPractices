import * as path from 'path';
import { IDomain } from "@aws-cdk/aws-elasticsearch";
import { Code, Function, IFunction, Runtime } from "@aws-cdk/aws-lambda";
import { Construct, Duration } from "@aws-cdk/core";
import IngestBuckets from "./buckets";
import IngestSnsTopics from './sns-topics';

const lambdasPath = path.join(__dirname, '..', '..', 'ingest', 'lambdas');

interface LambdasProps {
  buckets: IngestBuckets
  elasticsearchDomain: IDomain
  scheduleInterval: number
  snsTopics: IngestSnsTopics
  textExtractorFunction: IFunction
  stage: string
}

export default class IngestLambdas extends Construct {
  public readonly bitstreamsDownloader: Function;
  public readonly indexer: Function;
  public readonly invokeExtractor: Function;
  public readonly metadataDownloader: Function;
  public readonly scheduler: Function;

  constructor(scope: Construct, id: string, props: LambdasProps) {
    super(scope, id);

    const {
      buckets,
      elasticsearchDomain,
      scheduleInterval = 300,
      snsTopics,
      stage,
      textExtractorFunction
    } = props;

    this.indexer = new Function(this, 'Indexer', {
      functionName: `obp-cdk-ingest-indexer-${stage}`,
      handler: 'indexer.handler',
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset(path.join(lambdasPath, 'indexer')),
      description: 'Responsible for percolating (tagging) and indexing document metadata based on a given document UID',
      timeout: Duration.minutes(5),
      environment: {
        DOCUMENT_METADATA_BUCKET: buckets.documentMetadata.bucketName,
        DOCUMENT_CONTENT_BUCKET: buckets.textExtractorDestination.bucketName,
        ELASTIC_SEARCH_HOST: elasticsearchDomain.domainEndpoint
      }
    });
    buckets.documentMetadata.grantRead(this.indexer);
    buckets.textExtractorDestination.grantRead(this.indexer);

    this.bitstreamsDownloader = new Function(this, 'BitstreamsDownloader', {
      functionName: `obp-cdk-ingest-bitstreams-downloader-${stage}`,
      handler: 'bitstreams-downloader.handler',
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset(path.join(lambdasPath, 'bitstreams-downloader')),
      description: 'Downloads the binary file for a given document UID from the OBP API',
      timeout: Duration.minutes(5),
      memorySize: 1024,
      environment: {
        DOCUMENT_BINARY_BUCKET: buckets.documentSource.bucketName,
        INDEXER_FUNCTION_NAME: this.indexer.functionName
      }
    });
    buckets.documentSource.grantWrite(this.bitstreamsDownloader);
    this.indexer.grantInvoke(this.bitstreamsDownloader);

    this.invokeExtractor = new Function(this, 'InvokeExtractor', {
      functionName: `obp-cdk-ingest-invoke-extractor-${stage}`,
      handler: 'invoke-extractor.handler',
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset(path.join(lambdasPath, 'invoke-extractor')),
      description: 'Invokes the text extractor (3rd party library) functions for a given document UID',
      timeout: Duration.seconds(20),
      environment: {
        TEXT_EXTRACTOR_FUNCTION_NAME: textExtractorFunction.functionName,
        TEXT_EXTRACTOR_TEMP_BUCKET: buckets.textExtractorTemp.bucketName,
        TEXT_EXTRACTOR_BUCKET: buckets.textExtractorDestination.bucketName
      }
    });
    textExtractorFunction.grantInvoke(this.invokeExtractor);

    this.metadataDownloader = new Function(this, 'MetadataDownloader', {
      functionName: `obp-cdk-ingest-metadata-downloader-${stage}`,
      handler: 'metadata-downloader.handler',
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset(path.join(lambdasPath, 'metadata-downloader')),
      description: 'Downloads the metadata for a given document UID from the OBP API',
      timeout: Duration.minutes(5),
      environment: {
        DOCUMENT_METADATA_BUCKET: buckets.documentMetadata.bucketName
      }
    });
    buckets.documentMetadata.grantWrite(this.metadataDownloader);

    this.scheduler = new Function(this, 'Scheduler', {
      functionName: `obp-cdk-ingest-scheduler-${stage}`,
      handler: 'scheduler.handler',
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset(
        path.join(lambdasPath, 'scheduler'),
        { exclude: ['package.json', 'package-lock.json'] }
      ),
      description: 'Periodically checks the OBP RSS feed for documents that need indexing.',
      timeout: Duration.minutes(1),
      environment: {
        DOCUMENT_TOPIC_ARN: snsTopics.availableDocument.topicArn,
        SCHEDULE_INTERVAL: scheduleInterval.toString()
      }
    });
    snsTopics.availableDocument.grantPublish(this.scheduler);
  }
}
