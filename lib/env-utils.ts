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

/**
 * Read a `true` or `false` value from an environment variable, with an optional
 * default.
 */
export const getBoolFromEnv = (key: string, def?: boolean) => {
  const value = process.env[key];
  const error = new TypeError(`Invalid boolean for ${key}: "${value}`);

  if (value) {
    const uppercaseValue = value.toUpperCase();

    if (uppercaseValue === 'TRUE') return true;
    if (uppercaseValue === 'FALSE') return false;

    return error;
  }

  return def ?? error;
};
