import { loanProgress } from '@/lib/domain/loan';
import { savingsProgress } from '@/lib/domain/savings';
import type { CycleSpec } from '@/lib/domain/types';

const monthly: CycleSpec & { amount: number } = {
  cycle: 'monthly',
  cycleEvery: 1,
  cycleUnit: 'month',
  anchorDate: '2026-01-10',
  endDate: null,
  amount: 25000,
};

describe('loanProgress', () => {
  test('with known instalments', () => {
    const p = loanProgress(
      { principalTotal: 600000, remainingBalance: 350000, installmentsTotal: 24, installmentsPaid: 10, interestRateBp: null, lender: null },
      monthly,
      '2026-10-23',
    );
    expect(p.repaid).toBe(250000);
    expect(p.balanceRatio).toBeCloseTo(250000 / 600000, 5);
    expect(p.installmentRatio).toBeCloseTo(10 / 24, 5);
    expect(p.installmentsLeft).toBe(14);
    // next due 2026-11-10, 14 instalments → last one 2027-12-10
    expect(p.payoffDate).toBe('2027-12-10');
  });

  test('without instalment count: derive from balance / amount', () => {
    const p = loanProgress(
      { principalTotal: 100000, remainingBalance: 60000, installmentsTotal: null, installmentsPaid: 4, interestRateBp: null, lender: null },
      monthly,
      '2026-10-23',
    );
    expect(p.installmentRatio).toBeNull();
    expect(p.installmentsLeft).toBe(3); // ceil(60000/25000)
    expect(p.payoffDate).toBe('2027-01-10');
  });

  test('paid off', () => {
    const p = loanProgress(
      { principalTotal: 100000, remainingBalance: 0, installmentsTotal: 4, installmentsPaid: 4, interestRateBp: null, lender: null },
      monthly,
      '2026-10-23',
    );
    expect(p.installmentsLeft).toBe(0);
    expect(p.payoffDate).toBe('2026-10-23');
    expect(p.balanceRatio).toBe(1);
  });
});

describe('savingsProgress', () => {
  test('suggested monthly from target date', () => {
    const p = savingsProgress({ targetAmount: 120000, savedAmount: 20000, targetDate: '2027-08-01' }, 5000, '2026-10-23');
    expect(p.remaining).toBe(100000);
    expect(p.monthsToTarget).toBe(10);
    expect(p.suggestedMonthly).toBe(10000);
    expect(p.behind).toBe(true);
    expect(p.projectedFinish).toBe('2028-06-23'); // 20 months at 50/mo
  });

  test('on track and done', () => {
    const ok = savingsProgress({ targetAmount: 120000, savedAmount: 20000, targetDate: '2027-08-01' }, 10000, '2026-10-23');
    expect(ok.behind).toBe(false);
    const done = savingsProgress({ targetAmount: 1000, savedAmount: 1000, targetDate: null }, 100, '2026-10-23');
    expect(done.ratio).toBe(1);
    expect(done.remaining).toBe(0);
    expect(done.suggestedMonthly).toBeNull();
    expect(done.projectedFinish).toBe('2026-10-23');
  });

  test('no contribution → no projection', () => {
    const p = savingsProgress({ targetAmount: 1000, savedAmount: 0, targetDate: null }, 0, '2026-10-23');
    expect(p.projectedFinish).toBeNull();
    expect(p.suggestedMonthly).toBeNull();
  });
});
