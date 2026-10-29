import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/lib/theme/ThemeContext';
import { radius, space } from '@/lib/theme/tokens';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  onLongPress?: () => void;
  tone?: 'surface' | 'accent' | 'warn' | 'danger' | 'flat';
  padded?: boolean;
  accessibilityLabel?: string;
};

export function Card({ children, style, onPress, onLongPress, tone = 'surface', padded = true, accessibilityLabel }: Props) {
  const t = useTheme();
  const bg =
    tone === 'accent'
      ? t.accentSoft
      : tone === 'warn'
        ? t.warnSoft
        : tone === 'danger'
          ? t.dangerSoft
          : tone === 'flat'
            ? t.surface2
            : t.surface;
  const base: ViewStyle = {
    backgroundColor: bg,
    borderRadius: radius.md,
    borderWidth: tone === 'surface' ? 1 : 0,
    borderColor: t.border,
    padding: padded ? space.lg : 0,
  };
  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}
