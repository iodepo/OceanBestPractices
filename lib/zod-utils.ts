import { z } from 'zod';

export const zodTypeGuard = <T>(schema: z.ZodSchema<T>) =>
  (x: unknown): x is T => schema.safeParse(x).success;
