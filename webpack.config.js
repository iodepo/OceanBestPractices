// @ts-check

const _ = require('lodash');
const path = require('path');
const { readdir } = require('fs/promises');

const getEntries = async (entriesPath, prefix) => {
  const files = await readdir(entriesPath);
  const lambdaFiles = files.filter((f) => !f.endsWith('.test.js'));

  return _(lambdaFiles)
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
