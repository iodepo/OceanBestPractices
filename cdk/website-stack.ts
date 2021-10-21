import * as path from'path';
import { Construct, RemovalPolicy, Stack, StackProps } from "@aws-cdk/core";
import { Bucket } from '@aws-cdk/aws-s3';
import {
  AllowedMethods,
  CacheCookieBehavior,
  CachePolicy,
  CacheQueryStringBehavior,
  DistributionProps,
  HttpVersion,
  SecurityPolicyProtocol,
  ViewerProtocolPolicy
} from '@aws-cdk/aws-cloudfront';
import { S3Origin } from '@aws-cdk/aws-cloudfront-origins';
import { Certificate } from "@aws-cdk/aws-certificatemanager";
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';
import { StringParameter } from '@aws-cdk/aws-ssm';
import { Distribution } from '@aws-cdk/aws-cloudfront';

interface WebsiteStackProps extends StackProps {
  stage: string
  domainNames?: [string, ...string[]]
}

export default class WebsiteStack extends Stack {
  public readonly cloudfrontDistribution: Distribution;

  constructor(scope: Construct, id: string, props: WebsiteStackProps) {
    const {
      domainNames,
      stage,
      ...superProps
    } = props;

    super(scope, id, {
      stackName: `${stage}-obp-cdk-website`,
      description: `Website stack for the "${stage}" stage`,
      terminationProtection: true,
      ...superProps
    });

    const websiteBucket = new Bucket(this, 'WebsiteBucket', {
      bucketName: `${stage}-obp-cdk-website`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    let sslOptions: Partial<DistributionProps> = {};
    if (domainNames !== undefined) {
      const certificateArn = StringParameter.valueForStringParameter(this, `/OBP/${stage}/certificate-arn`);

      const certificate = Certificate.fromCertificateArn(this, 'Certificate', certificateArn);

      sslOptions = {
        certificate,
        domainNames
      };
    }

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
          responsePagePath: '/index.html'
        }
      ],
      defaultBehavior: {
        origin: new S3Origin(websiteBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: new CachePolicy(this, 'DefaultCachePolicy', {
          cookieBehavior: CacheCookieBehavior.all(),
          queryStringBehavior: CacheQueryStringBehavior.all()
        })
      },
    });

    new BucketDeployment(this, 'WebsiteContent', {
      destinationBucket: websiteBucket,
      sources: [Source.asset(path.join(__dirname, '..', 'website', 'build'))],
      distribution: this.cloudfrontDistribution
    });
  }
}
