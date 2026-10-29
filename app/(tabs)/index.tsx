import { useEffect, useMemo } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, EmptyState, Header, Icon, Money, Screen, Txt } from '@/lib/components';
import { currentPeriod, todayIso } from '@/lib/domain/date';
import { kindMeta } from '@/lib/domain/kinds';
import { sortPayments, summarizePeriod } from '@/lib/domain/ledger';
import { formatPeriod } from '@/lib/format';
import { PaymentRow } from '@/lib/features/PaymentRow';
import { confirmLoadSample } from '@/lib/features/SampleData';
import { useItems } from '@/lib/store/useItems';
import { useLedger } from '@/lib/store/useLedger';
import { useSettings } from '@/lib/store/useSettings';
import { useTheme } from '@/lib/theme/ThemeContext';
import { illustrations } from '@/lib/theme/illustrations';
import { radius, space, touch } from '@/lib/theme/tokens';

export default function ThisMonthScreen() {
  const t = useTheme();
  const router = useRouter();
  const items = useItems((s) => s.items);
  const archived = useItems((s) => s.archived);
  const itemsLoaded = useItems((s) => s.loaded);
  const period = useLedger((s) => s.period);
  const payments = useLedger((s) => s.payments);
  const loaded = useLedger((s) => s.loaded);
  const loading = useLedger((s) => s.loading);
  const shift = useLedger((s) => s.shift);
  const goToday = useLedger((s) => s.goToday);
  const refresh = useLedger((s) => s.refresh);
  const setStatus = useLedger((s) => s.setStatus);
  const mainCurrency = useSettings((s) => s.mainCurrency);
  const eurToGbp = useSettings((s) => s.eurToGbpRate);
  const monthlyIncome = useSettings((s) => s.monthlyIncome);

  const today = todayIso();
  const isCurrent = period === currentPeriod();

  useEffect(() => {
    if (!loaded) refresh().catch(() => {});
  }, [loaded, refresh]);

  const itemsById = useMemo(() => new Map([...items, ...archived].map((i) => [i.id, i])), [items, archived]);
  const summary = useMemo(
    () => summarizePeriod(payments, itemsById, { mainCurrency, rates: { eurToGbp }, today, monthlyIncome }),
    [payments, itemsById, mainCurrency, eurToGbp, today, monthlyIncome],
  );
  const sorted = useMemo(() => sortPayments(payments, today), [payments, today]);
  const open = sorted.filter((p) => p.status === 'due');
  const done = sorted.filter((p) => p.status !== 'due');
  const progress = summary.total > 0 ? summary.paid / summary.total : 0;

  const monthNav = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <NavBtn icon="chevron-back" onPress={() => shift(-1)} label="Previous month" />
      {!isCurrent ? (
        <Pressable
          onPress={goToday}
          accessibilityRole="button"
          accessibilityLabel="Back to this month"
          style={({ pressed }) => ({
            height: touch,
            paddingHorizontal: space.md,
            borderRadius: touch / 2,
            justifyContent: 'center',
            backgroundColor: pressed ? t.surface2 : t.accentSoft,
          })}
        >
          <Txt variant="label" tone="accent" weight="bold">
            Today
          </Txt>
        </Pressable>
      ) : null}
      <NavBtn icon="chevron-forward" onPress={() => shift(1)} label="Next month" />
    </View>
  );

  return (
    <Screen refreshing={loading} onRefresh={() => refresh().catch(() => {})}>
      <Header title={formatPeriod(period)} subtitle={isCurrent ? 'This month' : periodHint(period)} settings right={monthNav} />

      {itemsLoaded && items.length === 0 && payments.length === 0 ? (
        <EmptyState
          icon="today-outline"
          illustration={illustrations.emptyLedger}
          title="No fixed costs yet"
          body="Add your subscriptions, rent, loans and savings and this page becomes your monthly checklist."
          cta={{ label: 'Add your first item', onPress: () => router.push('/item/new') }}
          secondary={{ label: 'Try it with sample data', onPress: () => confirmLoadSample() }}
        />
      ) : (
        <View style={{ gap: space.md }}>
          <Card style={{ gap: space.md, padding: space.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
              <Txt variant="label" tone="ink2">
                Fixed costs · {formatPeriod(period, false).split(' ')[0]}
              </Txt>
              <Txt variant="label" tone="muted" mono accessibilityLabel={`${summary.countPaid} of ${summary.countTotal} paid`}>
                {summary.countPaid}/{summary.countTotal} paid
              </Txt>
            </View>
            <Money
              amount={summary.total}
              currency={mainCurrency}
              variant="hero"
              numberOfLines={1}
              adjustsFontSizeToFit
              accessibilityRole="header"
            />
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Paid so far"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
              style={{ height: 10, borderRadius: 5, backgroundColor: t.surface2, overflow: 'hidden' }}
            >
              <View style={{ width: `${Math.round(progress * 100)}%`, height: 10, borderRadius: 5, backgroundColor: t.accent }} />
            </View>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Mini label="Paid" minor={summary.paid} currency={mainCurrency} />
              <Mini label="Still to pay" minor={summary.due} currency={mainCurrency} />
              {summary.overdue > 0 ? (
                <Mini label={`${summary.countOverdue} overdue`} minor={summary.overdue} currency={mainCurrency} tone="danger" />
              ) : null}
            </View>
            {summary.leftAfterFixed !== null ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  paddingTop: space.md,
                  borderTopWidth: 1,
                  borderTopColor: t.border,
                }}
              >
                <Icon name="wallet-outline" size={18} color={t.ink2} />
                <Txt variant="label" tone="ink2" style={{ flex: 1 }}>
                  Left after fixed costs
                </Txt>
                <Money
                  amount={summary.leftAfterFixed}
                  currency={mainCurrency}
                  variant="h2"
                  weight="bold"
                  tone={summary.leftAfterFixed < 0 ? 'danger' : 'accent'}
                />
              </View>
            ) : null}
          </Card>

          {summary.byKind.length > 1 ? (
            <Card style={{ gap: space.sm }}>
              <Txt variant="label" tone="ink2">
                Where it goes
              </Txt>
              <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
                {summary.byKind.map((k) => (
                  <View key={k.kind} style={{ flex: Math.max(k.amount, 1), backgroundColor: kindMeta(k.kind).color }} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.xs }}>
                {summary.byKind.map((k) => (
                  <View key={k.kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: kindMeta(k.kind).color }} />
                    <Txt variant="caption" tone="muted">
                      {kindMeta(k.kind).plural}
                    </Txt>
                    <Money amount={k.amount} currency={mainCurrency} variant="caption" tone="ink2" compact />
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {payments.length === 0 && loaded ? (
            <Txt tone="muted" center style={{ paddingVertical: space.xxl }}>
              Nothing falls in {formatPeriod(period, false)}.
            </Txt>
          ) : null}

          {open.length ? (
            <Section title="To pay" count={open.length}>
              {open.map((p) => (
                <PaymentRow key={p.id} payment={p} item={itemsById.get(p.itemId)} today={today} onSetStatus={setStatus} />
              ))}
            </Section>
          ) : payments.length ? (
            <Card tone="accent" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Image source={illustrations.monthComplete} accessible={false} resizeMode="contain" style={{ width: 72, height: 72 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt weight="bold">All paid for {formatPeriod(period, false)}</Txt>
                <Txt variant="caption" tone="ink2">
                  Nothing left to tick off this month.
                </Txt>
              </View>
            </Card>
          ) : null}

          {done.length ? (
            <Section title="Done" count={done.length}>
              {done.map((p) => (
                <PaymentRow key={p.id} payment={p} item={itemsById.get(p.itemId)} today={today} onSetStatus={setStatus} />
              ))}
            </Section>
          ) : null}

          <Txt variant="caption" tone="muted" center style={{ marginTop: space.md }}>
            Tap a row to mark it paid · hold it to skip or undo
          </Txt>
        </View>
      )}
    </Screen>
  );
}

function NavBtn({ icon, onPress, label }: { icon: 'chevron-back' | 'chevron-forward'; onPress: () => void; label: string }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: touch,
        height: touch,
        borderRadius: touch / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? t.surface2 : 'transparent',
      })}
    >
      <Icon name={icon} size={22} color={t.ink} />
    </Pressable>
  );
}

function Mini({ label, minor, currency, tone = 'ink' }: { label: string; minor: number; currency: string; tone?: 'ink' | 'danger' }) {
  return (
    <View style={{ flex: 1, gap: 1 }}>
      <Txt variant="caption" tone={tone === 'danger' ? 'danger' : 'muted'}>
        {label}
      </Txt>
      <Money amount={minor} currency={currency} weight="semibold" tone={tone} numberOfLines={1} adjustsFontSizeToFit />
    </View>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm, paddingHorizontal: space.xs, marginTop: space.sm }}>
        <Txt variant="label" tone="muted">
          {title}
        </Txt>
        <Txt variant="caption" tone="muted" mono>
          {count}
        </Txt>
      </View>
      <View style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, paddingVertical: 2 }}>
        {children}
      </View>
    </View>
  );
}

/** "3 months ago" / "Next month" under the month title when browsing away from today */
function periodHint(period: string): string {
  const [y, m] = period.split('-').map((n) => parseInt(n, 10));
  const [cy, cm] = currentPeriod().split('-').map((n) => parseInt(n, 10));
  const diff = (y! - cy!) * 12 + (m! - cm!);
  if (diff === -1) return 'Last month';
  if (diff === 1) return 'Next month';
  return diff < 0 ? `${-diff} months ago` : `In ${diff} months`;
}
