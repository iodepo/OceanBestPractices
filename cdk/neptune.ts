import {
  IConnectable,
  IVpc,
  SubnetType,
} from '@aws-cdk/aws-ec2';
import {
  Construct,
  RemovalPolicy,
} from '@aws-cdk/core';
import * as neptune from '@aws-cdk/aws-neptune';
import { DatabaseCluster } from '@aws-cdk/aws-neptune';

interface NeptuneProps {
  stackName: string
  deletionProtection: boolean
  allowFrom?: IConnectable[]
  vpc: IVpc
}

export default class Neptune extends Construct {
  public readonly cluster: DatabaseCluster;

  constructor(scope: Construct, id: string, props: NeptuneProps) {
    super(scope, id);

    const {
      deletionProtection,
      stackName,
      vpc,
      allowFrom = [],
    } = props;

    const removalPolicy = deletionProtection
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    this.cluster = new neptune.DatabaseCluster(this, 'Database', {
      dbClusterName: stackName,
      instanceType: neptune.InstanceType.T3_MEDIUM,
      vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      removalPolicy,
    });

    for (const other of allowFrom) {
      this.cluster.connections.allowDefaultPortFrom(other);
    }
  }
}
