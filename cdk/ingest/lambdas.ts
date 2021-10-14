import { IDomain } from "@aws-cdk/aws-elasticsearch";
import { Function, IFunction } from "@aws-cdk/aws-lambda";
import { Construct, Duration } from "@aws-cdk/core";
import IngestBuckets from "./buckets";
import IngestFunction from "./ingest-function";
import IngestSnsTopics from './sns-topics';

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

    this.indexer = new IngestFunction(this, 'Indexer', {
      name: 'indexer',
      stage,
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

    this.bitstreamsDownloader = new IngestFunction(this, 'BitstreamsDownloader', {
      name: 'bitstreams-downloader',
      stage,
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

    this.invokeExtractor = new IngestFunction(this, 'InvokeExtractor', {
      name: 'invoke-extractor',
      stage,
      description: 'Invokes the text extractor (3rd party library) functions for a given document UID',
      timeout: Duration.seconds(20),
      environment: {
        TEXT_EXTRACTOR_FUNCTION_NAME: textExtractorFunction.functionName,
        TEXT_EXTRACTOR_TEMP_BUCKET: buckets.textExtractorTemp.bucketName,
        TEXT_EXTRACTOR_BUCKET: buckets.textExtractorDestination.bucketName
      }
    });
    textExtractorFunction.grantInvoke(this.invokeExtractor);

    this.metadataDownloader = new IngestFunction(this, 'MetadataDownloader', {
      name: 'metadata-downloader',
      stage,
      description: 'Downloads the metadata for a given document UID from the OBP API',
      timeout: Duration.minutes(5),
      environment: {
        DOCUMENT_METADATA_BUCKET: buckets.documentMetadata.bucketName
      }
    });
    buckets.documentMetadata.grantWrite(this.metadataDownloader);

    this.scheduler = new IngestFunction(this, 'Scheduler', {
      name: 'scheduler',
      stage,
      description: 'Periodically checks the OBP RSS feed for documents that need indexing.',
      timeout: Duration.minutes(1),
      environment: {
        DOCUMENT_TOPIC_ARN: snsTopics.availableDocument.topicArn,
        SCHEDULE_INTERVAL: scheduleInterval.toString()
      },
      exclude: ['package.json', 'package-lock.json']
    });
    snsTopics.availableDocument.grantPublish(this.scheduler);
  }
}
