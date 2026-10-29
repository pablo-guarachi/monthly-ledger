import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Card, Txt } from '@/lib/components';
import { listPaymentsForItem, setPaymentStatus } from '@/lib/db/payments';
import { todayIso } from '@/lib/domain/date';
import type { Payment, PaymentStatus } from '@/lib/domain/types';
import { useItems } from '@/lib/store/useItems';
import { useLedger } from '@/lib/store/useLedger';
import { formatMoney } from '@/lib/format';
import { space } from '@/lib/theme/tokens';
import { PaymentRow } from './PaymentRow';

/** Per-item payment history (newest first). Tapping toggles paid, like the home list. */
export function PaymentHistory({ itemId }: { itemId: string }) {
  const item = useItems((s) => s.byId(itemId));
  const [rows, setRows] = useState<Payment[]>([]);
  const today = todayIso();

  const load = useCallback(() => {
    listPaymentsForItem(itemId).then(setRows).catch(() => {});
  }, [itemId]);

  useEffect(load, [load]);

  const onSetStatus = async (id: string, status: PaymentStatus) => {
    await setPaymentStatus(id, status);
    load();
    await useLedger.getState().refresh();
    await useItems.getState().refresh();
  };

  if (!rows.length) return null;
  const paidCount = rows.filter((r) => r.status === 'paid').length;
  const paidTotal = rows.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0);

  return (
    <View style={{ marginTop: space.md, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm, paddingHorizontal: space.xs }}>
        <Txt variant="label" tone="muted">
          History
        </Txt>
        <Txt variant="caption" tone="muted">
          {paidCount} paid · {formatMoney(paidTotal, rows[0]!.currency)} so far
        </Txt>
      </View>
      <Card padded={false} style={{ paddingVertical: 2 }}>
        {rows.map((p) => (
          <PaymentRow key={p.id} payment={p} item={item} today={today} onSetStatus={onSetStatus} showPeriod />
        ))}
      </Card>
    </View>
  );
}
