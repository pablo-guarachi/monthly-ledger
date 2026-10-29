import {
  addDays,
  addMonthsClamped,
  addPeriods,
  daysBetween,
  isValidIso,
  monthsBetween,
  periodEnd,
  periodOf,
  periodStart,
} from '@/lib/domain/date';

describe('date helpers', () => {
  test('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  test('addMonthsClamped keeps the anchor day and clamps short months', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2026-01-31', 2, 31)).toBe('2026-03-31');
    expect(addMonthsClamped('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonthsClamped('2026-11-15', 2)).toBe('2027-01-15');
    expect(addMonthsClamped('2026-03-10', -3)).toBe('2025-12-10');
  });

  test('periods', () => {
    expect(periodOf('2026-10-23')).toBe('2026-10');
    expect(periodStart('2026-02')).toBe('2026-02-01');
    expect(periodEnd('2026-02')).toBe('2026-02-28');
    expect(periodEnd('2028-02')).toBe('2028-02-29');
    expect(addPeriods('2026-12', 1)).toBe('2027-01');
    expect(addPeriods('2026-01', -1)).toBe('2025-12');
    expect(monthsBetween('2026-01', '2027-03')).toBe(14);
  });

  test('daysBetween and validation', () => {
    expect(daysBetween('2026-10-01', '2026-10-31')).toBe(30);
    expect(daysBetween('2026-10-31', '2026-10-01')).toBe(-30);
    expect(isValidIso('2026-02-30')).toBe(false);
    expect(isValidIso('2026-02-28')).toBe(true);
    expect(isValidIso('26-2-8')).toBe(false);
  });
});
