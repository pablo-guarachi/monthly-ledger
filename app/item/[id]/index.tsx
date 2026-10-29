import { Alert, Linking, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card, Header, Icon, Money, Screen, Txt } from '@/lib/components';
import type { IconName } from '@/lib/components';
import { cycleLabel, monthlyEquivalent, yearlyEquivalent } from '@/lib/domain/cycle';
import { todayIso } from '@/lib/domain/date';
import { kindMeta } from '@/lib/domain/kinds';
import { formatDay } from '@/lib/format';
import { ItemProgress } from '@/lib/features/ItemProgress';
import { PaymentHistory } from '@/lib/features/PaymentHistory';
import { useItems } from '@/lib/store/useItems';
import { useSettings } from '@/lib/store/useSettings';
import { useTheme } from '@/lib/theme/ThemeContext';
import { radius, space, touch } from '@/lib/theme/tokens';

export default function ItemDetailScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useItems((s) => s.byId(id ?? ''));
  const categories = useItems((s) => s.categories);
  const archive = useItems((s) => s.archive);
  const restore = useItems((s) => s.restore);
  const defaultReminder = useSettings((s) => s.defaultReminderDays);

  if (!item) {
    return (
      <Screen>
        <Header title="Item" back />
        <Txt tone="muted">Item not found.</Txt>
      </Screen>
    );
  }

  const meta = kindMeta(item.kind);
  const category = item.categoryId ? categories.find((c) => c.id === item.categoryId) : undefined;
  const today = todayIso();
  const ended = !!item.endDate && item.endDate < today;
  const monthly = Math.round(monthlyEquivalent(item.amount, item));
  const yearly = Math.round(yearlyEquivalent(item.amount, item));
  const reminder = item.reminderDays === null ? `${defaultReminder} days (default)` : item.reminderDays === 0 ? 'off' : `${item.reminderDays} day${item.reminderDays === 1 ? '' : 's'}`;

  const onArchive = () => {
    Alert.alert(
      item.isArchived ? 'Restore item?' : 'Archive item?',
      item.isArchived
        ? 'It will show up again in your lists and next month.'
        : 'It leaves your active list and stops generating due dates. Past payments are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: item.isArchived ? 'Restore' : 'Archive',
          style: item.isArchived ? 'default' : 'destructive',
          onPress: async () => {
            if (item.isArchived) await restore(item.id);
            else await archive(item.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Header
        title={item.name}
        subtitle={`${category?.name ?? meta.label}${item.isArchived ? ' · archived' : ended ? ' · ended' : ''}`}
        back
        right={
          <Button label="Edit" variant="secondary" size="sm" icon="create-outline" onPress={() => router.push(`/item/${item.id}/edit`)} />
        }
      />

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: `${meta.color}22`, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={(category?.icon ?? meta.icon) as IconName} size={24} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Money amount={item.amount} currency={item.currency} variant="h1" />
            <Txt variant="label" tone="muted">
              {cycleLabel(item)}
              {item.autopay ? ' · charged automatically' : ' · paid by hand'}
            </Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Stat label="per month" minor={monthly} currency={item.currency} />
          <Stat label="per year" minor={yearly} currency={item.currency} />
        </View>
      </Card>

      <ItemProgress item={item} />

      <Card style={{ marginTop: space.md, gap: space.sm }}>
        <Row icon="calendar-outline" label={ended ? 'Last charge' : 'Next due'} value={formatDay(item.nextDueDate, { year: true, weekday: true })} />
        <Row icon="play-outline" label="First charge" value={formatDay(item.anchorDate, { year: true })} />
        {item.endDate ? <Row icon="stop-outline" label="Ends" value={formatDay(item.endDate, { year: true })} tone={ended ? 'danger' : 'warn'} /> : null}
        {item.paymentMethod ? <Row icon="card-outline" label="Paid from" value={item.paymentMethod} /> : null}
        <Row icon="notifications-outline" label="Reminder" value={reminder} />
        {item.url ? (
          <Row icon="link-outline" label="Manage" value={item.url.replace(/^https?:\/\//, '')} onPress={() => Linking.openURL(item.url!).catch(() => {})} />
        ) : null}
        {item.notes ? (
          <View style={{ paddingTop: space.sm, borderTopWidth: 1, borderTopColor: t.border, marginTop: space.xs }}>
            <Txt tone="ink2">{item.notes}</Txt>
          </View>
        ) : null}
      </Card>

      <PaymentHistory itemId={item.id} />

      <View style={{ marginTop: space.xl }}>
        <Button
          label={item.isArchived ? 'Restore item' : 'Archive item'}
          variant={item.isArchived ? 'secondary' : 'danger'}
          icon={item.isArchived ? 'refresh-outline' : 'archive-outline'}
          onPress={onArchive}
        />
      </View>
    </Screen>
  );
}

function Stat({ label, minor, currency }: { label: string; minor: number; currency: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.surface2, borderRadius: 10, padding: space.md, gap: 2 }}>
      <Txt variant="caption" tone="muted">
        {label}
      </Txt>
      <Money amount={minor} currency={currency} weight="semibold" />
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  tone = 'ink',
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone?: 'ink' | 'warn' | 'danger';
  onPress?: () => void;
}) {
  const t = useTheme();
  const content = (
    <>
      <Icon name={icon} size={18} color={t.muted} />
      <Txt variant="label" tone="muted" style={{ width: 96 }}>
        {label}
      </Txt>
      <Txt weight="medium" tone={onPress ? 'accent' : tone} style={{ flex: 1 }} numberOfLines={1}>
        {value}
      </Txt>
      {onPress ? <Icon name="open-outline" size={16} color={t.accent} /> : null}
    </>
  );
  const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: space.md, minHeight: 40 };
  if (!onPress) return <View style={row}>{content}</View>;
  // the old link was only the text run (one line of 15pt): the whole row is the target now
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [row, { minHeight: touch, borderRadius: radius.sm, backgroundColor: pressed ? t.surface2 : 'transparent' }]}
    >
      {content}
    </Pressable>
  );
}
