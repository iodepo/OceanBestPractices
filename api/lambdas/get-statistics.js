const { getStringFromEnv } = require('../../lib/env-utils');
const osClient = require('../../lib/open-search-client');

const defaultHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

exports.handler = async () => {
  const openSearchEndpoint = getStringFromEnv('OPEN_SEARCH_ENDPOINT');

  const documentCount = await osClient.getCount(
    openSearchEndpoint,
    'documents'
  );
  const termCount = await osClient.getCount(
    openSearchEndpoint,
    'terms'
  );

  const body = {
    documents: {
      count: documentCount,
    },
    ontologies: {
      // TODO: Get the count of ontologies by querying for ontology metadata.
      count: 6,
      terms: {
        count: termCount,
      },
    },
  };

  return {
    statusCode: 200,
    body: JSON.stringify(body),
    headers: defaultHeaders,
  };
};
