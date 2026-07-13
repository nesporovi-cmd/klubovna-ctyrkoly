import { OPEN_HOUR, CLOSE_HOUR, MAX_DAYS_AHEAD } from '@/lib/types';

export const DOW = ['po', 'út', 'st', 'čt', 'pá', 'so', 'ne'];
export const MONTHS = [
  'leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec',
];

export function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function dateKey(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDateHuman(key: string): string {
  const d = parseKey(key);
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function todayDateOnly(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function maxBookableDate(): Date {
  const d = todayDateOnly();
  d.setDate(d.getDate() + MAX_DAYS_AHEAD);
  return d;
}

export function isWithinRange(d: Date): boolean {
  return d >= todayDateOnly() && d <= maxBookableDate();
}

export function hourSlots(): { start: number; end: number }[] {
  const arr = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    arr.push({ start: h, end: h + 1 });
  }
  return arr;
}

export { OPEN_HOUR, CLOSE_HOUR };
