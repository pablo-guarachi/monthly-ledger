import { useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Chip, Txt } from '@/lib/components';
import { DateField, Field, SectionTitle, SwitchRow, TextField } from '@/lib/components/form';
import { CYCLES } from '@/lib/domain/cycle';
import { isValidIso, todayIso } from '@/lib/domain/date';
import { KINDS, kindMeta } from '@/lib/domain/kinds';
import type { Currency, Cycle, CycleUnit, Item, ItemInput, Kind } from '@/lib/domain/types';
import { minorToInput, parseMoney } from '@/lib/format';
import { useItems } from '@/lib/store/useItems';
import { useSettings } from '@/lib/store/useSettings';
import { space } from '@/lib/theme/tokens';

type Props = {
  initial?: Item;
  onSaved?: (item: Item) => void;
};

const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Default' },
  { value: 0, label: 'None' },
  { value: 1, label: '1 day' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 7, label: '1 week' },
];

export function ItemForm({ initial, onSaved }: Props) {
  const router = useRouter();
  const mainCurrency = useSettings((s) => s.mainCurrency);
  const allCategories = useItems((s) => s.categories);
  const categories = useMemo(() => allCategories.filter((c) => !c.isArchived), [allCategories]);
  const create = useItems((s) => s.create);
  const update = useItems((s) => s.update);

  const [kind, setKind] = useState<Kind>(initial?.kind ?? 'subscription');
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(minorToInput(initial?.amount));
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? mainCurrency);
  const [cycle, setCycle] = useState<Cycle>(initial?.cycle ?? 'monthly');
  const [cycleEvery, setCycleEvery] = useState(String(initial?.cycleEvery ?? 1));
  const [cycleUnit, setCycleUnit] = useState<CycleUnit>(initial?.cycleUnit ?? 'month');
  const [anchorDate, setAnchorDate] = useState<string>(initial?.anchorDate ?? todayIso());
  const [endDate, setEndDate] = useState<string | null>(initial?.endDate ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(
    initial?.categoryId ?? kindMeta(initial?.kind ?? 'subscription').defaultCategoryId,
  );
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? '');
  const [autopay, setAutopay] = useState(initial?.autopay ?? kindMeta('subscription').defaultAutopay);
  const [reminderDays, setReminderDays] = useState<number | null>(initial?.reminderDays ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  // loan
  const [principal, setPrincipal] = useState(minorToInput(initial?.loan?.principalTotal));
  const [remaining, setRemaining] = useState(minorToInput(initial?.loan?.remainingBalance));
  const [instTotal, setInstTotal] = useState(initial?.loan?.installmentsTotal?.toString() ?? '');
  const [instPaid, setInstPaid] = useState(initial?.loan?.installmentsPaid?.toString() ?? '0');
  const [rate, setRate] = useState(initial?.loan?.interestRateBp != null ? (initial.loan.interestRateBp / 100).toString() : '');
  const [lender, setLender] = useState(initial?.loan?.lender ?? '');
  // savings
  const [target, setTarget] = useState(minorToInput(initial?.savings?.targetAmount));
  const [saved, setSaved] = useState(minorToInput(initial?.savings?.savedAmount ?? 0));
  const [targetDate, setTargetDate] = useState<string | null>(initial?.savings?.targetDate ?? null);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const meta = useMemo(() => kindMeta(kind), [kind]);

  const pickKind = (k: Kind) => {
    const m = kindMeta(k);
    setKind(k);
    if (!initial) {
      setAutopay(m.defaultAutopay);
      setCategoryId(m.defaultCategoryId);
    }
  };

  const validate = (): ItemInput | null => {
    const e: Record<string, string> = {};
    const amt = parseMoney(amount);
    if (!name.trim()) e.name = 'Give it a name';
    if (amt === null || amt < 0) e.amount = 'Enter an amount';
    if (!isValidIso(anchorDate)) e.anchorDate = 'Pick the first charge date';
    if (endDate && endDate < anchorDate) e.endDate = 'End date is before the first charge';
    const every = parseInt(cycleEvery, 10);
    if (cycle === 'custom' && (!Number.isFinite(every) || every < 1)) e.cycleEvery = 'Must be 1 or more';

    let loan: ItemInput['loan'] = null;
    let savingsD: ItemInput['savings'] = null;
    if (kind === 'loan') {
      const p = parseMoney(principal);
      const r = parseMoney(remaining);
      const it = instTotal.trim() ? parseInt(instTotal, 10) : null;
      const ip = parseInt(instPaid || '0', 10);
      const rt = rate.trim() ? Math.round(parseFloat(rate) * 100) : null;
      if (p === null || p <= 0) e.principal = 'Enter the loan amount';
      if (r === null || r < 0) e.remaining = 'Enter the remaining balance';
      if (it !== null && (!Number.isFinite(it) || it < 1)) e.instTotal = 'Must be 1 or more';
      if (!Number.isFinite(ip) || ip < 0) e.instPaid = 'Must be 0 or more';
      if (it !== null && Number.isFinite(ip) && ip > it) e.instPaid = 'More paid than total';
      loan = {
        principalTotal: p ?? 0,
        remainingBalance: r ?? p ?? 0,
        installmentsTotal: it,
        installmentsPaid: Number.isFinite(ip) ? ip : 0,
        interestRateBp: rt !== null && Number.isFinite(rt) ? rt : null,
        lender: lender.trim() || null,
      };
    }
    if (kind === 'savings') {
      const tg = parseMoney(target);
      const sv = parseMoney(saved || '0');
      if (tg === null || tg <= 0) e.target = 'Enter a goal amount';
      if (sv === null || sv < 0) e.saved = 'Enter what you have saved so far';
      if (targetDate && targetDate < todayIso()) e.targetDate = 'Target date is in the past';
      savingsD = { targetAmount: tg ?? 0, savedAmount: sv ?? 0, targetDate };
    }
    setErrors(e);
    if (Object.keys(e).length) return null;
    return {
      kind,
      name: name.trim(),
      amount: amt ?? 0,
      currency,
      cycle,
      cycleEvery: cycle === 'custom' ? every : 1,
      cycleUnit: cycle === 'custom' ? cycleUnit : cycle === 'weekly' ? 'day' : 'month',
      anchorDate,
      endDate,
      categoryId,
      paymentMethod: paymentMethod.trim() || null,
      autopay,
      reminderDays,
      notes: notes.trim() || null,
      url: url.trim() || null,
      icon: null,
      color: null,
      loan,
      savings: savingsD,
    };
  };

  const save = async () => {
    const input = validate();
    if (!input) return;
    setSaving(true);
    try {
      const item = initial ? await update(initial.id, input) : await create(input);
      if (onSaved) onSaved(item);
      else router.back();
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: space.lg }}>
      <Field label="Type">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {KINDS.map((k) => (
            <Chip key={k.key} label={k.label} color={k.color} dot selected={kind === k.key} onPress={() => pickKind(k.key)} />
          ))}
        </ScrollView>
      </Field>

      <Field label="Name" error={errors.name}>
        <TextField value={name} onChangeText={setName} placeholder="Netflix, Rent, Car loan…" autoCapitalize="words" returnKeyType="next" />
      </Field>

      <Field label={meta.amountLabel} error={errors.amount}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <TextField
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            mono
            style={{ flex: 1 }}
          />
          <Chip label="£ GBP" selected={currency === 'GBP'} onPress={() => setCurrency('GBP')} />
          <Chip label="€ EUR" selected={currency === 'EUR'} onPress={() => setCurrency('EUR')} />
        </View>
      </Field>

      <Field label="Billing cycle" error={errors.cycleEvery}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {CYCLES.map((c) => (
            <Chip key={c.value} label={c.label} selected={cycle === c.value} onPress={() => setCycle(c.value)} />
          ))}
        </View>
        {cycle === 'custom' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
            <Txt tone="ink2">Every</Txt>
            <TextField value={cycleEvery} onChangeText={setCycleEvery} keyboardType="number-pad" mono style={{ width: 72 }} />
            <Chip label="days" selected={cycleUnit === 'day'} onPress={() => setCycleUnit('day')} />
            <Chip label="months" selected={cycleUnit === 'month'} onPress={() => setCycleUnit('month')} />
          </View>
        ) : null}
      </Field>

      <Field label={initial ? 'First charge date' : 'First / next charge date'} error={errors.anchorDate} hint="Due dates repeat from this date.">
        <DateField value={anchorDate} onChange={(v) => v && setAnchorDate(v)} />
      </Field>

      <Field label="End date (optional)" error={errors.endDate} hint="Contract end or planned cancellation. You get a reminder a week before.">
        <DateField value={endDate} onChange={setEndDate} clearable placeholder="No end date" />
      </Field>

      {kind === 'loan' ? (
        <Card style={{ gap: space.md }}>
          <SectionTitle>Loan details</SectionTitle>
          <Field label="Total borrowed" error={errors.principal}>
            <TextField value={principal} onChangeText={setPrincipal} keyboardType="decimal-pad" mono placeholder="0.00" />
          </Field>
          <Field label="Remaining balance" error={errors.remaining} hint="Goes down by one instalment each time you mark it paid.">
            <TextField value={remaining} onChangeText={setRemaining} keyboardType="decimal-pad" mono placeholder="0.00" />
          </Field>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Field label="Instalments paid" error={errors.instPaid} style={{ flex: 1 }}>
              <TextField value={instPaid} onChangeText={setInstPaid} keyboardType="number-pad" mono />
            </Field>
            <Field label="Total instalments" error={errors.instTotal} style={{ flex: 1 }}>
              <TextField value={instTotal} onChangeText={setInstTotal} keyboardType="number-pad" mono placeholder="optional" />
            </Field>
          </View>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Field label="Interest rate %" style={{ flex: 1 }}>
              <TextField value={rate} onChangeText={setRate} keyboardType="decimal-pad" mono placeholder="optional" />
            </Field>
            <Field label="Lender" style={{ flex: 1 }}>
              <TextField value={lender} onChangeText={setLender} placeholder="optional" autoCapitalize="words" />
            </Field>
          </View>
        </Card>
      ) : null}

      {kind === 'savings' ? (
        <Card style={{ gap: space.md }}>
          <SectionTitle>Savings goal</SectionTitle>
          <Field label="Goal amount" error={errors.target}>
            <TextField value={target} onChangeText={setTarget} keyboardType="decimal-pad" mono placeholder="0.00" />
          </Field>
          <Field label="Saved so far" error={errors.saved} hint="Goes up by one contribution each time you mark it paid.">
            <TextField value={saved} onChangeText={setSaved} keyboardType="decimal-pad" mono placeholder="0.00" />
          </Field>
          <Field label="Target date (optional)" error={errors.targetDate} hint="Used to suggest a monthly contribution.">
            <DateField value={targetDate} onChange={setTargetDate} clearable placeholder="No target date" />
          </Field>
        </Card>
      ) : null}

      <Field label="Category">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          <Chip label="None" selected={categoryId === null} onPress={() => setCategoryId(null)} />
          {categories.map((c) => (
            <Chip key={c.id} label={c.name} color={c.color} dot selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
        </ScrollView>
      </Field>

      <Field label="Paid from (optional)">
        <TextField value={paymentMethod} onChangeText={setPaymentMethod} placeholder="Monzo, Amex, Direct debit…" autoCapitalize="words" />
      </Field>

      <Card style={{ gap: space.sm }}>
        <SwitchRow
          label="Charged automatically"
          hint={autopay ? 'Direct debit or card on file: just confirm it went out.' : 'You pay this one by hand.'}
          value={autopay}
          onChange={setAutopay}
        />
      </Card>

      <Field label="Reminder before due date">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {REMINDER_OPTIONS.map((o) => (
            <Chip key={String(o.value)} label={o.label} selected={reminderDays === o.value} onPress={() => setReminderDays(o.value)} />
          ))}
        </View>
      </Field>

      <Field label="Link (optional)" hint="Where you manage or cancel it.">
        <TextField value={url} onChangeText={setUrl} placeholder="https://" autoCapitalize="none" keyboardType="url" autoCorrect={false} />
      </Field>

      <Field label="Notes (optional)">
        <TextField value={notes} onChangeText={setNotes} placeholder="Account number, plan, who shares it…" multiline />
      </Field>

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.sm }}>
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
        <Button label={initial ? 'Save changes' : 'Add item'} onPress={save} loading={saving} style={{ flex: 2 }} />
      </View>
      <View style={{ height: space.xxxl }} />
    </View>
  );
}
