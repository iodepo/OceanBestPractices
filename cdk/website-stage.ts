import { Construct, Stage, StageProps } from "@aws-cdk/core";
import WebsiteStack from "./website-stack";

interface WebsiteStageProps extends StageProps {
  stage: string
}

export default class WebsiteStage extends Stage {
  constructor(scope: Construct, id: string, props: WebsiteStageProps) {
    const {
      stage,
      ...superProps
    } = props;

    super(scope, id, superProps);

    new WebsiteStack(this, 'WebsiteStack', {
      stage,
      description: `Website stack for the "${stage}" stage`
    });
  }
}
