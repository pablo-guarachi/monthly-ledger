# Competitor research — fixed-cost / subscription tracking apps

*Date: 2026-10-23 — sources: 2026 reviews (CNBC, subtracker.io, resubs.app, thebudgetbadger, lowermysubs), the Wallos README, store listings. Reviews are often written by competing vendors: prices and details do not always agree.*

## Two families of apps

| Family | Examples | How it works | Pros | Cons |
|---|---|---|---|---|
| **Manual, local** | Bobby (iOS), Subby (Android), ReSubs, Subtrack, Tilla, Wallos (self-hosted) | You enter every item yourself: cost, first charge date, cycle | Privacy, no account, one-off price or free, work outside the US | You must keep them up to date by hand, they don't catch price increases |
| **Bank-connected** | Rocket Money, Monarch, Emma, Copilot, PocketGuard, YNAB | Plaid/Open Banking, detect recurring charges | Automatic, alerts before a charge | $7-15/month subscription, partial UK/EU coverage, sensitive data shared with third parties; in one independent test of 8 apps, only 2 found every subscription |

**Conclusion for us**: a personal, manual, local app. No bank integration (same principle as BPaper: zero cloud, zero accounts).

## Features by app

### Bobby (iOS, one-time ~$1-3)
- Fields: name, cost, first charge date, cycle (weekly/monthly/yearly/custom), optional **end date** (with a reminder to cancel in time)
- Reminder before renewal
- Categories, custom icon and colour, library of known services (Netflix, Spotify...) with logos
- Overall monthly total at the top of the list
- iCloud sync only; no sharing

### Subby (Android, free with ads / $2.99 one-time)
- Same model as Bobby; 160+ currencies
- Local backup/restore, automatic Google Drive backup (PRO)
- Home screen widget with subscriptions (PRO)
- "Insights" statistics on recurring spending
- Flexible cycles: weekly, monthly, yearly, custom interval

### Wallos (open source, self-hosted, PHP+SQLite)
- Fields per item: name, amount, currency, frequency, category, **payment method**, next renewal, notes, URL, logo (online logo search)
- Views: dashboard, list, **calendar**, statistics; multiple sort orders
- Multi-currency with a main currency and exchange rates (Fixer API)
- Renewal notifications via email/Telegram/Discord/webhook; a job that recalculates `next_payment`
- CSV import/export; light/dark themes; household members
- Reference example for the data schema and views

### Monarch Money ($99/year) / Rocket Money
- **Calendar view** of every due date in the month
- Alert N days before a charge
- Automatic detection (not replicable and not wanted)

### Bill trackers (TimelyBills, Subtrack, the now-closed Prism)
- Key concept: every bill has a **due date** and a **paid / due** status
- **Autopay** flag (automatic charge vs paid by hand)
- Reminders on the due date, not just on renewal

### PocketGuard
- "**In My Pocket**": income − fixed costs = what's left. A single, very readable number

### Savings / sinking funds (Tuck, EveryDollar, HiveCents)
- For each fund: **target** + **target date** → automatic calculation of the **monthly contribution**
- Progress bar, projected completion date
- Combined monthly total of everything to set aside
- Monthly reminder to contribute; automatic recurring contributions are missing (a gap reported by users)

### Loan trackers (LoanBee, EMI Calculator, Mortgage Payoff Track, Debt Tracker)
- Amortisation schedule: principal / interest per instalment
- **Remaining balance**, instalments paid / total, **payoff date**
- Extra payments and their effect on the end date
- Multiple loans with a combined view; instalment due reminders
- Scenario comparison (out of scope for us)

## Ideas adopted in Monthly Ledger

| # | Idea | From | Phase |
|---|---|---|---|
| 1 | Item = name, amount, currency, cycle, next due date, category, payment method, notes, URL, icon/colour | Bobby, Wallos | 1 |
| 2 | Cycles: weekly, monthly, quarterly, yearly, custom; everything **normalised to a monthly amount** | Subby, Bobby | 1 |
| 3 | Optional end date + reminder to cancel | Bobby | 1 |
| 4 | **Paid / due** status for every month + autopay flag | bill trackers | 2 |
| 5 | Monthly total at the top + "what's left" after income (optional) | Bobby, PocketGuard | 2 |
| 6 | "Next 30 days" view / due-date calendar | Monarch, Wallos | 4 |
| 7 | Local reminders N days before | Bobby, Monarch | 4 |
| 8 | Loans: remaining balance, instalments paid/total, payoff date | LoanBee | 3 |
| 9 | Savings: target + date → suggested monthly contribution, progress bar | Tuck | 3 |
| 10 | Statistics: 12-month trend, by category, yearly cost per item ("Netflix costs you £X/year") | Subby, Wallos | 5 |
| 11 | Local JSON backup/restore + CSV export | Subby, Wallos | 6 |
| 12 | GBP/EUR multi-currency with a manual rate to the main currency | Wallos | 6 |
| 13 | Home screen widget with the month total and upcoming due dates | Subby | backlog |
| 14 | Library of known services with logos | Bobby | backlog |
| 15 | Price change history per item | (gap in manual apps) | backlog |

## Explicitly rejected
- Bank connection / Open Banking
- Accounts, cloud sync, household sharing
- Full YNAB-style budgeting (variable spending categories): the scope is **fixed costs only**
- Bill negotiation, assisted cancellation
