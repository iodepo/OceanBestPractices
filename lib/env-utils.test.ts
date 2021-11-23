import { getBoolFromEnv, getListFromEnv, getStringFromEnv } from './env-utils';

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

  describe('getBoolFromEnv', () => {
    describe('without a default', () => {
      it('returns an Error if the environment variable is not set', () => {
        expect(getBoolFromEnv(testVar)).toBeInstanceOf(Error);
      });

      it('returns an Error if the environment variable is an empty string', () => {
        process.env[testVar] = '';
        expect(getBoolFromEnv(testVar)).toBeInstanceOf(Error);
      });

      it('returns an Error if the environment variable is an invalid value', () => {
        process.env[testVar] = 'ASDF';
        expect(getBoolFromEnv(testVar)).toBeInstanceOf(Error);
      });

      for (const val of ['true', 'True', 'TRUE']) {
        it(`returns true for "${val}"`, () => {
          process.env[testVar] = val;
          expect(getBoolFromEnv(testVar)).toBe(true);
        });
      }

      for (const val of ['false', 'False', 'FALSE']) {
        it(`returns false for "${val}"`, () => {
          process.env[testVar] = val;
          expect(getBoolFromEnv(testVar)).toBe(false);
        });
      }
    });

    describe('with a default', () => {
      it('returns the value from the environment if set', () => {
        process.env[testVar] = 'true';
        expect(getBoolFromEnv(testVar)).toBe(true);
      });

      it('returns the default if the environment variable is not set', () => {
        expect(getBoolFromEnv(testVar, true)).toBe(true);
        expect(getBoolFromEnv(testVar, false)).toBe(false);
      });

      it('returns an Error if the environment variable is an invalid value', () => {
        process.env[testVar] = 'ASDF';
        expect(getBoolFromEnv(testVar)).toBeInstanceOf(Error);
      });
    });
  });
});
