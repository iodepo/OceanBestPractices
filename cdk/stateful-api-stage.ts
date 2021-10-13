import { Construct, Stage, StageProps } from "@aws-cdk/core";
import StatefulApiStack from "./stateful-api-stack";

interface StatefulApiStageProps extends StageProps {
  stage: string
}

export default class StatefulApiStage extends Stage {
  constructor(scope: Construct, id: string, props: StatefulApiStageProps) {
    const { stage, ...superProps } = props;

    super(scope, id, superProps);

    new StatefulApiStack(this, 'StatefulApiStack', {
      stage,
      description: `Stateful API stack for the "${stage}" stage`
    });
  }
}
