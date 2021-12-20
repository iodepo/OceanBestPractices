import { z } from 'zod';

const snsEventSchema = z.object({
  Records: z.array(
    z.object({
      Sns: z.object({
        Message: z.string().uuid(),
      }),
    })
  ).nonempty(),
});

export const handler = async (event: unknown) => {
  const snsEvent = snsEventSchema.parse(event);
  const uuid = snsEvent.Records[0].Sns.Message;
};
