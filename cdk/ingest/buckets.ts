import { IDistribution } from "@aws-cdk/aws-cloudfront";
import { AnyPrincipal, PolicyStatement } from "@aws-cdk/aws-iam";
import { Bucket, BucketAccessControl, HttpMethods } from "@aws-cdk/aws-s3";
import { Construct, Duration, RemovalPolicy } from "@aws-cdk/core";

interface BucketsProps {
  stage: string
  websiteDistribution: IDistribution
}

export default class IngestBuckets extends Construct {
  public readonly documentMetadata: Bucket;
  public readonly documentSource: Bucket;
  public readonly textExtractorDestination: Bucket;
  public readonly textExtractorTemp: Bucket;

  constructor(scope: Construct, id: string, props: BucketsProps) {
    super(scope, id);

    const { stage, websiteDistribution } = props;

    this.documentMetadata = new Bucket(this, 'DocumentMetadata', {
      bucketName: `${stage}-obp-cdk-document-metadata`,
      lifecycleRules: [{ expiration: Duration.days(15) }],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    this.documentSource = new Bucket(this, 'DocumentSource', {
      bucketName: `${stage}-obp-cdk-document-source`,
      accessControl: BucketAccessControl.PUBLIC_READ,
      cors: [
        {
          allowedHeaders: ['Authorization'],
          allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
          allowedOrigins: [`https://${websiteDistribution.distributionDomainName}`],
          maxAge: 3000
        }
      ],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    this.documentSource.addToResourcePolicy(new PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [this.documentSource.arnForObjects('*')],
      principals: [new AnyPrincipal()],
    }));

    this.textExtractorTemp = new Bucket(this, 'TextExtractorTemp', {
      bucketName: `${stage}-obp-cdk-doc-extracted-temp`,
      lifecycleRules: [{ expiration: Duration.days(5) }],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    this.textExtractorDestination = new Bucket(this, 'TextExtractorDestination', {
      bucketName: `${stage}-obp-cdk-doc-extracted`,
      lifecycleRules: [{ expiration: Duration.days(15) }],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });
  }
}
