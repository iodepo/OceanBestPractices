import { Lambda } from 'aws-sdk';
import { localStackParams } from './aws-clients';

export interface LambdaClient {
  invoke(name: string, payload?: string): Promise<string>
  invokeAsync(name: string, payload?: string): Promise<void>
}

const invoke = (lambda: Lambda) =>
  async (name: string, payload?: string): Promise<string> => {
    const response = await lambda.invoke({
      FunctionName: name,
      Payload: payload,
    }).promise();

    if (typeof response.Payload === 'string') return response.Payload;

    throw new Error(`Unexpected lambda invocation response payload: ${response.Payload}`);
  };

const invokeAsync = (lambda: Lambda) =>
  (name: string, payload?: string): Promise<void> =>
    lambda.invoke({
      FunctionName: name,
      Payload: payload,
      InvocationType: 'Event',
    }).promise().then(() => undefined);

export const localStackLambdaClient = (): LambdaClient => {
  const lambda = new Lambda(localStackParams());

  return {
    invoke: invoke(lambda),
    invokeAsync: invokeAsync(lambda),
  };
};

export const awsLambdaClient = (): LambdaClient => {
  const lambda = new Lambda();

  return {
    invoke: invoke(lambda),
    invokeAsync: invokeAsync(lambda),
  };
};

export const nullLambdaClient = {
  invoke: () => Promise.resolve(''),
  invokeAsync: () => Promise.resolve(),
};
