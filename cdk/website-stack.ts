import * as path from 'path';
import {
  CfnOutput,
  Construct,
  RemovalPolicy,
  Stack,
  StackProps,
} from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import {
  AllowedMethods,
  CacheCookieBehavior,
  CachePolicy,
  CacheQueryStringBehavior,
  DistributionProps,
  HttpVersion,
  SecurityPolicyProtocol,
  ViewerProtocolPolicy,
  Distribution,
} from '@aws-cdk/aws-cloudfront';
import { S3Origin } from '@aws-cdk/aws-cloudfront-origins';
import { Certificate } from '@aws-cdk/aws-certificatemanager';
import {
  BucketDeployment,
  BucketDeploymentProps,
  Source,
} from '@aws-cdk/aws-s3-deployment';
import { StringParameter } from '@aws-cdk/aws-ssm';
import { Mutable } from 'type-fest';

interface WebsiteStackProps extends StackProps {
  stage: string
  domainNames?: [string, ...string[]]
  disableWebsiteCache?: boolean
}

export default class WebsiteStack extends Stack {
  public readonly cloudfrontDistribution: Distribution;

  constructor(scope: Construct, id: string, props: WebsiteStackProps) {
    const {
      domainNames,
      stage,
      disableWebsiteCache = false,
      ...superProps
    } = props;

    super(scope, id, {
      stackName: `${stage}-obp-cdk-website`,
      description: `Website stack for the "${stage}" stage`,
      terminationProtection: true,
      ...superProps,
    });

    const websiteBucket = new Bucket(this, 'WebsiteBucket', {
      bucketName: `${stage}-obp-cdk-website`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const configBucket = new Bucket(this, 'ConfigBucket', {
      bucketName: `${stage}-obp-cdk-website-config`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new CfnOutput(this, 'ConfigBucketOutput', {
      value: configBucket.bucketName,
      exportName: 'config-bucket-name',
    });

    let sslOptions: Partial<DistributionProps> = {};
    if (domainNames !== undefined) {
      const certificateArn = StringParameter.valueForStringParameter(
        this,
        `/OBP/${stage}/certificate-arn`
      );

      const certificate = Certificate.fromCertificateArn(
        this,
        'Certificate',
        certificateArn
      );

      sslOptions = {
        certificate,
        domainNames,
      };
    }

    const cachePolicy = disableWebsiteCache
      ? CachePolicy.CACHING_DISABLED
      : new CachePolicy(
        this,
        'DefaultCachePolicy',
        {
          cookieBehavior: CacheCookieBehavior.all(),
          queryStringBehavior: CacheQueryStringBehavior.all(),
        }
      );

    this.cloudfrontDistribution = new Distribution(this, 'Distribution', {
      ...sslOptions,
      comment: `Ocean Best Practices website - ${stage}`,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_1_2016,
      defaultRootObject: 'index.html',
      httpVersion: HttpVersion.HTTP2,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      defaultBehavior: {
        origin: new S3Origin(websiteBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy,
      },
      additionalBehaviors: {
        '/config.json': {
          origin: new S3Origin(configBucket),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
          cachePolicy: CachePolicy.CACHING_DISABLED,
        },
      },
    });

    const websiteContentProps: Mutable<BucketDeploymentProps> = {
      destinationBucket: websiteBucket,
      sources: [Source.asset(path.join(__dirname, '..', 'website', 'build'))],
    };

    if (disableWebsiteCache === false) {
      websiteContentProps.distribution = this.cloudfrontDistribution;
    }

    new BucketDeployment(this, 'WebsiteContent', websiteContentProps);
  }
}
