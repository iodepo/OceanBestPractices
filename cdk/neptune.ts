import * as path from 'path';
import * as ecs from '@aws-cdk/aws-ecs';
import {
  IConnectable,
  IVpc,
  SecurityGroup,
  SubnetType,
} from '@aws-cdk/aws-ec2';
import { Construct, Duration, RemovalPolicy } from '@aws-cdk/core';
import * as neptune from '@aws-cdk/aws-neptune';
import { Bucket } from '@aws-cdk/aws-s3';
import { Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { DockerImageAsset } from '@aws-cdk/aws-ecr-assets';
import { LogGroup } from '@aws-cdk/aws-logs';
import * as lambda from '@aws-cdk/aws-lambda';
import { LambdaDestination } from '@aws-cdk/aws-s3-notifications';

interface NeptuneProps {
  stackName: string
  deletionProtection: boolean
  allowFrom?: IConnectable[]
  vpc: IVpc
}

export default class Neptune extends Construct {
  public readonly neptuneCluster: neptune.DatabaseCluster;

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

    const neptuneRole = new Role(this, 'NeptuneRole', {
      roleName: `${stackName}-neptune`,
      assumedBy: new ServicePrincipal('rds.amazonaws.com'),
    });

    this.neptuneCluster = new neptune.DatabaseCluster(this, 'Database', {
      dbClusterName: stackName,
      instanceType: neptune.InstanceType.T3_MEDIUM,
      vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      removalPolicy,
      associatedRoles: [neptuneRole],
    });

    for (const other of allowFrom) {
      this.neptuneCluster.connections.allowDefaultPortFrom(other);
    }

    const bulkLoaderBucket = new Bucket(this, 'BulkLoader', {
      bucketName: `${stackName}-neptune-bulk-loader`,
    });

    bulkLoaderBucket.grantRead(neptuneRole);

    const image = new DockerImageAsset(this, 'NeptuneBulkLoaderImage', {
      directory: path.join(__dirname, '..', 'ingest', 'neptune-bulk-loader', 'docker'),
    });

    const ecsCluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: stackName,
      vpc,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition');

    const logGroup = new LogGroup(this, 'LogGroup', {
      logGroupName: `/obp/${stackName}/neptune-bulk-loader`,
    });

    const { clusterEndpoint } = this.neptuneCluster;
    const neptuneUrl = `https://${clusterEndpoint.hostname}:${clusterEndpoint.port}`;

    taskDefinition.addContainer('DefaultContainer', {
      image: ecs.ContainerImage.fromDockerImageAsset(image),
      environment: {
        IAM_ROLE_ARN: neptuneRole.roleArn,
        NEPTUNE_URL: neptuneUrl,
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: `${stackName}-neptune-bulk-loader`,
        logGroup,
      }),
    });

    const taskDefinitionSecurityGroup = new SecurityGroup(this, 'TaskSecurityGroup', { vpc });

    const taskLauncher = new lambda.Function(this, 'TaskLauncher', {
      functionName: `${stackName}-neptune-bulk-loader-launcher`,
      handler: 'lambda.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'dist', 'neptune-bulk-loader-launcher')),
      timeout: Duration.minutes(5),
      environment: {
        TASK_CLUSTER: ecsCluster.clusterName,
        TASK_SECURITY_GROUPS: taskDefinitionSecurityGroup.securityGroupId,
        TASK_SUBNETS: vpc.publicSubnets.map((s) => s.subnetId).join(','),
        TASK_DEFINITION: taskDefinition.taskDefinitionArn,
      },
    });

    bulkLoaderBucket.addObjectCreatedNotification(
      new LambdaDestination(taskLauncher)
    );
  }
}
