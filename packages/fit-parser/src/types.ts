/** Sets shorter than this are most likely a double press of the lap button. */
export const SUSPICIOUS_MIN_DURATION_SEC = 5;

/** HR keeps rising after a set ends, so `hrPeak` looks this far past the set end. */
export { HR_PEAK_WINDOW_AFTER_SEC } from '@gsc/shared';

export type SetSuspicion = 'too_short';

/** One exercise guess from the watch. Never applied automatically, only suggested. */
export interface GarminExerciseHint {
  /** FIT `exercise_category` name, e.g. `lateralRaise`. */
  category: string;
  /** FIT `category_subtype` (index into `<category>ExerciseName`), if the watch gave one. */
  subtype: number | null;
  /** FIT profile exercise name for the subtype, e.g. `seatedRearLateralRaise`. */
  exerciseName: string | null;
  /** English label from the profile name, e.g. `Seated rear lateral raise`. */
  label: string;
}

export interface HrSample {
  ts: Date;
  bpm: number;
}

export interface HrStats {
  avg: number | null;
  max: number | null;
  min: number | null;
}

export interface ParsedSet extends HrStats {
  /** 1-based position among active sets. */
  setIndex: number;
  /** FIT `message_index` of the set message. */
  messageIndex: number | null;
  startedAt: Date;
  durationSec: number | null;
  /** Sum of the rest messages between this set and the next active one. */
  restAfterSec: number | null;
  /** Template value from the watch, not a real count: pre-fill only. */
  repsGarmin: number | null;
  /** The watch does not know the weight; `0` becomes `null`. */
  weightGarminKg: number | null;
  /** Ordered by watch priority, `unknown` filtered out. */
  garminHints: GarminExerciseHint[];
  /** Max HR in `[start, end + HR_PEAK_WINDOW_AFTER_SEC]`. Main HR metric of a set. */
  hrPeak: number | null;
  caloriesEst: number | null;
  /** Session calories split by `duration × avg HR`, always an estimate. */
  caloriesEstimated: true;
  suspicious: SetSuspicion | null;
}

export interface HrZones {
  calcType: string | null;
  /** `hr_zone_high_boundary` as given by the watch (bpm). */
  highBoundaries: number[];
  /** `time_in_hr_zone` as given by the watch (seconds per zone, zone 0 first). */
  secondsInZone: number[];
}

export interface ParsedDevice {
  manufacturer: string | null;
  /** `garmin_product` name (e.g. `epixGen2Pro47`), or the numeric product id as a string. */
  model: string | null;
  serialNumber: number | null;
}

export interface ParsedWorkout {
  sport: string;
  subSport: string;
  /** UTC. */
  startedAt: Date;
  /** Local time = UTC + this offset (`device_settings.time_offset`). */
  utcOffsetSec: number | null;
  elapsedSec: number | null;
  timerSec: number | null;
  /** Time under load (`session.active_time`). */
  activeSec: number | null;
  calories: number | null;
  avgHr: number | null;
  maxHr: number | null;
  totalRepsGarmin: number | null;
  /** Not present in the FIT file itself; filled by the source (e.g. the Garmin API) if known. */
  garminActivityId: string | null;
  device: ParsedDevice;
  /** `user_profile.weight`: default body weight for bodyweight exercises. */
  bodyWeightKg: number | null;
  heightM: number | null;
  hrZones: HrZones | null;
  sets: ParsedSet[];
  hrSamples: HrSample[];
}
