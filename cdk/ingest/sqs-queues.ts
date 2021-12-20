import { Queue } from '@aws-cdk/aws-sqs';
import { Construct } from '@aws-cdk/core';

interface SqsQueuesProps {
  stackName: string
}

export default class IngestSqsQueues extends Construct {
  public readonly dspaceItemIngestQueue: Queue

  constructor(scope: Construct, id: string, props: SqsQueuesProps) {
    super(scope, id);

    this.dspaceItemIngestQueue = new Queue(
      this,
      'DSpaceItemIngest',
      { queueName: `${props.stackName}-DSpace-Item-Ingest` }
    );
  }
}
