import type { FitMessages, SetMesg } from '@garmin/fitsdk';
import { FitParseError } from './errors.js';
import { distributeCalories, hrStatsInWindow } from './heart-rate.js';
import { toExerciseHints } from './hints.js';
import {
  HR_PEAK_WINDOW_AFTER_SEC,
  SUSPICIOUS_MIN_DURATION_SEC,
  type HrSample,
  type HrZones,
  type ParsedSet,
  type ParsedWorkout,
} from './types.js';

const STRENGTH_SPORT = 'training';
const STRENGTH_SUB_SPORT = 'strengthTraining';

/** Seconds between the Unix epoch and the FIT epoch (1989-12-31T00:00:00Z). */
const FIT_EPOCH_OFFSET_SEC = 631065600;

/** Decoded FIT messages → domain workout. Pure; throws `FitParseError` for unusable input. */
export function normalizeWorkout(messages: FitMessages): ParsedWorkout {
  // TODO: multi-session files (e.g. multisport) are not expected for strength; first session wins.
  const session = messages.sessionMesgs?.[0];
  if (!session) throw new FitParseError('no_session', 'FIT file has no session message');

  const sport = String(session.sport ?? '');
  const subSport = String(session.subSport ?? '');
  if (sport !== STRENGTH_SPORT || subSport !== STRENGTH_SUB_SPORT) {
    throw new FitParseError('not_strength', `Not a strength workout: ${sport}/${subSport}`);
  }

  const startedAt = toDate(session.startTime);
  if (!startedAt) throw new FitParseError('no_session', 'Session has no start time');

  const hrSamples = toHrSamples(messages);
  const avgHr = num(session.avgHeartRate);
  const fileId = messages.fileIdMesgs?.[0];
  const creator = messages.deviceInfoMesgs?.find((d) => d.deviceIndex === 'creator');
  const userProfile = messages.userProfileMesgs?.[0];

  return {
    sport,
    subSport,
    startedAt,
    utcOffsetSec: utcOffsetSec(messages),
    elapsedSec: num(session.totalElapsedTime),
    timerSec: num(session.totalTimerTime),
    activeSec: num(session.activeTime),
    calories: num(session.totalCalories),
    avgHr,
    maxHr: num(session.maxHeartRate),
    totalRepsGarmin: num(session.totalReps),
    // TODO: the activity id is not in the FIT file; the Garmin API adapter (phase 8) provides it.
    garminActivityId: null,
    device: {
      manufacturer: str(fileId?.manufacturer ?? creator?.manufacturer),
      model: str(
        fileId?.garminProduct ?? creator?.garminProduct ?? fileId?.product ?? creator?.product,
      ),
      serialNumber: num(fileId?.serialNumber ?? creator?.serialNumber),
    },
    bodyWeightKg: positive(userProfile?.weight),
    heightM: positive(userProfile?.height),
    hrZones: sessionHrZones(messages),
    sets: toSets(messages.setMesgs ?? [], hrSamples, num(session.totalCalories), avgHr),
    hrSamples,
  };
}

function toSets(
  setMesgs: readonly SetMesg[],
  hrSamples: readonly HrSample[],
  totalCalories: number | null,
  sessionAvgHr: number | null,
): ParsedSet[] {
  const segments = setMesgs
    .map((mesg) => ({ mesg, startedAt: toDate(mesg.startTime), durationSec: num(mesg.duration) }))
    .filter((s): s is typeof s & { startedAt: Date } => s.startedAt !== null)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
    .map((s) => {
      const fromMs = s.startedAt.getTime();
      const toMs = fromMs + (s.durationSec ?? 0) * 1000;
      const stats =
        s.durationSec === null
          ? { avg: null, max: null, min: null }
          : hrStatsInWindow(hrSamples, fromMs, toMs);
      return { ...s, isActive: s.mesg.setType === 'active', stats, toMs };
    });

  // Rest burns calories too, so the session total is split over rest segments as well.
  const calories = distributeCalories(
    totalCalories,
    segments.map((s) => ({ durationSec: s.durationSec, avgHr: s.stats.avg })),
    sessionAvgHr,
  );

  const sets: ParsedSet[] = [];
  segments.forEach((s, i) => {
    if (!s.isActive) return;
    const peak =
      s.durationSec === null
        ? null
        : hrStatsInWindow(
            hrSamples,
            s.startedAt.getTime(),
            s.toMs + HR_PEAK_WINDOW_AFTER_SEC * 1000,
          ).max;
    sets.push({
      setIndex: sets.length + 1,
      messageIndex: num(s.mesg.messageIndex),
      startedAt: s.startedAt,
      durationSec: s.durationSec,
      restAfterSec: restAfter(segments, i),
      repsGarmin: num(s.mesg.repetitions),
      weightGarminKg: positive(s.mesg.weight),
      garminHints: toExerciseHints(s.mesg.category, s.mesg.categorySubtype),
      ...s.stats,
      hrPeak: peak,
      caloriesEst: calories[i] ?? null,
      caloriesEstimated: true,
      suspicious:
        s.durationSec !== null && s.durationSec < SUSPICIOUS_MIN_DURATION_SEC ? 'too_short' : null,
    });
  });
  return sets;
}

/** Sum of rest segments right after `index`, up to the next active set; `null` if none. */
function restAfter(
  segments: readonly { isActive: boolean; durationSec: number | null }[],
  index: number,
): number | null {
  let rest: number | null = null;
  for (const s of segments.slice(index + 1)) {
    if (s.isActive) break;
    rest = (rest ?? 0) + (s.durationSec ?? 0);
  }
  return rest === null ? null : Math.round(rest * 1000) / 1000;
}

function toHrSamples(messages: FitMessages): HrSample[] {
  const samples: HrSample[] = [];
  for (const record of messages.recordMesgs ?? []) {
    const ts = toDate(record.timestamp);
    const bpm = positive(record.heartRate);
    if (ts && bpm !== null) samples.push({ ts, bpm });
  }
  return samples.sort((a, b) => a.ts.getTime() - b.ts.getTime());
}

function sessionHrZones(messages: FitMessages): HrZones | null {
  const zone = messages.timeInZoneMesgs?.find((m) => m.referenceMesg === 'session');
  if (!zone?.timeInHrZone || !zone.hrZoneHighBoundary) return null;
  return {
    calcType: str(zone.hrCalcType),
    highBoundaries: [...zone.hrZoneHighBoundary],
    secondsInZone: [...zone.timeInHrZone],
  };
}

/** `device_settings.time_offset`, else derived from `activity.local_timestamp - timestamp`. */
function utcOffsetSec(messages: FitMessages): number | null {
  const offset = messages.deviceSettingsMesgs?.[0]?.timeOffset?.[0];
  if (typeof offset === 'number') return offset;

  const activity = messages.activityMesgs?.[0];
  const utc = toDate(activity?.timestamp);
  const local = activity?.localTimestamp;
  if (!utc || typeof local !== 'number') return null;
  return local + FIT_EPOCH_OFFSET_SEC - utc.getTime() / 1000;
}

/** Dates come as `Date` with `convertDateTimesToDates`; raw numbers are FIT-epoch seconds. */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date((value + FIT_EPOCH_OFFSET_SEC) * 1000);
  return null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Garmin writes `0` for "unknown" in weight, HR, body metrics. */
function positive(value: unknown): number | null {
  const n = num(value);
  return n !== null && n > 0 ? n : null;
}

function str(value: unknown): string | null {
  if (typeof value === 'string' && value !== '') return value;
  if (typeof value === 'number') return String(value);
  return null;
}
