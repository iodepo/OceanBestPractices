#!/usr/bin/env node

import 'source-map-support/register';
import {
  App,
  Environment,
} from '@aws-cdk/core';
import Obp from '../cdk/obp';

if (process.env['CDK_DEFAULT_ACCOUNT'] === undefined) {
  throw new Error('CDK_DEFAULT_ACCOUNT is not set');
}

if (process.env['CDK_DEFAULT_REGION'] === undefined) {
  throw new Error('CDK_DEFAULT_REGION is not set');
}

const env: Required<Environment> = {
  account: process.env['CDK_DEFAULT_ACCOUNT'],
  region: process.env['CDK_DEFAULT_REGION'],
};

const app = new App();

new Obp(app, 'Dev', {
  env,
  stage: 'dev',
  esNodeType: 't3.small.elasticsearch',
  terminationProtection: false,
  disableWebsiteCache: true,
});

new Obp(app, 'Staging', {
  env,
  stage: 'staging',
});

new Obp(app, 'Prod', {
  env,
  stage: 'prod',
});
