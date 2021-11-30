#!/usr/bin/env node

import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

async function fetchRecaptchaSiteKey(stage: string) {
  const client = new SSMClient({});

  const response = await client.send(new GetParameterCommand({
    Name: `/OBP/${stage}/recaptcha-site-key`,
  }));

  return response.Parameter?.Value;
}

async function fetchStackOutputValue(
  StackName: string,
  outputName: string
): Promise<string | undefined> {
  const client = new CloudFormationClient({});

  const response = await client.send(new DescribeStacksCommand({ StackName }));

  if (response.Stacks === undefined) return undefined;

  const [stack] = response.Stacks;
  if (stack === undefined) return undefined;

  const outputs = stack.Outputs;
  if (outputs === undefined) return undefined;

  const output = outputs.find((o) => o.ExportName === outputName);
  if (output === undefined) return undefined;

  return output.OutputValue;
}

function putConfig(bucketName: string, config: unknown) {
  const client = new S3Client({});

  return client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: 'config.json',
    Body: JSON.stringify(config),
  }));
}

async function main() {
  const [stackName] = process.argv.slice(2);

  if (!stackName) throw new Error('Usage: update-config STACK');

  const [
    recaptchaSiteKey,
    apiUrl,
    configBucketName,
  ] = await Promise.all([
    fetchRecaptchaSiteKey(stackName),
    fetchStackOutputValue(stackName, 'api-url'),
    fetchStackOutputValue(stackName, 'config-bucket-name'),
  ]);

  if (apiUrl === undefined) {
    throw new Error('Unable to fetch api url');
  }

  if (recaptchaSiteKey === undefined) {
    throw new Error('Unable to fetch recaptcha site key');
  }

  if (configBucketName === undefined) {
    throw new Error('Unable to fetch config bucket name');
  }

  const config = {
    apiUrl,
    recaptchaSiteKey,
  };

  await putConfig(configBucketName, config);
}

main().catch(console.error);
