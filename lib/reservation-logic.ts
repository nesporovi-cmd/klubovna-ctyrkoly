import { OPEN_HOUR, CLOSE_HOUR, MAX_DAYS_AHEAD } from './types';

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

export function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isWithinBookableRange(d: Date): boolean {
  return d >= todayDateOnly() && d <= maxBookableDate();
}

export function generateRecurrenceDates(
  startDate: Date,
  frequency: 'weekly' | 'monthly',
  count: number
): Date[] {
  const dates: Date[] = [];
  const cur = new Date(startDate);
  for (let i = 0; i < count; i++) {
    dates.push(new Date(cur));
    if (frequency === 'weekly') {
      cur.setDate(cur.getDate() + 7);
    } else {
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return dates.filter((d) => d <= maxBookableDate());
}

export function isValidHourRange(startHour: number, endHour: number): boolean {
  return (
    Number.isInteger(startHour) &&
    Number.isInteger(endHour) &&
    startHour >= OPEN_HOUR &&
    endHour <= CLOSE_HOUR &&
    endHour > startHour
  );
}

const MONTHS_CS = [
  'leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec',
];

export function formatDateHuman(key: string): string {
  const d = keyToDate(key);
  return `${d.getDate()}. ${MONTHS_CS[d.getMonth()]} ${d.getFullYear()}`;
}
