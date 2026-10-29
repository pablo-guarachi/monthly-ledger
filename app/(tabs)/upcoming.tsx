import { useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, Chip, EmptyState, Header, Icon, Money, Screen, Txt } from '@/lib/components';
import { addDays, daysBetween, todayIso } from '@/lib/domain/date';
import { kindMeta } from '@/lib/domain/kinds';
import { convert } from '@/lib/domain/money';
import { ended, endingSoon, groupByDay, upcomingCharges } from '@/lib/domain/upcoming';
import { formatDay, formatMoney } from '@/lib/format';
import { useItems } from '@/lib/store/useItems';
import { useSettings } from '@/lib/store/useSettings';
import { useTheme } from '@/lib/theme/ThemeContext';
import { illustrations } from '@/lib/theme/illustrations';
import { radius, space, touch } from '@/lib/theme/tokens';

export default function UpcomingScreen() {
  const t = useTheme();
  const router = useRouter();
  const items = useItems((s) => s.items);
  const loaded = useItems((s) => s.loaded);
  const mainCurrency = useSettings((s) => s.mainCurrency);
  const eurToGbp = useSettings((s) => s.eurToGbpRate);
  const [days, setDays] = useState<30 | 60 | 90>(30);
  const today = todayIso();

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const charges = useMemo(() => upcomingCharges(items, today, addDays(today, days)), [items, today, days]);
  const groups = useMemo(() => groupByDay(charges), [charges]);
  const inMain = (amount: number, currency: 'GBP' | 'EUR') => convert(amount, currency, mainCurrency, { eurToGbp });
  const next7 = charges.filter((c) => daysBetween(today, c.date) <= 7).reduce((s, c) => s + inMain(c.amount, c.currency), 0);
  const total = charges.reduce((s, c) => s + inMain(c.amount, c.currency), 0);
  const soon = useMemo(() => endingSoon(items, today, 30), [items, today]);
  const past = useMemo(() => ended(items, today), [items, today]);

  return (
    <Screen>
      <Header title="Upcoming" settings />

      {loaded && items.length === 0 ? (
        <EmptyState
          icon="time-outline"
          illustration={illustrations.upcomingClear}
          title="Nothing scheduled"
          body="Once you add fixed costs, every upcoming charge shows up here by day."
          cta={{ label: 'Add an item', onPress: () => router.push('/item/new') }}
        />
      ) : (
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {([30, 60, 90] as const).map((d) => (
              <Chip key={d} label={`${d} days`} selected={days === d} onPress={() => setDays(d)} />
            ))}
          </View>

          <Card style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="label" tone="ink2">
                Next 7 days
              </Txt>
              <Money amount={next7} currency={mainCurrency} variant="h1" numberOfLines={1} adjustsFontSizeToFit />
            </View>
            <View style={{ width: 1, backgroundColor: t.border }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="label" tone="ink2">
                Next {days} days · {charges.length} charge{charges.length === 1 ? '' : 's'}
              </Txt>
              <Money amount={total} currency={mainCurrency} variant="h1" numberOfLines={1} adjustsFontSizeToFit />
            </View>
          </Card>

          {past.length ? (
            <Card tone="danger" style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Icon name="alert-circle-outline" size={18} color={t.danger} />
                <Txt weight="bold" tone="danger">
                  Ended · archive?
                </Txt>
              </View>
              {past.map((i) => (
                <Pressable key={i.id} onPress={() => router.push(`/item/${i.id}`)} style={{ flexDirection: 'row', minHeight: touch, alignItems: 'center', gap: space.sm }}>
                  <Txt weight="medium" style={{ flex: 1 }}>
                    {i.name}
                  </Txt>
                  <Txt variant="caption" tone="danger">
                    ended {formatDay(i.endDate!)}
                  </Txt>
                </Pressable>
              ))}
            </Card>
          ) : null}

          {soon.length ? (
            <Card tone="warn" style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Icon name="hourglass-outline" size={18} color={t.warn} />
                <Txt weight="bold" tone="warn">
                  Ending soon · cancel or renew?
                </Txt>
              </View>
              {soon.map((i) => (
                <Pressable key={i.id} onPress={() => router.push(`/item/${i.id}`)} style={{ flexDirection: 'row', minHeight: touch, alignItems: 'center', gap: space.sm }}>
                  <Txt weight="medium" style={{ flex: 1 }}>
                    {i.name}
                  </Txt>
                  <Txt variant="caption" tone="warn">
                    {formatDay(i.endDate!)} · in {daysBetween(today, i.endDate!)}d
                  </Txt>
                </Pressable>
              ))}
            </Card>
          ) : null}

          {groups.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: space.xl, gap: space.sm }}>
              <Image source={illustrations.upcomingClear} accessible={false} resizeMode="contain" style={{ width: 120, height: 120 }} />
              <Txt tone="ink2" center>
                No charges in the next {days} days.
              </Txt>
            </View>
          ) : (
            groups.map((g) => {
              const d = daysBetween(today, g.date);
              const label = d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : formatDay(g.date, { weekday: true });
              const dayTotal = g.charges.reduce((s, c) => s + inMain(c.amount, c.currency), 0);
              return (
                <View key={g.date} style={{ gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: space.xs, marginTop: space.sm }}>
                    <Txt variant="label" tone={d === 0 ? 'accent' : 'muted'} style={{ flex: 1 }}>
                      {label}
                      {d > 1 ? ` · in ${d}d` : ''}
                    </Txt>
                    {g.charges.length > 1 ? <Money amount={dayTotal} currency={mainCurrency} variant="caption" tone="muted" /> : null}
                  </View>
                  <View style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border }}>
                    {g.charges.map((c, idx) => {
                      const it = itemsById.get(c.itemId);
                      const meta = kindMeta(it?.kind ?? 'other');
                      return (
                        <Pressable
                          key={`${c.itemId}-${c.date}`}
                          onPress={() => router.push(`/item/${c.itemId}`)}
                          accessibilityRole="button"
                          accessibilityLabel={`${it?.name ?? 'Item'}, ${formatMoney(c.amount, c.currency)}, ${label}`}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: space.md,
                            paddingVertical: space.md,
                            paddingHorizontal: space.md,
                            borderTopWidth: idx === 0 ? 0 : 1,
                            borderTopColor: t.border,
                            backgroundColor: pressed ? t.surface2 : 'transparent',
                          })}
                        >
                          <View style={{ width: 6, height: 24, borderRadius: 3, backgroundColor: meta.color }} />
                          <View style={{ flex: 1 }}>
                            <Txt weight="semibold" numberOfLines={1}>
                              {it?.name ?? '—'}
                            </Txt>
                            <Txt variant="caption" tone="muted">
                              {meta.label}
                              {it?.autopay ? ' · automatic' : ' · pay by hand'}
                            </Txt>
                          </View>
                          <Money amount={c.amount} currency={c.currency} weight="semibold" />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
    </Screen>
  );
}
