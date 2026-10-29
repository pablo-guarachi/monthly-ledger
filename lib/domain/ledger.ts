/**
 * Monthly ledger: which occurrences a period holds and how a period sums up.
 * Pure functions. Persistence lives in lib/db/payments.ts.
 */
import { occurrencesInPeriod } from './cycle';
import type { ISODate, Period } from './date';
import { convert, type Rates } from './money';
import type { Currency, Item, Kind, Payment } from './types';

export type Occurrence = {
  itemId: string;
  period: Period;
  dueDate: ISODate;
  /** amount × number of charges falling in the period (weekly items may have 4 or 5) */
  amount: number;
  currency: Currency;
  count: number;
};

/** expected occurrences for every active (non-archived) item in the period */
export function buildOccurrences(items: Item[], period: Period): Occurrence[] {
  const out: Occurrence[] = [];
  for (const it of items) {
    if (it.isArchived) continue;
    const dates = occurrencesInPeriod(it, period);
    if (!dates.length) continue;
    out.push({
      itemId: it.id,
      period,
      dueDate: dates[0]!,
      amount: it.amount * dates.length,
      currency: it.currency,
      count: dates.length,
    });
  }
  return out;
}

export type PeriodSummary = {
  total: number;
  paid: number;
  due: number;
  overdue: number;
  skipped: number;
  countTotal: number;
  countPaid: number;
  countOverdue: number;
  byKind: { kind: Kind; amount: number; count: number }[];
  /** income − total, or null when income unknown */
  leftAfterFixed: number | null;
};

export function summarizePeriod(
  payments: Payment[],
  itemsById: Map<string, Item>,
  opts: { mainCurrency: Currency; rates: Rates; today: ISODate; monthlyIncome: number | null },
): PeriodSummary {
  let total = 0;
  let paid = 0;
  let due = 0;
  let overdue = 0;
  let skipped = 0;
  let countTotal = 0;
  let countPaid = 0;
  let countOverdue = 0;
  const kinds = new Map<Kind, { amount: number; count: number }>();

  for (const p of payments) {
    const amt = convert(p.amount, p.currency, opts.mainCurrency, opts.rates);
    if (p.status === 'skipped') {
      skipped += amt;
      continue;
    }
    total += amt;
    countTotal += 1;
    const kind = itemsById.get(p.itemId)?.kind ?? 'other';
    const k = kinds.get(kind) ?? { amount: 0, count: 0 };
    k.amount += amt;
    k.count += 1;
    kinds.set(kind, k);
    if (p.status === 'paid') {
      paid += amt;
      countPaid += 1;
    } else {
      due += amt;
      if (p.dueDate < opts.today) {
        overdue += amt;
        countOverdue += 1;
      }
    }
  }

  const byKind = [...kinds.entries()]
    .map(([kind, v]) => ({ kind, amount: v.amount, count: v.count }))
    .sort((a, b) => b.amount - a.amount);

  return {
    total,
    paid,
    due,
    overdue,
    skipped,
    countTotal,
    countPaid,
    countOverdue,
    byKind,
    leftAfterFixed: opts.monthlyIncome === null ? null : opts.monthlyIncome - total,
  };
}

export type PaymentBucket = 'overdue' | 'today' | 'upcoming' | 'paid' | 'skipped';

export function bucketOf(p: Payment, today: ISODate): PaymentBucket {
  if (p.status === 'paid') return 'paid';
  if (p.status === 'skipped') return 'skipped';
  if (p.dueDate < today) return 'overdue';
  if (p.dueDate === today) return 'today';
  return 'upcoming';
}

/** sort: open items by due date first, then paid, then skipped */
export function sortPayments(payments: Payment[], today: ISODate): Payment[] {
  const rank: Record<PaymentBucket, number> = { overdue: 0, today: 1, upcoming: 2, paid: 3, skipped: 4 };
  return [...payments].sort((a, b) => {
    const ra = rank[bucketOf(a, today)];
    const rb = rank[bucketOf(b, today)];
    if (ra !== rb) return ra - rb;
    return a.dueDate.localeCompare(b.dueDate);
  });
}
