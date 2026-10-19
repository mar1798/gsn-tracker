import { z } from 'zod';
import { isAscending } from '../settings/hr-zones.js';
import { isoDateTime } from './common.js';

export const UNITS = ['kg', 'lb'] as const;

const hrMax = z.number().int().min(100).max(250);
/** Upper bounds (bpm) of HR zones 1..5, ascending. */
const hrZones = z
  .array(z.number().int().min(40).max(250))
  .length(5)
  .refine(isAscending, 'Границы зон должны возрастать');
/** Overrides `user_profile.weight` from FIT for bodyweight exercises. */
const bodyWeightKg = z.number().min(20).max(400);

export const userSettingsSchema = z.object({
  units: z.enum(UNITS).default('kg'),
  hrMax: hrMax.nullable().default(null),
  hrZones: hrZones.nullable().default(null),
  bodyWeightKg: bodyWeightKg.nullable().default(null),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const userSettingsPatchSchema = z
  .object({
    units: z.enum(UNITS),
    hrMax: hrMax.nullable(),
    hrZones: hrZones.nullable(),
    bodyWeightKg: bodyWeightKg.nullable(),
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

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));

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
