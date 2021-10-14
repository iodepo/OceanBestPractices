#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import StatefulApiPipelineStack from '../cdk/stateful-api-pipeline-stack';
import StatefulApiStage from '../cdk/stateful-api-stage';
import WebsitePipelineStack from '../cdk/website-pipeline-stack';
import WebsiteStage from '../cdk/website-stage';
import StatelessApiPipelineStack from '../cdk/stateless-api-pipeline-stack';
import StatelessApiStage from '../cdk/stateless-api-stage';

const env = { region: 'us-east-1' };

const app = new cdk.App();

/**
 * Stateful API stacks
 */
const statefulApiPipelineStack = new StatefulApiPipelineStack(
  app, 'StatefulApiPipelineStack', { env }
);

const marcStatefulApiStage = new StatefulApiStage(app, 'MarcStatefulApiStage', {
  env,
  stage: 'marc',
  terminationProtection: false
});

/**
 * Stateless API stacks
 */

new StatelessApiPipelineStack(app, 'StatelessApiPipelineStack', {
  env,
  developmentElasticsearchDomain: statefulApiPipelineStack.developmentElasticsearchDomain,
  stagingElasticsearchDomain: statefulApiPipelineStack.stagingElasticsearchDomain
});

new StatelessApiStage(app, 'MarcStatelessApiStage', {
  env,
  stage: 'marc',
  elasticsearchDomain: marcStatefulApiStage.elasticsearchDomain,
  textExtractorFunctionName: 'textractor_simple'
});

/**
 * Website stacks
 */

new WebsitePipelineStack(app, 'WebsitePipelineStack', { env });

new WebsiteStage(app, 'MarcWebsiteStage', { env, stage: 'marc' });

/**
 * Ship it
 */

app.synth();
