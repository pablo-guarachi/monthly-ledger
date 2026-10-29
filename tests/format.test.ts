import { formatDay, formatMoney, formatPeriod, minorToInput, parseMoney } from '@/lib/format';
import { convert } from '@/lib/domain/money';

describe('money formatting', () => {
  test('formatMoney', () => {
    expect(formatMoney(123456, 'GBP')).toBe('£1,234.56');
    expect(formatMoney(100, 'EUR')).toBe('€1.00');
    expect(formatMoney(100, 'EUR', { compact: true })).toBe('€1');
    expect(formatMoney(-2550, 'GBP')).toBe('−£25.50');
    expect(formatMoney(2550, 'GBP', { signed: true })).toBe('+£25.50');
  });

  test('parseMoney', () => {
    expect(parseMoney('12.5')).toBe(1250);
    expect(parseMoney('£1,234.56')).toBe(123456);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('0')).toBe(0);
  });

  test('minorToInput round-trips', () => {
    expect(minorToInput(1250)).toBe('12.50');
    expect(minorToInput(1200)).toBe('12');
    expect(parseMoney(minorToInput(999))).toBe(999);
  });

  test('convert EUR/GBP with manual rate', () => {
    expect(convert(1000, 'EUR', 'GBP', { eurToGbp: 0.85 })).toBe(850);
    expect(convert(850, 'GBP', 'EUR', { eurToGbp: 0.85 })).toBe(1000);
    expect(convert(500, 'GBP', 'GBP', { eurToGbp: 0.85 })).toBe(500);
  });
});

describe('date formatting', () => {
  test('formatDay and formatPeriod', () => {
    expect(formatDay('2026-10-23', { year: false })).toBe('23 Oct');
    expect(formatDay('2026-10-23', { year: true })).toBe('23 Oct 2026');
    expect(formatDay('2026-10-23', { year: false, weekday: true })).toBe('Fri 23 Oct');
    expect(formatPeriod('2026-10')).toBe('October 2026');
    expect(formatPeriod('2026-10', false)).toBe('Oct 2026');
  });
});
