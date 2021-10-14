import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { IDomain } from '@aws-cdk/aws-elasticsearch';
import Ingest from "./ingest";
import { Function } from "@aws-cdk/aws-lambda";

interface StatelessApiStackProps extends StackProps {
  elasticsearchDomain: IDomain
  stage: string
}

export default class StatelessApiStack extends Stack {
  constructor(scope: Construct, id: string, props: StatelessApiStackProps) {
    const {
      elasticsearchDomain,
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
      elasticsearchDomain,
      stage,
      textExtractorFunction
    });
  }
}
