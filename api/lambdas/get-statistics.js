const { default: got } = require('got');
const { z } = require('zod');
const { getStringFromEnv } = require('../../lib/env-utils');
const { httpsOptions } = require('../../lib/got-utils');
const osClient = require('../../lib/open-search-client');

const defaultHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

const graphCountQuery = 'select distinct ?g where  { graph ?g {?s ?p ?o} } group by ?g';

const graphCountSparqlSchema = z.object({
  results: z.object({
    bindings: z.array(z.object({})),
  }),
});

/**
 * @param {string} sparqlUrl
 * @returns {Promise<number>}
 */
const getGraphCount = async (sparqlUrl) => {
  const response = await got.post(
    sparqlUrl,
    {
      form: { query: graphCountQuery },
      throwHttpErrors: false,
      https: httpsOptions(sparqlUrl),
    }
  );

  const graphCount = graphCountSparqlSchema.parse(
    JSON.parse(response.body)
  );

  return graphCount.results.bindings.length;
};

exports.handler = async () => {
  const openSearchEndpoint = getStringFromEnv('OPEN_SEARCH_ENDPOINT');
  const sparqlUrl = getStringFromEnv('SPARQL_URL');
  const documentsIndexName = getStringFromEnv('DOCUMENTS_INDEX_NAME');
  const termsIndexName = getStringFromEnv('TERMS_INDEX_NAME');

  const documentCount = await osClient.getCount(
    openSearchEndpoint,
    documentsIndexName
  );

  const termCount = await osClient.getCount(
    openSearchEndpoint,
    termsIndexName
  );

  const graphCount = await getGraphCount(sparqlUrl);

  const body = {
    documents: {
      count: documentCount,
    },
    ontologies: {
      count: graphCount,
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
