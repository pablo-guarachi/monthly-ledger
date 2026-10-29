import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Card, Txt } from '@/lib/components';
import { clearSampleData, getSampleState, loadSampleData } from '@/lib/demo/sampleData';
import { space } from '@/lib/theme/tokens';

/** Confirmation + load. Shared by the Settings card and the first-launch empty state. */
export function confirmLoadSample(onDone?: (count: number) => void, onStart?: () => void): void {
  Alert.alert(
    'Load sample data?',
    'Adds 15 fictional fixed costs (rent, bills, a car loan, insurance, subscriptions, two savings goals) with five months of history. Your own items are not touched, and "Clear sample data" in Settings removes exactly these.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Load',
        onPress: () => {
          onStart?.();
          loadSampleData()
            .catch((e: unknown) => {
              Alert.alert('Could not load sample data', e instanceof Error ? e.message : String(e));
              return 0;
            })
            .then((n) => onDone?.(n));
        },
      },
    ],
  );
}

/** Settings card: load or clear the sample household. */
export function SampleDataCard() {
  const [loaded, setLoaded] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const check = useCallback(() => {
    getSampleState()
      .then((s) => setLoaded(!!s))
      .catch(() => setLoaded(false));
  }, []);
  useEffect(check, [check]);

  const onLoad = () =>
    confirmLoadSample(
      () => {
        setBusy(false);
        check();
      },
      () => setBusy(true),
    );

  const onClear = () =>
    Alert.alert('Clear sample data?', 'Removes the sample items and their history. Anything you added yourself stays.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          clearSampleData()
            .catch((e: unknown) => Alert.alert('Could not clear sample data', e instanceof Error ? e.message : String(e)))
            .finally(() => {
              setBusy(false);
              check();
            });
        },
      },
    ]);

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Txt variant="h2" style={{ flex: 1 }}>
          Sample data
        </Txt>
        {loaded ? (
          <Txt variant="caption" tone="accent" weight="bold">
            Loaded
          </Txt>
        ) : null}
      </View>
      <Txt tone="ink2">
        A fictional household to explore the app (or take screenshots) without typing in your own numbers.
      </Txt>
      {loaded ? (
        <Button label="Clear sample data" variant="danger" icon="trash-outline" loading={busy} onPress={onClear} />
      ) : (
        <Button label="Load sample data" variant="secondary" icon="sparkles-outline" loading={busy} disabled={loaded === null} onPress={onLoad} />
      )}
    </Card>
  );
}
