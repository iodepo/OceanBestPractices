import { IDomain } from "@aws-cdk/aws-elasticsearch";
import { Construct, Stage, StageProps } from "@aws-cdk/core";
import StatelessApiStack from "./stateless-api-stack";

interface StatelessApiStageProps extends StageProps {
  elasticsearchDomain: IDomain
  stage: string
  textExtractorFunctionName: string
}

export default class StatelessApiStage extends Stage {
  constructor(scope: Construct, id: string, props: StatelessApiStageProps) {
    const {
      elasticsearchDomain,
      stage,
      textExtractorFunctionName,
      ...superProps
    } = props;

    super(scope, id, superProps);

    new StatelessApiStack(this, 'StatelessApiStack', {
      elasticsearchDomain,
      stage,
      textExtractorFunctionName,
    });
  }
}
