import { IDistribution } from '@aws-cdk/aws-cloudfront';
import { AnyPrincipal, PolicyStatement } from '@aws-cdk/aws-iam';
import { Bucket, BucketAccessControl, HttpMethods } from '@aws-cdk/aws-s3';
import { Construct, RemovalPolicy } from '@aws-cdk/core';

interface BucketsProps {
  stackName: string
  websiteDistribution: IDistribution
}

export default class IngestBuckets extends Construct {
  public readonly documentSource: Bucket;

  constructor(scope: Construct, id: string, props: BucketsProps) {
    super(scope, id);

    const {
      stackName,
      websiteDistribution,
    } = props;

    this.documentSource = new Bucket(this, 'DocumentSource', {
      bucketName: `${stackName}-document-source`,
      accessControl: BucketAccessControl.PUBLIC_READ,
      cors: [
        {
          allowedHeaders: ['Authorization'],
          allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
          allowedOrigins: [`https://${websiteDistribution.distributionDomainName}`],
          maxAge: 3000,
        },
      ],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.documentSource.addToResourcePolicy(new PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [this.documentSource.arnForObjects('*')],
      principals: [new AnyPrincipal()],
    }));
  }
}
