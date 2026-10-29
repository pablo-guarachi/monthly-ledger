import { bucketOf, buildOccurrences, sortPayments, summarizePeriod } from '@/lib/domain/ledger';
import type { Item, Payment } from '@/lib/domain/types';

const base: Item = {
  id: 'a',
  kind: 'subscription',
  name: 'Netflix',
  amount: 1099,
  currency: 'GBP',
  cycle: 'monthly',
  cycleEvery: 1,
  cycleUnit: 'month',
  anchorDate: '2026-01-15',
  nextDueDate: '2026-10-15',
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

const pay = (over: Partial<Payment>): Payment => ({
  id: 'p',
  itemId: 'a',
  period: '2026-10',
  dueDate: '2026-10-15',
  amount: 1099,
  currency: 'GBP',
  status: 'due',
  paidAt: null,
  note: null,
  createdAt: '',
  ...over,
});

describe('buildOccurrences', () => {
  test('monthly, yearly and weekly items in October 2026', () => {
    const items: Item[] = [
      base,
      { ...base, id: 'b', cycle: 'yearly', anchorDate: '2025-10-03', amount: 9900 },
      { ...base, id: 'c', cycle: 'yearly', anchorDate: '2025-11-03', amount: 9900 },
      { ...base, id: 'd', cycle: 'weekly', cycleUnit: 'day', anchorDate: '2026-10-02', amount: 500 },
      { ...base, id: 'e', isArchived: true },
      { ...base, id: 'f', endDate: '2026-09-30' },
    ];
    const occ = buildOccurrences(items, '2026-10');
    expect(occ.map((o) => o.itemId)).toEqual(['a', 'b', 'd']);
    expect(occ.find((o) => o.itemId === 'd')).toMatchObject({ dueDate: '2026-10-02', count: 5, amount: 2500 });
    expect(occ.find((o) => o.itemId === 'b')).toMatchObject({ dueDate: '2026-10-03', amount: 9900 });
  });
});

describe('summarizePeriod', () => {
  const itemsById = new Map<string, Item>([
    ['a', base],
    ['l', { ...base, id: 'l', kind: 'loan' }],
  ]);
  const opts = { mainCurrency: 'GBP' as const, rates: { eurToGbp: 0.5 }, today: '2026-10-20', monthlyIncome: 200000 };

  test('totals, overdue and conversion', () => {
    const payments = [
      pay({ id: '1', status: 'paid', amount: 1000 }),
      pay({ id: '2', status: 'due', dueDate: '2026-10-10', amount: 2000 }), // overdue
      pay({ id: '3', status: 'due', dueDate: '2026-10-25', amount: 4000, currency: 'EUR' }), // → 2000 GBP
      pay({ id: '4', status: 'skipped', amount: 999 }),
      pay({ id: '5', itemId: 'l', status: 'due', dueDate: '2026-10-28', amount: 30000 }),
    ];
    const s = summarizePeriod(payments, itemsById, opts);
    expect(s.total).toBe(1000 + 2000 + 2000 + 30000);
    expect(s.paid).toBe(1000);
    expect(s.due).toBe(2000 + 2000 + 30000);
    expect(s.overdue).toBe(2000);
    expect(s.countOverdue).toBe(1);
    expect(s.skipped).toBe(999);
    expect(s.leftAfterFixed).toBe(200000 - 35000);
    expect(s.byKind[0]).toMatchObject({ kind: 'loan', amount: 30000 });
    expect(s.byKind[1]).toMatchObject({ kind: 'subscription', amount: 5000, count: 3 });
  });

  test('no income → leftAfterFixed null', () => {
    const s = summarizePeriod([], itemsById, { ...opts, monthlyIncome: null });
    expect(s.leftAfterFixed).toBeNull();
    expect(s.total).toBe(0);
  });
});

describe('buckets and order', () => {
  test('bucketOf', () => {
    expect(bucketOf(pay({ dueDate: '2026-10-10' }), '2026-10-20')).toBe('overdue');
    expect(bucketOf(pay({ dueDate: '2026-10-20' }), '2026-10-20')).toBe('today');
    expect(bucketOf(pay({ dueDate: '2026-10-21' }), '2026-10-20')).toBe('upcoming');
    expect(bucketOf(pay({ status: 'paid' }), '2026-10-20')).toBe('paid');
  });

  test('sortPayments: open first by date, then paid, then skipped', () => {
    const sorted = sortPayments(
      [
        pay({ id: 'paid', status: 'paid', dueDate: '2026-10-01' }),
        pay({ id: 'late', dueDate: '2026-10-05' }),
        pay({ id: 'skip', status: 'skipped', dueDate: '2026-10-02' }),
        pay({ id: 'soon', dueDate: '2026-10-25' }),
        pay({ id: 'today', dueDate: '2026-10-20' }),
      ],
      '2026-10-20',
    );
    expect(sorted.map((p) => p.id)).toEqual(['late', 'today', 'soon', 'paid', 'skip']);
  });
});
