import { Construct, Stage, StageProps } from "@aws-cdk/core";
import StatefulApiStack from "./stateful-api-stack";
import StatelessApiStack from "./stateless-api-stack";
import WebsiteStack from "./website-stack";

interface ObpStageProps extends StageProps {
  stage: string
}

export default class ObpStage extends Stage {
  constructor(scope: Construct, id: string, props: ObpStageProps) {
    const {
      stage,
      ...superProps
    } = props;

    super(scope, id, superProps);

    const statefulApiStack = new StatefulApiStack(this, 'StatefulApiStack', {
      stage
    });

    new StatelessApiStack(this, 'StatelessApiStack', {
      elasticsearchDomain: statefulApiStack.elasticsearchDomain,
      stage
    });

    new WebsiteStack(this, 'WebsiteStack', { stage });
  }
}
