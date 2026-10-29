import type * as SQLite from 'expo-sqlite';

import { getDb, newId, nowIso } from './client';
import { nextDueOnOrAfter } from '@/lib/domain/cycle';
import { todayIso } from '@/lib/domain/date';
import type { Currency, Cycle, CycleUnit, Item, ItemInput, Kind, LoanDetails, SavingsDetails } from '@/lib/domain/types';

type ItemRow = {
  id: string;
  kind: string;
  name: string;
  amount: number;
  currency: string;
  cycle: string;
  cycle_every: number;
  cycle_unit: string;
  anchor_date: string;
  next_due_date: string;
  end_date: string | null;
  category_id: string | null;
  payment_method: string | null;
  autopay: number;
  reminder_days: number | null;
  notes: string | null;
  url: string | null;
  icon: string | null;
  color: string | null;
  is_archived: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // loan
  principal_total: number | null;
  remaining_balance: number | null;
  installments_total: number | null;
  installments_paid: number | null;
  interest_rate_bp: number | null;
  lender: string | null;
  // savings
  target_amount: number | null;
  saved_amount: number | null;
  target_date: string | null;
};

const SELECT = `
  SELECT i.*,
         l.principal_total, l.remaining_balance, l.installments_total, l.installments_paid, l.interest_rate_bp, l.lender,
         s.target_amount, s.saved_amount, s.target_date
  FROM items i
  LEFT JOIN loan_details l ON l.item_id = i.id
  LEFT JOIN savings_details s ON s.item_id = i.id
`;

function rowToItem(r: ItemRow): Item {
  const loan: LoanDetails | null =
    r.kind === 'loan' && r.principal_total !== null
      ? {
          principalTotal: r.principal_total,
          remainingBalance: r.remaining_balance ?? r.principal_total,
          installmentsTotal: r.installments_total,
          installmentsPaid: r.installments_paid ?? 0,
          interestRateBp: r.interest_rate_bp,
          lender: r.lender,
        }
      : null;
  const savings: SavingsDetails | null =
    r.kind === 'savings' && r.target_amount !== null
      ? { targetAmount: r.target_amount, savedAmount: r.saved_amount ?? 0, targetDate: r.target_date }
      : null;
  return {
    id: r.id,
    kind: r.kind as Kind,
    name: r.name,
    amount: r.amount,
    currency: r.currency as Currency,
    cycle: r.cycle as Cycle,
    cycleEvery: r.cycle_every,
    cycleUnit: r.cycle_unit as CycleUnit,
    anchorDate: r.anchor_date,
    nextDueDate: r.next_due_date,
    endDate: r.end_date,
    categoryId: r.category_id,
    paymentMethod: r.payment_method,
    autopay: r.autopay === 1,
    reminderDays: r.reminder_days,
    notes: r.notes,
    url: r.url,
    icon: r.icon,
    color: r.color,
    isArchived: r.is_archived === 1,
    archivedAt: r.archived_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    loan,
    savings,
  };
}

export async function listItems(opts: { archived?: boolean } = {}): Promise<Item[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ItemRow>(
    `${SELECT} WHERE i.is_archived = ? ORDER BY i.next_due_date ASC, i.name COLLATE NOCASE ASC`,
    opts.archived ? 1 : 0,
  );
  return rows.map(rowToItem);
}

export async function listAllItems(): Promise<Item[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ItemRow>(`${SELECT} ORDER BY i.name COLLATE NOCASE ASC`);
  return rows.map(rowToItem);
}

export async function getItem(id: string): Promise<Item | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ItemRow>(`${SELECT} WHERE i.id = ?`, id);
  return row ? rowToItem(row) : null;
}

/** next due date on/after today for the spec, or the last occurrence when ended */
export function computeNextDue(input: Pick<ItemInput, 'cycle' | 'cycleEvery' | 'cycleUnit' | 'anchorDate' | 'endDate'>, today = todayIso()): string {
  const next = nextDueOnOrAfter(input, today);
  return next ?? input.endDate ?? input.anchorDate;
}

