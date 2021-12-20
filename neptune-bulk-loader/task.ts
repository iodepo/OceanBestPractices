import * as s3Utils from '../lib/s3-utils';
import * as osClient from '../lib/open-search-client';
import { NeptuneBulkLoaderClient } from './neptune-bulk-loader-client';
import { getBoolFromEnv, getStringFromEnv } from '../lib/env-utils';
import { loadMetadata } from './metadata';
import { indexTerms } from './index-terms';
import { loadStopwords } from './stopwords';
import { lambda } from '../lib/aws-clients';

export const neptuneBulkLoader = async (): Promise<void> => {
  const iamRoleArn = getStringFromEnv('IAM_ROLE_ARN');
  const insecureHttps = getBoolFromEnv('INSECURE_HTTPS', false);
  const metadataUrl = getStringFromEnv('S3_TRIGGER_OBJECT');
  const neptuneUrl = getStringFromEnv('NEPTUNE_URL');
  const region = getStringFromEnv('AWS_REGION');
  const esUrl = getStringFromEnv('ES_URL');
  const termsIndex = getStringFromEnv('ES_TERMS_INDEX');
  const stopwordsBucket = getStringFromEnv('STOPWORDS_BUCKET');
  const bulkIngesterFunctionName = getStringFromEnv('BULK_INGESTER_FUNCTION_NAME');

  const bulkLoaderClient = new NeptuneBulkLoaderClient({
    neptuneUrl,
    iamRoleArn,
    region,
    insecureHttps,
  });

  console.log(`Metadata URL: ${metadataUrl}`);

  const metadata = await loadMetadata(metadataUrl);

  console.log('Metadata:', JSON.stringify(metadata));

  const {
    format,
    terminologyTitle,
    ontologyNameSpace,
    source,
    namedGraphUri,
    queryS3Url,
  } = metadata;

  const loadId = await bulkLoaderClient.load({
    source,
    format,
    namedGraphUri,
  });

  console.log(`loadId: ${loadId}`);

  await bulkLoaderClient.waitForLoadCompleted(loadId);

  console.log('Creating terms index');
  await osClient.createTermsIndex(esUrl, termsIndex);
  console.log('terms index created');

  console.log('Deleting by query');
  await osClient.deleteByQuery(esUrl, termsIndex, {
    match: { namedGraphUri },
  });
  console.log('Deleting by query finished');

  const stopwordsLocation = new s3Utils.S3ObjectLocation(
    stopwordsBucket,
    'stopwords.txt'
  );

  console.log('Loading sparql query and stopwords');
  const [
    sparqlQuery,
    stopwords,
  ] = await Promise.all([
    s3Utils.getObjectText(queryS3Url),
    loadStopwords(stopwordsLocation),
  ]);

  console.log('Starting indexTerms');

  await indexTerms({
    elasticsearchUrl: esUrl,
    ontologyNameSpace,
    namedGraphUri,
    terminologyTitle,
    indexName: termsIndex,
    sparqlUrl: `${neptuneUrl}/sparql`,
    sparqlQuery,
    stopwords,
  });

  console.log('Finished indexTerms');

  console.log('Invoking bulk ingester function');
  await lambda().invoke({
    FunctionName: bulkIngesterFunctionName,
    InvocationType: 'Event',
  }).promise();
  console.log('Finished invoking bulk ingester function');
};

if (require.main === module) {
  console.time('Total');
  neptuneBulkLoader()
    .then(() => console.timeEnd('Total'))
    .catch((error) => {
      console.log(error);
      console.timeEnd('Total');
    });
}
