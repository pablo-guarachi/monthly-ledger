import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Icon, Money, Txt } from '@/lib/components';
import { bucketOf } from '@/lib/domain/ledger';
import { kindMeta } from '@/lib/domain/kinds';
import type { Item, Payment, PaymentStatus } from '@/lib/domain/types';
import { formatDay, formatMoney } from '@/lib/format';
import { useTheme } from '@/lib/theme/ThemeContext';
import { radius, space, touch } from '@/lib/theme/tokens';

type Props = {
  payment: Payment;
  item: Item | undefined;
  today: string;
  onSetStatus: (id: string, status: PaymentStatus) => Promise<void>;
  showPeriod?: boolean;
};

export function PaymentRow({ payment, item, today, onSetStatus, showPeriod }: Props) {
  const t = useTheme();
  const router = useRouter();
  const bucket = bucketOf(payment, today);
  const meta = kindMeta(item?.kind ?? 'other');
  const paid = payment.status === 'paid';
  const skipped = payment.status === 'skipped';

  const toggle = async () => {
    Haptics.impactAsync(paid ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await onSetStatus(payment.id, paid ? 'due' : 'paid');
  };

  const more = () => {
    // Android shows at most 3 buttons: primary toggle, skip/un-skip, cancel. The chevron opens the item.
    const buttons: { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }[] = [];
    if (skipped) {
      buttons.push({ text: 'Un-skip', onPress: () => onSetStatus(payment.id, 'due') });
      buttons.push({ text: 'Mark as paid', onPress: () => onSetStatus(payment.id, 'paid') });
    } else {
      buttons.push(
        paid
          ? { text: 'Mark as unpaid', onPress: () => onSetStatus(payment.id, 'due') }
          : { text: 'Mark as paid', onPress: () => onSetStatus(payment.id, 'paid') },
      );
      buttons.push({ text: 'Skip this month', style: 'destructive', onPress: () => onSetStatus(payment.id, 'skipped') });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(item?.name ?? 'Payment', `${formatDay(payment.dueDate, { year: true, weekday: true })}`, buttons);
  };

  const dateTone = bucket === 'overdue' ? 'danger' : bucket === 'today' ? 'warn' : 'muted';
  const dateLabel =
    bucket === 'overdue'
      ? `Overdue · ${formatDay(payment.dueDate)}`
      : bucket === 'today'
        ? 'Due today'
        : paid
          ? `Paid · ${formatDay(payment.dueDate)}`
          : skipped
            ? `Skipped · ${formatDay(payment.dueDate)}`
            : `Due ${formatDay(payment.dueDate)}`;

  return (
    <Pressable
      onPress={toggle}
      onLongPress={more}
      delayLongPress={350}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: paid }}
      accessibilityLabel={`${item?.name ?? 'Payment'}, ${formatMoney(payment.amount, payment.currency)}, ${dateLabel}`}
      accessibilityHint={paid ? 'Tap to mark unpaid. Hold for more options.' : 'Tap to mark paid. Hold for more options.'}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: 60,
        paddingVertical: space.sm,
        paddingHorizontal: space.md,
        borderRadius: radius.sm,
        backgroundColor: pressed ? t.surface2 : 'transparent',
        opacity: skipped ? 0.55 : 1,
      })}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: paid ? t.accent : bucket === 'overdue' ? t.danger : t.border,
          backgroundColor: paid ? t.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {paid ? <Icon name="checkmark" size={18} color={t.onAccent} /> : skipped ? <Icon name="remove" size={16} color={t.muted} /> : null}
      </View>
      <View style={{ width: 6, height: 28, borderRadius: 3, backgroundColor: meta.color }} />
      <View style={{ flex: 1, gap: 1 }}>
        <Txt weight="semibold" numberOfLines={1} style={paid ? { textDecorationLine: 'line-through', color: t.ink2 } : undefined}>
          {item?.name ?? 'Deleted item'}
        </Txt>
        <Txt variant="caption" tone={dateTone} weight={bucket === 'overdue' ? 'bold' : 'medium'}>
          {showPeriod ? `${payment.period} · ` : ''}
          {dateLabel}
          {item?.autopay && !paid && !skipped ? ' · auto' : ''}
        </Txt>
      </View>
      <Money amount={payment.amount} currency={payment.currency} weight="semibold" tone={paid ? 'ink2' : 'ink'} />
      <Pressable
        onPress={() => item && router.push(`/item/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item?.name ?? 'item'}`}
        style={({ pressed }) => ({
          width: touch,
          height: touch,
          marginRight: -space.sm,
          borderRadius: touch / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? t.border : 'transparent',
        })}
      >
        <Icon name="chevron-forward" size={18} color={t.muted} />
      </Pressable>
    </Pressable>
  );
}
