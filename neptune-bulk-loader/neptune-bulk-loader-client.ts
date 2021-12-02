import got, { Got } from 'got';
import { z } from 'zod';
import pWaitFor from 'p-wait-for';
import { negate } from 'lodash';
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

const isTerminalStatus = (status: string): boolean =>
  ![
    'LOAD_NOT_STARTED',
    'LOAD_IN_PROGRESS',
    'LOAD_IN_QUEUE',
  ].includes(status);

const isNonTerminalStatus = negate(isTerminalStatus);

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
type GetStatusOkResponse = z.infer<typeof getStatusOkResponseSchema>;

export class NeptuneBulkLoaderClient {
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

  async getStatus(loadId: string): Promise<GetStatusOkResponse> {
    const { body } = await this.got.get<unknown>(
      'loader',
      {
        searchParams: {
          loadId,
        },
      }
    );

    return getStatusOkResponseSchema.parse(body);
  }

  async waitForLoadCompleted(loadId: string): Promise<void> {
    await pWaitFor(
      async () => {
        const statusResponse = await this.getStatus(loadId);

        const { status } = statusResponse.payload.overallStatus;

        console.log(`LoadId ${loadId} status: ${status}`);

        if (isNonTerminalStatus(status)) return false;

        if (status !== 'LOAD_COMPLETED') {
          throw new Error(`Unexpected bulk loader status: ${status}`);
        }

        return true;
      },
      {
        interval: 1000,
        timeout: 60 * 1000, // Wait for a minute, will probably need to bump
      }
    );
  }
}
