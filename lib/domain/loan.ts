/**
 * Loan progress: instalments, remaining balance, projected payoff.
 */
import { nextDueOnOrAfter, nthOccurrence } from './cycle';
import type { ISODate } from './date';
import type { CycleSpec, LoanDetails } from './types';

export type LoanProgress = {
  /** 0..1 by balance repaid (principal − remaining) / principal */
  balanceRatio: number;
  /** 0..1 by instalments, or null when total unknown */
  installmentRatio: number | null;
  installmentsLeft: number | null;
  payoffDate: ISODate | null;
  repaid: number;
};

export function loanProgress(
  loan: LoanDetails,
  spec: CycleSpec & { amount: number },
  today: ISODate,
): LoanProgress {
  const repaid = Math.max(0, loan.principalTotal - loan.remainingBalance);
  const balanceRatio = loan.principalTotal > 0 ? Math.min(1, repaid / loan.principalTotal) : 0;

  let installmentsLeft: number | null = null;
  if (loan.installmentsTotal !== null) {
    installmentsLeft = Math.max(0, loan.installmentsTotal - loan.installmentsPaid);
  } else if (spec.amount > 0) {
    installmentsLeft = Math.ceil(loan.remainingBalance / spec.amount);
  }

  const installmentRatio =
    loan.installmentsTotal !== null && loan.installmentsTotal > 0
      ? Math.min(1, loan.installmentsPaid / loan.installmentsTotal)
      : null;

  let payoffDate: ISODate | null = null;
  if (installmentsLeft !== null) {
    if (installmentsLeft === 0 || loan.remainingBalance === 0) {
      payoffDate = today;
    } else {
      const next = nextDueOnOrAfter(spec, today);
      if (next) {
        // index of `next` relative to anchor, then step forward installmentsLeft − 1
        let n = 0;
        while (nthOccurrence(spec, n) < next && n < 2000) n++;
        payoffDate = nthOccurrence(spec, n + installmentsLeft - 1);
      }
    }
  }

  return { balanceRatio, installmentRatio, installmentsLeft, payoffDate, repaid };
}
