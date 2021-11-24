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
    .map((f) => {
      const { name } = path.parse(f);

      return [
        `${prefix}-${name}`,
        {
          import: path.resolve(path.join(entriesPath, f)),
          filename: path.join(prefix, name, 'lambda.js'),
        },
      ];
    })
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
      neptuneBulkLoaderTask: {
        import: './neptune-bulk-loader/task.ts',
        filename: './neptune-bulk-loader/task/index.js',
      },
      neptuneBulkLoaderTaskLauncher: {
        import: './neptune-bulk-loader/task-launcher.ts',
        filename: './neptune-bulk-loader/task-launcher/lambda.js',
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig-webpack.json',
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
    devtool: 'source-map',
    externals: { 'aws-sdk': 'aws-sdk' },
    resolve: {
      extensions: ['.ts', '...'],
    },
    output: {
      path: path.join(process.cwd(), 'dist'),
      library: { type: 'commonjs' },
    },
  };
};
