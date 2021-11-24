#!/usr/bin/env node

import 'source-map-support/register';
import { App, Environment, Tags } from '@aws-cdk/core';
import ObpStack from '../cdk/obp-stack';
import { getStringFromEnv } from '../lib/env-utils';

const env: Required<Environment> = {
  account: getStringFromEnv('CDK_DEFAULT_ACCOUNT'),
  region: getStringFromEnv('CDK_DEFAULT_REGION'),
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
