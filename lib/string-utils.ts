import cryptoRandomString from 'crypto-random-string';

export const randomId = (prefix?: string): string => {
  const randomString = cryptoRandomString({ length: 6 });

  return prefix ? `${prefix}-${randomString}` : randomString;
};
