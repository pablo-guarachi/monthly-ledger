# Architecture

*Updated 2026-10-23 — phases 0-6 implemented. Actual versions below.*

## Main patterns

- **Local-first, offline**: the only data source is SQLite on the device (`monthly-ledger.db`). No network at runtime.
- **Pure domain** in `lib/domain/`: dates, cycles, ledger, loans, savings, upcoming due dates, statistics. No RN dependency, 33 Jest tests.
- **Repositories** in `lib/db/*.ts`: all SQL lives here; screens only talk to the stores.
- **Zustand stores** (`lib/store/`): `useSettings`, `useItems` (items + categories, with an `onItemChange` bus), `useLedger` (the month on screen). Every change to an item re-syncs the month and the reminders.
- **Ledger snapshots**: `payments.amount` is copied at generation time; past months do not change when the item changes. `due` rows for periods ≥ the current month are re-synced; `paid`/`skipped` rows never are.
- **Lazy occurrences**: `ensurePeriod(period)` generates the missing rows when a month is opened. Weekly/custom-day items: one row per period with `amount × occurrences` and the due date set to the first occurrence.
- **Numbered migrations** (`PRAGMA user_version`), complete v1 schema. JSON backup = dump of every table; restore inserts only the columns that exist in the current schema.
- **Soft-delete** for items and categories.
- **Reconciled reminders**: `notifications.reconcile()` cancels and reschedules (max 60 notifications, 90-day horizon) at startup, when returning to the foreground, on every item change and on every change to the reminder settings.

## Folder structure

```
app/
  _layout.tsx              # fonts, theme, bootstrap DB → settings → items → ledger → permissions → reminders; AppState; notification tap
  (tabs)/index.tsx         # This month
  (tabs)/items.tsx         # Items (filters, search, sorting, archived, FAB)
  (tabs)/upcoming.tsx      # Next 30/60/90 days, ending soon, ended
  (tabs)/stats.tsx         # 12-month trend, by kind, by category, yearly cost
  item/new.tsx  item/[id]/index.tsx  item/[id]/edit.tsx
  settings.tsx  categories.tsx  db-error.tsx
lib/
  theme/      tokens.ts (light/dark colours, fonts, spacing), ThemeContext.tsx
  components/ Txt, Screen, Header, Card, Button, Chip, Icon, Money, EmptyState, BarChart, form.tsx
  features/   ItemForm, ItemRow, ItemProgress (loan/savings), PaymentRow, PaymentHistory
  domain/     date, types, cycle, kinds, money, ledger, loan, savings, upcoming, stats
  db/         client (open+migrate), migrations, settings, categories, items, payments, backup
  store/      useSettings, useItems, useLedger
  notifications.ts  backup.ts  format.ts
plugins/withReleaseSigning.js   # release signing from the keystore in signing/ (gitignored)
scripts/gen-assets.py           # icons/splash generated with PIL
tests/                          # jest, domain only
docs/ signing/(gitignored)
```

## Stack and installed versions

| Package | Version | Notes |
|---|---|---|
| expo | 57.0.31 | **SDK 57 chosen** over 58 (latest) because it was already proven on this PC |
| react / react-native | 19.2.3 / 0.86.3 | new architecture |
| expo-router | 57.0.29 | tabs + stack; modals for the forms |
| expo-sqlite | 57.0.4 | WAL, foreign keys, `withExclusiveTransactionAsync` |
| expo-notifications | 57.0.24 | local only, `reminders` channel, DATE triggers |
| expo-file-system / expo-sharing / expo-document-picker | 57.0.7 / 57.0.24 / 57.0.3 | new `File`/`Paths` API, backup via the share sheet |
| react-native-svg | 15.15.4 | custom `BarChart` |
| zustand | 5.x | |
| @react-native-community/datetimepicker | 9.1.0 | `DateTimePickerAndroid.open` |
| @expo/vector-icons | Ionicons | |
| react-native-gesture-handler / reanimated / worklets | 2.32.0 / 4.5.1 / 0.10.1 | peers of expo-router (drawer-layout). **They must be pinned to the SDK versions**: npm auto-installs the latest ones and the native build fails (see BUILD.md) |
| jest / jest-expo / typescript | 30.5.2 / 57.0.6 / 6.0.3 | |

Build: local, `arm64-v8a`, compileSdk/targetSdk 36, minSdk 26, edge-to-edge. Details and fixes in `BUILD.md`.

## Main flow

1. Startup: fonts → `getDb()` (migrations) → `useSettings.hydrate` → `refreshNextDueDates` → `useItems.refresh` → `useLedger.refresh` (current month) → notification permission → `reconcile()`
2. Home: the period's `payments` + items → `summarizePeriod` (total/paid/due/overdue, by kind, "left after fixed costs") in the main currency with the manual EUR→GBP rate
3. Mark as paid: `setPaymentStatus` in a transaction → updates `loan_details` (balance −instalment, instalments +1) or `savings_details` (saved +contribution) → store refresh
4. Save item: upsert `items` (+details) → `next_due_date` → `onItemChange` → `ensurePeriod` re-syncs the `due` rows → `reconcile()` reminders

## Architecture decisions

See `docs/decisions/` (platform and stack: `2026-10-23-platform-and-stack.md`).
