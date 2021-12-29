import { z } from 'zod';
import { zodTypeGuard } from './zod-utils';
import { lambda } from './aws-clients';

const invocationResponseSchema = z.object({ Payload: z.string() });

const isSuccessResponse = zodTypeGuard(z.object({
  text_uri: z.string().url(),
  results: z.object({
    textractor: z.object({
      success: z.literal(true),
    }),
  }),
}));

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
  textractorFunction: string
}

/**
 * Using the textractor lambda function, extract the text from a PDF. The text
 * will be written to the specified destination object.
 */
export const parseObject = async (
  params: ParseObjectParams
): Promise<void> => {
  const payload = JSON.stringify({
    document_uri: params.source,
    temp_uri_prefix: `s3://${params.tempBucket}/`,
    text_uri: params.destination,
  });

  const rawInvokeResponse: unknown = await lambda().invoke({
    FunctionName: params.textractorFunction,
    Payload: JSON.stringify(payload),
  }).promise();

  const invokeResponse = invocationResponseSchema.parse(rawInvokeResponse);

  validateTextractorResponse(invokeResponse.Payload);
};
