#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import StatefulApiPipelineStack from '../cdk/stateful-api-pipeline-stack';

const app = new cdk.App();

new StatefulApiPipelineStack(app, 'StatefulApiPipelineStack', {
  env: { region: 'us-east-1' },
  description: 'Pipeline for managing deployments of the stateful api stack'
});

app.synth();
