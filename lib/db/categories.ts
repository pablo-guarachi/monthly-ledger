import { getDb, newId } from './client';
import type { Category } from '@/lib/domain/types';

type Row = { id: string; name: string; color: string; icon: string; sort_order: number; is_archived: number };

const toCat = (r: Row): Category => ({
  id: r.id,
  name: r.name,
  color: r.color,
  icon: r.icon,
  sortOrder: r.sort_order,
  isArchived: r.is_archived === 1,
});

export async function listCategories(includeArchived = false): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM categories ${includeArchived ? '' : 'WHERE is_archived = 0'} ORDER BY sort_order ASC, name COLLATE NOCASE ASC`,
  );
  return rows.map(toCat);
}

export async function insertCategory(input: { name: string; color: string; icon: string }): Promise<Category> {
  const db = await getDb();
  const id = `cat_${newId()}`;
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM categories');
  const sort = (max?.m ?? 0) + 10;
  await db.runAsync(
    'INSERT INTO categories (id, name, color, icon, sort_order, is_archived) VALUES (?, ?, ?, ?, ?, 0)',
    id,
    input.name.trim(),
    input.color,
    input.icon,
    sort,
  );
  return { id, name: input.name.trim(), color: input.color, icon: input.icon, sortOrder: sort, isArchived: false };
}

export async function updateCategory(id: string, input: { name: string; color: string; icon: string }): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?', input.name.trim(), input.color, input.icon, id);
}

export async function setCategoryArchived(id: string, archived: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE categories SET is_archived = ? WHERE id = ?', archived ? 1 : 0, id);
}
