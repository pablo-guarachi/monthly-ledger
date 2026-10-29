import {
  cycleLabel,
  monthlyEquivalent,
  nextDueOnOrAfter,
  nthOccurrence,
  occurrencesBetween,
  occurrencesInPeriod,
  yearlyEquivalent,
} from '@/lib/domain/cycle';
import type { CycleSpec } from '@/lib/domain/types';

const monthly = (anchor: string, endDate: string | null = null): CycleSpec => ({
  cycle: 'monthly',
  cycleEvery: 1,
  cycleUnit: 'month',
  anchorDate: anchor,
  endDate,
});
const yearly = (anchor: string): CycleSpec => ({ ...monthly(anchor), cycle: 'yearly' });
const quarterly = (anchor: string): CycleSpec => ({ ...monthly(anchor), cycle: 'quarterly' });
const weekly = (anchor: string): CycleSpec => ({ ...monthly(anchor), cycle: 'weekly', cycleUnit: 'day' });
const custom = (anchor: string, every: number, unit: 'day' | 'month'): CycleSpec => ({
  cycle: 'custom',
  cycleEvery: every,
  cycleUnit: unit,
  anchorDate: anchor,
  endDate: null,
});

describe('occurrences', () => {
  test('monthly on the 31st clamps and recovers', () => {
    const s = monthly('2026-01-31');
    expect(nthOccurrence(s, 1)).toBe('2026-02-28');
    expect(nthOccurrence(s, 2)).toBe('2026-03-31');
    expect(nthOccurrence(s, 3)).toBe('2026-04-30');
  });

  test('nextDueOnOrAfter for monthly', () => {
    const s = monthly('2026-01-15');
    expect(nextDueOnOrAfter(s, '2026-01-01')).toBe('2026-01-15');
    expect(nextDueOnOrAfter(s, '2026-01-15')).toBe('2026-01-15');
    expect(nextDueOnOrAfter(s, '2026-01-16')).toBe('2026-02-15');
    expect(nextDueOnOrAfter(s, '2027-06-20')).toBe('2027-07-15');
  });

  test('nextDueOnOrAfter respects end date', () => {
    const s = monthly('2026-01-15', '2026-03-31');
    expect(nextDueOnOrAfter(s, '2026-03-16')).toBeNull();
    expect(nextDueOnOrAfter(s, '2026-03-01')).toBe('2026-03-15');
  });

  test('weekly and custom day cycles', () => {
    const w = weekly('2026-10-05'); // a Monday
    expect(nextDueOnOrAfter(w, '2026-10-06')).toBe('2026-10-12');
    expect(occurrencesInPeriod(w, '2026-10')).toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']);
    expect(occurrencesInPeriod(w, '2026-11')).toHaveLength(5);
    const c = custom('2026-10-01', 10, 'day');
    expect(occurrencesBetween(c, '2026-10-01', '2026-10-31')).toEqual(['2026-10-01', '2026-10-11', '2026-10-21', '2026-10-31']);
  });

  test('yearly, quarterly and custom month cycles', () => {
    expect(nextDueOnOrAfter(yearly('2024-02-29'), '2025-01-01')).toBe('2025-02-28');
    expect(nextDueOnOrAfter(yearly('2024-02-29'), '2028-01-01')).toBe('2028-02-29');
    expect(occurrencesInPeriod(yearly('2025-06-10'), '2026-06')).toEqual(['2026-06-10']);
    expect(occurrencesInPeriod(yearly('2025-06-10'), '2026-07')).toEqual([]);
    expect(occurrencesInPeriod(quarterly('2026-01-20'), '2026-04')).toEqual(['2026-04-20']);
    expect(occurrencesInPeriod(quarterly('2026-01-20'), '2026-05')).toEqual([]);
    expect(nextDueOnOrAfter(custom('2026-01-05', 2, 'month'), '2026-02-01')).toBe('2026-03-05');
  });

  test('nothing before the anchor', () => {
    expect(occurrencesInPeriod(monthly('2026-11-03'), '2026-10')).toEqual([]);
    expect(nextDueOnOrAfter(monthly('2026-11-03'), '2026-10-01')).toBe('2026-11-03');
  });
});

describe('normalisation', () => {
  test('monthly equivalents', () => {
    expect(monthlyEquivalent(1200, monthly('2026-01-01'))).toBe(1200);
    expect(monthlyEquivalent(12000, yearly('2026-01-01'))).toBe(1000);
    expect(monthlyEquivalent(300, quarterly('2026-01-01'))).toBe(100);
    expect(monthlyEquivalent(1000, weekly('2026-01-01'))).toBeCloseTo(4348.21, 1);
    expect(monthlyEquivalent(500, custom('2026-01-01', 2, 'month'))).toBe(250);
    expect(yearlyEquivalent(1000, monthly('2026-01-01'))).toBe(12000);
  });

  test('labels', () => {
    expect(cycleLabel(monthly('2026-01-01'))).toBe('monthly');
    expect(cycleLabel(custom('2026-01-01', 2, 'month'))).toBe('every 2 months');
    expect(cycleLabel(custom('2026-01-01', 1, 'day'))).toBe('daily');
  });
});
