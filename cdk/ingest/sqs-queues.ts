import { Queue } from '@aws-cdk/aws-sqs';
import { Construct } from '@aws-cdk/core';

interface SqsQueuesProps {
  stackName: string
}

export default class IngestSqsQueues extends Construct {
  public readonly indexerQueue: Queue

  constructor(scope: Construct, id: string, props: SqsQueuesProps) {
    super(scope, id);

    this.indexerQueue = new Queue(
      this,
      'IndexerQueue',
      { queueName: `${props.stackName}-Indexer-Queue` }
    );
  }
}
