import { create } from 'zustand';

import { getAllSettings, setSetting } from '@/lib/db/settings';
import type { ThemePref } from '@/lib/theme/tokens';

export type Currency = 'GBP' | 'EUR';

export type SettingsState = {
  hydrated: boolean;
  mainCurrency: Currency;
  /** 1 EUR = x GBP (manual). Stored as decimal string in DB. */
  eurToGbpRate: number;
  /** minor units; null = not set */
  monthlyIncome: number | null;
  defaultReminderDays: number;
  reminderHour: number;
  themePref: ThemePref;
  weekStartsMonday: boolean;

  hydrate: () => Promise<void>;
  setMainCurrency: (c: Currency) => Promise<void>;
  setEurToGbpRate: (r: number) => Promise<void>;
  setMonthlyIncome: (v: number | null) => Promise<void>;
  setDefaultReminderDays: (d: number) => Promise<void>;
  setReminderHour: (h: number) => Promise<void>;
  setThemePref: (p: ThemePref) => Promise<void>;
};

export const useSettings = create<SettingsState>((set) => ({
  hydrated: false,
  mainCurrency: 'GBP',
  eurToGbpRate: 0.85,
  monthlyIncome: null,
  defaultReminderDays: 2,
  reminderHour: 9,
  themePref: 'system',
  weekStartsMonday: true,

  hydrate: async () => {
    const s = await getAllSettings();
    set({
      hydrated: true,
      mainCurrency: s.main_currency === 'EUR' ? 'EUR' : 'GBP',
      eurToGbpRate: parseFloat(s.eur_to_gbp_rate ?? '0.85') || 0.85,
      monthlyIncome: s.monthly_income ? parseInt(s.monthly_income, 10) : null,
      defaultReminderDays: parseInt(s.default_reminder_days ?? '2', 10),
      reminderHour: parseInt(s.reminder_hour ?? '9', 10),
      themePref: (['system', 'light', 'dark'].includes(s.theme_pref) ? s.theme_pref : 'system') as ThemePref,
      weekStartsMonday: s.week_starts_monday !== '0',
    });
  },
  setMainCurrency: async (c) => {
    await setSetting('main_currency', c);
    set({ mainCurrency: c });
  },
  setEurToGbpRate: async (r) => {
    await setSetting('eur_to_gbp_rate', String(r));
    set({ eurToGbpRate: r });
  },
  setMonthlyIncome: async (v) => {
    await setSetting('monthly_income', v === null ? '' : String(v));
    set({ monthlyIncome: v });
  },
  setDefaultReminderDays: async (d) => {
    await setSetting('default_reminder_days', String(d));
    set({ defaultReminderDays: d });
  },
  setReminderHour: async (h) => {
    await setSetting('reminder_hour', String(h));
    set({ reminderHour: h });
  },
  setThemePref: async (p) => {
    await setSetting('theme_pref', p);
    set({ themePref: p });
  },
}));
