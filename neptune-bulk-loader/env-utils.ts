import { isBoolean, toUpper } from 'lodash';

export const getBoolFromEnv = (key: string, def?: boolean) => {
  const value = process.env[key];

  if (value) {
    const uppercaseValue = toUpper(value);

    if (uppercaseValue === 'TRUE') return true;
    if (uppercaseValue === 'FALSE') return false;

    throw new TypeError(`Invalid boolean for ${key}: "${value}`);
  }

  if (isBoolean(def)) return def;

  throw new TypeError(`Invalid boolean for ${key}: "${value}`);
};

export const getStringFromEnv = (key: string): string => {
  const value = process.env[key];

  if (value) return value;

  throw new Error(`${key} not set`);
};

export const getListFromEnv = (key: string): string[] =>
  getStringFromEnv(key).split(',');
