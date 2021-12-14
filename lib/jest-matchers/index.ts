import type { ZodTypeAny } from 'zod';

export const toMatchZodSchema = <T extends ZodTypeAny>(
  val: unknown,
  schema: T
) => {
  const result = schema.safeParse(val);

  if (result.success) {
    return {
      pass: true,
      message: () => 'Value matched schema, but it should not have',
    };
  }

  return {
    pass: false,
    message: () => `Value did not match schema: ${result.error.toString()}`,
  };
};
