import {
  authResponseSchema,
  exerciseListResponseSchema,
  importFitResponseSchema,
  manualSetSchema,
  userSchema,
  workoutDetailSchema,
  workoutHrResponseSchema,
  workoutListResponseSchema,
  workoutSetSchema,
  type AnnotationInput,
  type BulkAnnotationRequest,
  type LoginRequest,
  type ManualSetInput,
  type ManualSetPatch,
  type RegisterRequest,
} from '@gsc/shared';
import { z } from 'zod';

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
  hr: (id: string) =>
    api.request(`/workouts/${encodeURIComponent(id)}/hr`, { schema: workoutHrResponseSchema }),
};

export const exercisesApi = {
  list: () => api.request('/exercises', { schema: exerciseListResponseSchema }),
};

const bulkAnnotationResponseSchema = z.object({ items: z.array(workoutSetSchema) });

export const setsApi = {
  putAnnotation: (setId: string, body: AnnotationInput) =>
    api.request(`/sets/${encodeURIComponent(setId)}/annotation`, {
      method: 'PUT',
      body,
      schema: workoutSetSchema,
    }),
  bulkAnnotate: (body: BulkAnnotationRequest) =>
    api.request('/sets/annotations/bulk', {
      method: 'POST',
      body,
      schema: bulkAnnotationResponseSchema,
    }),
  createManual: (workoutId: string, body: ManualSetInput) =>
    api.request(`/workouts/${encodeURIComponent(workoutId)}/manual-sets`, {
      method: 'POST',
      body,
      schema: manualSetSchema,
    }),
  updateManual: (id: string, body: ManualSetPatch) =>
    api.request(`/manual-sets/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
      schema: manualSetSchema,
    }),
  deleteManual: (id: string) =>
    api.request(`/manual-sets/${encodeURIComponent(id)}`, { method: 'DELETE' }),
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
