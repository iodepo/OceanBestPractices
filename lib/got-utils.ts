import { URL } from 'url';
import type { HTTPSOptions } from 'got';

const allowInvalidCerts = (url: string): boolean => {
  const { protocol, hostname } = new URL(url);

  return protocol === 'https:'
    && ['localhost', '127.0.0.1', '::1'].includes(hostname);
};

export const httpsOptions = (url: string): HTTPSOptions => ({
  rejectUnauthorized: !allowInvalidCerts(url),
});
