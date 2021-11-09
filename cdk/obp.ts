import {
  Construct,
  Environment,
  Tags,
} from '@aws-cdk/core';
import BastionStack from './bastion-stack';
import NeptuneStack from './neptune-stack';
import StatefulApiStack from './stateful-api-stack';
import StatelessApiStack from './stateless-api-stack';
import WebsiteStack from './website-stack';

interface ObpProps {
  env: Required<Environment>
  stage: string
  esNodeType?: string
  terminationProtection?: boolean
  disableWebsiteCache?: boolean
}

export default class Obp extends Construct {
  constructor(scope: Construct, id: string, props: ObpProps) {
    super(scope, id);

    const {
      env,
      stage,
      disableWebsiteCache,
      esNodeType,
      terminationProtection = true,
    } = props;

    const bastionStack = new BastionStack(this, 'BastionStack', { env });
    Tags.of(bastionStack).add('obp-stage', stage);
    const { bastion } = bastionStack;

    const statefulApiStack = new StatefulApiStack(this, 'StatefulApiStack', {
      env,
      stage,
      esNodeType,
      terminationProtection,
      bastionIps: [
        bastion.instancePrivateIp,
        bastion.instancePublicIp,
      ],
    });
    Tags.of(statefulApiStack).add('obp-stage', stage);

    const neptuneStack = new NeptuneStack(this, 'NeptuneStack', {
      env,
      bastion,
    });
    Tags.of(neptuneStack).add('obp-stage', stage);

    const websiteStack = new WebsiteStack(this, 'WebsiteStack', {
      env,
      stage,
      disableWebsiteCache,
      terminationProtection,
    });
    Tags.of(websiteStack).add('obp-stage', stage);

    const statelessApiStack = new StatelessApiStack(this, 'StatelessApiStack', {
      env,
      stage,
      elasticsearch: statefulApiStack.elasticsearchDomain,
      websiteDistribution: websiteStack.cloudfrontDistribution,
    });
    Tags.of(statelessApiStack).add('obp-stage', stage);
  }
}
