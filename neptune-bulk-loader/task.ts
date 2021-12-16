import * as s3Utils from '../lib/s3-utils';
import * as osClient from '../lib/open-search-client';
import { NeptuneBulkLoaderClient } from './neptune-bulk-loader-client';
import { getBoolFromEnv, getStringFromEnv } from '../lib/env-utils';
import { loadMetadata } from './metadata';
import { indexTerms } from './index-terms';
import { updateAllDocumentsTerms } from './update-document-terms';
import { loadStopwords } from './stopwords';

export const neptuneBulkLoader = async (): Promise<void> => {
  const iamRoleArn = getStringFromEnv('IAM_ROLE_ARN');
  const insecureHttps = getBoolFromEnv('INSECURE_HTTPS', false);
  const metadataUrl = getStringFromEnv('S3_TRIGGER_OBJECT');
  const neptuneUrl = getStringFromEnv('NEPTUNE_URL');
  const region = getStringFromEnv('AWS_REGION');
  const esUrl = getStringFromEnv('ES_URL');
  const termsIndex = getStringFromEnv('ES_TERMS_INDEX');
  const documentsIndex = getStringFromEnv('ES_DOCUMENTS_INDEX');
  const stopwordsBucket = getStringFromEnv('STOPWORDS_BUCKET');

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

  await osClient.createTermsIndex(esUrl, termsIndex);

  await osClient.deleteByQuery(esUrl, termsIndex, {
    match: { namedGraphUri },
  });

  const stopwordsLocation = new s3Utils.S3ObjectLocation(
    stopwordsBucket,
    'stopwords.txt'
  );

  const [
    sparqlQuery,
    stopwords,
  ] = await Promise.all([
    s3Utils.getObjectText(queryS3Url),
    loadStopwords(stopwordsLocation),
  ]);

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

  await updateAllDocumentsTerms({
    esUrl,
    index: documentsIndex,
  });
};

if (require.main === module) {
  neptuneBulkLoader()
    .then((r) => console.log('Result:', r))
    .catch((error) => console.log(error));
}
