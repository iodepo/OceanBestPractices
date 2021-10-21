#!/usr/bin/env node

import 'source-map-support/register';
import { App, Environment } from '@aws-cdk/core';
import Obp from '../cdk/obp';

const env: Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

const app = new App();

new Obp(app, 'Dev', {
  env,
  stage: 'dev',
  esNodeType: 't3.small.elasticsearch',
  terminationProtection: false
});

new Obp(app, 'Staging', { env, stage: 'staging' });

new Obp(app, 'Prod', { env, stage: 'prod' });
