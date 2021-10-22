import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { IDomain } from '@aws-cdk/aws-elasticsearch';
import Ingest from "./ingest";
import { Function } from "@aws-cdk/aws-lambda";
import Api from "./api";
import { IDistribution } from "@aws-cdk/aws-cloudfront";

interface StatelessApiStackProps extends StackProps {
  elasticsearch: IDomain
  stage: string
  websiteDistribution: IDistribution
}

export default class StatelessApiStack extends Stack {
  constructor(scope: Construct, id: string, props: StatelessApiStackProps) {
    const {
      elasticsearch,
      stage,
      websiteDistribution,
      ...superProps
    } = props;

    super(scope, id, {
      stackName: `${stage}-obp-cdk-stateless-api`,
      description: `Stateless API stack for the "${stage}" stage`,
      terminationProtection: true,
      ...superProps
    });

    const textExtractorFunction = Function.fromFunctionArn(
      this,
      'TextExtractor',
      `arn:aws:lambda:${this.region}:${this.account}:function:textractor_simple`
    );

    new Ingest(this, 'Ingest', {
      elasticsearchDomain: elasticsearch,
      stage,
      textExtractorFunction,
      websiteDistribution
    });

    new Api(this, 'Api', {
      stage,
      region: this.region,
      elasticsearch,
      websiteDistribution
    });
  }
}
