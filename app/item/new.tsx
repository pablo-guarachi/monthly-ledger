import { Header, Screen } from '@/lib/components';
import { ItemForm } from '@/lib/features/ItemForm';

export default function NewItemScreen() {
  return (
    <Screen>
      <Header title="New item" back />
      <ItemForm />
    </Screen>
  );
}
