import { Topic } from "@aws-cdk/aws-sns";
import { Construct } from "@aws-cdk/core";

interface SnsTopicsProps {
  stage: string
}

export default class IngestSnsTopics extends Construct {
  public readonly availableDocument: Topic;
  public readonly textExtractor: Topic;

  constructor(scope: Construct, id: string, props: SnsTopicsProps) {
    super(scope, id);

    const {
      stage
    } = props;

    this.availableDocument = new Topic(this, 'AvailableDocument', {
      displayName: `${stage} Available Documents Topic`
    });

    this.textExtractor = new Topic(this, 'TextExtractor', {
      displayName: `${stage}-Text Extractor Completed Topic`
    });
  }
}