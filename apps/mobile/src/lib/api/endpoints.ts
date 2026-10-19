import {
  authResponseSchema,
  importFitResponseSchema,
  userSchema,
  workoutDetailSchema,
  workoutListResponseSchema,
  type LoginRequest,
  type RegisterRequest,
} from '@gsc/shared';

import { api } from './index';

export const authApi = {
  login: (body: LoginRequest) =>
    api.request('/auth/login', { method: 'POST', body, schema: authResponseSchema, auth: false }),
  register: (body: RegisterRequest) =>
    api.request('/auth/register', {
      method: 'POST',
      body,
      schema: authResponseSchema,
      auth: false,
    }),
  logout: (refreshToken: string) =>
    api.request('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }),
};

export const meApi = {
  get: () => api.request('/me', { schema: userSchema }),
};

export const workoutsApi = {
  list: (cursor?: string) =>
    api.request('/workouts', { query: { cursor }, schema: workoutListResponseSchema }),
  get: (id: string) =>
    api.request(`/workouts/${encodeURIComponent(id)}`, { schema: workoutDetailSchema }),
};

export type FitFile = { uri: string; name: string; mimeType?: string | null };

export const importsApi = {
  fit: (file: FitFile) => {
    const form = new FormData();
    // React Native's FormData uploads a local file from a { uri, name, type } descriptor.
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? 'application/octet-stream',
    } as unknown as Blob);
    return api.request('/imports/fit', {
      method: 'POST',
      formData: form,
      schema: importFitResponseSchema,
    });
  },
};
