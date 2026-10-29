import { ended, endingSoon, groupByDay, upcomingCharges } from '@/lib/domain/upcoming';
import type { Item } from '@/lib/domain/types';

const base: Item = {
  id: 'a',
  kind: 'subscription',
  name: 'A',
  amount: 100,
  currency: 'GBP',
  cycle: 'monthly',
  cycleEvery: 1,
  cycleUnit: 'month',
  anchorDate: '2026-01-05',
  nextDueDate: '2026-11-05',
  endDate: null,
  categoryId: null,
  paymentMethod: null,
  autopay: true,
  reminderDays: null,
  notes: null,
  url: null,
  icon: null,
  color: null,
  isArchived: false,
  archivedAt: null,
  createdAt: '',
  updatedAt: '',
  loan: null,
  savings: null,
};

test('upcomingCharges lists every occurrence in the window, sorted', () => {
  const items: Item[] = [
    base,
    { ...base, id: 'w', cycle: 'weekly', cycleUnit: 'day', anchorDate: '2026-10-24', amount: 10 },
    { ...base, id: 'x', isArchived: true },
    { ...base, id: 'e', endDate: '2026-10-31' },
  ];
  const charges = upcomingCharges(items, '2026-10-23', '2026-11-21');
  expect(charges.filter((c) => c.itemId === 'w')).toHaveLength(5);
  expect(charges.filter((c) => c.itemId === 'a').map((c) => c.date)).toEqual(['2026-11-05']);
  expect(charges.some((c) => c.itemId === 'x')).toBe(false);
  expect(charges.some((c) => c.itemId === 'e')).toBe(false); // ends before its Nov charge
  expect(charges[0]!.date).toBe('2026-10-24');
  const groups = groupByDay(charges);
  expect(groups[0]).toMatchObject({ date: '2026-10-24' });
  expect(groups.find((g) => g.date === '2026-11-05')!.charges.map((c) => c.itemId)).toEqual(['a']);
});

test('endingSoon and ended', () => {
  const items: Item[] = [
    { ...base, id: 'soon', endDate: '2026-11-10' },
    { ...base, id: 'later', endDate: '2027-01-10' },
    { ...base, id: 'past', endDate: '2026-10-01' },
    { ...base, id: 'none' },
  ];
  expect(endingSoon(items, '2026-10-23', 30).map((i) => i.id)).toEqual(['soon']);
  expect(ended(items, '2026-10-23').map((i) => i.id)).toEqual(['past']);
});
