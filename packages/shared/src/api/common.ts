import { z } from 'zod';

export const isoDateTime = z.iso.datetime({ offset: true });

/** Body of every 4xx/5xx response. `message` is user-facing (Russian). */
export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const idParamsSchema = z.object({ id: z.uuid() });
