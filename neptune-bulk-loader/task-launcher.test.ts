import nock from 'nock';
import ECS from 'aws-sdk/clients/ecs';
import { handler } from './task-launcher';

jest.mock('aws-sdk/clients/ecs');

const ECSMock = ECS as jest.MockedClass<typeof ECS>;

ECSMock.prototype.runTask = jest.fn().mockReturnValue({
  promise: () => Promise.resolve({}),
});

describe('task-launcher.handler()', () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  beforeEach(() => {
    ECSMock.mockClear();

    process.env['TASK_CLUSTER'] = 'my-cluster';
    process.env['TASK_SECURITY_GROUPS'] = 'sg-1,sg-2';
    process.env['TASK_SUBNETS'] = 'subnet-1,subnet-2';
    process.env['TASK_DEFINITION'] = 'my-task-definition';
    process.env['AWS_REGION'] = 'us-east-1';
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  it('runs the correct task', async () => {
    await handler({
      Records: [
        {
          s3: {
            bucket: { name: 'my-bucket' },
            object: { key: 'my-key' },
          },
        },
      ],
    });

    expect(ECSMock.prototype.runTask).toBeCalledWith({
      cluster: 'my-cluster',
      launchType: 'FARGATE',
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: ['subnet-1', 'subnet-2'],
          securityGroups: ['sg-1', 'sg-2'],
          assignPublicIp: 'ENABLED',
        },
      },
      taskDefinition: 'my-task-definition',
      overrides: {
        containerOverrides: [{
          name: 'DefaultContainer',
          environment: [
            {
              name: 'S3_TRIGGER_OBJECT',
              value: 's3://my-bucket/my-key',
            },
          ],
        }],
      },
    });
  });

  it('throws an error if an unexpected event is received', async () => {
    const handlerPromise = handler({ Records: [{ invalid: true }] });

    await expect(handlerPromise).rejects.toThrow();
  });

  const requiredEnvVars = [
    'TASK_CLUSTER',
    'TASK_SECURITY_GROUPS',
    'TASK_SUBNETS',
    'TASK_DEFINITION',
  ];
  for (const k of requiredEnvVars) {
    it(`throws an error if ${k} is not set`, async () => {
      delete process.env[k];

      const handlerPromise = handler({ Records: [{ invalid: true }] });

      await expect(handlerPromise).rejects.toThrow();
    });
  }

  it('throws an error if an unexpected event is received', async () => {
    const handlerPromise = handler({ Records: [{ invalid: true }] });

    await expect(handlerPromise).rejects.toThrow();
  });
});
