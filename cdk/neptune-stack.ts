import {
  IConnectable,
  SubnetType,
  Vpc,
} from '@aws-cdk/aws-ec2';
import {
  Construct,
  Environment,
  Stack,
  StackProps,
} from '@aws-cdk/core';
import * as neptune from '@aws-cdk/aws-neptune';

type NeptuneStackProps = Omit<StackProps, 'env'>
  & {
    env: Required<Environment>,
    bastion: IConnectable
  };

export default class NeptuneStack extends Stack {
  constructor(scope: Construct, id: string, props: NeptuneStackProps) {
    const { bastion, ...superProps } = props;

    super(scope, id, superProps);

    const vpc = Vpc.fromLookup(this, 'Vpc', { isDefault: true });

    const cluster = new neptune.DatabaseCluster(this, 'Database', {
      instanceType: neptune.InstanceType.T3_MEDIUM,
      vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
    });

    cluster.connections.allowDefaultPortFrom(bastion);
  }
}
