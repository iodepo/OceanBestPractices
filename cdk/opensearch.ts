import { Construct, RemovalPolicy } from '@aws-cdk/core';
import { Domain, EngineVersion } from '@aws-cdk/aws-opensearchservice';
import * as ec2 from '@aws-cdk/aws-ec2';

interface OpenSearchProps {
  deletionProtection: boolean
  stackName?: string
  searchNodeType?: string,
  vpc: ec2.IVpc
}

export default class OpenSearch extends Construct {
  public readonly domain: Domain;

  constructor(scope: Construct, id: string, props: OpenSearchProps) {
    super(scope, id);

    const {
      deletionProtection,
      searchNodeType = 't3.small.search',
      vpc,
    } = props;

    const removalPolicy = deletionProtection
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    const [subnet] = vpc.publicSubnets;

    if (subnet === undefined) throw new Error('No public subnet found');

    this.domain = new Domain(this, 'OpenSearch', {
      version: EngineVersion.ELASTICSEARCH_7_10,
      capacity: {
        dataNodeInstanceType: searchNodeType,
        dataNodes: 1,
      },
      advancedOptions: { 'rest.action.multi.allow_explicit_index': 'true' },
      removalPolicy,
      vpc,
      vpcSubnets: [{ subnets: [subnet] }],
    });
  }
}
