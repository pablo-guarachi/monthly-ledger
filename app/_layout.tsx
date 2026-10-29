import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { JetBrainsMono_500Medium, JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono';

import { getDb } from '@/lib/db/client';
import { refreshNextDueDates } from '@/lib/db/items';
import { useItems } from '@/lib/store/useItems';
import { useLedger } from '@/lib/store/useLedger';
import { onItemChange } from '@/lib/store/useItems';
import { ensurePermission, reconcile } from '@/lib/notifications';
import * as Notifications from 'expo-notifications';
import { useSettings } from '@/lib/store/useSettings';
import { ThemeProvider, useTheme } from '@/lib/theme/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  // Keys MUST match lib/theme/tokens.ts `fonts`. Never Inter.
  const [fontsLoaded, fontError] = useFonts({
    'Manrope-Regular': Manrope_400Regular,
    'Manrope-Medium': Manrope_500Medium,
    'Manrope-SemiBold': Manrope_600SemiBold,
    'Manrope-Bold': Manrope_700Bold,
    'Manrope-ExtraBold': Manrope_800ExtraBold,
    'JetBrainsMono-Medium': JetBrainsMono_500Medium,
    'JetBrainsMono-SemiBold': JetBrainsMono_600SemiBold,
  });
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const settingsHydrated = useSettings((s) => s.hydrated);

  useEffect(() => {
    getDb()
      .then(() => useSettings.getState().hydrate())
      .then(() => refreshNextDueDates())
      .then(() => useItems.getState().refresh())
      .then(() => useLedger.getState().refresh())
      .then(() => {
        setDbReady(true);
        // reminders are best-effort: never turn their failure into a DB error
        ensurePermission()
          .then(() => reconcile())
          .catch(() => {});
      })
      .catch((e: unknown) => setDbError(e instanceof Error ? e.message : String(e)));
  }, []);

  // Reminders follow every item change and every change to the reminder settings.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => reconcile().catch(() => {}), 500);
    };
    const unsubItems = onItemChange(async () => debounced());
    let prev = useSettings.getState();
    const unsubSettings = useSettings.subscribe((next) => {
      if (next.defaultReminderDays !== prev.defaultReminderDays || next.reminderHour !== prev.reminderHour) debounced();
      prev = next;
    });
    return () => {
      unsubItems();
      unsubSettings();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Coming back to the app (possibly on a new day/month): refresh due dates and the month on screen.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      refreshNextDueDates()
        .then(() => useItems.getState().refresh())
        .then(() => useLedger.getState().refresh())
        .then(() => reconcile())
        .catch(() => {});
    });
    return () => sub.remove();
  }, []);

  const ready = (fontsLoaded || !!fontError) && (dbReady || !!dbError) && (settingsHydrated || !!dbError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Shell dbError={dbError} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Shell({ dbError }: { dbError: string | null }) {
  const t = useTheme();
  const router = useRouter();

  // expo-router builds the initial state from the URL ("/"), so a failed DB must be routed explicitly.
  useEffect(() => {
    if (dbError) router.replace({ pathname: '/db-error', params: { message: dbError } });
  }, [dbError, router]);

  useEffect(() => {
    const go = (resp: Notifications.NotificationResponse | null) => {
      const itemId = resp?.notification.request.content.data?.itemId;
      if (typeof itemId === 'string') router.push(`/item/${itemId}`);
    };
    Notifications.getLastNotificationResponseAsync().then(go).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(go);
    return () => sub.remove();
  }, [router]);
  const base = t.mode === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: t.bg,
      card: t.surface,
      text: t.ink,
      border: t.border,
      primary: t.accent,
      notification: t.danger,
    },
  };
  return (
    <NavThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="item/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="item/[id]/index" />
        <Stack.Screen name="item/[id]/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="db-error" />
      </Stack>
      <StatusBar style={t.mode === 'dark' ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}
