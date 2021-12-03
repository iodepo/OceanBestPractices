import { Bitstream, Metadata } from './dspace-schemas';

/**
 * Returns an array of metadata items that match the given key.
 * @param metadataItems - List of metadata to search.
 * @param key - The key for the metadata items to find.
 *
 * @returns An array with metadata items for the given key.
 * If no metadata items match the key an empty array is returned.
 */
export const findMetadataItems = (
  metadataItems: Metadata[],
  key: string
): Metadata[] => metadataItems.filter((m) => m.key === key);

/**
   * Finds the first bistream item that matches the given bundle name
   * and mimetype.
   *
   * @param bitstreams - List of bitstream items to search.
   * @param bundleName - The DSpace bitstream bundle name.
   * @param mimeType - The mimeType of the bitstream item.
   * @returns The bitstream item that matches the given
   * bundle name and mime type. Returns undefined if no matching bitstream
   * is found.
   */
export const findBitstreamItem = (
  bitstreamItems: Bitstream[],
  bundleName: string,
  mimeType: string
): Bitstream | undefined => bitstreamItems.find((b) => (
  b.bundleName === bundleName && b.mimeType === mimeType
));

/**
   * Bitstream item that represents the thumbnail.
   * @param bitstreams - List of bitstreams to search.
   * @returns The bitstream item for the thumbnail or undefined
   * if none is found.
   */
export const thumbnailBitstreamItem = (
  bitstreams: Bitstream[]
): Bitstream | undefined => findBitstreamItem(
  bitstreams,
  'THUMBNAIL',
  'image/jpeg'
);

/**
   * Bitstream item that represents the source PDF.
   * @param bitstreams - List of bitstreams to search.
   * @returns The bitstream item for the PDF or undefined if none is found.
   */
export const pdfBitstreamItem = (
  bitstreams: Bitstream[]
): Bitstream | undefined => findBitstreamItem(
  bitstreams,
  'ORIGINAL',
  'application/pdf'
);
