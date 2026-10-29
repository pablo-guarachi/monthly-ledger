import { kindColors } from '@/lib/theme/tokens';
import type { Kind } from './types';

export type KindMeta = {
  key: Kind;
  label: string;
  plural: string;
  icon: string;
  color: string;
  defaultAutopay: boolean;
  defaultCategoryId: string | null;
  /** copy for the amount field */
  amountLabel: string;
};

export const KINDS: KindMeta[] = [
  {
    key: 'subscription',
    label: 'Subscription',
    plural: 'Subscriptions',
    icon: 'repeat-outline',
    color: kindColors.subscription!,
    defaultAutopay: true,
    defaultCategoryId: 'cat_streaming',
    amountLabel: 'Price',
  },
  {
    key: 'loan',
    label: 'Loan',
    plural: 'Loans',
    icon: 'cash-outline',
    color: kindColors.loan!,
    defaultAutopay: true,
    defaultCategoryId: 'cat_loans',
    amountLabel: 'Instalment',
  },
  {
    key: 'housing',
    label: 'Rent / mortgage',
    plural: 'Housing',
    icon: 'home-outline',
    color: kindColors.housing!,
    defaultAutopay: true,
    defaultCategoryId: 'cat_home',
    amountLabel: 'Amount',
  },
  {
    key: 'utility',
    label: 'Bill',
    plural: 'Bills',
    icon: 'flash-outline',
    color: kindColors.utility!,
    defaultAutopay: true,
    defaultCategoryId: 'cat_utilities',
    amountLabel: 'Amount',
  },
  {
    key: 'insurance',
    label: 'Insurance',
    plural: 'Insurance',
    icon: 'shield-outline',
    color: kindColors.insurance!,
    defaultAutopay: true,
    defaultCategoryId: 'cat_insurance',
    amountLabel: 'Premium',
  },
  {
    key: 'savings',
    label: 'Savings',
    plural: 'Savings',
    icon: 'leaf-outline',
    color: kindColors.savings!,
    defaultAutopay: false,
    defaultCategoryId: 'cat_savings',
    amountLabel: 'Contribution',
  },
  {
    key: 'other',
    label: 'Other',
    plural: 'Other',
    icon: 'ellipsis-horizontal-circle-outline',
    color: kindColors.other!,
    defaultAutopay: true,
    defaultCategoryId: 'cat_other',
    amountLabel: 'Amount',
  },
];

export const KIND_BY_KEY: Record<Kind, KindMeta> = Object.fromEntries(KINDS.map((k) => [k.key, k])) as Record<
  Kind,
  KindMeta
>;

export function kindMeta(kind: Kind): KindMeta {
  return KIND_BY_KEY[kind] ?? KIND_BY_KEY.other;
}
