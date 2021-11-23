import {
  getListFromEnv,
  getStringFromEnv,
} from './env-utils';

const testVar = 'TEST_VAR';

describe('env-utils', () => {
  beforeEach(() => {
    delete process.env[testVar];
  });

  describe('getStringFromEnv', () => {
    it('returns an Error if the environment variable is not set', () => {
      expect(getStringFromEnv(testVar)).toBeInstanceOf(Error);
    });

    it('returns an Error if the environment variable is an empty string', () => {
      process.env[testVar] = '';
      expect(getStringFromEnv(testVar)).toBeInstanceOf(Error);
    });

    it('returns the value if the environment variable is set', () => {
      process.env[testVar] = 'asdf';
      expect(getStringFromEnv(testVar)).toBe('asdf');
    });
  });

  describe('getListFromEnv', () => {
    it('returns an Error if the environment variable is not set', () => {
      expect(getListFromEnv(testVar)).toBeInstanceOf(Error);
    });

    it('returns an Error if the environment variable is an empty string', () => {
      process.env[testVar] = '';
      expect(getListFromEnv(testVar)).toBeInstanceOf(Error);
    });

    it('returns a single-element list', () => {
      process.env[testVar] = 'asdf';
      expect(getListFromEnv(testVar)).toEqual(['asdf']);
    });

    it('returns a multi-element list', () => {
      process.env[testVar] = 'as,df';
      expect(getListFromEnv(testVar)).toEqual(['as', 'df']);
    });
  });
});
