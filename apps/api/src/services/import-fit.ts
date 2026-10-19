import { createHash } from 'node:crypto';
import { parseFit } from '@gsc/fit-parser';
import type { WorkoutSource } from '@gsc/shared';
import { and, eq, or, type SQL } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { garminSets, workoutHr, workouts } from '../db/schema.js';
import type { FileStorage } from '../storage.js';
import { isUniqueViolation } from './pg-errors.js';

export class DuplicateImportError extends Error {
  constructor(readonly workoutId: string) {
    super('Workout already imported');
  }
}

export interface ImportFitInput {
  userId: string;
  source: WorkoutSource;
  bytes: Uint8Array;
  /** Known to API-based sources (phase 8); a FIT file alone does not carry it. */
  garminActivityId?: string | null;
}

/**
 * The shared pipeline of every Garmin source: dedupe → parse → store the original → save.
 * Throws `DuplicateImportError` or `FitParseError`.
 */
export async function importFit(
  { db, storage }: { db: Db; storage: FileStorage },
  input: ImportFitInput,
): Promise<{ workoutId: string }> {
  const fileHash = createHash('sha256').update(input.bytes).digest('hex');
  const garminActivityId = input.garminActivityId ?? null;

  const findDuplicate = async () => {
    const matches: SQL[] = [eq(workouts.fileHash, fileHash)];
    if (garminActivityId) matches.push(eq(workouts.garminActivityId, garminActivityId));
    const [row] = await db
      .select({ id: workouts.id })
      .from(workouts)
      .where(and(eq(workouts.userId, input.userId), or(...matches)));
    return row?.id ?? null;
  };

  const existing = await findDuplicate();
  if (existing) throw new DuplicateImportError(existing);

  const parsed = parseFit(input.bytes);

  // Deterministic key: a retry after a failed insert overwrites the same object.
  const fitObjectKey = `fit/${input.userId}/${fileHash}.fit`;
  await storage.put(fitObjectKey, input.bytes, 'application/vnd.ant.fit');

  try {
    return await db.transaction(async (tx) => {
      const [workout] = await tx
        .insert(workouts)
        .values({
          userId: input.userId,
          source: input.source,
          garminActivityId: garminActivityId ?? parsed.garminActivityId,
          fileHash,
          fitObjectKey,
          startedAt: parsed.startedAt,
          utcOffsetSec: parsed.utcOffsetSec,
          durationSec: parsed.elapsedSec,
          timerSec: parsed.timerSec,
          activeSec: parsed.activeSec,
          calories: parsed.calories,
          avgHr: parsed.avgHr,
          maxHr: parsed.maxHr,
          totalRepsGarmin: parsed.totalRepsGarmin,
          deviceModel: parsed.device.model,
          deviceSerial: parsed.device.serialNumber?.toString() ?? null,
          bodyWeightKg: parsed.bodyWeightKg,
          hrZones: parsed.hrZones,
        })
        .returning({ id: workouts.id });
      const workoutId = workout!.id;

      if (parsed.sets.length > 0) {
        await tx.insert(garminSets).values(
          parsed.sets.map((s) => ({
            workoutId,
            setIndex: s.setIndex,
            messageIndex: s.messageIndex,
            startedAt: s.startedAt,
            durationSec: s.durationSec,
            restAfterSec: s.restAfterSec,
            repsGarmin: s.repsGarmin,
            weightGarminKg: s.weightGarminKg,
            garminHints: s.garminHints,
            avgHr: s.avg,
            maxHr: s.max,
            minHr: s.min,
            hrPeak: s.hrPeak,
            caloriesEst: s.caloriesEst,
            suspicious: s.suspicious,
          })),
        );
      }

      const startMs = parsed.startedAt.getTime();
      await tx.insert(workoutHr).values({
        workoutId,
        offsetsSec: parsed.hrSamples.map((s) => Math.round((s.ts.getTime() - startMs) / 1000)),
        bpm: parsed.hrSamples.map((s) => s.bpm),
      });

      return { workoutId };
    });
  } catch (err) {
    // A concurrent upload of the same file won the race.
    if (isUniqueViolation(err)) {
      const winner = await findDuplicate();
      if (winner) throw new DuplicateImportError(winner);
    }
    throw err;
  }
}
