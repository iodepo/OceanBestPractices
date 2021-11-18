module.exports = {
  addDSpaceItem(documentItem, dspaceItem) {
    return Object.assign(documentItem, dspaceItem);
  },

  addMetadataItemSearchFields(documentItem, metadataItems) {
    for (const metadataItem of metadataItems) {
      const searchFieldKey = metadataItem.key.replace('.', '_');
      documentItem[searchFieldKey] = metadataItem.value;
    }

    return documentItem;
  },
};
