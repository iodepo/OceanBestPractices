import {
  PublishCommand,
  PublishCommandOutput,
  SNSClient,
} from '@aws-sdk/client-sns';

/**
 * Queues a DSpace document for ingest using the `link` attribute. This will
 * trigger the full asynchronous ingest process for a given DSpace document.
 *
 * @param uuid - UUID of the DSpace item to queue for ingest.
 * @param ingestTopicArn - SNS Topic ARN where new documents are queued.
 * @param region - AWS region containing the infrastructure.
 * @returns Returns the resut of the SNS PublishCommand:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sns/interfaces/publishcommandoutput.html
 */
export const queueIngestDocument = (
  uuid: string,
  ingestTopicArn: string,
  region = 'us-east-1'
): Promise<PublishCommandOutput> => {
  const params = {
    Message: uuid,
    TopicArn: ingestTopicArn,
  };

  const client = new SNSClient({ region });
  const command = new PublishCommand(params);

  return client.send(command);
};
