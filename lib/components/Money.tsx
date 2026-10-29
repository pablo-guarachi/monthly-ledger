import { Txt, type TxtProps } from './Txt';
import { formatMoney } from '@/lib/format';
import type { Currency } from '@/lib/store/useSettings';

type Props = Omit<TxtProps, 'children' | 'mono'> & {
  amount: number;
  currency: Currency | string;
  /** show "+"/"−" sign for signed values */
  signed?: boolean;
  /** drop pence when the value is a whole amount */
  compact?: boolean;
};

export function Money({ amount, currency, signed, compact, ...rest }: Props) {
  return (
    <Txt mono {...rest}>
      {formatMoney(amount, currency, { signed, compact })}
    </Txt>
  );
}
