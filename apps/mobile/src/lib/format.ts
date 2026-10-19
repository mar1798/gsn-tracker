// Display formatting (Russian UI). Timestamps are stored in UTC and shown in the device time zone.

const DASH = '—';

/** 4296 → "1:11:36", 2712 → "45:12". */
export function formatDuration(totalSec: number | null | undefined): string {
  if (totalSec == null || !Number.isFinite(totalSec) || totalSec < 0) return DASH;
  const sec = Math.round(totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mmss = `${String(m).padStart(h > 0 ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

/** "Пт, 17 окт · 18:05"; the year is added when it is not the current one. */
export function formatWorkoutDate(
  iso: string,
  { now = new Date(), timeZone }: { now?: Date; timeZone?: string } = {},
): string {
  const date = new Date(iso);
  const yearOf = (d: Date) =>
    new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone }).format(d);
  const sameYear = yearOf(date) === yearOf(now);

  const parts = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value.replace('.', '') ?? '';

  const weekday = part('weekday');
  const day = [part('day'), part('month'), sameYear ? '' : part('year')].filter(Boolean).join(' ');
  const time = `${part('hour')}:${part('minute')}`;
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${day} · ${time}`;
}

export function formatNumber(value: number | null | undefined, unit?: string): string {
  if (value == null || !Number.isFinite(value)) return DASH;
  const text = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value);
  return unit ? `${text} ${unit}` : text;
}

/** "60 кг × 12", "60 кг", "12 повт."; `null` when there is neither. */
export function formatSetLoad(weightKg: number | null, reps: number | null): string | null {
  const weight = weightKg != null ? formatNumber(weightKg, 'кг') : null;
  if (weight && reps != null) return `${weight} × ${reps}`;
  if (weight) return weight;
  if (reps != null) return `${reps} повт.`;
  return null;
}

/** Set numbers as ranges: [1, 2, 3, 4, 7] → "1–4, 7". */
export function formatSetNumbers(numbers: readonly number[]): string {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i]!;
    while (sorted[i + 1] === sorted[i]! + 1) i++;
    const end = sorted[i]!;
    parts.push(
      end - start >= 2 ? `${start}–${end}` : start === end ? `${start}` : `${start}, ${end}`,
    );
  }
  return parts.join(', ');
}

/** 850 → "850 кг", 12 400 → "12,4 т". */
export function formatVolume(kg: number | null | undefined): string {
  if (kg == null || !Number.isFinite(kg)) return DASH;
  if (kg < 1000) return formatNumber(Math.round(kg), 'кг');
  return formatNumber(Math.round(kg / 100) / 10, 'т');
}

/** 0.264 → "26 %". */
export const formatPercent = (share: number | null | undefined) =>
  share == null || !Number.isFinite(share) ? DASH : `${Math.round(share * 100)} %`;

export type Change = { text: string; direction: 'up' | 'down' | 'flat' };

/** Change against the previous period: "+12 %", "−5 %"; null when there is nothing to compare. */
export function formatChange(current: number | null, previous: number | null): Change | null {
  if (current == null || previous == null || previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { text: '0 %', direction: 'flat' };
  return pct > 0
    ? { text: `+${pct} %`, direction: 'up' }
    : { text: `−${Math.abs(pct)} %`, direction: 'down' };
}

const SHORT_MONTHS = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

/** Local date "2026-10-17" → "17 окт". */
export function formatShortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${day} ${SHORT_MONTHS[month! - 1]}`;
}

/** Today in the device time zone as "YYYY-MM-DD". */
export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** A personal record: "80 кг × 3" for the heaviest set, "101,3 кг" or "1,8 т" otherwise. */
export function formatRecord(
  kind: 'maxWeight' | 'maxE1rm' | 'maxSetVolume' | 'maxWorkoutVolume',
  valueKg: number,
  reps: number | null,
): string {
  if (kind === 'maxSetVolume' || kind === 'maxWorkoutVolume') return formatVolume(valueKg);
  const weight = formatNumber(Math.round(valueKg * 10) / 10, 'кг');
  return kind === 'maxWeight' && reps ? `${weight} × ${reps}` : weight;
}
