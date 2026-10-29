import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/theme/ThemeContext';
import { space } from '@/lib/theme/tokens';

type Props = {
  children: ReactNode;
  /** scroll (default) or plain view (for FlatList screens) */
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** extra bottom padding so a FAB never covers the last row */
  bottomInset?: number;
};

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
  contentStyle,
  refreshing,
  onRefresh,
  bottomInset = 0,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const base: ViewStyle = { flex: 1, backgroundColor: t.bg, paddingTop: insets.top };
  const pad: ViewStyle = padded ? { paddingHorizontal: space.lg } : {};

  if (!scroll) {
    return <View style={[base, pad, style]}>{children}</View>;
  }
  return (
    <View style={[base, style]}>
      <ScrollView
        contentContainerStyle={[pad, { paddingBottom: insets.bottom + space.xxxl + bottomInset }, contentStyle]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.accent} /> : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}
