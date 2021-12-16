import { URL } from 'url';
import type { HTTPError, HTTPSOptions } from 'got';
import { z } from 'zod';

const allowInvalidCerts = (url: string): boolean => {
  const { protocol, hostname } = new URL(url);

  return protocol === 'https:'
    && ['localhost', '127.0.0.1', '::1'].includes(hostname);
};

export const httpsOptions = (url: string): HTTPSOptions => ({
  rejectUnauthorized: !allowInvalidCerts(url),
});

export const isHTTPError = (x: unknown): x is HTTPError =>
  z.object({
    response: z.object({
      body: z.unknown(),
      statusCode: z.number(),
    }),
  }).safeParse(x).success;
