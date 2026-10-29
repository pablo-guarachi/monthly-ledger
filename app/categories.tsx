import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button, Card, Header, Icon, Screen, Txt } from '@/lib/components';
import type { IconName } from '@/lib/components';
import { Field, TextField } from '@/lib/components/form';
import { insertCategory, setCategoryArchived, updateCategory } from '@/lib/db/categories';
import type { Category } from '@/lib/domain/types';
import { useItems } from '@/lib/store/useItems';
import { useTheme } from '@/lib/theme/ThemeContext';
import { radius, space, touch } from '@/lib/theme/tokens';

const PALETTE = ['#7C5CE6', '#5B7BD5', '#1FA3B8', '#3B82C4', '#2F9E8F', '#2EAA8C', '#6B7A8F', '#C27C2C', '#E07A2F', '#D1565A', '#B04A8C', '#8A939B'];
const ICONS: IconName[] = [
  'play-circle-outline',
  'code-slash-outline',
  'wifi-outline',
  'home-outline',
  'flash-outline',
  'shield-outline',
  'car-outline',
  'fitness-outline',
  'cash-outline',
  'leaf-outline',
  'school-outline',
  'paw-outline',
  'game-controller-outline',
  'musical-notes-outline',
  'newspaper-outline',
  'gift-outline',
  'ellipsis-horizontal-circle-outline',
];

export default function CategoriesScreen() {
  const t = useTheme();
  const categories = useItems((s) => s.categories);
  const items = useItems((s) => s.items);
  const refresh = useItems((s) => s.refresh);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);

  const active = categories.filter((c) => !c.isArchived);
  const archived = categories.filter((c) => c.isArchived);
  const usage = (id: string) => items.filter((i) => i.categoryId === id).length;

  const toggleArchive = (c: Category) => {
    const n = usage(c.id);
    Alert.alert(
      c.isArchived ? 'Restore category?' : 'Archive category?',
      c.isArchived ? '' : n ? `${n} item${n === 1 ? '' : 's'} keep this category; it just disappears from pickers.` : 'It disappears from pickers.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: c.isArchived ? 'Restore' : 'Archive', onPress: () => setCategoryArchived(c.id, !c.isArchived).then(refresh) },
      ],
    );
  };

  return (
    <Screen>
      <Header title="Categories" back right={<Button label="New" size="sm" icon="add" onPress={() => setEditing('new')} />} />
      {editing ? (
        <Editor
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await refresh();
            setEditing(null);
          }}
        />
      ) : null}
      <View style={{ gap: space.sm }}>
        {active.map((c) => (
          <Row key={c.id} c={c} count={usage(c.id)} onEdit={() => setEditing(c)} onArchive={() => toggleArchive(c)} />
        ))}
        {archived.length ? (
          <>
            <Txt variant="label" tone="muted" style={{ marginTop: space.lg }}>
              Archived
            </Txt>
            {archived.map((c) => (
              <Row key={c.id} c={c} count={usage(c.id)} onEdit={() => setEditing(c)} onArchive={() => toggleArchive(c)} />
            ))}
          </>
        ) : null}
      </View>
      <View style={{ height: 1, backgroundColor: t.border, marginVertical: space.lg }} />
      <Txt variant="caption" tone="muted">
        Categories only group your items for stats. Archiving never deletes anything.
      </Txt>
    </Screen>
  );
}

const iconBtn = { width: touch, height: touch, alignItems: 'center' as const, justifyContent: 'center' as const };

function Row({ c, count, onEdit, onArchive }: { c: Category; count: number; onEdit: () => void; onArchive: () => void }) {
  const t = useTheme();
  return (
    <Card padded={false} style={{ padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: c.isArchived ? 0.6 : 1 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${c.color}22`, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={c.icon as IconName} size={18} color={c.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt weight="semibold">{c.name}</Txt>
        <Txt variant="caption" tone="muted">
          {count} item{count === 1 ? '' : 's'}
        </Txt>
      </View>
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Edit ${c.name}`} style={iconBtn}>
        <Icon name="create-outline" size={20} color={t.ink2} />
      </Pressable>
      <Pressable
        onPress={onArchive}
        accessibilityRole="button"
        accessibilityLabel={`${c.isArchived ? 'Restore' : 'Archive'} ${c.name}`}
        style={iconBtn}
      >
        <Icon name={c.isArchived ? 'refresh-outline' : 'archive-outline'} size={20} color={t.ink2} />
      </Pressable>
    </Card>
  );
}

function Editor({ initial, onClose, onSaved }: { initial: Category | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const t = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? PALETTE[0]!);
  const [icon, setIcon] = useState<IconName>((initial?.icon as IconName) ?? ICONS[0]!);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (initial) await updateCategory(initial.id, { name, color, icon });
      else await insertCategory({ name, color, icon });
      await onSaved();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ gap: space.md, marginBottom: space.lg }}>
      <Txt variant="h2">{initial ? 'Edit category' : 'New category'}</Txt>
      <Field label="Name">
        <TextField value={name} onChangeText={setName} placeholder="Gym, Kids, Car…" autoCapitalize="words" autoFocus />
      </Field>
      <Field label="Colour">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {PALETTE.map((p) => (
            <Pressable
              key={p}
              onPress={() => setColor(p)}
              accessibilityRole="radio"
              accessibilityState={{ selected: color === p }}
              accessibilityLabel={`Colour ${p}`}
              hitSlop={2}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p, borderWidth: 3, borderColor: color === p ? t.ink : 'transparent' }}
            />
          ))}
        </View>
      </Field>
      <Field label="Icon">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {ICONS.map((ic) => (
            <Pressable
              key={ic}
              onPress={() => setIcon(ic)}
              accessibilityRole="radio"
              accessibilityState={{ selected: icon === ic }}
              accessibilityLabel={ic.replace(/-outline$/, '').replace(/-/g, ' ')}
              style={{
                width: touch,
                height: touch,
                borderRadius: radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: icon === ic ? `${color}33` : t.surface2,
                borderWidth: icon === ic ? 2 : 0,
                borderColor: color,
              }}
            >
              <Icon name={ic} size={20} color={icon === ic ? color : t.ink2} />
            </Pressable>
          ))}
        </View>
      </Field>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Button label="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        <Button label="Save" onPress={save} loading={saving} disabled={!name.trim()} style={{ flex: 2 }} />
      </View>
    </Card>
  );
}
