import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, Icon, Money, Txt } from '@/lib/components';
import { cycleSuffix, monthlyEquivalent } from '@/lib/domain/cycle';
import { kindMeta } from '@/lib/domain/kinds';
import type { Category, Item } from '@/lib/domain/types';
import { formatDay, formatMoney } from '@/lib/format';
import { useTheme } from '@/lib/theme/ThemeContext';
import { space } from '@/lib/theme/tokens';
import type { IconName } from '@/lib/components';

type Props = { item: Item; category?: Category; today: string };

export function ItemRow({ item, category, today }: Props) {
  const t = useTheme();
  const router = useRouter();
  const meta = kindMeta(item.kind);
  const monthly = Math.round(monthlyEquivalent(item.amount, item));
  const ended = !!item.endDate && item.endDate < today;
  const dueSoon = !ended && item.nextDueDate <= today;

  return (
    <Card
      onPress={() => router.push(`/item/${item.id}`)}
      padded={false}
      style={{ padding: space.md, minHeight: 68, justifyContent: 'center' }}
      accessibilityLabel={`${item.name}, ${formatMoney(item.amount, item.currency)} ${cycleSuffix(item)}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: `${meta.color}22`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={(category?.icon ?? meta.icon) as IconName} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt weight="semibold" numberOfLines={1}>
            {item.name}
          </Txt>
          <Txt variant="caption" tone="muted" numberOfLines={1}>
            {category?.name ?? meta.label}
            {item.paymentMethod ? ` · ${item.paymentMethod}` : ''}
            {item.isArchived ? ' · archived' : ended ? ' · ended' : ` · ${dueSoon ? 'due today' : `next ${formatDay(item.nextDueDate)}`}`}
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
            <Money amount={item.amount} currency={item.currency} weight="semibold" />
            <Txt variant="caption" tone="muted">
              {cycleSuffix(item)}
            </Txt>
          </View>
          {item.cycle !== 'monthly' ? (
            <Txt variant="caption" tone="muted" mono>
              ≈ {formatMoney(monthly, item.currency)}/mo
            </Txt>
          ) : null}
        </View>
        <Icon name="chevron-forward" size={18} color={t.muted} />
      </View>
    </Card>
  );
}

