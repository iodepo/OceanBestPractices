const { HttpRequest } = require('@aws-sdk/protocol-http');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { SignatureV4 } = require('@aws-sdk/signature-v4');
const { NodeHttpHandler } = require('@aws-sdk/node-http-handler');
const { Sha256 } = require('@aws-crypto/sha256-browser');

/**
 *
 * @param {*} params
 * @returns
 */
const signAndRequest = async (params) => {
  const {
    body,
    endpoint,
    path,
    method = 'GET',
    region = 'us-east-1',
  } = params;

  // Create the HTTP request
  const request = new HttpRequest({
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      host: endpoint,
    },
    hostname: endpoint,
    method,
    path,
  });

  // Sign the request
  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region,
    service: 'es',
    sha256: Sha256,
  });

  const signedRequest = await signer.sign(request);

  // Send the request
  const client = new NodeHttpHandler();
  const { response } = await client.handle(signedRequest);
  console.log(`${response.statusCode} ${response.body.statusMessage}`);
  let responseBody = '';
  await new Promise(() => {
    response.body.on('data', (chunk) => {
      responseBody += chunk;
    });
    response.body.on('end', () => {
      console.log(`Response body: ${responseBody}`);
    });
  }, (error) => {
    console.log(`Error: ${error}`);
  });

  return JSON.parse(responseBody);
};

module.exports = {
  openScroll: async (endpoint, index, options = {}) => {
    const {
      includes = ['*'],
      region = 'us-east-1',
      scrollTimeout = 60,
      size = 500,
    } = options;

    const params = {
      body: {
        _source: {
          includes,
        },
        size,
      },
      path: `${index}/_search?scroll=${scrollTimeout}m`,
      endpoint,
      region,
    };

    return signAndRequest(params);
  },

  nextScroll: async (endpoint, scrollId, options = {}) => {
    const {
      region = 'us-east-1',
      scrollTimeout = 60,
    } = options;

    const params = {
      body: {
        scroll: `${scrollTimeout}m`,
        scroll_id: scrollId,
      },
      path: '_search/scroll',
      endpoint,
      region,
    };

    return signAndRequest(params);
  },

  closeScroll: async (endpoint, scrollId, options = {}) => {
    const {
      region = 'us-east-1',
    } = options;

    const params = {
      method: 'DELETE',
      path: `_search/scroll/${scrollId}`,
      endpoint,
      region,
    };

    return signAndRequest(params);
  },

  bulkDelete: async (endpoint, index, ids, options = {}) => {
    const {
      region = 'us-east-1',
    } = options;

    const bulkData = ids.map((id) => ({
      delete: {
        _index: index,
        _type: '_doc',
        _id: id,
      },
    }));

    const params = {
      body: `${bulkData.map((d) => JSON.stringify(d)).join('\n')}\n`,
      method: 'POST',
      path: '_bulk',
      endpoint,
      region,
    };

    return signAndRequest(params);
  },
};
