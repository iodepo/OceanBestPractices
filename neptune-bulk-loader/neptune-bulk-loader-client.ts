import got, { Got } from 'got';
import { z } from 'zod';
import pWaitFor from 'p-wait-for';
import { zodTypeGuard } from '../lib/zod-utils';
import { httpsOptions } from '../lib/got-utils';
import { S3ObjectLocation } from '../lib/s3-utils';

export const BulkLoaderDataFormatSchema = z.enum([
  'csv',
  'opencypher',
  'ntriples',
  'nquads',
  'rdfxml',
  'turtle',
]);
export type BulkLoaderDataFormat = z.infer<typeof BulkLoaderDataFormatSchema>;

interface NeptuneBulkLoaderClientProps {
  neptuneUrl: string
  iamRoleArn: string
  region: string
  insecureHttps?: boolean
}

interface LoadParams {
  source: S3ObjectLocation
  format: BulkLoaderDataFormat
  namedGraphUri: string
}

const loaderOkResponseSchema = z.object({
  status: z.literal('200 OK'),
  payload: z.object({
    loadId: z.string(),
  }),
});
const isLoaderOkResponse = zodTypeGuard(loaderOkResponseSchema);

const loaderErrorResponseSchema = z.object({
  code: z.string(),
  requestId: z.string(),
  detailedMessage: z.string(),
});

const loaderResponseSchema = z.union([
  loaderOkResponseSchema,
  loaderErrorResponseSchema,
]);

const getStatusOkResponseSchema = z.object({
  status: z.literal('200 OK'),
  payload: z.object({
    overallStatus: z.object({
      status: z.string(),
    }),
  }),
});

export interface BulkLoaderClient {
  load(params: LoadParams): Promise<string>
  getStatus(loadId: string): Promise<string>
  isLoadCompleted(loadId: string): Promise<boolean>
  waitForLoadCompleted(loadId: string): Promise<void>
}

export class NeptuneBulkLoaderClient implements BulkLoaderClient {
  private readonly got: Got;

  private readonly iamRoleArn: string

  private readonly region: string

  constructor(props: NeptuneBulkLoaderClientProps) {
    this.iamRoleArn = props.iamRoleArn;
    this.region = props.region;

    this.got = got.extend({
      prefixUrl: props.neptuneUrl,
      responseType: 'json',
      throwHttpErrors: false,
      https: httpsOptions(props.neptuneUrl),
    });
  }

  async load(params: LoadParams): Promise<string> {
    const { source, format, namedGraphUri } = params;

    const { body } = await this.got.post<unknown>(
      'loader',
      {
        json: {
          source: source.url,
          format,
          iamRoleArn: this.iamRoleArn,
          region: this.region,
          parserConfiguration: {
            namedGraphUri,
          },
        },
        responseType: 'json',
        throwHttpErrors: false,
      }
    );

    const loaderResponse = loaderResponseSchema.parse(body);

    if (isLoaderOkResponse(loaderResponse)) {
      return loaderResponse.payload.loadId;
    }

    throw new Error(loaderResponse.detailedMessage);
  }

  async getStatus(loadId: string): Promise<string> {
    const { body } = await this.got.get<unknown>(
      'loader',
      {
        searchParams: {
          loadId,
        },
      }
    );

    const getStatusResponse = getStatusOkResponseSchema.parse(body);

    return getStatusResponse.payload.overallStatus.status;
  }

  async isLoadCompleted(loadId: string): Promise<boolean> {
    return (await this.getStatus(loadId)) === 'LOAD_COMPLETED';
  }

  async waitForLoadCompleted(loadId: string): Promise<void> {
    const nonTerminalStates = new Set([
      'LOAD_NOT_STARTED',
      'LOAD_IN_PROGRESS',
      'LOAD_IN_QUEUE',
    ]);

    await pWaitFor(
      async () => {
        const status = await this.getStatus(loadId);

        console.log(`LoadId ${loadId} status: ${status}`);

        if (nonTerminalStates.has(status)) return false;

        if (status !== 'LOAD_COMPLETED') {
          throw new Error(`Load status: "${status}"`);
        }

        return true;
      },
      {
        interval: 1000,
        timeout: 10 * 60 * 1000,
      }
    );
  }
}
