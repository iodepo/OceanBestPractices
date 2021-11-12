const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { TextEncoder } = require('util');

module.exports = {
  /**
   * Invokes another Lambda function.
   *
   * @param {string} functionName Name of the function to invoke.
   * @param {'Event'|'RequestResponse'|'DryRun'} invocationType
   * See https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-lambda/modules/invocationrequest.html#invocationtype
   * @param {Object} payload The JSON that you want to provide
   * to your Lambda function as input.
   * @param {string} [region=us-east-1] AWS Region for the function.
   */
  invoke: async (functionName, invocationType, payload, region = 'us-east-1') => {
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
  },
};
