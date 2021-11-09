#!/usr/bin/env node

import 'source-map-support/register';
import {
  App,
  Environment,
  Tags,
} from '@aws-cdk/core';
import ObpStack from '../cdk/obp-stack';

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

const devStack = new ObpStack(app, 'DevStack', {
  env,
  stackName: 'dev-obp-cdk',
  deletionProtection: false,
  disableWebsiteCache: true,
});
Tags.of(devStack).add('obp-stack', devStack.stackName);

const stagingStack = new ObpStack(app, 'StagingStack', {
  env,
  stackName: 'staging-obp-cdk',
});
Tags.of(stagingStack).add('obp-stack', stagingStack.stackName);

const prodStack = new ObpStack(app, 'ProdStack', {
  env,
  stackName: 'prod-obp-cdk',
});
Tags.of(prodStack).add('obp-stack', prodStack.stackName);
