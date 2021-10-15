import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { IDomain } from '@aws-cdk/aws-elasticsearch';
import Ingest from "./ingest";
import { Function } from "@aws-cdk/aws-lambda";
import Api from "./api";

interface StatelessApiStackProps extends StackProps {
  elasticsearch: IDomain
  stage: string
}

export default class StatelessApiStack extends Stack {
  constructor(scope: Construct, id: string, props: StatelessApiStackProps) {
    const {
      elasticsearch,
      stage,
      ...superProps
    } = props;

    super(scope, id, {
      description: `Stateless API stack for the "${stage}" stage`,
      ...superProps
    });

    const textExtractorFunction = Function.fromFunctionArn(
      this,
      'TextExtractor',
      `arn:aws:lambda:${this.region}:${this.account}:function:'textractor_simple'`
    );

    new Ingest(this, 'Ingest', {
      elasticsearchDomain: elasticsearch,
      stage,
      textExtractorFunction
    });

    if (this.region === undefined) {
      throw new Error('Expected a region to be set');
    }

    new Api(this, 'Api', {
      stage,
      region: this.region,
      elasticsearch
    });
  }
}
