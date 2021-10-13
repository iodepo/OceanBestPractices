import { Stack, StackProps } from "@aws-cdk/core";
import { Construct } from "constructs";
import { CodePipeline, CodePipelineSource, ShellStep } from '@aws-cdk/pipelines';
import { GitHubTrigger } from "@aws-cdk/aws-codepipeline-actions";

export default class StatefulApiPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('iodepo/OceanBestPractices', 'cdk-pipeline-deployments', {
          trigger: GitHubTrigger.POLL
        }),
        commands: ['npm ci', 'npm run build', 'npx cdk synth']
      })
    })
  }
}
