import { z } from 'zod';
import { sns } from './aws-clients';
import { randomId } from './string-utils';

export const createSnsTopic = (name?: string): Promise<string> =>
  sns().createTopic({
    Name: name || randomId('sns'),
  }).promise()
    .then(({ TopicArn }) => {
      if (TopicArn) return TopicArn;
      throw new Error('Unable to get topic ARN');
    });

export const deleteSnsTopic = async (arn: string): Promise<void> => {
  await sns().deleteTopic({ TopicArn: arn }).promise();
};

export interface SnsSubscribeParams {
  topicArn: string
  protocol: string
  endpoint: string
}

export const subscribe = async (
  params: SnsSubscribeParams
): Promise<string> =>
  sns().subscribe({
    TopicArn: params.topicArn,
    Protocol: params.protocol,
    Endpoint: params.endpoint,
    ReturnSubscriptionArn: true,
  }).promise()
    .then(({ SubscriptionArn }) => {
      if (SubscriptionArn) return SubscriptionArn;
      throw new Error('Unable to subscribe endpoint');
    });

export const snsEventSchema = z.object({ Message: z.string() });
