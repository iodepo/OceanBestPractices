import { AnyPrincipal, PolicyStatement } from "@aws-cdk/aws-iam";
import { Bucket, BucketAccessControl, HttpMethods } from "@aws-cdk/aws-s3";
import { Construct, Duration } from "@aws-cdk/core";

interface BucketsProps {
  stage: string
}

export default class IngestBuckets extends Construct {
  public readonly documentMetadata: Bucket;
  public readonly documentSource: Bucket;
  public readonly textExtractorDestination: Bucket;
  public readonly textExtractorTemp: Bucket;

  constructor(scope: Construct, id: string, props: BucketsProps) {
    super(scope, id);

    const { stage } = props;

    this.documentMetadata = new Bucket(this, 'DocumentMetadata', {
      bucketName: `obp-cdk-document-metadata-${stage}`,
      lifecycleRules: [{ expiration: Duration.days(15) }]
    });

    this.documentSource = new Bucket(this, 'DocumentSource', {
      bucketName: `obp-cdk-document-source-${stage}`,
      accessControl: BucketAccessControl.PUBLIC_READ,
      cors: [
        {
          allowedHeaders: ['Authorization'],
          allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
          allowedOrigins: ['*'],
          maxAge: 3000
        }
      ]
    });

    this.documentSource.addToResourcePolicy(new PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [this.documentSource.arnForObjects('*')],
      principals: [new AnyPrincipal()],
    }));

    this.textExtractorTemp = new Bucket(this, 'TextExtractorTemp', {
      bucketName: `obp-cdk-doc-extracted-temp-${stage}`,
      lifecycleRules: [{ expiration: Duration.days(5) }]
    });

    this.textExtractorDestination = new Bucket(this, 'TextExtractorDestination', {
      bucketName: `obp-cdk-doc-extracted-${stage}`,
      lifecycleRules: [{ expiration: Duration.days(15) }]
    });
  }
}
