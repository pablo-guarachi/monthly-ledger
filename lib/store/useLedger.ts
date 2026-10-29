import { create } from 'zustand';

import { ensurePeriod, setPaymentStatus } from '@/lib/db/payments';
import { addPeriods, currentPeriod } from '@/lib/domain/date';
import type { Payment, PaymentStatus, Period } from '@/lib/domain/types';
import { onItemChange, useItems } from './useItems';

type State = {
  period: Period;
  payments: Payment[];
  loading: boolean;
  loaded: boolean;
  setPeriod: (p: Period) => Promise<void>;
  shift: (n: number) => Promise<void>;
  goToday: () => Promise<void>;
  refresh: () => Promise<void>;
  setStatus: (paymentId: string, status: PaymentStatus) => Promise<void>;
};

export const useLedger = create<State>((set, get) => ({
  period: currentPeriod(),
  payments: [],
  loading: false,
  loaded: false,

  setPeriod: async (p) => {
    set({ period: p, loading: true });
    const payments = await ensurePeriod(p);
    // ignore stale results if the user moved on
    if (get().period === p) set({ payments, loading: false, loaded: true });
  },
  shift: (n) => get().setPeriod(addPeriods(get().period, n)),
  goToday: () => get().setPeriod(currentPeriod()),

  refresh: async () => {
    const p = get().period;
    const payments = await ensurePeriod(p);
    if (get().period === p) set({ payments, loaded: true, loading: false });
  },

  setStatus: async (paymentId, status) => {
    await setPaymentStatus(paymentId, status);
    await get().refresh();
    // loan / savings progress changed on the item
    await useItems.getState().refresh();
  },
}));

// Any item change re-syncs the month on screen.
onItemChange(async () => {
  await useLedger.getState().refresh();
});
