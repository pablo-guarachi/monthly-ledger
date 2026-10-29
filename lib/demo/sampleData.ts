/**
 * Sample data for demos and portfolio screenshots.
 *
 * Kept apart from the domain/repository layers on purpose: it only *uses* them.
 * Items go through `useItems.create` (same path as the item form: insert →
 * next due date → ledger sync → reminders), past months are generated with
 * `ensurePeriod` and settled with `setPaymentStatus`, so loan balances and
 * savings totals move exactly as they would with real use.
 *
 * Every figure here is fictional. The ids of what was created are stored in the
 * `settings` table under `sample_data`, so "Clear sample data" removes exactly
 * those rows and never touches anything the user entered.
 */
import { getDb } from '@/lib/db/client';
import { ensurePeriod, setPaymentStatus } from '@/lib/db/payments';
import { getAllSettings, setSetting } from '@/lib/db/settings';
import { addDays, addMonthsClamped, addPeriods, currentPeriod, daysInMonth, todayIso } from '@/lib/domain/date';
import type { ItemInput } from '@/lib/domain/types';
import { reconcile } from '@/lib/notifications';
import { useItems } from '@/lib/store/useItems';
import { useLedger } from '@/lib/store/useLedger';
import { useSettings } from '@/lib/store/useSettings';

const KEY = 'sample_data';
/** months of paid history generated before the current one (feeds Stats and item history) */
const HISTORY_MONTHS = 5;
/** £3,450.00 net a month, only applied when the user has not set an income */
const SAMPLE_INCOME = 345_000;

type SampleState = { itemIds: string[]; setIncome: boolean; createdAt: string };

/** anchor = the given day-of-month, `monthsAgo` months back (clamped to the month length) */
function anchor(day: number, monthsAgo: number, today = todayIso()): string {
  const first = `${today.slice(0, 7)}-01`;
  const d = addMonthsClamped(first, -monthsAgo, 1);
  const [y, m] = d.split('-').map((n) => parseInt(n, 10));
  const dd = Math.min(day, daysInMonth(y!, m!));
  return `${d.slice(0, 7)}-${dd < 10 ? `0${dd}` : dd}`;
}

const base = {
  cycle: 'monthly' as const,
  cycleEvery: 1,
  cycleUnit: 'month' as const,
  endDate: null,
  currency: 'GBP' as const,
  autopay: true,
  reminderDays: null,
  notes: null,
  url: null,
  icon: null,
  color: null,
  loan: null,
  savings: null,
};

/** Fictional fixed costs for one UK household. Amounts in pence. */
export function sampleItems(today = todayIso()): ItemInput[] {
  const a = (day: number, monthsAgo = 8) => anchor(day, monthsAgo, today);
  const inMonths = (n: number) => addMonthsClamped(today, n);
  return [
    { ...base, kind: 'housing', name: 'Rent · Flat 2B', amount: 112_500, anchorDate: a(1), categoryId: 'cat_home', paymentMethod: 'Current account', reminderDays: 3 },
    { ...base, kind: 'utility', name: 'Council tax', amount: 16_800, anchorDate: a(5), categoryId: 'cat_home', paymentMethod: 'Current account', autopay: false, endDate: null },
    { ...base, kind: 'utility', name: 'Energy · dual fuel', amount: 9_400, anchorDate: a(12), categoryId: 'cat_utilities', paymentMethod: 'Direct debit' },
    { ...base, kind: 'utility', name: 'Broadband 500 Mb', amount: 3_200, anchorDate: a(18), categoryId: 'cat_phone', paymentMethod: 'Credit card' },
    { ...base, kind: 'utility', name: 'Mobile · SIM only', amount: 1_200, anchorDate: a(22), categoryId: 'cat_phone', paymentMethod: 'Credit card' },
    {
      ...base,
      kind: 'loan',
      name: 'Car loan',
      amount: 21_850,
      anchorDate: a(8, 14),
      categoryId: 'cat_loans',
      paymentMethod: 'Direct debit',
      notes: 'Fictional sample loan · 48 monthly instalments.',
      // 14 instalments already behind it when the history below starts settling the rest
      loan: { principalTotal: 950_000, remainingBalance: 950_000 - 21_850 * (14 - HISTORY_MONTHS), installmentsTotal: 48, installmentsPaid: 14 - HISTORY_MONTHS, interestRateBp: 590, lender: 'Northbank Finance' },
    },
    { ...base, kind: 'insurance', name: 'Home & contents insurance', amount: 1_850, anchorDate: a(3), categoryId: 'cat_insurance', paymentMethod: 'Direct debit' },
    { ...base, kind: 'insurance', name: 'Car insurance', amount: 48_600, cycle: 'yearly', anchorDate: inMonths(2).slice(0, 8) + '14', categoryId: 'cat_insurance', paymentMethod: 'Credit card', reminderDays: 14, notes: 'Renewal: compare quotes a month before.' },
    { ...base, kind: 'subscription', name: 'Streaming · video', amount: 1_099, anchorDate: a(9), categoryId: 'cat_streaming', paymentMethod: 'Credit card' },
    { ...base, kind: 'subscription', name: 'Music family plan', amount: 1_999, anchorDate: a(15), categoryId: 'cat_streaming', paymentMethod: 'Credit card' },
    { ...base, kind: 'subscription', name: 'Cloud storage 2 TB', amount: 899, currency: 'EUR', anchorDate: a(20), categoryId: 'cat_software', paymentMethod: 'Credit card', notes: 'Billed in euros.' },
    { ...base, kind: 'subscription', name: 'News digital pass', amount: 699, anchorDate: a(26), categoryId: 'cat_other', paymentMethod: 'Credit card', endDate: addDays(today, 20) },
    { ...base, kind: 'other', name: 'Gym membership', amount: 3_499, anchorDate: a(2), categoryId: 'cat_health', paymentMethod: 'Debit card' },
    {
      ...base,
      kind: 'savings',
      name: 'Emergency fund',
      amount: 25_000,
      anchorDate: a(28),
      autopay: false,
      categoryId: 'cat_savings',
      paymentMethod: 'Savings account',
      savings: { targetAmount: 600_000, savedAmount: 210_000, targetDate: null },
    },
    {
      ...base,
      kind: 'savings',
      name: 'Holiday · Lisbon',
      amount: 12_000,
      anchorDate: a(25, 6),
      autopay: false,
      categoryId: 'cat_savings',
      paymentMethod: 'Savings account',
      savings: { targetAmount: 150_000, savedAmount: 24_000, targetDate: inMonths(7) },
    },
  ];
}

