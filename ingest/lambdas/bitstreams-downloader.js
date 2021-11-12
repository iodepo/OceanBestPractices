// @ts-check
const dspaceClient = require('../../lib/dspace-client');
const lambdaClient = require('../../lib/lambda-client');
const s3Client = require('../../lib/s3-client');

const handler = async (event) => {
  try {
    // Get the DSpace item from S3.
    const dspaceItem = await s3Client.getJSONObject(
      event.Records[0].s3.bucket.name,
      event.Records[0].s3.object.key,
      process.env.AWS_REGION
    );

    // Get the PDF bitstream metadata.
    const pdfMetadata = dspaceItem.bitstreams.find((b) => (
      b.bundleName === 'ORIGINAL' && b.mimeType === 'application/pdf'
    ));

    if (pdfMetadata !== undefined) {
      console.log(`INFO: Found PDF for DSpace item ${dspaceItem.uuid}. Uploading to S3.`);

      // Get the PDF from DSpace.
      const pdf = await dspaceClient.getBitstream(
        process.env.DSPACE_ENDPOINT,
        pdfMetadata.retrieveLink
      );

      // Upload the PDF to S3.
      await s3Client.pubObject(
        process.env.DOCUMENT_BINARY_BUCKET,
        `${dspaceItem.uuid}.pdf`,
        pdf
      );

      console.log(`INFO: Uploaded PDF for DSpace item ${dspaceItem.uuid}`);
    } else {
      // No PDF so just invoke the indexer.
      console.log(`INFO: DSpace item ${dspaceItem.uuid} has no PDF. Skipping upload and invoking the indexer.`);

      await lambdaClient.invoke(
        process.env.INDEXER_FUNCTION_NAME,
        'Event',
        { uuid: dspaceItem.uuid }
      );
    }
  } catch (error) {
    console.log(`ERROR: Failed to process DSpace item bitstream with error: ${error}`);
    throw error;
  }
};

module.exports = handler;
