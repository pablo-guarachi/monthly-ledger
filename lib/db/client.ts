/**
 * SQLite client (expo-sqlite async API). One connection, WAL, foreign keys on,
 * migrations applied on first open.
 */
import * as SQLite from 'expo-sqlite';

import { migrations } from './migrations';

export const DB_NAME = 'monthly-ledger.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = open();
  }
  return dbPromise;
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await migrate(db);
  return db;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;
  for (const m of migrations) {
    if (m.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(m.sql);
      await db.execAsync(`PRAGMA user_version = ${m.version}`);
    });
    current = m.version;
  }
}

/** Close and forget the connection (used by backup restore). */
export async function resetDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    await db.closeAsync();
    dbPromise = null;
  }
}

export function newId(): string {
  // 20 chars of base36 time + random: unique enough for a single device.
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 12);
  return `${t}${r}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
