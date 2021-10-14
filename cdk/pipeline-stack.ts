import { Stack, StackProps } from "@aws-cdk/core";
import { Construct } from "constructs";
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep } from '@aws-cdk/pipelines';
import { GitHubTrigger } from "@aws-cdk/aws-codepipeline-actions";
import ObpStage from "./obp-stage";

export default class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, {
      description: 'Pipeline for managing deployments',
      ...props
    });

    const pipeline = new CodePipeline(this, 'Pipeline', {
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('iodepo/OceanBestPractices', 'cdk-pipeline-deployments', {
          trigger: GitHubTrigger.POLL
        }),
        commands: [
          '(cd website && npm ci && npm run build)',
          'npm ci',
          'npm run build',
          'npx cdk synth'
        ]
      })
    });

    pipeline.addStage(new ObpStage(this, 'Development', {
      env: { region: 'us-east-1' },
      stage: 'development'
    }));

    pipeline.addStage(
      new ObpStage(this, 'Staging', {
        env: { region: 'us-east-1' },
        stage: 'staging'
      }),
      {
        pre: [
          new ManualApprovalStep(
            'PromoteToStaging',
            { comment: 'Promote to staging' }
          ),
        ]
      }
    );
  }
}
