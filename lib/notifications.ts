/**
 * Local reminders (expo-notifications). No push, no server.
 *
 * `reconcile()` cancels every scheduled notification and rebuilds the schedule
 * from the active items + settings, so it is safe to call after any change:
 *  - due-date reminders: `reminderDays` before each charge in the next 90 days
 *    (per-item override, else the global default; 0 = off), at `reminderHour`
 *  - end-date reminders: 7 days before an item's end date
 * Capped to ~60 notifications (Android limit is 500, but keep it lean).
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { listItems } from '@/lib/db/items';
import { addDays, fromIso, todayIso } from '@/lib/domain/date';
import { endingSoon, upcomingCharges } from '@/lib/domain/upcoming';
import { formatMoney } from '@/lib/format';
import { useSettings } from '@/lib/store/useSettings';

export const CHANNEL_ID = 'reminders';
const HORIZON_DAYS = 90;
const MAX_SCHEDULED = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Due date reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: undefined,
  });
}

export async function hasPermission(): Promise<boolean> {
  const s = await Notifications.getPermissionsAsync();
  return s.granted;
}

/** Create the channel first: on Android 13+ the system prompt needs one to exist. */
export async function ensurePermission(): Promise<boolean> {
  await ensureChannel();
  if (await hasPermission()) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

type Planned = { id: string; when: Date; title: string; body: string; itemId: string };

export async function reconcile(): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await hasPermission())) return 0;
  await ensureChannel();

  const { defaultReminderDays, reminderHour } = useSettings.getState();
  const items = await listItems({ archived: false });
  const byId = new Map(items.map((i) => [i.id, i]));
  const today = todayIso();
  const now = new Date();
  const planned: Planned[] = [];

  for (const c of upcomingCharges(items, today, addDays(today, HORIZON_DAYS))) {
    const it = byId.get(c.itemId);
    if (!it) continue;
    const days = it.reminderDays ?? defaultReminderDays;
    if (days <= 0) continue;
    const when = fromIso(addDays(c.date, -days));
    when.setHours(reminderHour, 0, 0, 0);
    if (when <= now) continue;
    const amount = formatMoney(c.amount, c.currency);
    planned.push({
      id: `due:${it.id}:${c.date}`,
      when,
      title: days === 1 ? `${it.name} due tomorrow` : `${it.name} due in ${days} days`,
      body: it.autopay ? `${amount} will be taken automatically.` : `${amount} to pay by hand.`,
      itemId: it.id,
    });
  }

  for (const it of endingSoon(items, today, HORIZON_DAYS)) {
    const when = fromIso(addDays(it.endDate!, -7));
    when.setHours(reminderHour, 0, 0, 0);
    if (when <= now) continue;
    planned.push({
      id: `end:${it.id}`,
      when,
      title: `${it.name} ends in a week`,
      body: 'Cancel, renew or archive it before it lapses.',
      itemId: it.id,
    });
  }

  planned.sort((a, b) => a.when.getTime() - b.when.getTime());
  const batch = planned.slice(0, MAX_SCHEDULED);
  for (const p of batch) {
    await Notifications.scheduleNotificationAsync({
      identifier: p.id,
      content: { title: p.title, body: p.body, data: { itemId: p.itemId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.when, channelId: CHANNEL_ID },
    });
  }
  return batch.length;
}

export async function scheduledCount(): Promise<number> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.length;
}

/** Fire a test notification in 5 seconds (settings screen). */
export async function sendTest(): Promise<void> {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Monthly Ledger', body: 'Reminders are working.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL_ID },
  });
}
