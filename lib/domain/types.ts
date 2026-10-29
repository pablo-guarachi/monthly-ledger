import type { ISODate, Period } from './date';

export type { ISODate, Period };

export type Kind = 'subscription' | 'loan' | 'housing' | 'utility' | 'insurance' | 'savings' | 'other';
export type Cycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type CycleUnit = 'day' | 'month';
export type Currency = 'GBP' | 'EUR';
export type PaymentStatus = 'due' | 'paid' | 'skipped';

export type CycleSpec = {
  cycle: Cycle;
  cycleEvery: number;
  cycleUnit: CycleUnit;
  anchorDate: ISODate;
  endDate: ISODate | null;
};

export type LoanDetails = {
  principalTotal: number;
  remainingBalance: number;
  installmentsTotal: number | null;
  installmentsPaid: number;
  interestRateBp: number | null;
  lender: string | null;
};

export type SavingsDetails = {
  targetAmount: number;
  savedAmount: number;
  targetDate: ISODate | null;
};

export type Item = CycleSpec & {
  id: string;
  kind: Kind;
  name: string;
  /** minor units */
  amount: number;
  currency: Currency;
  nextDueDate: ISODate;
  categoryId: string | null;
  paymentMethod: string | null;
  autopay: boolean;
  /** null = use global default; 0 = no reminder */
  reminderDays: number | null;
  notes: string | null;
  url: string | null;
  icon: string | null;
  color: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  loan: LoanDetails | null;
  savings: SavingsDetails | null;
};

export type ItemInput = Omit<Item, 'id' | 'nextDueDate' | 'isArchived' | 'archivedAt' | 'createdAt' | 'updatedAt'>;

export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  isArchived: boolean;
};

export type Payment = {
  id: string;
  itemId: string;
  period: Period;
  dueDate: ISODate;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  paidAt: string | null;
  note: string | null;
  createdAt: string;
};
