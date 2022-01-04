export const s3EventFactory = (bucket: string, key: string) => ({
  Records: [
    {
      s3: {
        bucket: {
          name: bucket,
        },
        object: {
          key,
        },
      },
    },
  ],
});
