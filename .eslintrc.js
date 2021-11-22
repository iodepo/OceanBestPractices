module.exports = {
  root: true,
  env: {
    node: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
    'plugin:unicorn/recommended',
    'plugin:promise/recommended',
  ],
  rules: {
    'comma-dangle': [
      'error',
      {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'never',
      },
    ],
    'function-paren-newline': [
      'error',
      'multiline-arguments',
    ],
    'implicit-arrow-linebreak': 'off',
    'max-len': [
      'error',
      {
        code: 80,
        tabWidth: 2,
        ignorePattern: '(test\\(|https?://|@typedef)',
        ignoreTemplateLiterals: true,
        ignoreStrings: true,
      },
    ],
    'no-console': 'off',
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message: 'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
      },
      {
        selector: 'LabeledStatement',
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
      },
    ],
    'object-property-newline': [
      'error',
      { allowAllPropertiesOnSameLine: false },
    ],
    radix: ['error', 'as-needed'],
    'unicorn/custom-error-definition': 'error',
    'unicorn/no-unsafe-regex': 'error',
    'unicorn/no-useless-undefined': 'off',
    'unicorn/no-unused-properties': 'error',
    'unicorn/prefer-module': 'off',
    'unicorn/prefer-node-protocol': 'off',
    'unicorn/prevent-abbreviations': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_' },
    ],
  },
  overrides: [
    {
      files: [
        'api/lambdas/*',
        'ingest/lambdas/*',
        'neptune-bulk-loader/task-launcher.ts',
      ],
      rules: {
        'import/prefer-default-export': 'off',
      },
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: [
        '@typescript-eslint',
        'import-newlines',
      ],
      extends: [
        'plugin:@typescript-eslint/recommended',
      ],
      settings: { 'import/resolver': 'node' },
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        'dot-notation': 'off',
        'import/extensions': 'off',
        'import/no-extraneous-dependencies': [
          'error',
          { devDependencies: ['**/*.test.ts'] },
        ],
        'import/no-unresolved': 'off',
        'import-newlines/enforce': [
          'error',
          {
            items: 3,
            'max-len': 80,
          },
        ],
      },
    },
    {
      files: [
        'bin/*.ts',
        'cdk/**/*.ts',
      ],
      rules: {
        'no-new': 'off',
        '@typescript-eslint/ban-types': [
          'error',
          { types: { Function: false } },
        ],
        'unicorn/import-style': [
          'error',
          {
            styles: {
              path: {
                namespace: true,
              },
            },
          },
        ],
      },
    },
    {
      files: ['website/**'],
      env: {
        browser: true,
        node: false,
      },
    },
  ],
};
