# Monthly Ledger — Functional spec v1

*2026-10-23. Derived from the research in `../research/2026-10-23-competitor-features.md`. This file is the source of truth for the "what"; `PHASE-PLAN.md` is the "when".*

## Principle

A single list of fixed commitments. Every month the app answers three questions:
1. **How much** do my fixed costs come to this month?
2. **What** have I already paid and what is left?
3. **When** is the next due date?

Everything else (loans, savings, statistics) is a view on that list.

## Data model

### `items` — fixed item
| Field | Type | Notes |
|---|---|---|
| id | text (uuid) | |
| kind | enum | subscription, loan, housing, utility, insurance, savings, other |
| name | text | required |
| amount | integer | minor units (pence/cents) |
| currency | text | `GBP` default, `EUR` |
| cycle | enum | weekly, monthly, quarterly, yearly, custom |
| cycle_every | integer | custom only: every N `cycle_unit` |
| cycle_unit | enum | day, month (custom only) |
| anchor_date | date | date of the first charge; due dates are calculated from here |
| next_due_date | date | calculated and persisted (like Wallos) |
| end_date | date? | optional: after this date the item generates no occurrences; "cancel" reminder |
| category_id | text? | FK categories |
| payment_method | text? | e.g. "Monzo", "Amex card", "Direct debit" |
| autopay | bool | default true for subscription/loan/utility, false for savings |
| reminder_days | integer? | null = use the global default; 0 = no reminder |
| notes | text? | |
| url | text? | link to manage/cancel |
| icon | text? | icon name |
| color | text? | hex |
| is_archived | bool | soft-delete |
| archived_at | datetime? | |
| created_at / updated_at | datetime | |

### `loan_details` (1:1 with an item of kind=loan)
| Field | Notes |
|---|---|
| principal_total | initial amount |
| remaining_balance | updated on every payment (−amount) or edited by hand |
| installments_total | number of instalments |
| installments_paid | counter, updated from the ledger |
| interest_rate_bp | optional, basis points, informational only |
| lender | text |
| payoff_date | calculated: next_due + (total − paid) cycles |

### `savings_details` (1:1 with an item of kind=savings)
| Field | Notes |
|---|---|
| target_amount | target |
| saved_amount | saved so far, +amount on every confirmed payment |
| target_date | optional |
| suggested_monthly | calculated: (target − saved) / remaining months |

### `payments` — monthly ledger
| Field | Notes |
|---|---|
| id | uuid |
| item_id | FK |
| period | `YYYY-MM` |
| due_date | actual due date in that period |
| amount | snapshot of the amount at generation time (future changes to the item do not rewrite history) |
| currency | snapshot |
| status | due, paid, skipped |
| paid_at | datetime? |
| note | text? |

Unique index on `(item_id, period)`. Rows are generated **lazily** when a month is opened; occurrences of an item with a non-monthly cycle appear only in the months where a due date falls.

### `categories`
id, name, color, icon, sort_order, is_archived. Defaults: Streaming, Software, Phone/Internet, Home, Utilities, Insurance, Transport, Health, Loans, Savings, Other.

### `settings` (key/value)
main_currency, eur_to_gbp_rate (manual), monthly_income (optional, minor units), default_reminder_days (default 2), theme.

### Monthly normalisation
- monthly → amount
- weekly → amount × 52 / 12
- quarterly → amount / 3
- yearly → amount / 12
- custom day N → amount × 365.25 / (12 × N)
- custom month N → amount / N
Rounding to the minor unit happens only on display.

## Screens

### 1. This month (home, tab 1)
- Header: current month with ← → arrows
- Total card: **fixed total for the month** in the main currency; below it: paid / due / overdue
- If `monthly_income` is set: "£X left after fixed costs" row
- Bar breakdown by kind (subscription / loan / housing+utility / savings / other)
- List of the month's occurrences sorted by due date: name, amount, date, status. Tap on the circle = mark as paid (with haptic); long-press = skip / undo payment
- Overdue highlighted (past due and unpaid); autopay items shown with an "auto" label
- Empty state: "No fixed costs. Add the first one" with a CTA

### 2. Items (tab 2)
- Kind filter chips; search by name; sorting (due date, amount, name)
- Row: icon/colour, name, amount + cycle, "≈ £X/month" if not monthly, next due date
- Collapsed "Archived" section at the bottom with restore
- "+" FAB → form

### 3. Item form (modal)
- Kind (segmented) → shows extra fields for loan / savings
- Name, amount (numeric keyboard, currency alongside), cycle, first charge date (default today), end date (optional), category, payment method, autopay, reminder, notes, URL
- Pre-filled defaults; inline validation; save/cancel; in edit mode also "Archive"

### 4. Item detail
- Summary + yearly cost ("costs you £X/year")
- Loan: paid/total instalments bar, remaining balance, expected payoff, manual balance edit
- Savings: progress bar, suggested vs set monthly contribution, target date
- Payment history (ledger filtered by item)
- Actions: edit, archive, open URL

### 5. Upcoming (tab 3)
- 30 / 60-day timeline grouped by day, with the current week's total
- Items with `end_date` within 30 days: "Ending soon: cancel?" box

### 6. Stats (tab 4)
- Monthly total trend for the last 12 months (svg bars)
- Breakdown by category (horizontal bars with %)
- Top 5 items by yearly cost
- Estimated yearly total

### 7. Settings
- Main currency, manual EUR→GBP rate, monthly income, default reminder, theme
- Categories (CRUD with soft-delete)
- Backup: export JSON (share sheet), import JSON (document picker, with a "replaces everything" confirmation)
- Ledger CSV export

## Reminders (local)
- When an item changes, its notifications are rescheduled: `next_due_date − reminder_days` at 09:00
- End-date reminder: 7 days before `end_date`
- On app launch: reconciliation (cancel and reschedule everything, max ~60 notifications over the next 90 days)

## Business rules
- Marking a loan paid: `remaining_balance −= amount`, `installments_paid += 1`
- Marking savings paid: `saved_amount += amount`
- Undoing a payment reverses the operations above
- Changing an item's amount updates only the **future unpaid** occurrences from the current month onwards; history stays a snapshot
- Archiving an item does not touch past payments; future `due` occurrences from the current month are removed
- An item whose `end_date` has passed is suggested for archiving

## Not in v1 (backlog)
Widget, logo library, price history, automatic exchange rates, CSV import, sharing, sync.
