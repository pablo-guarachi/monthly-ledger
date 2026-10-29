import { Image, View, type ImageSourcePropType } from 'react-native';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';
import { useTheme } from '@/lib/theme/ThemeContext';
import { space } from '@/lib/theme/tokens';

type Props = {
  icon: IconName;
  title: string;
  body?: string;
  /** decorative illustration from assets/illustrations (falls back to the icon bubble) */
  illustration?: ImageSourcePropType;
  cta?: { label: string; onPress: () => void };
  /** quieter second action, e.g. "Try with sample data" */
  secondary?: { label: string; onPress: () => void; icon?: IconName };
};

export function EmptyState({ icon, title, body, illustration, cta, secondary }: Props) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: illustration ? space.xl : space.xxxl * 2, gap: space.md }}>
      {illustration ? (
        <Image
          source={illustration}
          accessibilityIgnoresInvertColors
          accessible={false}
          resizeMode="contain"
          style={{ width: 200, height: 200 }}
        />
      ) : (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: t.surface2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={30} color={t.muted} />
        </View>
      )}
      <Txt variant="h2" center accessibilityRole="header">
        {title}
      </Txt>
      {body ? (
        <Txt tone="ink2" center style={{ maxWidth: 300 }}>
          {body}
        </Txt>
      ) : null}
      {cta || secondary ? (
        <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
          {cta ? <Button label={cta.label} onPress={cta.onPress} icon="add" style={{ minWidth: 240 }} /> : null}
          {secondary ? (
            <Button
              label={secondary.label}
              onPress={secondary.onPress}
              variant="ghost"
              icon={secondary.icon ?? 'sparkles-outline'}
              style={{ minWidth: 240 }}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
