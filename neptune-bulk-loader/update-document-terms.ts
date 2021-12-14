/* eslint-disable no-underscore-dangle */
import { z } from 'zod';
import * as osClient from '../lib/open-search-client';

const getTerms = async (
  esUrl: string,
  title: string,
  contents: string
) => osClient.percolateDocumentFields(
  esUrl,
  {
    title,
    contents,
  }
);

const hitSchema = z.object({
  _id: z.string(),
  _source: z.object({
    _bitstreamText: z.string().optional(),
    dc_title: z.string(),
  }),
});

const updateDocumentTerms = async (
  esUrl: string,
  index: string,
  rawHit: unknown
): Promise<void> => {
  const hit = hitSchema.parse(rawHit);

  const title = hit._source.dc_title;

  const contents = hit._source._bitstreamText ?? title;

  const terms = await getTerms(esUrl, title, contents);

  await osClient.updateDocument(
    esUrl,
    index,
    hit._id,
    { _terms: terms }
  );
};

interface UpdateDocumentTermsParams {
  esUrl: string;
  index: string;
}

export const updateAllDocumentsTerms = async (
  params: UpdateDocumentTermsParams
) => {
  const {
    esUrl,
    index,
  } = params;

  await osClient.scrollMap({
    esUrl,
    index,
    pMapOptions: { concurrency: 1 },
    scrollOptions: { includes: ['dc_title', '_bitstreamText'] },
    handler: (rawHit) => updateDocumentTerms(esUrl, index, rawHit),
  });
};
