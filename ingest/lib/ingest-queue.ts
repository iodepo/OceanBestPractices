import { sns } from '../../lib/aws-clients';

/**
 * Queues a DSpace document for ingest using the `link` attribute. This will
 * trigger the full asynchronous ingest process for a given DSpace document.
 *
 * @param uuid - UUID of the DSpace item to queue for ingest.
 * @param ingestTopicArn - SNS Topic ARN where new documents are queued.
 * @returns Returns the resut of the SNS PublishCommand:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sns/interfaces/publishcommandoutput.html
 */
export const queueIngestDocument = async (
  uuid: string,
  ingestTopicArn: string
): Promise<void> => {
  console.log(`Sending message ${uuid} to ${ingestTopicArn}`);

  await sns().publish({
    TopicArn: ingestTopicArn,
    Message: uuid,
  }).promise();
};
