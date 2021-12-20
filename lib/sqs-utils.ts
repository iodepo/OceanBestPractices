import pTimeout from 'p-timeout';
import { z } from 'zod';
import type { Message } from 'aws-sdk/clients/sqs';
import { noop } from 'lodash';
import { sqs } from './aws-clients';
import { randomId } from './string-utils';
import { snsEventSchema } from './sns-utils';

const sqsMessageSchema = z.object({
  ReceiptHandle: z.string().min(1),
  Body: z.string().min(1),
});

export type SqsMessage = z.infer<typeof sqsMessageSchema>;

const receiveMessageResultSchema = z.object({
  Messages: z.array(sqsMessageSchema).default([]),
});

type ReceiveMessageResult = z.infer<typeof receiveMessageResultSchema>;

export const createSQSQueue = async (
  name?: string
): Promise<{ arn: string, url: string }> => {
  const { QueueUrl: url } = await sqs().createQueue({
    QueueName: name || randomId('sqs'),
  }).promise();

  if (!url) throw new Error('Unable to get queue URL');

  const rawGetAttributesResponse = await sqs().getQueueAttributes({
    QueueUrl: url,
    AttributeNames: ['QueueArn'],
  }).promise();

  const getAttributesResponse = z.object({
    Attributes: z.object({
      QueueArn: z.string(),
    }),
  }).parse(rawGetAttributesResponse);

  const arn = getAttributesResponse.Attributes.QueueArn;

  return {
    arn,
    url,
  };
};

export const deleteSqsQueue = async (url: string): Promise<void> => {
  await sqs().deleteQueue({ QueueUrl: url }).promise();
};

export const receiveMessage = async (
  queueUrl: string
): Promise<ReceiveMessageResult> => {
  const result = await sqs().receiveMessage({
    QueueUrl: queueUrl,
    WaitTimeSeconds: 1,
  }).promise();

  return receiveMessageResultSchema.parse(result);
};

const getAllMessages = async (url: string, n: number): Promise<Message[]> => {
  const messages: Message[] = [];

  do {
    // eslint-disable-next-line no-await-in-loop
    const receivedMessages = await receiveMessage(url);

    messages.push(...receivedMessages.Messages);
  } while (messages.length < n);

  return messages;
};

export const waitForMessages = async (
  url: string,
  count: number
): Promise<Message[]> => pTimeout(getAllMessages(url, count), 10_000);

const snsMessageFromSqsMessage = (rawSqsMessage: Message): string => {
  const sqsMessage = sqsMessageSchema.parse(rawSqsMessage);

  const rawSnsEvent = JSON.parse(sqsMessage.Body);

  const snsEvent = snsEventSchema.parse(rawSnsEvent);

  return snsEvent.Message;
};

export const snsMessagesFromQueue = async (
  queueUrl: string,
  count: number
): Promise<string[]> => {
  const messages = await waitForMessages(queueUrl, count);

  return messages.map((m) => snsMessageFromSqsMessage(m));
};

export const deleteMessage = (
  queueUrl: string,
  receiptHandle: string
): Promise<void> =>
  sqs().deleteMessage({
    QueueUrl: queueUrl,
    ReceiptHandle: receiptHandle,
  }).promise().then(noop);

export const sendMessage = async (
  QueueUrl: string,
  message: unknown
): Promise<void> => {
  const MessageBody = typeof message === 'string'
    ? message
    : JSON.stringify(message);

  await sqs().sendMessage({
    QueueUrl,
    MessageBody,
  }).promise();
};
