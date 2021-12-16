import { getObjectText, S3ObjectLocation } from '../lib/s3-utils';

export const parseStopwords = (lines: string): string[] =>
  lines
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

export const loadStopwords = async (
  s3Location: S3ObjectLocation
): Promise<string[]> => {
  try {
    const lines = await getObjectText(s3Location);
    return parseStopwords(lines);
  } catch (error) {
    console.log(`Unable to load stopwords from ${s3Location.url}: ${error}`);
    return [];
  }
};
