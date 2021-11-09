import {
  BastionHostLinux,
  Instance,
  IVpc,
} from '@aws-cdk/aws-ec2';
import { Construct } from '@aws-cdk/core';

interface NeptuneProps {
  stackName: string
  deletionProtection: boolean
  vpc: IVpc
}

export default class Bastion extends Construct {
  public readonly instance: Instance;

  public readonly privateIp: string;

  public readonly publicIp: string;

  constructor(scope: Construct, id: string, props: NeptuneProps) {
    super(scope, id);

    const {
      // deletionProtection,
      stackName: instanceName,
      vpc,
    } = props;

    const bastion = new BastionHostLinux(this, 'Bastion', {
      instanceName,
      vpc,
    });

    this.instance = bastion.instance;
    this.privateIp = bastion.instancePrivateIp;
    this.publicIp = bastion.instancePublicIp;
  }
}
