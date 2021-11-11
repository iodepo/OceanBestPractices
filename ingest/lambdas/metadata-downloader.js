// @ts-check
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const dspaceClient = require('../../lib/dspace-client');

const handler = async (event) => {
  const uuid = event.Records[0].Sns.Message;

  try {
    const dspaceItem = await dspaceClient.getItem(
      process.env.DSPACE_ENDPOINT,
      uuid
    );

    if (dspaceItem === undefined) {
      throw new Error(`Could not find DSpace item with UUID ${uuid}`);
    }

    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    const command = new PutObjectCommand({
      Body: JSON.stringify(dspaceItem),
      Bucket: process.env.DOCUMENT_METADATA_BUCKET,
      Key: `${dspaceItem.uuid}.json`,
    });

    await s3Client.send(command);

    console.log(`INFO: Successfully uploaded metadata for item: ${dspaceItem.uuid}`);

    return uuid;
  } catch (error) {
    console.log(`ERROR: Failed to upload metadata with error: ${error}`);
    throw error;
  }
};

module.exports = handler;
