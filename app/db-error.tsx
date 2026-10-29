import { useLocalSearchParams } from 'expo-router';

import { Card, Screen, Txt } from '@/lib/components';
import { space } from '@/lib/theme/tokens';

export default function DbErrorScreen() {
  const { message } = useLocalSearchParams<{ message?: string }>();
  return (
    <Screen>
      <Txt variant="h1" style={{ marginTop: space.xxxl, marginBottom: space.md }}>
        Database error
      </Txt>
      <Txt tone="ink2" style={{ marginBottom: space.lg }}>
        The local database could not be opened. Your data is still on the device; restart the app. If it keeps
        failing, restore a backup after reinstalling.
      </Txt>
      <Card tone="danger">
        <Txt mono variant="caption" tone="danger">
          {message || 'unknown error'}
        </Txt>
      </Card>
    </Screen>
  );
}
