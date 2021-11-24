#!/usr/bin/env npx ts-node
/* eslint-disable no-await-in-loop */

import delay from 'delay';
import { s3 } from '../lib/aws-clients';

(async () => {
  process.env['NODE_ENV'] = 'test';

  const s3Client = s3();

  const waitUntil = Date.now() + (60 * 1000);

  let s3IsUp = false;
  let timedOut = false;

  do {
    try {
      await s3Client.listBuckets().promise();
      s3IsUp = true;
    } catch {
      if (Date.now() + 1000 < waitUntil) await delay(1000);
      else timedOut = true;
    }
  } while (!s3IsUp && !timedOut);

  if (s3IsUp) {
    console.log('LocalStack S3 server is available');
  } else {
    console.log('ERROR: LocalStack S3 server failed to start');
    process.exitCode = 1;
  }
})();
