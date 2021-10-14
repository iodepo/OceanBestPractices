#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import PipelineStack from '../cdk/pipeline-stack';
import ObpStage from '../cdk/obp-stage';

const env = { region: 'us-east-1' };

const app = new cdk.App();

new PipelineStack(app, 'PipelineStack', { env });

new ObpStage(app, 'MarcApp', { env, stage: 'marc' });

app.synth();
