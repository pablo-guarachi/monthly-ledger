import { byCategory, byKind, monthlyTotals, periodRange, rankedByYearly, yearlyTotal } from '@/lib/domain/stats';
import type { Category, Item, Payment } from '@/lib/domain/types';

const base: Item = {
  id: 'a',
  kind: 'subscription',
  name: 'A',
  amount: 1000,
  currency: 'GBP',
  cycle: 'monthly',
  cycleEvery: 1,
  cycleUnit: 'month',
  anchorDate: '2026-01-05',
  nextDueDate: '2026-11-05',
  endDate: null,
  categoryId: 'c1',
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
const rates = { eurToGbp: 0.5 };

test('periodRange', () => {
  expect(periodRange('2026-10', 3)).toEqual(['2026-08', '2026-09', '2026-10']);
  expect(periodRange('2026-01', 2)).toEqual(['2025-12', '2026-01']);
});

test('monthlyTotals uses ledger rows when present, projection otherwise', () => {
  const items: Item[] = [base, { ...base, id: 'b', cycle: 'yearly', anchorDate: '2026-09-01', amount: 12000 }];
  const payments: Payment[] = [
    { id: '1', itemId: 'a', period: '2026-09', dueDate: '2026-09-05', amount: 900, currency: 'GBP', status: 'paid', paidAt: null, note: null, createdAt: '' },
    { id: '2', itemId: 'b', period: '2026-09', dueDate: '2026-09-01', amount: 12000, currency: 'GBP', status: 'skipped', paidAt: null, note: null, createdAt: '' },
  ];
  const pts = monthlyTotals(items, payments, ['2026-08', '2026-09', '2026-10'], 'GBP', rates);
  expect(pts[0]).toEqual({ period: '2026-08', amount: 1000, source: 'projected' });
  expect(pts[1]).toEqual({ period: '2026-09', amount: 900, source: 'ledger' }); // skipped excluded, snapshot amount used
  expect(pts[2]).toEqual({ period: '2026-10', amount: 1000, source: 'projected' });
});

test('breakdowns and ranking convert currencies and ignore archived', () => {
  const cats: Category[] = [
    { id: 'c1', name: 'Streaming', color: '#111', icon: 'x', sortOrder: 1, isArchived: false },
    { id: 'c2', name: 'Home', color: '#222', icon: 'y', sortOrder: 2, isArchived: false },
  ];
  const items: Item[] = [
    base,
    { ...base, id: 'eur', amount: 2000, currency: 'EUR', categoryId: 'c2', kind: 'housing' }, // 1000 GBP
    { ...base, id: 'yr', cycle: 'yearly', amount: 24000, categoryId: null, kind: 'insurance' }, // 2000/mo
    { ...base, id: 'arch', amount: 99999, isArchived: true },
  ];
  const cat = byCategory(items, cats, 'GBP', rates);
  expect(cat.map((s) => [s.label, s.amount])).toEqual([
    ['Uncategorised', 2000],
    ['Streaming', 1000],
    ['Home', 1000],
  ]);
  expect(cat[0]!.ratio).toBeCloseTo(0.5, 5);

  const kinds = byKind(items, (k) => ({ label: k, color: '#000' }), 'GBP', rates);
  expect(kinds[0]).toMatchObject({ key: 'insurance', amount: 2000 });

  const ranked = rankedByYearly(items, 'GBP', rates);
  expect(ranked.map((r) => r.item.id)).toEqual(['yr', 'a', 'eur']);
  expect(ranked[0]!.yearly).toBe(24000);
  expect(yearlyTotal(ranked)).toBe(24000 + 12000 + 12000);
});