export async function insertItem(input: ItemInput): Promise<Item> {
  const db = await getDb();
  const id = newId();
  const now = nowIso();
  const nextDue = computeNextDue(input);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO items (id, kind, name, amount, currency, cycle, cycle_every, cycle_unit, anchor_date, next_due_date,
         end_date, category_id, payment_method, autopay, reminder_days, notes, url, icon, color, is_archived, archived_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
      id,
      input.kind,
      input.name.trim(),
      input.amount,
      input.currency,
      input.cycle,
      input.cycleEvery,
      input.cycleUnit,
      input.anchorDate,
      nextDue,
      input.endDate,
      input.categoryId,
      input.paymentMethod,
      input.autopay ? 1 : 0,
      input.reminderDays,
      input.notes,
      input.url,
      input.icon,
      input.color,
      now,
      now,
    );
    await upsertDetails(db, id, input);
  });
  return (await getItem(id))!;
}

export async function updateItem(id: string, input: ItemInput): Promise<Item> {
  const db = await getDb();
  const now = nowIso();
  const nextDue = computeNextDue(input);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE items SET kind = ?, name = ?, amount = ?, currency = ?, cycle = ?, cycle_every = ?, cycle_unit = ?,
         anchor_date = ?, next_due_date = ?, end_date = ?, category_id = ?, payment_method = ?, autopay = ?,
         reminder_days = ?, notes = ?, url = ?, icon = ?, color = ?, updated_at = ?
       WHERE id = ?`,
      input.kind,
      input.name.trim(),
      input.amount,
      input.currency,
      input.cycle,
      input.cycleEvery,
      input.cycleUnit,
      input.anchorDate,
      nextDue,
      input.endDate,
      input.categoryId,
      input.paymentMethod,
      input.autopay ? 1 : 0,
      input.reminderDays,
      input.notes,
      input.url,
      input.icon,
      input.color,
      now,
      id,
    );
    await upsertDetails(db, id, input);
  });
  return (await getItem(id))!;
}

async function upsertDetails(db: SQLite.SQLiteDatabase, id: string, input: ItemInput): Promise<void> {
  if (input.kind === 'loan' && input.loan) {
    const l = input.loan;
    await db.runAsync(
      `INSERT INTO loan_details (item_id, principal_total, remaining_balance, installments_total, installments_paid, interest_rate_bp, lender)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(item_id) DO UPDATE SET principal_total = excluded.principal_total, remaining_balance = excluded.remaining_balance,
         installments_total = excluded.installments_total, installments_paid = excluded.installments_paid,
         interest_rate_bp = excluded.interest_rate_bp, lender = excluded.lender`,
      id,
      l.principalTotal,
      l.remainingBalance,
      l.installmentsTotal,
      l.installmentsPaid,
      l.interestRateBp,
      l.lender,
    );
  } else {
    await db.runAsync('DELETE FROM loan_details WHERE item_id = ?', id);
  }
  if (input.kind === 'savings' && input.savings) {
    const s = input.savings;
    await db.runAsync(
      `INSERT INTO savings_details (item_id, target_amount, saved_amount, target_date) VALUES (?, ?, ?, ?)
       ON CONFLICT(item_id) DO UPDATE SET target_amount = excluded.target_amount, saved_amount = excluded.saved_amount,
         target_date = excluded.target_date`,
      id,
      s.targetAmount,
      s.savedAmount,
      s.targetDate,
    );
  } else {
    await db.runAsync('DELETE FROM savings_details WHERE item_id = ?', id);
  }
}

export async function setArchived(id: string, archived: boolean): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    'UPDATE items SET is_archived = ?, archived_at = ?, updated_at = ? WHERE id = ?',
    archived ? 1 : 0,
    archived ? now : null,
    now,
    id,
  );
}

/** refresh persisted next_due_date for every active item (call on app start) */
export async function refreshNextDueDates(today = todayIso()): Promise<void> {
  const items = await listItems({ archived: false });
  const db = await getDb();
  for (const it of items) {
    const next = computeNextDue(it, today);
    if (next !== it.nextDueDate) {
      await db.runAsync('UPDATE items SET next_due_date = ? WHERE id = ?', next, it.id);
    }
  }
}

export async function updateLoanProgress(
  id: string,
  patch: { remainingBalance?: number; installmentsPaid?: number },
): Promise<void> {
  const db = await getDb();
  if (patch.remainingBalance !== undefined) {
    await db.runAsync('UPDATE loan_details SET remaining_balance = ? WHERE item_id = ?', patch.remainingBalance, id);
  }
  if (patch.installmentsPaid !== undefined) {
    await db.runAsync('UPDATE loan_details SET installments_paid = ? WHERE item_id = ?', patch.installmentsPaid, id);
  }
}

export async function updateSavingsProgress(id: string, savedAmount: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE savings_details SET saved_amount = ? WHERE item_id = ?', savedAmount, id);
}
