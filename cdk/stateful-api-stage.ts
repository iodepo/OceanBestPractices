import { IDomain } from "@aws-cdk/aws-elasticsearch";
import { Construct, Stage, StageProps } from "@aws-cdk/core";
import StatefulApiStack from "./stateful-api-stack";

interface StatefulApiStageProps extends StageProps {
  stage: string
  terminationProtection?: boolean
}

export default class StatefulApiStage extends Stage {
  public readonly elasticsearchDomain: IDomain;

  constructor(scope: Construct, id: string, props: StatefulApiStageProps) {
    const {
      stage,
      terminationProtection = true,
      ...superProps
    } = props;

    super(scope, id, superProps);

    const statefulApiStack = new StatefulApiStack(this, 'StatefulApiStack', {
      terminationProtection,
      stage
    });

    this.elasticsearchDomain = statefulApiStack.elasticsearchDomain;
  }
}
