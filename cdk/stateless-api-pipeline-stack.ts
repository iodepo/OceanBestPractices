import { Stack, StackProps } from "@aws-cdk/core";
import { Construct } from "constructs";
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep } from '@aws-cdk/pipelines';
import { GitHubTrigger } from "@aws-cdk/aws-codepipeline-actions";
import StatelessApiStage from "./stateless-api-stage";
import { IDomain } from "@aws-cdk/aws-elasticsearch";

interface PipelineStackProps extends StackProps {
  developmentElasticsearchDomain: IDomain
  stagingElasticsearchDomain: IDomain
}

export default class StatelessApiPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    const {
      developmentElasticsearchDomain,
      stagingElasticsearchDomain,
      ...superProps
    } = props;

    super(scope, id, {
      description: 'Pipeline for managing deployments of the stateful api stack',
      ...superProps
    });

    const pipeline = new CodePipeline(this, 'Pipeline', {
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('iodepo/OceanBestPractices', 'cdk-pipeline-deployments', {
          trigger: GitHubTrigger.POLL
        }),
        commands: ['npm ci', 'npm run build', 'npx cdk synth']
      })
    });

    pipeline.addStage(new StatelessApiStage(this, 'Development', {
      env: { region: 'us-east-1' },
      stage: 'development',
      elasticsearchDomain: developmentElasticsearchDomain,
      textExtractorFunctionName: 'textractor_simple'
    }));

    pipeline.addStage(
      new StatelessApiStage(this, 'Staging', {
        env: { region: 'us-east-1' },
        stage: 'staging',
        elasticsearchDomain: stagingElasticsearchDomain,
        textExtractorFunctionName: 'textractor_simple'
      }),
      {
        pre: [
          new ManualApprovalStep('PromoteToStaging', { comment: 'Promote to staging' }),
        ]
      }
    );
  }
}
