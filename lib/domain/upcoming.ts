/**
 * Forward-looking timeline of charges (every occurrence, not grouped by month)
 * and items whose end date is approaching.
 */
import { occurrencesBetween } from './cycle';
import { addDays, type ISODate } from './date';
import type { Currency, Item } from './types';

export type Charge = { itemId: string; date: ISODate; amount: number; currency: Currency };

export function upcomingCharges(items: Item[], from: ISODate, to: ISODate): Charge[] {
  const out: Charge[] = [];
  for (const it of items) {
    if (it.isArchived) continue;
    for (const date of occurrencesBetween(it, from, to)) {
      out.push({ itemId: it.id, date, amount: it.amount, currency: it.currency });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.itemId.localeCompare(b.itemId));
}

export type DayGroup = { date: ISODate; charges: Charge[] };

export function groupByDay(charges: Charge[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const c of charges) {
    const last = groups[groups.length - 1];
    if (last && last.date === c.date) last.charges.push(c);
    else groups.push({ date: c.date, charges: [c] });
  }
  return groups;
}

/** active items whose end date falls within `days` from `from` (inclusive), soonest first */
export function endingSoon(items: Item[], from: ISODate, days: number): Item[] {
  const limit = addDays(from, days);
  return items
    .filter((it) => !it.isArchived && it.endDate && it.endDate >= from && it.endDate <= limit)
    .sort((a, b) => a.endDate!.localeCompare(b.endDate!));
}

/** active items whose end date has already passed (candidates for archiving) */
export function ended(items: Item[], today: ISODate): Item[] {
  return items.filter((it) => !it.isArchived && it.endDate && it.endDate < today);
}
