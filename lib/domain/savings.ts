/**
 * Savings goals: progress, suggested monthly contribution, projected finish.
 */
import { addMonthsClamped, monthsBetween, type ISODate } from './date';
import type { SavingsDetails } from './types';

export type SavingsProgress = {
  ratio: number;
  remaining: number;
  /** what you'd need to put aside each month to hit the target date; null without a date or when done */
  suggestedMonthly: number | null;
  monthsToTarget: number | null;
  /** when you'd finish at the current contribution (monthly-equivalent), null if contribution is 0 or done */
  projectedFinish: ISODate | null;
  /** true when the current contribution is lower than what the target date needs */
  behind: boolean;
};

export function savingsProgress(s: SavingsDetails, monthlyContribution: number, today: ISODate): SavingsProgress {
  const remaining = Math.max(0, s.targetAmount - s.savedAmount);
  const ratio = s.targetAmount > 0 ? Math.min(1, s.savedAmount / s.targetAmount) : 0;

  let monthsToTarget: number | null = null;
  let suggestedMonthly: number | null = null;
  if (s.targetDate && remaining > 0) {
    monthsToTarget = Math.max(1, monthsBetween(today, s.targetDate));
    suggestedMonthly = Math.ceil(remaining / monthsToTarget);
  }

  let projectedFinish: ISODate | null = null;
  if (remaining === 0) {
    projectedFinish = today;
  } else if (monthlyContribution > 0) {
    const months = Math.ceil(remaining / monthlyContribution);
    projectedFinish = addMonthsClamped(today, months);
  }

  const behind = suggestedMonthly !== null && monthlyContribution < suggestedMonthly;
  return { ratio, remaining, suggestedMonthly, monthsToTarget, projectedFinish, behind };
}
