import { Stack, StackProps } from "@aws-cdk/core";
import { Construct } from "constructs";
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep } from '@aws-cdk/pipelines';
import { GitHubTrigger } from "@aws-cdk/aws-codepipeline-actions";
import WebsiteStage from "./website-stage";

export default class WebsitePipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('iodepo/OceanBestPractices', 'cdk-pipeline-deployments', {
          trigger: GitHubTrigger.POLL
        }),
        commands: [
          '(cd website && npm ci && npm run build)',
          'npm ci',
          'npx cdk synth'
        ]
      })
    });

    pipeline.addStage(new WebsiteStage(this, 'Development', {
      env: { region: 'us-east-1' },
      stage: 'development'
    }));

    pipeline.addStage(
      new WebsiteStage(this, 'Staging', {
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
