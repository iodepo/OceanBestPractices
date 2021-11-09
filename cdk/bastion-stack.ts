import {
  BastionHostLinux,
  Vpc,
} from '@aws-cdk/aws-ec2';
import {
  Construct,
  Environment,
  Stack,
  StackProps,
} from '@aws-cdk/core';

type BastionStackProps = Omit<StackProps, 'env'>
  & { env: Required<Environment> };

export default class BastionStack extends Stack {
  public readonly bastion: BastionHostLinux

  constructor(scope: Construct, id: string, props: BastionStackProps) {
    super(scope, id, props);

    const vpc = Vpc.fromLookup(this, 'Vpc', { isDefault: true });

    this.bastion = new BastionHostLinux(this, 'Bastion', { vpc });
  }
}
