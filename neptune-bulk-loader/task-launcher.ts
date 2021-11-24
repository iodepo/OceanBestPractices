import ECS from 'aws-sdk/clients/ecs';
import pMap from 'p-map';
import { z } from 'zod';
import { getListFromEnv, getStringFromEnv } from '../lib/env-utils';

const eventSchema = z.object({
  Records: z.array(z.object({
    s3: z.object({
      bucket: z.object({
        name: z.string().min(1),
      }),
      object: z.object({
        key: z.string().min(1),
      }),
    }),
  })),
});

export const handler = async (rawEvent: unknown) => {
  const event = eventSchema.parse(rawEvent);

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
};
