const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { mockClient } = require('aws-sdk-client-mock');
const { TextEncoder } = require('util');
const lambdaClient = require('./lambda-client');

const mockLambda = mockClient(LambdaClient);

describe('lambda-client', () => {
  describe('invoke', () => {
    test('should invoke another Lambda function', async () => {
      mockLambda.on(
        InvokeCommand
      )
        .resolves({ status: 'Success' });

      await lambdaClient.invoke('mockFunction', 'Event', { mock: 'payload' });

      const invokeCommandCalls = mockLambda.commandCalls(InvokeCommand, {
        Payload: new TextEncoder().encode(JSON.stringify({ mock: 'payload' })), // We're cheating here but I want to make sure we check this gets called.
        FunctionName: 'mockFunction',
        InvocationType: 'Event',
      });

      expect(invokeCommandCalls.length).toEqual(1);
    });
  });
});
