import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';
import { useTheme } from '@/lib/theme/ThemeContext';
import { radius, space, touch } from '@/lib/theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  size?: 'md' | 'sm';
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
  size = 'md',
}: Props) {
  const t = useTheme();
  const bg =
    variant === 'primary' ? t.accent : variant === 'secondary' ? t.surface2 : variant === 'danger' ? t.dangerSoft : 'transparent';
  const fg = variant === 'primary' ? t.onAccent : variant === 'danger' ? t.danger : t.ink;
  const height = size === 'md' ? 48 : touch;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ pressed }) => [
        {
          height,
          minWidth: 44,
          borderRadius: radius.sm,
          backgroundColor: bg,
          paddingHorizontal: size === 'md' ? space.xl : space.lg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: t.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {icon ? <Icon name={icon} size={18} color={fg} /> : null}
          <Txt variant={size === 'md' ? 'body' : 'label'} weight="bold" style={{ color: fg }}>
            {label}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}
