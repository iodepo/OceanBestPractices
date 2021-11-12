// @ts-check
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

// Helper function to convert a ReadableStream to a string.
const streamToString = (stream) => new Promise((resolve, reject) => {
  const chunks = [];
  stream.on('data', (chunk) => chunks.push(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
});

module.exports = {
  /**
   * Gets an object from the given S3 bucket and key and returns it as a
   * JSON object. This command will fail if the object in S3 is not a valid
   * JSON file.
   * @param {string} bucket The S3 bucket.
   * @param {string} key The S3 key for the object to get.
   * @param {string} [region=us-east-1] AWS Region containing the object.
   * @returns {Promise<Object>} The contents of the JSON file as an object.
   */
  getJSONObject: async (bucket, key, region = 'us-east-1') => {
    const s3Client = new S3Client({ region });
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const getObjectResponse = await s3Client.send(getObjectCommand);
    const getObjectBodyAsString = await streamToString(getObjectResponse.Body);

    return JSON.parse(getObjectBodyAsString);
  },

  /**
   * Puts an object into the given S3 bucket with the given key.
   *
   * @param {string} bucket The S3 bucket.
   * @param {string} key The S3 key for the object.
   * @param {Buffer} payload The object to put into S3.
   */
  pubObject: async (bucket, key, payload, region = 'us-east-1') => {
    const s3Client = new S3Client({ region });
    const putObjectCommand = new PutObjectCommand({
      Body: payload,
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(putObjectCommand);
  },
};
