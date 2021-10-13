import { Construct, Stack, StackProps } from "@aws-cdk/core";
import * as opensearch from '@aws-cdk/aws-opensearchservice';

interface StatefulApiStackProps extends StackProps {
  stage: string
}

export default class StatefulApiStack extends Stack {
  public readonly opensearchDomain: opensearch.Domain;

  constructor(scope: Construct, id: string, props: StatefulApiStackProps) {
    const {
      stage,
      ...superProps
    } = props;

    super(scope, id, superProps);
  }
}
