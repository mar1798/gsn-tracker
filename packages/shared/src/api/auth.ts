import { z } from 'zod';
import { isoDateTime } from './common.js';

export const UNITS = ['kg', 'lb'] as const;

export const userSettingsSchema = z.object({
  units: z.enum(UNITS).default('kg'),
  hrMax: z.number().int().min(100).max(250).nullable().default(null),
  /** Upper bounds (bpm) of HR zones 1..5, ascending. */
  hrZones: z.array(z.number().int().min(40).max(250)).length(5).nullable().default(null),
  /** Overrides `user_profile.weight` from FIT for bodyweight exercises. */
  bodyWeightKg: z.number().min(20).max(400).nullable().default(null),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const userSettingsPatchSchema = z
  .object({
    units: z.enum(UNITS),
    hrMax: z.number().int().min(100).max(250).nullable(),
    hrZones: z.array(z.number().int().min(40).max(250)).length(5).nullable(),
    bodyWeightKg: z.number().min(20).max(400).nullable(),
  })
  .partial()
  .strict();
export type UserSettingsPatch = z.infer<typeof userSettingsPatchSchema>;

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email().nullable(),
  name: z.string().nullable(),
  settings: userSettingsSchema,
  createdAt: isoDateTime,
});
export type User = z.infer<typeof userSchema>;

const email = z
  .email()
  .max(254)
  .transform((v) => v.trim().toLowerCase());

export const registerRequestSchema = z.object({
  email,
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(100).optional(),
});
export type RegisterRequest = z.input<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});
export type LoginRequest = z.input<typeof loginRequestSchema>;

export const refreshRequestSchema = z.object({ refreshToken: z.string().min(1) });
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const appleAuthRequestSchema = z.object({
  /** `identityToken` from Sign in with Apple on the device. */
  identityToken: z.string().min(1),
  /** Apple sends the name to the app only on the first sign-in. */
  name: z.string().trim().min(1).max(100).optional(),
});
export type AppleAuthRequest = z.infer<typeof appleAuthRequestSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  /** Seconds until the access token expires. */
  accessExpiresIn: z.number().int(),
  /** Single use: every refresh returns a new one. */
  refreshToken: z.string(),
  user: userSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
