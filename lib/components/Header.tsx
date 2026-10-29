import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Icon } from './Icon';
import { Txt } from './Txt';
import { useTheme } from '@/lib/theme/ThemeContext';
import { space, touch } from '@/lib/theme/tokens';

type Props = {
  title: string;
  subtitle?: string;
  /** show a back chevron (stack screens) */
  back?: boolean;
  /** show the settings gear (tab screens) */
  settings?: boolean;
  right?: ReactNode;
};

export function Header({ title, subtitle, back, settings, right }: Props) {
  const t = useTheme();
  const router = useRouter();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: space.md,
        paddingBottom: space.lg,
        gap: space.md,
      }}
    >
      {back ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => ({
            width: touch,
            height: touch,
            borderRadius: touch / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? t.surface2 : 'transparent',
            marginLeft: -8,
          })}
        >
          <Icon name="chevron-back" size={24} color={t.ink} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Txt variant="h1" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} accessibilityRole="header">
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="label" tone="muted" weight="medium">
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
      {settings ? (
        <Pressable
          onPress={() => router.push('/settings')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={({ pressed }) => ({
            width: touch,
            height: touch,
            borderRadius: touch / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? t.surface2 : 'transparent',
          })}
        >
          <Icon name="settings-outline" size={22} color={t.ink2} />
        </Pressable>
      ) : null}
    </View>
  );
}
