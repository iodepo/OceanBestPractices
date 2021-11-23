/**
 * Get a value from an environment variable, returning an Error if it is not set
 */
export const getStringFromEnv = (key: string): string | Error =>
  process.env[key] || new Error(`${key} not set`);

/**
 * Get a comma-delimited list from an environmet variable
 */
export const getListFromEnv = (key: string): string[] | Error => {
  const value = getStringFromEnv(key);

  if (value instanceof Error) return value;

  return value.split(',');
};
