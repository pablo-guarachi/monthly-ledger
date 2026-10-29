import type { Currency } from './types';

export type Rates = { eurToGbp: number };

/** convert minor units between GBP and EUR using the manual rate (1 EUR = eurToGbp GBP) */
export function convert(amount: number, from: Currency, to: Currency, rates: Rates): number {
  if (from === to) return amount;
  const r = rates.eurToGbp > 0 ? rates.eurToGbp : 1;
  if (from === 'EUR' && to === 'GBP') return Math.round(amount * r);
  if (from === 'GBP' && to === 'EUR') return Math.round(amount / r);
  return amount;
}

export function sumInCurrency(
  rows: { amount: number; currency: Currency }[],
  to: Currency,
  rates: Rates,
): number {
  let total = 0;
  for (const r of rows) total += convert(r.amount, r.currency, to, rates);
  return total;
}
