import type { Period } from '@gsc/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { analyticsApi } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query-client';

// Analytics come from the server only (not cached in SQLite): they span many workouts.
// The workout summary is computed on the device instead, so it works offline.

export const useOverview = (period: Period) =>
  useQuery({
    queryKey: queryKeys.overview(period.from, period.to),
    queryFn: () => analyticsApi.overview(period),
    // Switching the period keeps the old numbers on screen until the new ones arrive.
    placeholderData: keepPreviousData,
  });

export const useMuscleAnalytics = (period: Period) =>
  useQuery({
    queryKey: queryKeys.muscles(period.from, period.to),
    queryFn: () => analyticsApi.muscles(period),
    placeholderData: keepPreviousData,
  });

export const useExerciseProgress = (id: string, period: Period) =>
  useQuery({
    queryKey: queryKeys.exerciseProgress(id, period.from, period.to),
    queryFn: () => analyticsApi.exercise(id, period),
    placeholderData: keepPreviousData,
  });

/** Bests per exercise; `before` = only workouts started earlier (a workout's new records). */
export const useRecords = (before: string | null = null, enabled = true) =>
  useQuery({
    queryKey: queryKeys.records(before),
    queryFn: () => analyticsApi.records(before ?? undefined),
    enabled,
  });
