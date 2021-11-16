import pMap from 'p-map';
import { ECS } from 'aws-sdk';
import type { S3Event } from 'aws-lambda';

function getStringFromEnv(key: string): string {
  const value = process.env[key];

  if (value) return value;

  throw new Error(`${key} not set`);
}

function getListFromEnv(key: string): string[] {
  return getStringFromEnv(key).split(',');
}

export async function handler(event: S3Event) {
  const s3TriggerObjects = event.Records.map(
    (record) => `s3://${record.s3.bucket.name}/${record.s3.object.key}`
  );

  const cluster = getStringFromEnv('TASK_CLUSTER');
  const securityGroups = getListFromEnv('TASK_SECURITY_GROUPS');
  const subnets = getListFromEnv('TASK_SUBNETS');
  const taskDefinition = getStringFromEnv('TASK_DEFINITION');

  const ecs = new ECS({ region: process.env['AWS_REGION'] });

  await pMap(
    s3TriggerObjects,
    (s3TriggerObject) => ecs.runTask({
      cluster,
      launchType: 'FARGATE',
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets,
          securityGroups,
          assignPublicIp: 'ENABLED',
        },
      },
      taskDefinition,
      overrides: {
        containerOverrides: [{
          name: 'DefaultContainer',
          environment: [
            {
              name: 'S3_TRIGGER_OBJECT',
              value: s3TriggerObject,
            },
          ],
        }],
      },
    }).promise()
  );
}
