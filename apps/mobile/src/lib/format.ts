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
