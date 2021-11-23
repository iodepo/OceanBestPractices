/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while
  // executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: 'v8',

  setupFiles: ['<rootDir>/.jest/setEnvVars.js'],

  preset: 'ts-jest',

  testEnvironment: 'node',
};
