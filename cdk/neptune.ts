import {
  Construct,
  Duration,
  RemovalPolicy,
  Token,
} from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecrAssets from '@aws-cdk/aws-ecr-assets';
import * as ecs from '@aws-cdk/aws-ecs';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as logs from '@aws-cdk/aws-logs';
import * as neptune from '@aws-cdk/aws-neptune';
import * as path from 'path';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Notifications from '@aws-cdk/aws-s3-notifications';

interface NeptuneProps {
  stackName: string
  deletionProtection: boolean
  allowFrom?: ec2.IConnectable[]
  vpc: ec2.IVpc
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

    const neptuneRole = new iam.Role(this, 'NeptuneRole', {
      roleName: `${stackName}-neptune`,
      assumedBy: new iam.ServicePrincipal('rds.amazonaws.com'),
    });

    this.neptuneCluster = new neptune.DatabaseCluster(this, 'Database', {
      dbClusterName: stackName,
      instanceType: neptune.InstanceType.T3_MEDIUM,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      removalPolicy,
      associatedRoles: [neptuneRole],
    });

    for (const other of allowFrom) {
      this.neptuneCluster.connections.allowDefaultPortFrom(other);
    }

    const bulkLoaderBucket = new s3.Bucket(this, 'BulkLoader', {
      bucketName: `${stackName}-neptune-bulk-loader`,
    });

    bulkLoaderBucket.grantRead(neptuneRole);

    const image = new ecrAssets.DockerImageAsset(
      this,
      'NeptuneBulkLoaderImage',
      {
        directory: path.join(__dirname, '..', 'neptune-bulk-loader', 'docker'),
      }
    );

    const ecsCluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: stackName,
      vpc,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition');

    bulkLoaderBucket.grantRead(taskDefinition.taskRole);

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/obp/${stackName}/neptune-bulk-loader`,
    });

    const { clusterEndpoint } = this.neptuneCluster;
    const neptuneUrl = `https://${clusterEndpoint.hostname}:${Token.asString(clusterEndpoint.port)}`;

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

    const taskDefinitionSecurityGroup = new ec2.SecurityGroup(
      this,
      'TaskSecurityGroup',
      { vpc }
    );

    // eslint-disable-next-line unicorn/consistent-destructuring
    this.neptuneCluster.connections.allowDefaultPortFrom(
      taskDefinitionSecurityGroup
    );

    const taskLauncher = new lambda.Function(this, 'TaskLauncher', {
      functionName: `${stackName}-neptune-bulk-loader-task-launcher`,
      handler: 'lambda.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'dist', 'neptune-bulk-loader', 'task-launcher')),
      timeout: Duration.seconds(3),
      environment: {
        TASK_CLUSTER: ecsCluster.clusterName,
        TASK_SECURITY_GROUPS: taskDefinitionSecurityGroup.securityGroupId,
        TASK_SUBNETS: vpc.publicSubnets.map((s) => s.subnetId).join(','),
        TASK_DEFINITION: taskDefinition.taskDefinitionArn,
      },
    });

    if (taskDefinition.executionRole === undefined) {
      throw new Error('taskDefinition.executionRole is undefined');
    }

    const taskLauncherPolicies: iam.PolicyStatementProps[] = [
      {
        actions: ['ecs:RunTask'],
        resources: [taskDefinition.taskDefinitionArn],
      },
      {
        actions: ['iam:PassRole'],
        resources: [
          taskDefinition.executionRole.roleArn,
          taskDefinition.taskRole.roleArn,
        ],
      },
    ];

    for (const policy of taskLauncherPolicies) {
      taskLauncher.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        ...policy,
      }));
    }

    bulkLoaderBucket.addObjectCreatedNotification(
      new s3Notifications.LambdaDestination(taskLauncher),
      {
        prefix: 'bulk-loader-trigger/',
        suffix: '.json',
      }
    );
  }
}
