import { Pressable, View } from 'react-native';

import { Txt } from './Txt';
import { useTheme } from '@/lib/theme/ThemeContext';
import { radius, space } from '@/lib/theme/tokens';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  dot?: boolean;
};

export function Chip({ label, selected, onPress, color, dot }: Props) {
  const t = useTheme();
  // Selected chips are always ink-on-paper: kind colours behind white text fell below 4.5:1.
  // The kind colour survives as the dot, so the filter still reads at a glance.
  const bg = selected ? t.ink : t.surface2;
  const fg = selected ? t.bg : t.ink2;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => ({
        height: 40,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {dot && color ? (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      ) : null}
      <Txt variant="label" weight="semibold" style={{ color: fg }}>
        {label}
      </Txt>
    </Pressable>
  );
}
