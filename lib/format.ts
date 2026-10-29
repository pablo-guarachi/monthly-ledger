/**
 * Display formatting. Money is minor units (integer). Dates are ISO YYYY-MM-DD.
 */

const SYMBOL: Record<string, string> = { GBP: '£', EUR: '€' };

export function formatMoney(
  minor: number,
  currency: string,
  opts: { signed?: boolean; compact?: boolean } = {},
): string {
  const sym = SYMBOL[currency] ?? `${currency} `;
  const neg = minor < 0;
  const abs = Math.abs(Math.round(minor));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = opts.compact && frac === 0 ? wholeStr : `${wholeStr}.${frac.toString().padStart(2, '0')}`;
  const sign = neg ? '−' : opts.signed ? '+' : '';
  return `${sign}${sym}${body}`;
}

/** "1234.5" | "1,234" | "£12" → minor units; null when not parseable */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function minorToInput(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return '';
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return frac === 0 ? `${minor < 0 ? '-' : ''}${whole}` : `${minor < 0 ? '-' : ''}${whole}.${frac.toString().padStart(2, '0')}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "2026-10-23" → "23 Oct" (or "23 Oct 2026" when not current year) */
export function formatDay(iso: string, opts: { year?: boolean; weekday?: boolean } = {}): string {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  const now = new Date();
  const showYear = opts.year ?? y !== now.getFullYear();
  const base = `${d} ${MONTHS[m - 1]}${showYear ? ` ${y}` : ''}`;
  if (opts.weekday) {
    const wd = DAYS[new Date(y, m - 1, d).getDay()];
    return `${wd} ${base}`;
  }
  return base;
}

/** "2026-10" → "October 2026" */
export function formatPeriod(period: string, long = true): string {
  const [y, m] = period.split('-').map((n) => parseInt(n, 10));
  if (!y || !m) return period;
  return `${(long ? MONTHS_LONG : MONTHS)[m - 1]} ${y}`;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
}
