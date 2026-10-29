/**
 * Whole-database dump/restore for JSON backups. Row shapes are the raw table
 * columns so a backup survives app upgrades (migrations run on restore).
 */
import { getDb } from './client';
import { SCHEMA_VERSION } from './migrations';

export const BACKUP_APP = 'monthly-ledger';
export const BACKUP_FORMAT = 1;

type Row = Record<string, string | number | null>;

export type BackupFile = {
  app: typeof BACKUP_APP;
  format: number;
  schemaVersion: number;
  exportedAt: string;
  tables: {
    settings: Row[];
    categories: Row[];
    items: Row[];
    loan_details: Row[];
    savings_details: Row[];
    payments: Row[];
  };
};

const TABLES = ['settings', 'categories', 'items', 'loan_details', 'savings_details', 'payments'] as const;
type Table = (typeof TABLES)[number];

export async function dumpAll(): Promise<BackupFile> {
  const db = await getDb();
  const tables = {} as BackupFile['tables'];
  for (const t of TABLES) {
    tables[t] = await db.getAllAsync<Row>(`SELECT * FROM ${t}`);
  }
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

export function validateBackup(data: unknown): BackupFile {
  if (!data || typeof data !== 'object') throw new Error('Not a backup file.');
  const d = data as Partial<BackupFile>;
  if (d.app !== BACKUP_APP) throw new Error('This file is not a Monthly Ledger backup.');
  if (typeof d.format !== 'number' || d.format > BACKUP_FORMAT) throw new Error('Backup was made by a newer app version.');
  if (!d.tables || typeof d.tables !== 'object') throw new Error('Backup has no data.');
  for (const t of TABLES) {
    if (!Array.isArray((d.tables as Record<string, unknown>)[t])) throw new Error(`Backup is missing the "${t}" table.`);
  }
  return d as BackupFile;
}

/** Replace everything with the backup's rows, in one transaction. */
export async function restoreAll(backup: BackupFile): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    // children first
    for (const t of [...TABLES].reverse()) await db.execAsync(`DELETE FROM ${t}`);
    for (const t of TABLES) {
      const rows = backup.tables[t];
      if (!rows.length) continue;
      // only columns that exist in the current schema (tolerates older/newer backups)
      const cols = (await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name);
      const present = cols.filter((c) => c in rows[0]!);
      const sql = `INSERT INTO ${t} (${present.join(', ')}) VALUES (${present.map(() => '?').join(', ')})`;
      for (const r of rows) {
        await db.runAsync(sql, ...present.map((c) => (r[c] === undefined ? null : r[c])));
      }
    }
  });
}

export async function counts(): Promise<Record<Table, number>> {
  const db = await getDb();
  const out = {} as Record<Table, number>;
  for (const t of TABLES) {
    const r = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`);
    out[t] = r?.n ?? 0;
  }
  return out;
}
