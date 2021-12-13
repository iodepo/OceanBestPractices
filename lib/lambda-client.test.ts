import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { TextEncoder } from 'util';
import * as lambdaClient from './lambda-client';

const mockLambda = mockClient(LambdaClient);

describe('lambda-client', () => {
  describe('invoke', () => {
    test('should invoke another Lambda function', async () => {
      mockLambda.on(
        InvokeCommand
      )
        .resolves({ StatusCode: 200 });

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
