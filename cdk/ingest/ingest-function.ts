import * as path from 'path';
import { Code, Function, FunctionProps, Runtime } from "@aws-cdk/aws-lambda";
import { Construct } from '@aws-cdk/core';

const lambdasPath = path.join(__dirname, '..', '..', 'oop-indexer', 'ingest', 'lambdas');

type IngestFunctionProps = Omit<FunctionProps, 'code' | 'handler' | 'runtime'>
  & Partial<Pick<FunctionProps, 'code' | 'handler' | 'runtime'>>
  & {
    name: string,
    stage: string,
    exclude?: string[]
  }

export default class IngestFunction extends Function {
  constructor(scope: Construct, id: string, props: IngestFunctionProps) {
    const { exclude, name, stage, ...superProps } = props;
    
    super(scope, id, {
      functionName: `obp-cdk-${name}-${stage}`,
      code: Code.fromAsset(path.join(lambdasPath, name), { exclude: ['*.test.js'] }),
      handler: 'index.handler',
      runtime: Runtime.NODEJS_12_X,
      ...superProps
    });
  }
}
