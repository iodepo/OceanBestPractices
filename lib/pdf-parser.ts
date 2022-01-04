import { z } from 'zod';
import { LambdaClient } from './lambda-client';
import { zodTypeGuard } from './zod-utils';

const textractorSuccessResponseSchema = z.object({
  text_uri: z.string().url(),
  results: z.object({
    textractor: z.object({
      success: z.literal(true),
    }),
  }),
});

export type TextractorSuccessResponse = z.infer<typeof textractorSuccessResponseSchema>;

const isSuccessResponse = zodTypeGuard(textractorSuccessResponseSchema);

const isErrorResponse = zodTypeGuard(
  z.object({
    errorMessage: z.string(),
    errorType: z.string(),
  })
);

const validateTextractorResponse = (response: unknown): void => {
  if (isSuccessResponse(response)) return undefined;

  const errorMessage = isErrorResponse(response)
    ? `textractor error: ${response.errorMessage}`
    : `Unexpected textractor response: ${JSON.stringify(response)}`;

  throw new Error(errorMessage);
};

interface ParseObjectParams {
  source: string,
  destination: string,
  tempBucket: string,
  textractorFunction: string,
  lambda: LambdaClient
}

/**
 * Using the textractor lambda function, extract the text from a PDF. The text
 * will be written to the specified destination S3 location.
 */
export const parseObject = (params: ParseObjectParams): Promise<void> => {
  const payload = JSON.stringify({
    document_uri: params.source,
    temp_uri_prefix: `s3://${params.tempBucket}/`,
    text_uri: params.destination,
  });

  return params.lambda.invoke(params.textractorFunction, payload)
    .then(JSON.parse)
    .then(validateTextractorResponse);
};
