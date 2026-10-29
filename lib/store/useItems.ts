import { create } from 'zustand';

import { listCategories } from '@/lib/db/categories';
import { getItem, insertItem, listItems, setArchived, updateItem } from '@/lib/db/items';
import type { Category, Item, ItemInput } from '@/lib/domain/types';

/** Hooks other modules register to react to item changes (ledger sync, reminders). */
type ChangeListener = (item: Item, reason: 'create' | 'update' | 'archive' | 'restore') => Promise<void>;
const listeners: ChangeListener[] = [];
export function onItemChange(fn: ChangeListener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}
async function notify(item: Item, reason: Parameters<ChangeListener>[1]) {
  for (const fn of listeners) {
    try {
      await fn(item, reason);
    } catch {
      // listeners must never break the save path
    }
  }
}

type State = {
  loaded: boolean;
  items: Item[];
  archived: Item[];
  categories: Category[];
  refresh: () => Promise<void>;
  create: (input: ItemInput) => Promise<Item>;
  update: (id: string, input: ItemInput) => Promise<Item>;
  archive: (id: string) => Promise<void>;
  restore: (id: string) => Promise<void>;
  byId: (id: string) => Item | undefined;
};

export const useItems = create<State>((set, get) => ({
  loaded: false,
  items: [],
  archived: [],
  categories: [],

  refresh: async () => {
    const [items, archived, categories] = await Promise.all([
      listItems({ archived: false }),
      listItems({ archived: true }),
      listCategories(true),
    ]);
    set({ items, archived, categories, loaded: true });
  },

  create: async (input) => {
    const item = await insertItem(input);
    await notify(item, 'create');
    await get().refresh();
    return item;
  },

  update: async (id, input) => {
    const item = await updateItem(id, input);
    await notify(item, 'update');
    await get().refresh();
    return item;
  },

  archive: async (id) => {
    await setArchived(id, true);
    const item = await getItem(id);
    if (item) await notify(item, 'archive');
    await get().refresh();
  },

  restore: async (id) => {
    await setArchived(id, false);
    const item = await getItem(id);
    if (item) await notify(item, 'restore');
    await get().refresh();
  },

  byId: (id) => get().items.find((i) => i.id === id) ?? get().archived.find((i) => i.id === id),
}));
