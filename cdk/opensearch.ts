import { Construct, RemovalPolicy } from '@aws-cdk/core';
import { Domain, EngineVersion } from '@aws-cdk/aws-opensearchservice';
import { AnyPrincipal, Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import * as ec2 from '@aws-cdk/aws-ec2';

interface OpenSearchProps {
  deletionProtection: boolean
  stackName?: string
  allowFromIps?: string[]
  searchNodeType?: string,
  vpc: ec2.IVpc
}

export default class OpenSearch extends Construct {
  public readonly domain: Domain;

  constructor(scope: Construct, id: string, props: OpenSearchProps) {
    super(scope, id);

    const {
      deletionProtection,
      allowFromIps = [],
      searchNodeType = 't3.small.search',
      vpc,
    } = props;

    const accessPolicies: PolicyStatement[] = [];

    if (allowFromIps.length > 0) {
      accessPolicies.push(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['es:*'],
          principals: [new AnyPrincipal()],
          conditions: {
            IpAddress: {
              'aws:SourceIp': allowFromIps,
            },
          },
        })
      );
    }

    const removalPolicy = deletionProtection
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    this.domain = new Domain(this, 'OpenSearch', {
      version: EngineVersion.ELASTICSEARCH_7_10,
      capacity: {
        dataNodeInstanceType: searchNodeType,
        dataNodes: 1,
      },
      advancedOptions: { 'rest.action.multi.allow_explicit_index': 'true' },
      accessPolicies,
      removalPolicy,
      vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PUBLIC }],
    });
  }
}
