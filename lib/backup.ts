/**
 * Backup / restore / CSV export through the share sheet and the document picker.
 */
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { dumpAll, restoreAll, validateBackup } from '@/lib/db/backup';
import { listAllItems } from '@/lib/db/items';
import { listPaymentsBetween } from '@/lib/db/payments';
import { todayIso } from '@/lib/domain/date';
import { reconcile } from '@/lib/notifications';
import { useItems } from '@/lib/store/useItems';
import { useLedger } from '@/lib/store/useLedger';
import { useSettings } from '@/lib/store/useSettings';

async function shareText(name: string, text: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name, UTI: mimeType === 'application/json' ? 'public.json' : 'public.comma-separated-values-text' });
}

export async function exportBackup(): Promise<string> {
  const data = await dumpAll();
  const name = `monthly-ledger-backup-${todayIso()}.json`;
  await shareText(name, JSON.stringify(data, null, 1), 'application/json');
  return name;
}

export type RestoreSummary = { items: number; payments: number; exportedAt: string };

/** Pick a file; returns null when cancelled. Does NOT restore yet (caller confirms). */
export async function pickBackup(): Promise<{ parsed: ReturnType<typeof validateBackup>; summary: RestoreSummary } | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.[0]) return null;
  const file = new File(res.assets[0].uri);
  const text = await file.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const parsed = validateBackup(json);
  return {
    parsed,
    summary: { items: parsed.tables.items.length, payments: parsed.tables.payments.length, exportedAt: parsed.exportedAt },
  };
}

export async function restoreBackup(parsed: ReturnType<typeof validateBackup>): Promise<void> {
  await restoreAll(parsed);
  await useSettings.getState().hydrate();
  await useItems.getState().refresh();
  await useLedger.getState().refresh();
  await reconcile().catch(() => {});
}

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Ledger rows for all time as CSV (period, due date, item, type, amount, currency, status, paid at, note). */
export async function exportCsv(): Promise<string> {
  const items = await listAllItems();
  const byId = new Map(items.map((i) => [i.id, i]));
  const payments = await listPaymentsBetween('0000-00', '9999-99');
  const lines = ['period,due_date,item,type,amount,currency,status,paid_at,note'];
  for (const p of payments) {
    const it = byId.get(p.itemId);
    lines.push(
      [p.period, p.dueDate, it?.name ?? '', it?.kind ?? '', (p.amount / 100).toFixed(2), p.currency, p.status, p.paidAt ?? '', p.note ?? '']
        .map(csvCell)
        .join(','),
    );
  }
  const name = `monthly-ledger-${todayIso()}.csv`;
  await shareText(name, lines.join('\n'), 'text/csv');
  return name;
}
