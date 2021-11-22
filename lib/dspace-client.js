// @ts-check
const { default: got } = require('got');
const xml2js = require('xml2js');

/**
 * @typedef {import('./dspace-types').DSpaceItem} DSpaceItem
 * @typedef {import('./dspace-types').Metadata} Metadata
 * @typedef {import('./dspace-types').RSSFeed} RSSFeed
 */

const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5',
};

module.exports = {
/**
   * Searches for DSpace items that match the given metadata field and value.
   * Includes the metadata and bitstreams fields for each matched item.
   *
   * @param {string} endpoint DSpace endpoint. Should include protocol.
   * @param {string} key Metadata field key
   * @param {string} value Metadata field value
   * @returns {Promise<DSpaceItem[]>} List of DSpace items that match the query.
   */
  find: async (endpoint, key, value) => got.post(`${endpoint}/rest/items/find-by-metadata-field`, {
    json: {
      key,
      value,
    },
    searchParams: {
      expand: 'metadata,bitstreams',
    },
    responseType: 'json',
    resolveBodyOnly: true,
    headers,
  }),

  /**
   * Fetches the DSpace RSS feed.
   *
   * @param {string} endpoint DSpace endpoint. Should include protocol.
   * @returns {Promise<RSSFeed>} Parsed DSpace RSS feed.
   */
  getFeed: async (endpoint) => {
    const rawFeed = await got(`${endpoint}/feed/rss_2.0/site`, {
      headers: {
        ...headers,
        Accept: 'application/xml',
      },
      resolveBodyOnly: true,
    });

    return new Promise((resolve, reject) => {
      const xmlOpts = {
        explicitRoot: false,
      };

      const parser = new xml2js.Parser(xmlOpts);
      parser.parseString(rawFeed, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  },

  /**
   * Returns DSpace items within the scope of the provided limit
   * and offset values.
   *
   * @param {string} endpoint DSpace endpoint. Should include protocol.
   * @param {Object} [searchParams={}] Optional query parameters.
   * @param {'metadata'|'bitstreams'|'none'} [searchParams.expand='none']
   *  Metadata fields to expand in the query. Valid options include 'metadata',
   * 'bitstreams', or 'none'.
   * @param {number} [searchParams.limit=50] Limit the number of items returned.
   * @param {number} [searchParams.offset=0] Offset to start query. Used for
   * paginating results.
   *
   * @returns {Promise<DSpaceItem[]>} List of DSpace items.
   */
  getItems: async (endpoint, searchParams = {}) => {
    const {
      expand = 'none',
      limit = 50,
      offset = 0,
    } = searchParams;

    return got.get(`${endpoint}/rest/items`, {
      headers,
      searchParams: {
        expand,
        limit,
        offset,
      },
      responseType: 'json',
      resolveBodyOnly: true,
    });
  },

  /**
   * Gets a DSpace item for the given UUID. Returns an empty object if
   * no item is found for the given UUID. This returns the full DSpace
   * item including metadata and bitstreams.
   *
   * @param {string} endpoint DSpace endpoint. Should include protocol.
   * @param {string} uuid DSpace item UUID.

   * @returns {Promise<DSpaceItem|undefined>} DSpace item or undefined if not
   * found.
   */
  getItem: async (endpoint, uuid) => {
    try {
      return await got.get(`${endpoint}/rest/items/${uuid}`, {
        headers: this.headers,
        responseType: 'json',
        resolveBodyOnly: true,
      });
    } catch (error) {
      if (error.response.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  },

  /**
   * Gets the metadata for a DSpace item for the given UUID. Returns an
   * empty object if no item is found for the given UUID. This returns
   * only the metadata.
   *
   * @param {string} endpoint DSpace endpoint. Should include protocol.
   * @param {string} uuid DSpace item UUID.
   *
   * @returns {Promise<Metadata[]|undefined>} Metadata for the DSpace item
   * or undefined if the item could not be found.
   */
  getMetadata: async (endpoint, uuid) => {
    try {
      return await got.get(`${endpoint}/rest/items/${uuid}/metadata`, {
        headers,
        responseType: 'json',
        resolveBodyOnly: true,
      });
    } catch (error) {
      if (error.response.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  },

  /**
   * Gets a bitstream file for the given bitstream retrieve link.
   *
   * @param {string} endpoint endpoint DSpace endpoint. Should include protocol.
   * @param {string} retrieveLink Bitstream retrieve link.
   *
   * @returns {Promise<Buffer>} Bitstream file as a buffer.
   */
  getBitstream: async (endpoint, retrieveLink) => got(`${endpoint}${retrieveLink}`, {
    headers: {
      Accept: '*/*',
      ...headers,
    },
    responseType: 'buffer',
    resolveBodyOnly: true,
  }),
};
