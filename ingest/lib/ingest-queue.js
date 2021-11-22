const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

module.exports = {
  /**
   * Queues a DSpace document for ingest using the `link` attribute. This will
   * trigger the full asynchronous ingest process for a given DSpace document.
   *
   * @param {string} uuid UUID of the DSpace item to queue for ingest.
   * @param {string} ingestTopicArn SNS Topic ARN where new documents
   *                                are queued.
   * @param {Object} [options={}] Additional options.
   * @param {string} [options.region='us-east-1'] AWS region containing the
   *                                            infrastructure.
   * @returns {Promise<import('@aws-sdk/client-sns').PublishCommandOutput>}
   * Returns the resut of the SNS PublishCommand:
   * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sns/interfaces/publishcommandoutput.html
   */
  queueIngestDocument: async (uuid, ingestTopicArn, options = {}) => {
    const { region = 'us-east-1' } = options;

    const params = {
      Message: uuid,
      TopicArn: ingestTopicArn,
    };

    const client = new SNSClient({ region });
    const command = new PublishCommand(params);

    return client.send(command);
  },
};
