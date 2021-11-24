import { getBoolFromEnv, getListFromEnv, getStringFromEnv } from './env-utils';

const testVar = 'TEST_VAR';

describe('env-utils', () => {
  beforeEach(() => {
    delete process.env[testVar];
  });

  describe('getStringFromEnv', () => {
    describe('without allowMissing set', () => {
      it('throws an Error if the environment variable is not set', () => {
        expect(() => getStringFromEnv(testVar)).toThrow(Error);
      });

      it('throws an Error if the environment variable is an empty string', () => {
        process.env[testVar] = '';
        expect(() => getStringFromEnv(testVar)).toThrow(Error);
      });

      it('returns the value if the environment variable is set', () => {
        process.env[testVar] = 'asdf';
        expect(getStringFromEnv(testVar)).toBe('asdf');
      });
    });

    describe('with allowMissing set to false', () => {
      it('returns the value if the environment variable is set', () => {
        process.env[testVar] = 'asdf';
        expect(getStringFromEnv(testVar, false)).toBe('asdf');
      });

      it('throws an Error if the environment variable is not set', () => {
        expect(() => getStringFromEnv(testVar, false)).toThrow(Error);
      });

      it('throws an Error if the environment variable is an empty string', () => {
        process.env[testVar] = '';
        expect(() => getStringFromEnv(testVar, false)).toThrow(Error);
      });
    });

    describe('with allowMissing set to true', () => {
      it('returns the value if the environment variable is set', () => {
        process.env[testVar] = 'asdf';
        expect(getStringFromEnv(testVar, true)).toBe('asdf');
      });

      it('returns undefined if the environment variable is not set', () => {
        expect(getStringFromEnv(testVar, true)).toBe(undefined);
      });

      it('returns the value if the environment variable is an empty string', () => {
        process.env[testVar] = '';
        expect(getStringFromEnv(testVar, true)).toBe('');
      });
    });
  });

  describe('getListFromEnv', () => {
    it('throws an Error if the environment variable is not set', () => {
      expect(() => getListFromEnv(testVar)).toThrow(Error);
    });

    it('throws an Error if the environment variable is an empty string', () => {
      process.env[testVar] = '';
      expect(() => getListFromEnv(testVar)).toThrow(Error);
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
      it('throws an Error if the environment variable is not set', () => {
        expect(() => getBoolFromEnv(testVar)).toThrow(Error);
      });

      it('throws an Error if the environment variable is an empty string', () => {
        process.env[testVar] = '';
        expect(() => getBoolFromEnv(testVar)).toThrow(Error);
      });

      it('throws an Error if the environment variable is an invalid value', () => {
        process.env[testVar] = 'ASDF';
        expect(() => getBoolFromEnv(testVar)).toThrow(Error);
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

      it('throws an Error if the environment variable is an invalid value', () => {
        process.env[testVar] = 'ASDF';
        expect(() => getBoolFromEnv(testVar)).toThrow(Error);
      });
    });
  });
});
