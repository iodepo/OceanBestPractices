// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: [
    '@mhuffnagle/eslint-config-node-ts',
    '@mhuffnagle/eslint-config-jest',
  ],
};

module.exports = config;
