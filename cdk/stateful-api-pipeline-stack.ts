import { Stack, StackProps } from "@aws-cdk/core";
import { Construct } from "constructs";
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep } from '@aws-cdk/pipelines';
import { GitHubTrigger } from "@aws-cdk/aws-codepipeline-actions";
import StatefulApiStage from "./stateful-api-stage";
import { IDomain } from "@aws-cdk/aws-elasticsearch";

export default class StatefulApiPipelineStack extends Stack {
  public readonly developmentElasticsearchDomain: IDomain;
  public readonly stagingElasticsearchDomain: IDomain;

  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, {
      description: 'Pipeline for managing deployments of the stateful api stack',
      ...props
    });

    const pipeline = new CodePipeline(this, 'Pipeline', {
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('iodepo/OceanBestPractices', 'cdk-pipeline-deployments', {
          trigger: GitHubTrigger.POLL
        }),
        commands: ['npm ci', 'npm run build', 'npx cdk synth']
      })
    });

    const developmentStage = new StatefulApiStage(this, 'Development', {
      env: { region: 'us-east-1' },
      stage: 'development',
      terminationProtection: false
    });

    this.developmentElasticsearchDomain = developmentStage.elasticsearchDomain;

    pipeline.addStage(developmentStage);

    const stagingStage = new StatefulApiStage(this, 'Staging', {
      env: { region: 'us-east-1' },
      stage: 'staging'
    });

    this.stagingElasticsearchDomain = stagingStage.elasticsearchDomain;

    pipeline.addStage(stagingStage, {
      pre: [
        new ManualApprovalStep('PromoteToStaging', { comment: 'Promote to staging' }),
      ]
    });
  }
}
