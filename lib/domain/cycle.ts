/**
 * Billing cycles: occurrence generation and monthly normalisation.
 * Pure functions, no I/O.
 */
import {
  addDays,
  addMonthsClamped,
  compareIso,
  dayOfMonth,
  daysBetween,
  monthsBetween,
  periodEnd,
  periodStart,
  type ISODate,
  type Period,
} from './date';
import type { Cycle, CycleSpec, CycleUnit } from './types';

export const CYCLES: { value: Cycle; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
];

/** step in months, or null for day-based cycles */
export function stepMonths(spec: Pick<CycleSpec, 'cycle' | 'cycleEvery' | 'cycleUnit'>): number | null {
  switch (spec.cycle) {
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'yearly':
      return 12;
    case 'custom':
      return spec.cycleUnit === 'month' ? Math.max(1, spec.cycleEvery) : null;
    default:
      return null;
  }
}

/** step in days, or null for month-based cycles */
export function stepDays(spec: Pick<CycleSpec, 'cycle' | 'cycleEvery' | 'cycleUnit'>): number | null {
  switch (spec.cycle) {
    case 'weekly':
      return 7;
    case 'custom':
      return spec.cycleUnit === 'day' ? Math.max(1, spec.cycleEvery) : null;
    default:
      return null;
  }
}

/** n-th occurrence (n ≥ 0) from the anchor date */
export function nthOccurrence(spec: CycleSpec, n: number): ISODate {
  const sm = stepMonths(spec);
  if (sm !== null) return addMonthsClamped(spec.anchorDate, n * sm, dayOfMonth(spec.anchorDate));
  const sd = stepDays(spec) ?? 1;
  return addDays(spec.anchorDate, n * sd);
}

/** index of the first occurrence on or after `from` (may be 0) */
function firstIndexOnOrAfter(spec: CycleSpec, from: ISODate): number {
  if (compareIso(from, spec.anchorDate) <= 0) return 0;
  const sd = stepDays(spec);
  if (sd !== null) {
    return Math.ceil(daysBetween(spec.anchorDate, from) / sd);
  }
  const sm = stepMonths(spec) ?? 1;
  let n = Math.max(0, Math.floor(monthsBetween(spec.anchorDate, from) / sm) - 1);
  // walk forward until occurrence >= from (clamped days make estimate fuzzy)
  while (compareIso(nthOccurrence(spec, n), from) < 0) n++;
  // walk back in case the estimate overshot
  while (n > 0 && compareIso(nthOccurrence(spec, n - 1), from) >= 0) n--;
  return n;
}

function withinEnd(spec: CycleSpec, iso: ISODate): boolean {
  return !spec.endDate || compareIso(iso, spec.endDate) <= 0;
}

/** next occurrence on or after `from`, or null if the cycle ended */
export function nextDueOnOrAfter(spec: CycleSpec, from: ISODate): ISODate | null {
  const n = firstIndexOnOrAfter(spec, from);
  const iso = nthOccurrence(spec, n);
  return withinEnd(spec, iso) ? iso : null;
}

/** all occurrences with from ≤ date ≤ to (inclusive), respecting anchor and end date */
export function occurrencesBetween(spec: CycleSpec, from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  if (compareIso(from, to) > 0) return out;
  let n = firstIndexOnOrAfter(spec, from);
  for (let guard = 0; guard < 400; guard++) {
    const iso = nthOccurrence(spec, n);
    if (compareIso(iso, to) > 0 || !withinEnd(spec, iso)) break;
    out.push(iso);
    n++;
  }
  return out;
}

export function occurrencesInPeriod(spec: CycleSpec, period: Period): ISODate[] {
  return occurrencesBetween(spec, periodStart(period), periodEnd(period));
}

/** average monthly cost (minor units, may be fractional) */
export function monthlyEquivalent(amount: number, spec: Pick<CycleSpec, 'cycle' | 'cycleEvery' | 'cycleUnit'>): number {
  const sm = stepMonths(spec);
  if (sm !== null) return amount / sm;
  const sd = stepDays(spec) ?? 1;
  return (amount * 365.25) / (12 * sd);
}

export function yearlyEquivalent(amount: number, spec: Pick<CycleSpec, 'cycle' | 'cycleEvery' | 'cycleUnit'>): number {
  return monthlyEquivalent(amount, spec) * 12;
}

export function cycleLabel(spec: Pick<CycleSpec, 'cycle' | 'cycleEvery' | 'cycleUnit'>): string {
  switch (spec.cycle) {
    case 'monthly':
      return 'monthly';
    case 'quarterly':
      return 'quarterly';
    case 'yearly':
      return 'yearly';
    case 'weekly':
      return 'weekly';
    case 'custom': {
      const n = Math.max(1, spec.cycleEvery);
      const unit: CycleUnit = spec.cycleUnit;
      if (n === 1) return unit === 'day' ? 'daily' : 'monthly';
      return `every ${n} ${unit}s`;
    }
  }
}

/** short suffix for amounts: "/mo", "/yr", "/wk", "/qtr", "/2 mo" */
export function cycleSuffix(spec: Pick<CycleSpec, 'cycle' | 'cycleEvery' | 'cycleUnit'>): string {
  switch (spec.cycle) {
    case 'monthly':
      return '/mo';
    case 'quarterly':
      return '/qtr';
    case 'yearly':
      return '/yr';
    case 'weekly':
      return '/wk';
    case 'custom': {
      const n = Math.max(1, spec.cycleEvery);
      const u = spec.cycleUnit === 'day' ? 'd' : 'mo';
      return n === 1 ? `/${u}` : `/${n} ${u}`;
    }
  }
}
