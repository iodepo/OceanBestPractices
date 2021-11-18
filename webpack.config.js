// @ts-check

const _ = require('lodash');
const path = require('path');
const { readdir } = require('fs/promises');

/** @type {(f: string) => boolean} */
const isTestFile = (f) => f.endsWith('.test.js') || f.endsWith('.test.ts');

/** @type {(f: string) => boolean} */
const isNotTestFile = _.negate(isTestFile);

const getEntries = async (entriesPath, prefix) => {
  const files = await readdir(entriesPath);

  return _(files)
    .filter(isNotTestFile)
    .map((f) => [
      `${prefix}-${path.parse(f).name}`,
      {
        import: path.resolve(path.join(entriesPath, f)),
        filename: path.join(prefix, '[name]', 'handler.js'),
      },
    ])
    .fromPairs()
    .value();
};

/** @type {import('webpack').Configuration} */
module.exports = async () => {
  const apiEntries = await getEntries(path.join('api', 'lambdas'), 'api');

  const ingestEntries = await getEntries(
    path.join('ingest', 'lambdas'),
    'ingest'
  );

  return {
    target: 'node',
    node: { __dirname: true },
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    entry: {
      ...apiEntries,
      ...ingestEntries,
    },
    devtool: 'source-map',
    externals: { 'aws-sdk': 'aws-sdk' },
    resolve: { extensions: ['.js'] },
    output: {
      path: path.join(process.cwd(), 'dist'),
      library: { type: 'commonjs' },
    },
  };
};
