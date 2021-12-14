import type { ZodTypeAny } from 'zod';

declare global {
  declare namespace jest {
    interface Matchers<R> {
      toMatchZodSchema<T extends ZodTypeAny>(schema: T): R
    }
  }
}

export {};
