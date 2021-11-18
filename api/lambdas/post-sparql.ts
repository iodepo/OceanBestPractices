import { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';
import got from 'got';

type StringOrError = string | Error;

export const badRequest = (body: string): APIGatewayProxyResult => ({
  statusCode: 400,
  headers: { 'Content-Type': 'text/plain' },
  body,
});

export const internalServerError: APIGatewayProxyResult = {
  statusCode: 500,
  headers: { 'Content-Type': 'text/plain' },
  body: 'Internal Server Error',
};

export const queryREsult = (body: string): APIGatewayProxyResult => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/sparql-results+json; charset=UTF-8' },
  body,
});

export const getStringFromEnv = (key: string): StringOrError =>
  process.env[key] || new Error(`${key} not set`);

export const handler = async (
  event: APIGatewayProxyEventV2

): Promise<APIGatewayProxyResult> => {
  const { body } = event;

  const sparqlUrl = getStringFromEnv('SPARQL_URL');

  if (sparqlUrl instanceof Error) {
    console.log('SPARQL_URL not set');
    return internalServerError;
  }

  if (!body) return badRequest('Missing query parameter for POST request');
};