export async function getSampleState(): Promise<SampleState | null> {
  const raw = (await getAllSettings())[KEY];
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as SampleState;
    return Array.isArray(s.itemIds) && s.itemIds.length ? s : null;
  } catch {
    return null;
  }
}

/** Insert the sample household and a few months of settled history. No-op if already loaded. */
export async function loadSampleData(): Promise<number> {
  if (await getSampleState()) return 0;
  const today = todayIso();
  const create = useItems.getState().create;
  const itemIds: string[] = [];
  const idByName = new Map<string, string>();
  for (const input of sampleItems(today)) {
    const item = await create(input);
    itemIds.push(item.id);
    idByName.set(item.name, item.id);
  }
  const ids = new Set(itemIds);
  const gym = idByName.get('Gym membership');
  const councilTax = idByName.get('Council tax');

  // Paid history: previous months fully settled, except one skipped month so the state is visible.
  const now = currentPeriod();
  for (let back = HISTORY_MONTHS; back >= 1; back--) {
    const period = addPeriods(now, -back);
    const rows = await ensurePeriod(period);
    for (const p of rows) {
      if (!ids.has(p.itemId)) continue;
      const skip = back === 2 && p.itemId === gym; // gym paused for a month
      await setPaymentStatus(p.id, skip ? 'skipped' : 'paid');
    }
  }

  // Current month: what is already due is paid, except council tax (paid by hand) which stays overdue.
  const current = await ensurePeriod(now);
  for (const p of current) {
    if (!ids.has(p.itemId) || p.itemId === councilTax) continue;
    if (p.dueDate < today) await setPaymentStatus(p.id, 'paid');
  }

  const setIncome = useSettings.getState().monthlyIncome === null;
  if (setIncome) await useSettings.getState().setMonthlyIncome(SAMPLE_INCOME);

  const state: SampleState = { itemIds, setIncome, createdAt: new Date().toISOString() };
  await setSetting(KEY, JSON.stringify(state));
  await refreshAll();
  return itemIds.length;
}

/** Remove exactly the rows created by `loadSampleData` (payments and loan/savings details cascade). */
export async function clearSampleData(): Promise<number> {
  const state = await getSampleState();
  if (!state) return 0;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const id of state.itemIds) {
      await db.runAsync('DELETE FROM payments WHERE item_id = ?', id);
      await db.runAsync('DELETE FROM loan_details WHERE item_id = ?', id);
      await db.runAsync('DELETE FROM savings_details WHERE item_id = ?', id);
      await db.runAsync('DELETE FROM items WHERE id = ?', id);
    }
  });
  if (state.setIncome && useSettings.getState().monthlyIncome === SAMPLE_INCOME) {
    await useSettings.getState().setMonthlyIncome(null);
  }
  await setSetting(KEY, '');
  await refreshAll();
  return state.itemIds.length;
}

async function refreshAll(): Promise<void> {
  await useItems.getState().refresh();
  await useLedger.getState().refresh();
  await reconcile().catch(() => 0);
}
