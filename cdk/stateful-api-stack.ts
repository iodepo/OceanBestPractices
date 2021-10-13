import { Construct, Stack, StackProps } from "@aws-cdk/core";
import * as es from '@aws-cdk/aws-elasticsearch';
import { ElasticsearchVersion } from "@aws-cdk/aws-elasticsearch";

interface StatefulApiStackProps extends StackProps {
  stage: string
}

export default class StatefulApiStack extends Stack {
  public readonly elasticsearchDomain: es.IDomain;

  constructor(scope: Construct, id: string, props: StatefulApiStackProps) {
    const { stage, ...superProps } = props;

    super(scope, id, superProps);

    this.elasticsearchDomain = new es.Domain(this, 'Elasticsearch', {
      domainName: `obp-cdk-${stage}`,
      version: ElasticsearchVersion.V6_0,
      capacity: {
        dataNodeInstanceType: 't2.small.elasticsearch',
        dataNodes: 1
      },
      advancedOptions: {
        'rest.action.multi.allow_explicit_index': 'true'
      }
    });
  }
}
