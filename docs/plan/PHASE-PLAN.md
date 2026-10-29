# Monthly Ledger — Phase plan

*2026-10-23. The "what" is in `00-functional-spec.md`. This file covers order, deliverables and exit criteria. Each phase is one step: it ends with a check on the phone and an explicit go-ahead before the next one starts. No code had been written when this plan was drafted.*

## Cross-cutting rules

- **Local builds only** (`npx expo run:android`), never EAS. `arm64-v8a` architecture.
- Read the versioned Expo docs before any phase that introduces a native module.
- Every phase leaves the app installable and usable: no phase "breaks" the previous one.
- Amounts in minor units, dates in ISO `YYYY-MM-DD`, periods `YYYY-MM`. No floating `Date` in the DB.
- Domain logic (normalisation, due-date calculation, amortisation, savings) in `lib/domain/` as pure TypeScript, testable without RN.
- Jest tests on the domain functions (due dates, normalisation, loan/savings). No UI tests.
- Commit only on request; record progress at the end of each phase.

---

## Phase 0 — Setup

**Goal**: an empty app with 4 tabs, theme, fonts and an open DB, installed on the phone.

Deliverables:
1. SDK check: `npx create-expo-app@latest` with the default template (expo-router); note the SDK version in `docs/architecture.md`
2. Dependencies: expo-sqlite, zustand, expo-notifications, expo-file-system, expo-sharing, expo-document-picker, expo-haptics, react-native-svg, @expo-google-fonts/manrope, @expo-google-fonts/jetbrains-mono, @react-native-community/datetimepicker, expo-font
3. `app.json`: package `com.peo88.monthlyledger`, portrait orientation, placeholder icon, `userInterfaceStyle: automatic`
4. Design system in `lib/theme/`: colour tokens (light/dark), spacing 4/8/12/16/24/32, radius, typography (Manrope for text, JetBrains Mono for numbers), base components: `Screen`, `Card`, `Money`, `Button`, `Chip`, `EmptyState`
5. `app/(tabs)/`: This month, Items, Upcoming, Stats; `app/settings.tsx` from a header icon
6. `lib/db/`: DB opening, `schema_version` table, empty migration 001
7. First build `npx expo run:android --device` → installed on the phone

Exit criteria: the app opens on the device, tabs are navigable, the theme follows the system, fonts are loaded, no red warnings.

---

## Phase 1 — Fixed items (CRUD)

**Goal**: manage the complete list of fixed costs.

Deliverables:
1. Migration 002: `items`, `categories`, `settings`; seed default categories and default settings
2. `lib/domain/cycle.ts`: `monthlyEquivalent(item)`, `nextDueDate(item, from)`, `occurrencesInPeriod(item, period)` + tests
3. `lib/db/items.ts`: repository (list active/archived, get, insert, update, archive, restore)
4. Zustand store `useItems` (cache + actions)
5. Items tab: list with kind filter chips, search, sorting; collapsed Archived section
6. Item form (`app/item/new.tsx`, `app/item/[id]/edit.tsx`): every field in the spec, pre-filled defaults, validation; loan/savings sections visible but saved in Phase 3
7. Item detail (`app/item/[id].tsx`): summary, yearly cost, edit/archive/open URL actions

Exit criteria: I can create, edit, archive and restore items of every kind on the phone; the "≈ £X/month" totals are correct for every cycle (tests green).

---

## Phase 2 — Monthly ledger

**Goal**: the home screen answers "how much, what's left, when".

Deliverables:
1. Migration 003: `payments` with a unique index on `(item_id, period)`
2. `lib/domain/ledger.ts`: `ensurePeriod(period)` lazily generates the missing occurrences from the active items; `markPaid`, `unmarkPaid`, `skip`; rules for amount changes and archiving (see the spec)
3. This month tab: month header with arrows, total card (total / paid / due / overdue), "£X left" row if income is set, bars by kind, occurrence list with mark-as-paid (tap + haptic) and long-press (skip/undo)
4. Overdue: past due date and unpaid, highlighted; autopay items labelled
5. Empty state with a CTA to the form

Exit criteria: I can navigate months and mark items paid/unpaid, the totals add up; changing an item's amount does not change the history of past months.

---

## Phase 3 — Loans and savings

**Goal**: loan and savings items show their own progress.

Deliverables:
1. Migration 004: `loan_details`, `savings_details`
2. `lib/domain/loan.ts`: `payoffDate`, balance/instalment updates on paid/unpaid + tests
3. `lib/domain/savings.ts`: `suggestedMonthly`, progress, projected date + tests
4. Form: loan section (principal, remaining, total/paid instalments, rate, lender) and savings section (target, saved, target date)
5. Item detail: instalment bar + remaining + payoff; progress bar + suggested vs set contribution
6. The ledger's `markPaid`/`unmarkPaid` update the details (SQLite transaction)

Exit criteria: marking an instalment paid lowers the remaining balance and counter; undoing raises them back; savings show the correct monthly contribution for the target date.

---

## Phase 4 — Due dates and reminders

**Goal**: forget nothing.

Deliverables:
1. Upcoming tab: 30/60-day timeline grouped by day, current week total, "Ending soon: cancel?" box for `end_date` within 30 days
2. `lib/notifications.ts`: permission, Android channel, `reconcile()` that cancels and reschedules (max ~60 notifications / 90 days) at 09:00 local time
3. Reconcile triggers: app start, item save/archive, default reminder change
4. Per-item reminder (`reminder_days`, 0 = none) and a global default; end-date reminder at −7 days

Exit criteria: a test notification arrives on the phone at the expected time; changing a due date removes the old notification.

---

## Phase 5 — Statistics

**Goal**: understand where the fixed spending goes.

Deliverables:
1. `lib/domain/stats.ts`: total per month (12 months, from `payments` where they exist, otherwise projected from the items), breakdown by category/kind, yearly cost per item
2. Stats tab: 12-month bars (svg), horizontal bars per category with %, top 5 by yearly cost, estimated yearly total
3. Reusable svg `BarChart` component (BPaper pattern, no chart libraries)

Exit criteria: the statistics match the home totals for months already opened.

---

## Phase 6 — Backup, settings, personal release

**Goal**: data kept safe, app "finished" for daily use.

Deliverables:
1. Settings: main currency, manual EUR→GBP rate, monthly income, default reminder, theme; category CRUD with soft-delete
2. `lib/backup.ts`: versioned JSON export (every table + schema_version) via the share sheet; import with the document picker, validation, "replaces everything" confirmation, transaction
3. Ledger CSV export (period, item, kind, amount, status, payment date)
4. Local keystore, `gradlew assembleRelease`, APK installed for good
5. 30 days of real use; bugs and ideas noted down

Exit criteria: backup exported, app uninstalled and reinstalled, backup re-imported with no loss; signed release APK on the phone.

---

## After v1 (backlog, not planned)
Home screen widget, service logo library, per-item price history, automatic exchange rates, CSV import.

## Rough estimate
Phases 0-1: 2 sessions. Phase 2: 1-2 sessions. Phase 3: 1 session. Phase 4: 1 session. Phase 5: 1 session. Phase 6: 1-2 sessions. Total ~8-10 work sessions, plus 30 days of use.
