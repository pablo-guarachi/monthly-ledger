/**
 * Statistics: monthly trend, breakdowns, yearly cost. Pure functions.
 */
import { monthlyEquivalent } from './cycle';
import { addPeriods, type Period } from './date';
import { buildOccurrences } from './ledger';
import { convert, type Rates } from './money';
import type { Category, Currency, Item, Kind, Payment } from './types';

export type MonthPoint = { period: Period; amount: number; source: 'ledger' | 'projected' };

/** last `count` periods ending at `endPeriod` (inclusive), oldest first */
export function periodRange(endPeriod: Period, count: number): Period[] {
  const out: Period[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(addPeriods(endPeriod, -i));
  return out;
}

/**
 * Per-month totals. A month with ledger rows uses them (paid + due, not skipped);
 * a month without rows is projected from the current item specs.
 */
export function monthlyTotals(
  items: Item[],
  payments: Payment[],
  periods: Period[],
  mainCurrency: Currency,
  rates: Rates,
): MonthPoint[] {
  const byPeriod = new Map<Period, Payment[]>();
  for (const p of payments) {
    const arr = byPeriod.get(p.period) ?? [];
    arr.push(p);
    byPeriod.set(p.period, arr);
  }
  return periods.map((period) => {
    const rows = byPeriod.get(period);
    if (rows && rows.length) {
      const amount = rows
        .filter((r) => r.status !== 'skipped')
        .reduce((s, r) => s + convert(r.amount, r.currency, mainCurrency, rates), 0);
      return { period, amount, source: 'ledger' as const };
    }
    const amount = buildOccurrences(items, period).reduce(
      (s, o) => s + convert(o.amount, o.currency, mainCurrency, rates),
      0,
    );
    return { period, amount, source: 'projected' as const };
  });
}

export type Slice = { key: string; label: string; color: string; amount: number; ratio: number; count: number };

function slices(entries: Map<string, { label: string; color: string; amount: number; count: number }>): Slice[] {
  const total = [...entries.values()].reduce((s, e) => s + e.amount, 0);
  return [...entries.entries()]
    .map(([key, e]) => ({ key, ...e, ratio: total > 0 ? e.amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

/** monthly-equivalent spend per category (active items only) */
export function byCategory(items: Item[], categories: Category[], mainCurrency: Currency, rates: Rates): Slice[] {
  const cats = new Map(categories.map((c) => [c.id, c]));
  const entries = new Map<string, { label: string; color: string; amount: number; count: number }>();
  for (const it of items) {
    if (it.isArchived) continue;
    const cat = it.categoryId ? cats.get(it.categoryId) : undefined;
    const key = cat?.id ?? 'none';
    const e = entries.get(key) ?? { label: cat?.name ?? 'Uncategorised', color: cat?.color ?? '#8A939B', amount: 0, count: 0 };
    e.amount += convert(Math.round(monthlyEquivalent(it.amount, it)), it.currency, mainCurrency, rates);
    e.count += 1;
    entries.set(key, e);
  }
  return slices(entries);
}

/** monthly-equivalent spend per kind (active items only) */
export function byKind(
  items: Item[],
  kindLabel: (k: Kind) => { label: string; color: string },
  mainCurrency: Currency,
  rates: Rates,
): Slice[] {
  const entries = new Map<string, { label: string; color: string; amount: number; count: number }>();
  for (const it of items) {
    if (it.isArchived) continue;
    const meta = kindLabel(it.kind);
    const e = entries.get(it.kind) ?? { label: meta.label, color: meta.color, amount: 0, count: 0 };
    e.amount += convert(Math.round(monthlyEquivalent(it.amount, it)), it.currency, mainCurrency, rates);
    e.count += 1;
    entries.set(it.kind, e);
  }
  return slices(entries);
}

export type YearlyRow = { item: Item; yearly: number; monthly: number };

/** active items ranked by yearly cost in the main currency */
export function rankedByYearly(items: Item[], mainCurrency: Currency, rates: Rates): YearlyRow[] {
  return items
    .filter((it) => !it.isArchived)
    .map((it) => {
      const monthly = convert(Math.round(monthlyEquivalent(it.amount, it)), it.currency, mainCurrency, rates);
      return { item: it, monthly, yearly: monthly * 12 };
    })
    .sort((a, b) => b.yearly - a.yearly);
}

export function yearlyTotal(rows: YearlyRow[]): number {
  return rows.reduce((s, r) => s + r.yearly, 0);
}
