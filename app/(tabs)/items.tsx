import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, EmptyState, Header, Icon, Money, Screen, Txt } from '@/lib/components';
import { TextField } from '@/lib/components/form';
import { monthlyEquivalent } from '@/lib/domain/cycle';
import { todayIso } from '@/lib/domain/date';
import { KINDS } from '@/lib/domain/kinds';
import { convert } from '@/lib/domain/money';
import type { Item, Kind } from '@/lib/domain/types';
import { ItemRow } from '@/lib/features/ItemRow';
import { confirmLoadSample } from '@/lib/features/SampleData';
import { formatMoney } from '@/lib/format';
import { illustrations } from '@/lib/theme/illustrations';
import { useItems } from '@/lib/store/useItems';
import { useSettings } from '@/lib/store/useSettings';
import { useTheme } from '@/lib/theme/ThemeContext';
import { radius, space } from '@/lib/theme/tokens';

type Sort = 'due' | 'amount' | 'name';

export default function ItemsScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useItems((s) => s.items);
  const archived = useItems((s) => s.archived);
  const categories = useItems((s) => s.categories);
  const loaded = useItems((s) => s.loaded);
  const mainCurrency = useSettings((s) => s.mainCurrency);
  const eurToGbp = useSettings((s) => s.eurToGbpRate);

  const [kind, setKind] = useState<Kind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('due');
  const [showArchived, setShowArchived] = useState(false);
  const today = todayIso();

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items.filter((i) => (kind === 'all' || i.kind === kind) && (!q || i.name.toLowerCase().includes(q)));
    const monthlyMain = (i: Item) => convert(Math.round(monthlyEquivalent(i.amount, i)), i.currency, mainCurrency, { eurToGbp });
    list = [...list].sort((a, b) => {
      if (sort === 'amount') return monthlyMain(b) - monthlyMain(a);
      if (sort === 'name') return a.name.localeCompare(b.name);
      return a.nextDueDate.localeCompare(b.nextDueDate) || a.name.localeCompare(b.name);
    });
    return list;
  }, [items, kind, query, sort, mainCurrency, eurToGbp]);

  const totalMonthly = useMemo(
    () =>
      visible.reduce(
        (sum, i) => sum + convert(Math.round(monthlyEquivalent(i.amount, i)), i.currency, mainCurrency, { eurToGbp }),
        0,
      ),
    [visible, mainCurrency, eurToGbp],
  );

  const counts = useMemo(() => {
    const m = new Map<Kind, number>();
    for (const i of items) m.set(i.kind, (m.get(i.kind) ?? 0) + 1);
    return m;
  }, [items]);

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomInset={64}>
        <Header title="Items" subtitle={items.length ? `${items.length} active · ≈ ${fmt(totalMonthly, mainCurrency)}/mo` : undefined} settings />

        {items.length === 0 && loaded ? (
          <EmptyState
            icon="layers-outline"
            illustration={illustrations.emptyLedger}
            title="No fixed costs yet"
            body="Add your subscriptions, rent, loans and savings. You'll see them all in one place, every month."
            cta={{ label: 'Add your first item', onPress: () => router.push('/item/new') }}
            secondary={{ label: 'Try it with sample data', onPress: () => confirmLoadSample() }}
          />
        ) : (
          <View style={{ gap: space.md }}>
            <View style={{ justifyContent: 'center' }}>
              <TextField
                value={query}
                onChangeText={setQuery}
                placeholder="Search items"
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="Search items"
                style={{ paddingLeft: 40, paddingRight: query ? 44 : space.md, borderRadius: radius.pill }}
              />
              <View pointerEvents="none" style={{ position: 'absolute', left: 14 }}>
                <Icon name="search-outline" size={18} color={t.muted} />
              </View>
              {query ? (
                <Pressable
                  onPress={() => setQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  style={{ position: 'absolute', right: 2, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="close-circle" size={18} color={t.muted} />
                </Pressable>
              ) : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              <Chip label={`All ${items.length}`} selected={kind === 'all'} onPress={() => setKind('all')} />
              {KINDS.filter((k) => counts.get(k.key)).map((k) => (
                <Chip
                  key={k.key}
                  label={`${k.plural} ${counts.get(k.key)}`}
                  color={k.color}
                  dot
                  selected={kind === k.key}
                  onPress={() => setKind(k.key)}
                />
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Icon name="swap-vertical-outline" size={16} color={t.muted} />
              <Txt variant="caption" tone="muted" style={{ marginRight: space.xs }}>
                Sort
              </Txt>
              {(['due', 'amount', 'name'] as Sort[]).map((s) => (
                <SortPill key={s} label={s === 'due' ? 'Next due' : s === 'amount' ? 'Amount' : 'Name'} selected={sort === s} onPress={() => setSort(s)} />
              ))}
            </View>
            {kind !== 'all' || query.trim() ? (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingHorizontal: space.xs }}>
                <Txt variant="caption" tone="muted" style={{ flex: 1 }}>
                  {visible.length} shown
                </Txt>
                <Money amount={totalMonthly} currency={mainCurrency} variant="caption" tone="ink2" />
                <Txt variant="caption" tone="muted">
                  /mo
                </Txt>
              </View>
            ) : null}

            {visible.length === 0 ? (
              <Txt tone="muted" center style={{ paddingVertical: space.xxl }}>
                Nothing matches.
              </Txt>
            ) : (
              visible.map((i) => <ItemRow key={i.id} item={i} category={i.categoryId ? catById.get(i.categoryId) : undefined} today={today} />)
            )}

            {archived.length ? (
              <View style={{ marginTop: space.lg, gap: space.md }}>
                <Pressable
                  onPress={() => setShowArchived((v) => !v)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 }}
                >
                  <Icon name={showArchived ? 'chevron-down' : 'chevron-forward'} size={18} color={t.muted} />
                  <Txt variant="label" tone="muted">
                    Archived · {archived.length}
                  </Txt>
                </Pressable>
                {showArchived
                  ? archived.map((i) => (
                      <ItemRow key={i.id} item={i} category={i.categoryId ? catById.get(i.categoryId) : undefined} today={today} />
                    ))
                  : null}
              </View>
            ) : null}
          </View>
        )}
      </Screen>

      {items.length > 0 ? (
        <Pressable
          onPress={() => router.push('/item/new')}
          accessibilityRole="button"
          accessibilityLabel="Add item"
          style={({ pressed }) => ({
            position: 'absolute',
            right: space.lg,
            bottom: insets.bottom + space.lg,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: t.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
            elevation: 4,
          })}
        >
          <Icon name="add" size={28} color={t.onAccent} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** whole units for the header ("≈ £2,457/mo"), same symbol and grouping as every other amount */
function fmt(minor: number, currency: string): string {
  return formatMoney(Math.round(minor / 100) * 100, currency, { compact: true });
}

function SortPill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Sort by ${label.toLowerCase()}`}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => ({
        height: 32,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: selected ? t.ink : t.border,
        backgroundColor: pressed ? t.surface2 : 'transparent',
      })}
    >
      <Txt variant="caption" weight={selected ? 'bold' : 'medium'} tone={selected ? 'ink' : 'ink2'}>
        {label}
      </Txt>
    </Pressable>
  );
}
