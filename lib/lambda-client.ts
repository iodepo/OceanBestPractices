import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { TextEncoder } from 'util';

/**
 * Invokes another Lambda function.
 *
 * @param functionName - Name of the function to invoke.
 * @param invocationType - See
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-lambda/modules/invocationrequest.html#invocationtype
 * @param payload - The JSON that you want to provide
 * to your Lambda function as input.
 * @param region - AWS Region for the function.
 */
export const invoke = async (
  functionName: string,
  invocationType: 'Event' | 'RequestResponse' | 'DryRun',
  payload: unknown,
  region = 'us-east-1'
): Promise<void> => {
  const lambdaClient = new LambdaClient({ region });
  const encodedPayload = new TextEncoder().encode(
    JSON.stringify(payload)
  );
  const invokeCommand = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: invocationType,
    Payload: encodedPayload,
  });

  await lambdaClient.send(invokeCommand);
};
