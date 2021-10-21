import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { Domain, ElasticsearchVersion } from '@aws-cdk/aws-elasticsearch';
import { AnyPrincipal, Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { BastionHostLinux, Vpc } from '@aws-cdk/aws-ec2';

interface StatefulApiStackProps extends StackProps {
  stage: string
  esNodeType?: string
}

export default class StatefulApiStack extends Stack {
  public readonly elasticsearchDomain: Domain;

  constructor(scope: Construct, id: string, props: StatefulApiStackProps) {
    const {
      stage,
      esNodeType = 't2.small.elasticsearch',
      ...superProps
    } = props;

    super(scope, id, {
      stackName: `${stage}-obp-cdk-stateful-api`,
      description: `Stateful API stack for the "${stage}" stage`,
      terminationProtection: true,
      ...superProps
    });

    const vpc = Vpc.fromLookup(this, 'Vpc', { isDefault: true });

    const esProxy = new BastionHostLinux(this, 'EsProxy', { vpc });

    this.elasticsearchDomain = new Domain(this, 'Elasticsearch', {
      version: ElasticsearchVersion.V6_8,
      capacity: {
        dataNodeInstanceType: esNodeType,
        dataNodes: 1
      },
      advancedOptions: {
        'rest.action.multi.allow_explicit_index': 'true'
      },
      accessPolicies: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['es:*'],
          principals: [new AnyPrincipal()],
          conditions: {
            IpAddress: {
              'aws:SourceIp': [
                esProxy.instancePrivateIp,
                esProxy.instancePublicIp
              ]
            }
          }
        })
      ]
    });
  }
}
