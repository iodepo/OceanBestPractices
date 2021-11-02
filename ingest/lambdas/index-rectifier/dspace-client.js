const got = require('got');

class DSpaceClient {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5',
    };
  }

  /**
   * Searches for DSpace items that match the given metadata field and value.
   * Includes the metadata and bitstreams fields for each matched item.
   *
   * @param {string} key Metadata field key
   * @param {string} value Metadata field value
   * @returns {Array} List of DSpace items that match the query
   */
  async find(key, value) {
    return got.post(`${this.endpont}/rest/items/find-by-metadata-field?expand=metadata,bitstreams`, {
      json: {
        key,
        value,
      },
      headers: this.headers,
    });
  }

  /**
   * Fetches the DSpace RSS feed.
   *
   * @returns {string} DSpace RSS feed in XML format
   */
  async getFeed() {
    return got(`${this.endpoint}/feed/rss_2.0/site`, {
      headers: {
        ...this.headers,
        Accept: 'application/xml',
      },
      resolveBodyOnly: true,
    });
  }

  /**
   * Gets a DSpace item for the given UUID. Returns an empty object if
   * no item is found for the given UUID. This returns the full DSpace
   * item including metadata and bitstreams.
   *
   * @param {string} uuid DSpace item UUID.
   * @returns {object} Full DSpace item
   */
  async getItem(uuid) {
    return got(`${this.endpoint}/rest/items/${uuid}`, {
      headers: this.headers,
      resolveBodyOnly: true,
    });
  }

  /**
   * Gets the metadata for a DSpace item for the given UUID. Returns an
   * empty object if no item is found for the given UUID. This returns
   * only the metadata.
   *
   * @param {string} uuid DSpace item UUID.
   * @returns {object} Metadata for the DSpace item
   */
  async getMetadata(uuid) {
    return got(`${this.endpoint}/rest/items/${uuid}/metadata`, {
      headers: this.headers,
      resolveBodyOnly: true,
    });
  }
}

module.exports = DSpaceClient;
