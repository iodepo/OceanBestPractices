import { APIGatewayProxyResult } from 'aws-lambda';

const defaultHeaders = {
  'Access-Control-Allow-Origin': '*',
};

export const okResponse = (
  contentType: string,
  body: string
): APIGatewayProxyResult => ({
  statusCode: 200,
  headers: {
    ...defaultHeaders,
    'Content-Type': contentType,
  },
  body,
});

export const badRequestResponse = (
  body: string,
  contentType?: string
): APIGatewayProxyResult => ({
  statusCode: 400,
  headers: {
    ...defaultHeaders,
    'Content-Type': contentType ?? 'text/plain',
  },
  body,
});

export const internalServerErrorResponse: APIGatewayProxyResult = {
  statusCode: 500,
  headers: {
    ...defaultHeaders,
    'Content-Type': 'text/plain',
  },
  body: 'Internal Server Error',
};

export const badGatewayResponse: APIGatewayProxyResult = {
  statusCode: 502,
  headers: {
    ...defaultHeaders,
    'Content-Type': 'text/plain',
  },
  body: 'Bad Gateway',
};
