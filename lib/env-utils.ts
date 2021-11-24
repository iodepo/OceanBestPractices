/**
 * Get a value from an environment variable
 */
export function getStringFromEnv(
  key: string,
   allowMissing: false
): string;
export function getStringFromEnv(
  key: string,
   allowMissing: true
): string | undefined;
export function getStringFromEnv(
  key: string
): string;
export function getStringFromEnv(
  key: string,
  allowMissing = false
): string | undefined {
  const value = process.env[key];

  if (value || allowMissing) return value;

  throw new Error(`${key} not set`);
}

/**
 * Get a comma-delimited list from an environmet variable
 */
export const getListFromEnv = (key: string): string[] => {
  const value = getStringFromEnv(key);

  return value.split(',');
};

/**
 * Read a `true` or `false` value from an environment variable, with an optional
 * default.
 */
export const getBoolFromEnv = (key: string, def?: boolean): boolean => {
  let value: string;
  try {
    value = getStringFromEnv(key);
  } catch (error) {
    if (def !== undefined) return def;
    throw error;
  }

  const uppercaseValue = value.toUpperCase();

  if (uppercaseValue === 'TRUE') return true;
  if (uppercaseValue === 'FALSE') return false;

  throw new TypeError(`Invalid boolean for ${key}: "${value}`);
};
