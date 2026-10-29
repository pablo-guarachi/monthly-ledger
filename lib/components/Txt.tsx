import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/lib/theme/ThemeContext';
import { fonts, type as typeScale } from '@/lib/theme/tokens';

type Variant = 'hero' | 'display' | 'h1' | 'h2' | 'body' | 'label' | 'caption';
type Tone = 'ink' | 'ink2' | 'muted' | 'accent' | 'warn' | 'danger' | 'onAccent';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

export type TxtProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  weight?: Weight;
  mono?: boolean;
  center?: boolean;
};

const defaultWeight: Record<Variant, Weight> = {
  hero: 'bold',
  display: 'extrabold',
  h1: 'bold',
  h2: 'semibold',
  body: 'regular',
  label: 'semibold',
  caption: 'medium',
};

export function Txt({
  variant = 'body',
  tone = 'ink',
  weight,
  mono = false,
  center = false,
  style,
  ...rest
}: TxtProps) {
  const t = useTheme();
  const scale = typeScale[variant];
  const w = weight ?? defaultWeight[variant];
  const family = mono ? (w === 'regular' || w === 'medium' ? fonts.mono : fonts.monoBold) : fonts[w];
  const s: TextStyle = {
    fontFamily: family,
    fontSize: scale.size,
    lineHeight: scale.line,
    color: t[tone],
    textAlign: center ? 'center' : undefined,
  };
  return <Text {...rest} style={[s, style]} />;
}
