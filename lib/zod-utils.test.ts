import { z } from 'zod';
import { zodTypeGuard } from './zod-utils';

describe('zodUtils', () => {
  describe('zodTypeGuard()', () => {
    it('returns true for a value that matches the schema', () => {
      const isString = zodTypeGuard(z.string());

      expect(isString('asdf')).toBe(true);
    });

    it('returns false for a value that does not match the schema', () => {
      const isString = zodTypeGuard(z.string());

      expect(isString(5)).toBe(false);
    });
  });
});
