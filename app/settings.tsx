import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

import { Button, Card, Chip, Header, Icon, Screen, Txt } from '@/lib/components';
import { Field, TextField } from '@/lib/components/form';
import { exportBackup, exportCsv, pickBackup, restoreBackup } from '@/lib/backup';
import { SCHEMA_VERSION } from '@/lib/db/migrations';
import { formatDay } from '@/lib/format';
import { minorToInput, parseMoney } from '@/lib/format';
import { ensurePermission, hasPermission, reconcile, scheduledCount, sendTest } from '@/lib/notifications';
import { SampleDataCard } from '@/lib/features/SampleData';
import { useItems } from '@/lib/store/useItems';
import { useSettings } from '@/lib/store/useSettings';
import { useTheme } from '@/lib/theme/ThemeContext';
import { space, type ThemePref } from '@/lib/theme/tokens';

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];
const REMINDER_DAYS = [0, 1, 2, 3, 5, 7];
const HOURS = [7, 8, 9, 12, 18, 20];

export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const s = useSettings();
  const categories = useItems((st) => st.categories);
  const [rate, setRate] = useState(String(s.eurToGbpRate));
  const [income, setIncome] = useState(minorToInput(s.monthlyIncome));
  const [perm, setPerm] = useState<boolean | null>(null);
  const [scheduled, setScheduled] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refreshNotif = () => {
    hasPermission().then(setPerm).catch(() => setPerm(false));
    scheduledCount().then(setScheduled).catch(() => setScheduled(null));
  };
  useEffect(refreshNotif, []);

  const commitRate = async () => {
    const r = parseFloat(rate.replace(',', '.'));
    if (!Number.isFinite(r) || r <= 0) {
      setRate(String(s.eurToGbpRate));
      return;
    }
    await s.setEurToGbpRate(Math.round(r * 10000) / 10000);
  };
  const commitIncome = async () => {
    const v = income.trim() ? parseMoney(income) : null;
    if (v !== null && v < 0) return;
    await s.setMonthlyIncome(v);
  };

  const run = async (label: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(label);
    try {
      await fn();
      if (done) Alert.alert(done);
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onRestore = async () => {
    setBusy('restore');
    try {
      const picked = await pickBackup();
      if (!picked) return;
      Alert.alert(
        'Replace everything?',
        `This backup from ${formatDay(picked.summary.exportedAt.slice(0, 10), { year: true })} has ${picked.summary.items} items and ${picked.summary.payments} ledger rows. All current data will be replaced.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () =>
              run('restore', () => restoreBackup(picked.parsed), 'Backup restored.').then(() => {
                setRate(String(useSettings.getState().eurToGbpRate));
                setIncome(minorToInput(useSettings.getState().monthlyIncome));
              }),
          },
        ],
      );
    } catch (e) {
      Alert.alert('Could not read backup', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const version = Constants.expoConfig?.version ?? '?';

  return (
    <Screen>
      <Header title="Settings" back />
      <View style={{ gap: space.lg }}>
        <Card style={{ gap: space.md }}>
          <Txt variant="h2">Money</Txt>
          <Field label="Main currency" hint="Totals are shown in this currency. Items can still be in the other one.">
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Chip label="£ GBP" selected={s.mainCurrency === 'GBP'} onPress={() => s.setMainCurrency('GBP')} />
              <Chip label="€ EUR" selected={s.mainCurrency === 'EUR'} onPress={() => s.setMainCurrency('EUR')} />
            </View>
          </Field>
          <Field label="Exchange rate · 1 EUR =" hint="Set it by hand; nothing is fetched online.">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <TextField value={rate} onChangeText={setRate} onBlur={commitRate} keyboardType="decimal-pad" mono style={{ flex: 1 }} />
              <Txt tone="ink2" weight="semibold">
                GBP
              </Txt>
            </View>
          </Field>
          <Field label="Monthly income (optional)" hint='Shows "left after fixed costs" on the month page.'>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <TextField value={income} onChangeText={setIncome} onBlur={commitIncome} keyboardType="decimal-pad" mono placeholder="not set" style={{ flex: 1 }} />
              <Txt tone="ink2" weight="semibold">
                {s.mainCurrency}
              </Txt>
            </View>
          </Field>
        </Card>

        <Card style={{ gap: space.md }}>
          <Txt variant="h2">Reminders</Txt>
          {perm === false ? (
            <View style={{ gap: space.sm }}>
              <Txt tone="warn">Notifications are off for this app.</Txt>
              <Button label="Allow notifications" variant="secondary" size="sm" onPress={() => ensurePermission().then(() => reconcile()).then(refreshNotif)} />
            </View>
          ) : null}
          <Field label="Default: remind me before a due date">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {REMINDER_DAYS.map((d) => (
                <Chip key={d} label={d === 0 ? 'Off' : d === 1 ? '1 day' : `${d} days`} selected={s.defaultReminderDays === d} onPress={() => s.setDefaultReminderDays(d)} />
              ))}
            </View>
          </Field>
          <Field label="At what time">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {HOURS.map((h) => (
                <Chip key={h} label={`${String(h).padStart(2, '0')}:00`} selected={s.reminderHour === h} onPress={() => s.setReminderHour(h)} />
              ))}
            </View>
          </Field>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Txt variant="caption" tone="muted" style={{ flex: 1 }}>
              {scheduled === null ? '' : `${scheduled} reminder${scheduled === 1 ? '' : 's'} scheduled for the next 90 days.`}
            </Txt>
            <Button label="Send test" variant="ghost" size="sm" icon="notifications-outline" onPress={() => run('test', () => ensurePermission().then(() => sendTest()), 'A test notification arrives in 5 seconds.').then(refreshNotif)} />
          </View>
        </Card>

        <Card style={{ gap: space.md }}>
          <Txt variant="h2">Appearance</Txt>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {THEMES.map((o) => (
              <Chip key={o.value} label={o.label} selected={s.themePref === o.value} onPress={() => s.setThemePref(o.value)} />
            ))}
          </View>
        </Card>

        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Txt variant="h2" style={{ flex: 1 }}>
              Categories
            </Txt>
            <Txt variant="caption" tone="muted">
              {categories.filter((c) => !c.isArchived).length} active
            </Txt>
          </View>
          <Button label="Manage categories" variant="secondary" icon="pricetags-outline" onPress={() => router.push('/categories')} />
        </Card>

        <Card style={{ gap: space.md }}>
          <Txt variant="h2">Backup</Txt>
          <Txt tone="ink2">
            Everything lives on this phone. Export a backup now and then, and keep it somewhere safe (Drive, email to yourself).
          </Txt>
          <Button label="Export backup (JSON)" icon="cloud-upload-outline" loading={busy === 'export'} onPress={() => run('export', exportBackup)} />
          <Button label="Restore from backup…" variant="secondary" icon="cloud-download-outline" loading={busy === 'restore'} onPress={onRestore} />
          <Button label="Export ledger as CSV" variant="ghost" icon="document-text-outline" loading={busy === 'csv'} onPress={() => run('csv', exportCsv)} />
        </Card>

        <SampleDataCard />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'center', paddingVertical: space.md }}>
          <Icon name="information-circle-outline" size={14} color={t.muted} />
          <Txt variant="caption" tone="muted">
            Monthly Ledger {version} · schema v{SCHEMA_VERSION} · local only, no account
          </Txt>
        </View>
      </View>
    </Screen>
  );
}
