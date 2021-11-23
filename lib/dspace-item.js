class DSpaceItem {
  constructor(options = {}) {
    Object.assign(this, options);
  }

  /**
   * Returns an array of metadata items that match the given key.
   * @param {string} key The DSpace metadata key to find.
   *
   * @returns {Obejct[]} An array with metadata items for the given key.
   * If no metadata items match the key an empty array is returned.
   */
  findMetadataItems(key) {
    return this.metadata.filter((m) => m.key === key);
  }

  /**
   * Finds the first bistream item that matches the given bundle name
   * and mimetype.
   *
   * @param {string} bundleName The DSpace bitstream bundle name.
   * @param {string} mimeType The mimeType of the bitstream item.
   * @returns {Object|undefined} The bitstream item that matches the given
   * bundle name and mime type. Returns undefined if no matching bitstream
   * is found.
   */
  findBitstreamItem(bundleName, mimeType) {
    return this.bitstreams.find((b) => (
      b.bundleName === bundleName && b.mimeType === mimeType
    ));
  }

  /**
   * Bitstream item that represents the thumbnail.
   * @returns {Object|undefined}
   */
  get thumbnailBitstreamItem() {
    return this.findBitstreamItem('THUMBNAIL', 'image/jpeg');
  }

  /**
   * Bitstream item that represents the source PDF.
   * @returns {Object|undefined}
   */
  get pdfBitstreamItem() {
    return this.findBitstreamItem('ORIGINAL', 'application/pdf');
  }
}

module.exports = DSpaceItem;
