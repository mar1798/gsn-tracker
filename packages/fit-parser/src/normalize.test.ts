import type { FitMessages } from '@garmin/fitsdk';
import { describe, expect, it } from 'vitest';
import { normalizeWorkout } from './normalize.js';

const T0 = Date.parse('2026-10-17T03:00:00Z');
const at = (sec: number) => new Date(T0 + sec * 1000);

const session = {
  sport: 'training',
  subSport: 'strengthTraining',
  startTime: at(0),
  totalTimerTime: 300,
  activeTime: 60,
  totalCalories: 100,
  avgHeartRate: 120,
  maxHeartRate: 150,
};

function messages(overrides: Partial<FitMessages> = {}): FitMessages {
  return { sessionMesgs: [session], ...overrides } as FitMessages;
}

const active = (start: number, duration: number, extra: object = {}) => ({
  setType: 'active',
  startTime: at(start),
  duration,
  repetitions: 10,
  weight: 0,
  ...extra,
});
const rest = (start: number, duration: number) => ({
  setType: 'rest',
  startTime: at(start),
  duration,
});

describe('normalizeWorkout', () => {
  it('rejects a file without a session', () => {
    expect(() => normalizeWorkout({} as FitMessages)).toThrow(
      expect.objectContaining({ code: 'no_session' }),
    );
  });

  it('rejects a session without a start time', () => {
    const noStart = { ...session, startTime: undefined };
    expect(() => normalizeWorkout({ sessionMesgs: [noStart] } as FitMessages)).toThrow(
      expect.objectContaining({ code: 'no_session' }),
    );
  });

  it('rejects a non-strength workout with a clear error', () => {
    const run = { ...session, sport: 'running', subSport: 'generic' };
    expect(() => normalizeWorkout({ sessionMesgs: [run] } as FitMessages)).toThrow(
      expect.objectContaining({
        code: 'not_strength',
        message: 'Not a strength workout: running/generic',
      }),
    );
  });

  it('handles a workout without set messages', () => {
    const workout = normalizeWorkout(messages());
    expect(workout.sets).toEqual([]);
    expect(workout.hrSamples).toEqual([]);
    expect(workout.hrZones).toBeNull();
    expect(workout.device).toEqual({ manufacturer: null, model: null, serialNumber: null });
  });

  it('handles a rest-only workout', () => {
    const workout = normalizeWorkout(messages({ setMesgs: [rest(0, 60)] } as Partial<FitMessages>));
    expect(workout.sets).toEqual([]);
  });

  it('handles a workout without heart rate', () => {
    const workout = normalizeWorkout(
      messages({ setMesgs: [active(0, 30), rest(30, 60)] } as Partial<FitMessages>),
    );
    expect(workout.sets[0]).toMatchObject({ avg: null, max: null, min: null, hrPeak: null });
    // Without per-set HR, calories fall back to the session average HR → split by duration.
    expect(workout.sets[0]!.caloriesEst).toBeCloseTo(33.3, 1);
  });

  it('computes HR stats inside the set and the peak in the 30 s after it', () => {
    const recordMesgs = [
      { timestamp: at(0), heartRate: 100 },
      { timestamp: at(10), heartRate: 120 },
      { timestamp: at(20), heartRate: 110 },
      { timestamp: at(45), heartRate: 160 }, // after the set, inside the peak window
      { timestamp: at(60), heartRate: 170 }, // outside the peak window (20 + 30 = 50)
    ];
    const workout = normalizeWorkout(
      messages({ setMesgs: [active(0, 20), rest(20, 100)], recordMesgs } as Partial<FitMessages>),
    );
    expect(workout.sets[0]).toMatchObject({ avg: 110, max: 120, min: 100, hrPeak: 160 });
    expect(workout.hrSamples).toHaveLength(5);
  });

  it('skips records with missing or zero heart rate', () => {
    const recordMesgs = [
      { timestamp: at(0), heartRate: 0 },
      { timestamp: at(1) },
      { timestamp: at(2), heartRate: 90 },
    ];
    const workout = normalizeWorkout(messages({ recordMesgs } as Partial<FitMessages>));
    expect(workout.hrSamples).toEqual([{ ts: at(2), bpm: 90 }]);
  });

  it('sorts sets by start time and sums consecutive rests', () => {
    const setMesgs = [active(100, 30), rest(40, 20), rest(60, 40), active(0, 40)];
    const workout = normalizeWorkout(messages({ setMesgs } as Partial<FitMessages>));
    expect(workout.sets.map((s) => [s.setIndex, s.startedAt, s.restAfterSec])).toEqual([
      [1, at(0), 60],
      [2, at(100), null],
    ]);
  });

  it('leaves rest null between back-to-back active sets', () => {
    const workout = normalizeWorkout(
      messages({ setMesgs: [active(0, 30), active(30, 30)] } as Partial<FitMessages>),
    );
    expect(workout.sets[0]!.restAfterSec).toBeNull();
  });

  it('skips set messages without a start time', () => {
    const setMesgs = [{ setType: 'active', duration: 30 }, active(0, 30)];
    const workout = normalizeWorkout(messages({ setMesgs } as Partial<FitMessages>));
    expect(workout.sets).toHaveLength(1);
  });

  it('keeps a set without duration but cannot compute its HR or flag it', () => {
    const setMesgs = [{ setType: 'active', startTime: at(0) }];
    const recordMesgs = [{ timestamp: at(0), heartRate: 100 }];
    const workout = normalizeWorkout(messages({ setMesgs, recordMesgs } as Partial<FitMessages>));
    expect(workout.sets[0]).toMatchObject({
      durationSec: null,
      avg: null,
      hrPeak: null,
      caloriesEst: null,
      suspicious: null,
      repsGarmin: null,
      weightGarminKg: null,
      garminHints: [],
    });
  });

  it('flags sets shorter than 5 s as suspicious', () => {
    const setMesgs = [active(0, 4.9), active(10, 5)];
    const workout = normalizeWorkout(messages({ setMesgs } as Partial<FitMessages>));
    expect(workout.sets.map((s) => s.suspicious)).toEqual(['too_short', null]);
  });

  it('keeps a real weight from the watch', () => {
    const workout = normalizeWorkout(
      messages({ setMesgs: [active(0, 30, { weight: 62.5 })] } as Partial<FitMessages>),
    );
    expect(workout.sets[0]!.weightGarminKg).toBe(62.5);
  });

  it('leaves calories null when the session has no total', () => {
    const noCalories = { ...session, totalCalories: undefined };
    const workout = normalizeWorkout({
      sessionMesgs: [noCalories],
      setMesgs: [active(0, 30)],
    } as FitMessages);
    expect(workout.calories).toBeNull();
    expect(workout.sets[0]!.caloriesEst).toBeNull();
  });

  it('takes the UTC offset from device settings', () => {
    const workout = normalizeWorkout(
      messages({ deviceSettingsMesgs: [{ timeOffset: [21600] }] } as Partial<FitMessages>),
    );
    expect(workout.utcOffsetSec).toBe(21600);
  });

  it('derives the UTC offset from the activity local timestamp as a fallback', () => {
    const utcSec = T0 / 1000;
    const activityMesgs = [{ timestamp: at(0), localTimestamp: utcSec - 631065600 - 3 * 3600 }];
    const workout = normalizeWorkout(messages({ activityMesgs } as Partial<FitMessages>));
    expect(workout.utcOffsetSec).toBe(-3 * 3600);
  });

  it('has no UTC offset when the file does not tell', () => {
    expect(normalizeWorkout(messages()).utcOffsetSec).toBeNull();
  });

  it('accepts raw FIT-epoch timestamps', () => {
    const fitEpochSec = T0 / 1000 - 631065600;
    const workout = normalizeWorkout({
      sessionMesgs: [{ ...session, startTime: fitEpochSec }],
    } as FitMessages);
    expect(workout.startedAt).toEqual(at(0));
  });

  it('falls back to the creator device info for the model', () => {
    const deviceInfoMesgs = [
      { deviceIndex: 1, garminProduct: 'hrm' },
      { deviceIndex: 'creator', manufacturer: 'garmin', product: 4313, serialNumber: 42 },
    ];
    const workout = normalizeWorkout(messages({ deviceInfoMesgs } as Partial<FitMessages>));
    expect(workout.device).toEqual({ manufacturer: 'garmin', model: '4313', serialNumber: 42 });
  });

  it('treats zero body weight and height as unknown', () => {
    const workout = normalizeWorkout(
      messages({ userProfileMesgs: [{ weight: 0, height: 0 }] } as Partial<FitMessages>),
    );
    expect(workout).toMatchObject({ bodyWeightKg: null, heightM: null });
  });

  it('uses only the session time-in-zone message', () => {
    const timeInZoneMesgs = [
      { referenceMesg: 'set', timeInHrZone: [1], hrZoneHighBoundary: [100] },
      {
        referenceMesg: 'session',
        timeInHrZone: [5, 6],
        hrZoneHighBoundary: [100],
        hrCalcType: 'percentMaxHr',
      },
    ];
    const workout = normalizeWorkout(messages({ timeInZoneMesgs } as Partial<FitMessages>));
    expect(workout.hrZones).toEqual({
      calcType: 'percentMaxHr',
      highBoundaries: [100],
      secondsInZone: [5, 6],
    });
  });
});
