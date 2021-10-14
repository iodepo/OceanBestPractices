import * as path from'path';
import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { Bucket } from '@aws-cdk/aws-s3';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import { S3Origin } from '@aws-cdk/aws-cloudfront-origins';
import { Certificate } from "@aws-cdk/aws-certificatemanager";
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';

interface WebsiteStackProps extends StackProps {
  stage: string
  sslConfig?: {
    certificate: Certificate
    domainNames: [string, ...string[]]
  },
  websiteIndexDocument?: string
}

export default class WebsiteStack extends Stack {
  constructor(scope: Construct, id: string, props: WebsiteStackProps) {
    const {
      sslConfig,
      stage,
      websiteIndexDocument = 'index.html',
      ...superProps
    } = props;

    super(scope, id, superProps);

    const websiteBucket = new Bucket(this, 'WebsiteBucket', {
      bucketName: `obp-cdk-website-${stage}`,
      websiteIndexDocument
    });

    new BucketDeployment(this, 'WebsiteContent', {
      destinationBucket: websiteBucket,
      sources: [Source.asset(path.join(__dirname, '..', 'website', 'build'))]
    });

    let sslOptions: Partial<cloudfront.DistributionProps> = {};
    if (sslConfig !== undefined) {
      sslOptions = {
        certificate: sslConfig.certificate,
        domainNames: sslConfig.domainNames,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016
      };
    }

    new cloudfront.Distribution(this, 'Distribution', {
      ...sslOptions,
      comment: `Ocean Best Practices website - ${stage}`,
      defaultRootObject: websiteIndexDocument,
      httpVersion: cloudfront.HttpVersion.HTTP2,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html'
        }
      ],
      defaultBehavior: {
        origin: new S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: new cloudfront.CachePolicy(this, 'DefaultCachePolicy', {
          cookieBehavior: cloudfront.CacheCookieBehavior.all(),
          queryStringBehavior: cloudfront.CacheQueryStringBehavior.all()
        })
      },
    });
  }
}
