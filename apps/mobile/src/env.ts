import { parseEnv } from '@gsc/shared';
import { z } from 'zod';

// Expo inlines EXPO_PUBLIC_* at build time only for literal `process.env.NAME` accesses,
// so the source object is spelled out instead of passing `process.env`.
export const env = parseEnv(
  z.object({
    EXPO_PUBLIC_API_URL: z.url(),
  }),
  {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  },
);
