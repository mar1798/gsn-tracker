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
