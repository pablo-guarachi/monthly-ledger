import { useLocalSearchParams, useRouter } from 'expo-router';

import { Header, Screen, Txt } from '@/lib/components';
import { ItemForm } from '@/lib/features/ItemForm';
import { useItems } from '@/lib/store/useItems';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const item = useItems((s) => s.byId(id ?? ''));
  return (
    <Screen>
      <Header title={item ? `Edit ${item.name}` : 'Edit item'} back />
      {item ? <ItemForm initial={item} onSaved={() => router.back()} /> : <Txt tone="muted">Item not found.</Txt>}
    </Screen>
  );
}
