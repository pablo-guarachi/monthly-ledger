import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, EmptyState, Header, Money, Screen, Txt } from '@/lib/components';
import { BarChart } from '@/lib/components/BarChart';
import { listPaymentsBetween } from '@/lib/db/payments';
import { currentPeriod } from '@/lib/domain/date';
import { kindMeta } from '@/lib/domain/kinds';
import { byCategory, byKind, monthlyTotals, periodRange, rankedByYearly, yearlyTotal } from '@/lib/domain/stats';
import type { Payment } from '@/lib/domain/types';
import { formatMoney, formatPercent } from '@/lib/format';
import { useItems } from '@/lib/store/useItems';
import { useLedger } from '@/lib/store/useLedger';
import { useSettings } from '@/lib/store/useSettings';
import { useTheme } from '@/lib/theme/ThemeContext';
import { illustrations } from '@/lib/theme/illustrations';
import { space, touch } from '@/lib/theme/tokens';

// Single initials made Jan/Jun/Jul and Mar/May indistinguishable.
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function StatsScreen() {
  const t = useTheme();
  const router = useRouter();
  const items = useItems((s) => s.items);
  const categories = useItems((s) => s.categories);
  const loaded = useItems((s) => s.loaded);
  const ledgerPayments = useLedger((s) => s.payments);
  const mainCurrency = useSettings((s) => s.mainCurrency);
  const eurToGbp = useSettings((s) => s.eurToGbpRate);
  const rates = useMemo(() => ({ eurToGbp }), [eurToGbp]);

  const now = currentPeriod();
  const periods = useMemo(() => periodRange(now, 12), [now]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const load = useCallback(() => {
    listPaymentsBetween(periods[0]!, periods[periods.length - 1]!)
      .then(setPayments)
      .catch(() => {});
  }, [periods]);
  // reload whenever the ledger on the home tab changes (mark paid / skip)
  useEffect(load, [load, ledgerPayments, items]);

  const trend = useMemo(() => monthlyTotals(items, payments, periods, mainCurrency, rates), [items, payments, periods, mainCurrency, rates]);
  const cats = useMemo(() => byCategory(items, categories, mainCurrency, rates), [items, categories, mainCurrency, rates]);
  const kinds = useMemo(() => byKind(items, (k) => kindMeta(k), mainCurrency, rates), [items, mainCurrency, rates]);
  const ranked = useMemo(() => rankedByYearly(items, mainCurrency, rates), [items, mainCurrency, rates]);
  const yearly = yearlyTotal(ranked);
  const monthlyAvg = ranked.reduce((s, r) => s + r.monthly, 0);
  const fmtShort = (v: number) => formatMoney(v, mainCurrency, { compact: true });

  return (
    <Screen>
      <Header title="Stats" settings />
      {loaded && items.length === 0 ? (
        <EmptyState
          icon="bar-chart-outline"
          illustration={illustrations.statisticsStart}
          title="No data yet"
          body="Add a few fixed costs and this page shows your monthly trend, categories and what each item costs per year."
          cta={{ label: 'Add an item', onPress: () => router.push('/item/new') }}
        />
      ) : (
        <View style={{ gap: space.md }}>
          <Card style={{ gap: space.xs, padding: space.xl }}>
            <Txt variant="label" tone="ink2">
              Fixed costs per year
            </Txt>
            <Money amount={yearly} currency={mainCurrency} variant="display" numberOfLines={1} adjustsFontSizeToFit />
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
              <Money amount={monthlyAvg} currency={mainCurrency} weight="semibold" tone="ink2" />
              <Txt variant="label" tone="muted">
                a month · {items.length} active item{items.length === 1 ? '' : 's'}
              </Txt>
            </View>
          </Card>

          <Card style={{ gap: space.md }}>
            <View style={{ gap: 2 }}>
              <Txt variant="h2">Last 12 months</Txt>
              <Txt variant="caption" tone="muted">
                Months without a ledger are projected from today's items.
              </Txt>
            </View>
            <BarChart
              bars={trend.map((p) => ({
                label: MONTH_SHORT[parseInt(p.period.slice(5, 7), 10) - 1]!,
                value: p.amount,
                muted: p.source === 'projected',
                highlight: p.period === now,
              }))}
              format={fmtShort}
              legend={{ solid: 'From your ledger', muted: 'Projected' }}
            />
          </Card>

          {kinds.length ? (
            <Card style={{ gap: space.md }}>
              <Txt variant="h2">By type</Txt>
              {kinds.map((s) => (
                <SliceRow key={s.key} label={s.label} color={s.color} amount={s.amount} ratio={s.ratio} count={s.count} currency={mainCurrency} />
              ))}
            </Card>
          ) : null}

          {cats.length ? (
            <Card style={{ gap: space.md }}>
              <Txt variant="h2">By category</Txt>
              {cats.map((s) => (
                <SliceRow key={s.key} label={s.label} color={s.color} amount={s.amount} ratio={s.ratio} count={s.count} currency={mainCurrency} />
              ))}
            </Card>
          ) : null}

          {ranked.length ? (
            <Card style={{ gap: space.sm }}>
              <Txt variant="h2">Yearly cost by item</Txt>
              {ranked.map((r, i) => (
                <Pressable
                  key={r.item.id}
                  onPress={() => router.push(`/item/${r.item.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${i + 1}. ${r.item.name}, ${formatMoney(r.yearly, mainCurrency)} a year`}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    minHeight: touch,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Txt variant="caption" tone="muted" mono style={{ width: 20 }}>
                    {i + 1}
                  </Txt>
                  <View style={{ width: 6, height: 22, borderRadius: 3, backgroundColor: kindMeta(r.item.kind).color }} />
                  <Txt weight="medium" style={{ flex: 1 }} numberOfLines={1}>
                    {r.item.name}
                  </Txt>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Money amount={r.yearly} currency={mainCurrency} weight="semibold" compact />
                    <Txt variant="caption" tone="muted" mono>
                      {formatPercent(yearly > 0 ? r.yearly / yearly : 0)}
                    </Txt>
                  </View>
                </Pressable>
              ))}
              <View style={{ borderTopWidth: 1, borderTopColor: t.border, paddingTop: space.sm, flexDirection: 'row' }}>
                <Txt variant="label" tone="muted" style={{ flex: 1 }}>
                  Total per year
                </Txt>
                <Money amount={yearly} currency={mainCurrency} weight="bold" compact />
              </View>
            </Card>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function SliceRow({
  label,
  color,
  amount,
  ratio,
  count,
  currency,
}: {
  label: string;
  color: string;
  amount: number;
  ratio: number;
  count: number;
  currency: string;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <Txt weight="medium" style={{ flex: 1 }}>
          {label}
          <Txt variant="caption" tone="muted">
            {'  '}
            {count}
          </Txt>
        </Txt>
        <Money amount={amount} currency={currency} weight="semibold" compact />
        <Txt variant="caption" tone="muted" mono style={{ width: 38, textAlign: 'right' }}>
          {formatPercent(ratio)}
        </Txt>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: t.border, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(ratio * 100)}%`, height: 6, backgroundColor: color }} />
      </View>
    </View>
  );
}
