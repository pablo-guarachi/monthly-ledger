import { View } from 'react-native';

import { Card, Icon, Money, Txt } from '@/lib/components';
import { monthlyEquivalent } from '@/lib/domain/cycle';
import { todayIso } from '@/lib/domain/date';
import { loanProgress } from '@/lib/domain/loan';
import { savingsProgress } from '@/lib/domain/savings';
import type { Item } from '@/lib/domain/types';
import { formatDay, formatPercent } from '@/lib/format';
import { useTheme } from '@/lib/theme/ThemeContext';
import { kindColors, space } from '@/lib/theme/tokens';

/** Loan / savings progress card shown in the item detail. */
export function ItemProgress({ item }: { item: Item }) {
  if (item.kind === 'loan' && item.loan) return <LoanCard item={item} />;
  if (item.kind === 'savings' && item.savings) return <SavingsCard item={item} />;
  return null;
}

function Bar({ ratio, color }: { ratio: number; color: string }) {
  const t = useTheme();
  return (
    <View style={{ height: 10, borderRadius: 5, backgroundColor: t.border, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`, height: 10, backgroundColor: color }} />
    </View>
  );
}

function LoanCard({ item }: { item: Item }) {
  const t = useTheme();
  const loan = item.loan!;
  const p = loanProgress(loan, item, todayIso());
  const color = kindColors.loan!;
  return (
    <Card style={{ marginTop: space.md, gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name="cash-outline" size={18} color={color} />
        <Txt variant="h2" style={{ flex: 1 }}>
          Loan progress
        </Txt>
        <Txt variant="label" tone="muted" mono>
          {formatPercent(p.balanceRatio)}
        </Txt>
      </View>
      <Bar ratio={p.balanceRatio} color={color} />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Stat label="Remaining" minor={loan.remainingBalance} currency={item.currency} />
        <Stat label="Repaid" minor={p.repaid} currency={item.currency} />
        <Stat label="Borrowed" minor={loan.principalTotal} currency={item.currency} />
      </View>
      <View style={{ gap: 4 }}>
        {loan.installmentsTotal !== null ? (
          <Line
            label="Instalments"
            value={`${loan.installmentsPaid} of ${loan.installmentsTotal} paid${p.installmentsLeft ? ` · ${p.installmentsLeft} left` : ''}`}
          />
        ) : p.installmentsLeft !== null ? (
          <Line label="Instalments" value={`${loan.installmentsPaid} paid · about ${p.installmentsLeft} left`} />
        ) : null}
        {p.payoffDate ? (
          <Line label="Paid off" value={p.installmentsLeft === 0 ? 'Done' : formatDay(p.payoffDate, { year: true })} highlight />
        ) : null}
        {loan.interestRateBp !== null ? <Line label="Interest" value={`${(loan.interestRateBp / 100).toFixed(2)}%`} /> : null}
        {loan.lender ? <Line label="Lender" value={loan.lender} /> : null}
      </View>
      <Txt variant="caption" tone="muted">
        Marking an instalment paid lowers the balance by {fmt(item.amount, item.currency)}. Edit the item to correct the balance.
      </Txt>
      <View style={{ height: 0, borderTopWidth: 0, borderColor: t.border }} />
    </Card>
  );
}

function SavingsCard({ item }: { item: Item }) {
  const s = item.savings!;
  const monthly = Math.round(monthlyEquivalent(item.amount, item));
  const p = savingsProgress(s, monthly, todayIso());
  const color = kindColors.savings!;
  return (
    <Card style={{ marginTop: space.md, gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name="leaf-outline" size={18} color={color} />
        <Txt variant="h2" style={{ flex: 1 }}>
          Savings goal
        </Txt>
        <Txt variant="label" tone="muted" mono>
          {formatPercent(p.ratio)}
        </Txt>
      </View>
      <Bar ratio={p.ratio} color={color} />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Stat label="Saved" minor={s.savedAmount} currency={item.currency} />
        <Stat label="To go" minor={p.remaining} currency={item.currency} />
        <Stat label="Goal" minor={s.targetAmount} currency={item.currency} />
      </View>
      <View style={{ gap: 4 }}>
        {s.targetDate ? <Line label="Target date" value={formatDay(s.targetDate, { year: true })} /> : null}
        {p.suggestedMonthly !== null ? (
          <Line
            label="Needed"
            value={`${fmt(p.suggestedMonthly, item.currency)}/mo to hit the date`}
            tone={p.behind ? 'warn' : 'accent'}
          />
        ) : null}
        <Line label="Contributing" value={`${fmt(monthly, item.currency)}/mo`} />
        {p.projectedFinish && p.remaining > 0 ? (
          <Line label="At this pace" value={`done ${formatDay(p.projectedFinish, { year: true })}`} highlight />
        ) : p.remaining === 0 ? (
          <Line label="Status" value="Goal reached" highlight />
        ) : null}
      </View>
      <Txt variant="caption" tone="muted">
        Marking a contribution paid adds {fmt(item.amount, item.currency)} to what you've saved.
      </Txt>
    </Card>
  );
}

function Stat({ label, minor, currency }: { label: string; minor: number; currency: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.surface2, borderRadius: 10, padding: space.md, gap: 2 }}>
      <Txt variant="caption" tone="muted">
        {label}
      </Txt>
      <Money amount={minor} currency={currency} weight="semibold" compact />
    </View>
  );
}

function Line({
  label,
  value,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: 'warn' | 'accent';
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 28 }}>
      <Txt variant="label" tone="muted" style={{ width: 104 }}>
        {label}
      </Txt>
      <Txt weight={highlight ? 'bold' : 'medium'} tone={tone ?? 'ink'} style={{ flex: 1 }} numberOfLines={1}>
        {value}
      </Txt>
    </View>
  );
}

function fmt(minor: number, currency: string): string {
  const sym = currency === 'GBP' ? '£' : '€';
  const v = minor / 100;
  return `${sym}${Number.isInteger(v) ? v : v.toFixed(2)}`;
}
