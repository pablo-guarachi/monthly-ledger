/**
 * Calendar helpers on ISO `YYYY-MM-DD` strings (local time, no TZ drift).
 * Periods are `YYYY-MM`.
 */

export type ISODate = string;
export type Period = string;

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function toIso(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromIso(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function isValidIso(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = fromIso(iso);
  return toIso(d) === iso;
}

export function todayIso(now: Date = new Date()): ISODate {
  return toIso(now);
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/**
 * Add months keeping `anchorDay` (day-of-month) when the target month has it,
 * clamping to the month length otherwise (31 Jan + 1 → 28/29 Feb; +2 → 31 Mar).
 */
export function addMonthsClamped(iso: ISODate, n: number, anchorDay?: number): ISODate {
  const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10));
  const day = anchorDay ?? d!;
  const total = (m! - 1) + n;
  const ny = y! + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12; // 0-based
  const dim = daysInMonth(ny, nm + 1);
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(day, dim))}`;
}

export function periodOf(iso: ISODate): Period {
  return iso.slice(0, 7);
}

export function currentPeriod(now: Date = new Date()): Period {
  return periodOf(toIso(now));
}

export function periodStart(period: Period): ISODate {
  return `${period}-01`;
}

export function periodEnd(period: Period): ISODate {
  const [y, m] = period.split('-').map((n) => parseInt(n, 10));
  return `${period}-${pad(daysInMonth(y!, m!))}`;
}

export function addPeriods(period: Period, n: number): Period {
  return periodOf(addMonthsClamped(periodStart(period), n, 1));
}

/** months from a to b (b - a), ignoring days */
export function monthsBetween(a: ISODate | Period, b: ISODate | Period): number {
  const [ay, am] = a.split('-').map((n) => parseInt(n, 10));
  const [by, bm] = b.split('-').map((n) => parseInt(n, 10));
  return (by! - ay!) * 12 + (bm! - am!);
}

/** whole days from a to b (b - a) */
export function daysBetween(a: ISODate, b: ISODate): number {
  const ms = fromIso(b).getTime() - fromIso(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function compareIso(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function maxIso(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

export function minIso(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b;
}

export function dayOfMonth(iso: ISODate): number {
  return parseInt(iso.slice(8, 10), 10);
}
