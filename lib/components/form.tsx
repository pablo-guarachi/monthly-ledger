import type { ReactNode } from 'react';
import { Pressable, Switch, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { Icon } from './Icon';
import { Txt } from './Txt';
import { fromIso, toIso } from '@/lib/domain/date';
import { formatDay } from '@/lib/format';
import { useTheme } from '@/lib/theme/ThemeContext';
import { fonts, radius, space } from '@/lib/theme/tokens';

export function Field({
  label,
  hint,
  error,
  children,
  style,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <Txt variant="label" tone="ink2">
        {label}
      </Txt>
      {children}
      {error ? (
        <Txt variant="caption" tone="danger">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="caption" tone="muted">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function TextField({ style, mono, ...props }: TextInputProps & { mono?: boolean }) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.muted}
      selectionColor={t.accent}
      {...props}
      style={[
        {
          height: 48,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: t.border,
          backgroundColor: t.surface,
          color: t.ink,
          paddingHorizontal: space.md,
          fontFamily: mono ? fonts.mono : fonts.medium,
          fontSize: 16,
        },
        props.multiline ? { height: 96, paddingTop: space.md, textAlignVertical: 'top' } : null,
        style,
      ]}
    />
  );
}

export function DateField({
  value,
  onChange,
  placeholder = 'Pick a date',
  clearable,
  minimumDate,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  clearable?: boolean;
  minimumDate?: string;
}) {
  const t = useTheme();
  const open = () => {
    DateTimePickerAndroid.open({
      value: value ? fromIso(value) : new Date(),
      mode: 'date',
      minimumDate: minimumDate ? fromIso(minimumDate) : undefined,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(toIso(date));
      },
    });
  };
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        style={({ pressed }) => ({
          flex: 1,
          height: 48,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: t.border,
          backgroundColor: pressed ? t.surface2 : t.surface,
          paddingHorizontal: space.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
        })}
      >
        <Icon name="calendar-outline" size={18} color={t.ink2} />
        <Txt weight="medium" tone={value ? 'ink' : 'muted'}>
          {value ? formatDay(value, { year: true, weekday: true }) : placeholder}
        </Txt>
      </Pressable>
      {clearable && value ? (
        <Pressable
          onPress={() => onChange(null)}
          accessibilityRole="button"
          accessibilityLabel="Clear date"
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: pressed ? t.surface2 : t.surface,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Icon name="close" size={20} color={t.ink2} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function SwitchRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 }}
    >
      <View style={{ flex: 1 }}>
        <Txt weight="semibold">{label}</Txt>
        {hint ? (
          <Txt variant="caption" tone="muted">
            {hint}
          </Txt>
        ) : null}
      </View>
      <View pointerEvents="none">
        <Switch value={value} trackColor={{ true: t.accent, false: t.border }} thumbColor={t.surface} />
      </View>
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Txt variant="h2" style={{ marginTop: space.sm }}>
      {children}
    </Txt>
  );
}
