import { getDb, newId, nowIso } from './client';
import { listItems } from './items';
import { currentPeriod } from '@/lib/domain/date';
import { buildOccurrences } from '@/lib/domain/ledger';
import type { Currency, Payment, PaymentStatus, Period } from '@/lib/domain/types';

type Row = {
  id: string;
  item_id: string;
  period: string;
  due_date: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  note: string | null;
  created_at: string;
};

const toPayment = (r: Row): Payment => ({
  id: r.id,
  itemId: r.item_id,
  period: r.period,
  dueDate: r.due_date,
  amount: r.amount,
  currency: r.currency as Currency,
  status: r.status as PaymentStatus,
  paidAt: r.paid_at,
  note: r.note,
  createdAt: r.created_at,
});

export async function listPayments(period: Period): Promise<Payment[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>('SELECT * FROM payments WHERE period = ? ORDER BY due_date ASC', period);
  return rows.map(toPayment);
}

export async function listPaymentsForItem(itemId: string): Promise<Payment[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>('SELECT * FROM payments WHERE item_id = ? ORDER BY period DESC', itemId);
  return rows.map(toPayment);
}

export async function listPaymentsBetween(fromPeriod: Period, toPeriod: Period): Promise<Payment[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM payments WHERE period >= ? AND period <= ? ORDER BY period ASC, due_date ASC',
    fromPeriod,
    toPeriod,
  );
  return rows.map(toPayment);
}

/**
 * Make the period's rows match the current item specs:
 * - insert missing `due` rows for active items with occurrences,
 * - for periods ≥ current month, re-sync unpaid `due` rows (amount, due date, currency),
 * - remove `due` rows whose item no longer has an occurrence (archived, cycle changed).
 * Paid and skipped rows are never touched (history is a snapshot).
 */
export async function ensurePeriod(period: Period): Promise<Payment[]> {
  const db = await getDb();
  const items = await listItems({ archived: false });
  const expected = buildOccurrences(items, period);
  const existing = await listPayments(period);
  const byItem = new Map(existing.map((p) => [p.itemId, p]));
  const syncDue = period >= currentPeriod();
  const now = nowIso();

  await db.withTransactionAsync(async () => {
    const seen = new Set<string>();
    for (const occ of expected) {
      seen.add(occ.itemId);
      const row = byItem.get(occ.itemId);
      if (!row) {
        await db.runAsync(
          `INSERT INTO payments (id, item_id, period, due_date, amount, currency, status, paid_at, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'due', NULL, NULL, ?)`,
          newId(),
          occ.itemId,
          period,
          occ.dueDate,
          occ.amount,
          occ.currency,
          now,
        );
      } else if (
        syncDue &&
        row.status === 'due' &&
        (row.amount !== occ.amount || row.dueDate !== occ.dueDate || row.currency !== occ.currency)
      ) {
        await db.runAsync(
          'UPDATE payments SET amount = ?, due_date = ?, currency = ? WHERE id = ?',
          occ.amount,
          occ.dueDate,
          occ.currency,
          row.id,
        );
      }
    }
    for (const row of existing) {
      if (row.status === 'due' && !seen.has(row.itemId)) {
        await db.runAsync('DELETE FROM payments WHERE id = ?', row.id);
      }
    }
  });

  return listPayments(period);
}

/**
 * Change a payment's status and keep loan/savings progress in step:
 * paid ⇒ loan balance −amount, instalments +1; savings saved +amount.
 * Leaving `paid` reverses it. Runs in one transaction.
 */
export async function setPaymentStatus(paymentId: string, status: PaymentStatus): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const p = await db.getFirstAsync<Row>('SELECT * FROM payments WHERE id = ?', paymentId);
    if (!p || p.status === status) return;
    const item = await db.getFirstAsync<{ kind: string }>('SELECT kind FROM items WHERE id = ?', p.item_id);
    const wasPaid = p.status === 'paid';
    const willBePaid = status === 'paid';
    const delta = willBePaid && !wasPaid ? 1 : wasPaid && !willBePaid ? -1 : 0;

    await db.runAsync(
      'UPDATE payments SET status = ?, paid_at = ? WHERE id = ?',
      status,
      willBePaid ? nowIso() : null,
      paymentId,
    );

    if (delta !== 0 && item?.kind === 'loan') {
      await db.runAsync(
        `UPDATE loan_details
           SET remaining_balance = MAX(0, remaining_balance - (? * ?)),
               installments_paid = MAX(0, installments_paid + ?)
         WHERE item_id = ?`,
        delta,
        p.amount,
        delta,
        p.item_id,
      );
    }
    if (delta !== 0 && item?.kind === 'savings') {
      await db.runAsync(
        'UPDATE savings_details SET saved_amount = MAX(0, saved_amount + (? * ?)) WHERE item_id = ?',
        delta,
        p.amount,
        p.item_id,
      );
    }
  });
}

export async function setPaymentNote(paymentId: string, note: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE payments SET note = ? WHERE id = ?', note, paymentId);
}

export async function listPeriodsWithPayments(): Promise<Period[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ period: string }>('SELECT DISTINCT period FROM payments ORDER BY period ASC');
  return rows.map((r) => r.period);
}
