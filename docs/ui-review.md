# UI review — portfolio pass (2026-10-28)

Branch `portfolio-ui`. Review done **from the code only** (no device was available), then implemented.
Every number below (contrast ratios, dp sizes) was measured from `lib/theme/tokens.ts` and the
component styles, not estimated. A device check is still pending: see "Verify on the phone".

## Phase 0 — what the app is built on

| Area | Finding |
|---|---|
| Stack | Expo SDK 57, React Native 0.86 (new architecture), expo-router 57 (tabs + stack, modals for forms), Zustand 5, expo-sqlite, react-native-svg. No UI kit: a small in-house component set. |
| Reanimated | Installed (peer of expo-router) but **excluded from autolinking** (`package.json → expo.autolinking.exclude`) because of a MAX_PATH ninja loop on Windows. No animation code may depend on it. |
| Tokens | `lib/theme/tokens.ts`: light "paper" (`#F6F1E6`) and dark "ink" (`#0F1D26`) palettes, spacing 4–32, radii 10/14/20/pill, type scale display 34 → caption 12, per-kind colours shared by both themes. Theme follows the system or a manual override (Settings). |
| Typography | Manrope for text, JetBrains Mono for every amount (`Money` → `Txt mono`). Never Inter. |
| Components | `Txt`, `Screen`, `Header`, `Card` (surface/flat/accent/warn/danger), `Button` (primary/secondary/ghost/danger, md/sm), `Chip`, `Icon` (Ionicons), `Money`, `EmptyState`, `BarChart` (svg), form fields. Features: `PaymentRow`, `ItemRow`, `ItemProgress`, `PaymentHistory`, `ItemForm`. |
| Navigation | 4 tabs (This month, Items, Upcoming, Stats) + stack: item detail, item new/edit (modal), settings, categories, db-error. Scheme `monthlyledger://` (deep links work for every route). |
| Data flow | SQLite → repositories (`lib/db`) → Zustand stores → screens. Domain maths in `lib/domain` (33 Jest tests). |
| Must not change | Domain functions and tests, repositories, store contracts, payment status transitions, reminder reconciliation, backup format, routes. All respected: no file in `lib/domain`, `lib/db`, `lib/store`, `lib/format.ts` or `tests/` was modified. |

## Phase 1 — problems found

### Cross-cutting

| # | Problem | Evidence |
|---|---|---|
| C1 | **Light theme text contrast fails WCAG AA** | `muted #8A939B` on bg 2.77:1, on surface2 2.56:1 (used for every caption, label, tab label); `accent #1F8F74` as text 3.56:1; white on accent buttons 4.01:1; `warn #C97A12` on warnSoft 2.85:1; `danger` on dangerSoft 3.93:1. Dark theme: muted on surface2 3.72:1, danger on dangerSoft 4.62 (borderline). |
| C2 | **Selected chips put white text on kind colours** | white on savings `#2EAA8C` 2.9:1, utility/loan 3.0:1. |
| C3 | **Touch targets below 44dp** | Chip 36dp, Button `sm` 38dp, Header back/settings 40dp, month arrows 40dp, Items sort links ~28dp (12pt text + hitSlop 8), Upcoming "ending soon" rows 32dp, category edit/archive 32dp, colour swatches 32dp, item-detail "Manage" link = one text run. |
| C4 | **Three money formatters** | `formatMoney` (grouping, `−`), Items header `toLocaleString('en-GB')` (rounded, depends on Hermes Intl), `ItemRow`/`PaymentHistory` `toFixed(2)` (no thousands separator, hard-coded symbols). |
| C5 | **Empty states are an icon in a grey circle** | No first-launch guidance beyond one CTA, no way to see the app with data without typing real numbers (blocks screenshots and demos). The visual kit's illustrations were unused. |
| C6 | **Accessibility metadata** | Pressable cards had no role/label; progress bars and the chart were invisible to TalkBack; month nav, sort and pickers had no selected state. |

### Per screen

| Screen | Problems |
|---|---|
| **This month** | The key number (34pt display) sits on a *flat* card directly under a 24pt month title and competes with it, the paid count, three equal-weight mini stats and the "left after" row. Hint says "Tap the circle to mark paid" but the whole row toggles. "Today" link is 12pt text with ~30dp target. "All done" state is a one-line card. Kind legend uses an unlabeled loose row. |
| **Items** | Monthly total shown twice (header subtitle and sort row). Sort options are text links, the selected one only differs in colour (accent text at 3.56:1). Search field has no icon or clear button. |
| **Upcoming** | Ending/ended rows 32dp. Summary card is flat with two equal numbers and no count. "No charges" is a single muted line. |
| **Stats** | Chart: single-letter month labels (J/J/J, M/M ambiguous); projected bars filled with `border` colour — almost invisible on paper; average line unlabelled (explained only in a sentence below); the current-month value label is centred on the last bar and gets clipped at the right edge; no accessible description. "Per month (average)" is not an average — it is the monthly equivalent of the current items. |
| **Item detail** | "Manage" URL is a tappable text run with no affordance. |
| **Categories** | 32dp edit/archive icons, 32dp swatches, icon picker 40dp, labels like `play-circle-outline` read out by TalkBack. |
| **Settings** | No sample-data entry point. Otherwise fine (cards, 48dp buttons). |
| **App icon / splash** | **Bug:** `assets/splash-icon.png` is a paper-coloured mark on a transparent background, shown on the paper-coloured light splash → the light-mode splash is blank. Icon is the PIL placeholder while a finished visual kit (`assets/visual-kit/`) was sitting unwired. |
| **Currency / dates** | Dates are consistent (`formatDay`: "23 Oct", year only when different). Currency: see C4. Mixed GBP/EUR is handled by the domain (converted totals, original currency on rows) — correct. |

## Phase 2 — changes defined

- **Tokens:** light muted `#656E76`, accent `#17785F`, warn `#94560A`, danger `#B03A31`; dark muted `#909AA2`, danger `#EE7A6A`. All ≥ 4.5:1 on bg and surface (≥ 4.26 on the secondary surface2). New `type.hero` (44/52) and `touch = 44`.
- **Components:** Chip 40dp + hitSlop (48dp target) and ink-on-paper when selected (kind colour kept as the dot); Button sm 44dp; Header buttons 44dp, title auto-shrinks instead of wrapping; EmptyState takes an illustration and a secondary action; Card exposes role/label when pressable; BarChart rewritten (see Stats).
- **This month:** hero card (surface, 44pt total, `x/y paid` top-right), progress bar with a11y value, "Paid / Still to pay / N overdue", "Left after fixed costs" in accent; kind breakdown in a titled "Where it goes" card; "All paid" card with illustration; 44dp Today pill and arrows; subtitle "Last month / 3 months ago" when browsing; hint copy fixed; payment rows 60dp with a 44dp "open item" target.
- **Items:** search with icon + clear, sort pills (32dp + hitSlop), single total, filtered subtotal only when filtering.
- **Upcoming:** divided summary with charge count, 44dp rows, illustrated empty states.
- **Stats:** yearly total as headline + monthly equivalent and item count; chart with 3-letter months, dashed-outline projected bars, baseline, legend incl. average value, right-aligned current label, a11y summary; 44dp ranked rows.
- **Detail / Categories:** full-row link, 44dp buttons, swatches and icon picker as radio options with readable labels.
- **Formatting:** every amount through `formatMoney`.
- **Sample data:** `lib/demo/sampleData.ts` + Settings card + first-launch shortcut (below).
- **Icon/splash:** visual-kit icon, adaptive layers (incl. monochrome), splash-light/splash-dark, notification icon. Version 1.1.0 / versionCode 2.
- **Responsive behaviour:** phone portrait only (app.json). Long amounts auto-shrink (`adjustsFontSizeToFit`) instead of wrapping; header title shrinks to 75% before truncating; legends wrap; chip rows scroll horizontally.

## Sample data

Settings → **Sample data → Load sample data** (also "Try it with sample data" on the empty This month / Items screens). Confirmation first.

- 15 fictional items for one UK household: rent, council tax (paid by hand, left overdue on purpose), energy, broadband, mobile, a 48-instalment car loan, home and car insurance (yearly), video and music streaming, a cloud plan billed in EUR, a news pass ending in 20 days, gym, an emergency fund and a holiday fund with a target date. Monthly income £3,450 is set **only if** no income was set.
- Created through `useItems.create` (same path as the form), then five past months are generated with `ensurePeriod` and settled with `setPaymentStatus` (one gym month skipped), and the current month's past-due rows are marked paid. Loan balance and savings totals therefore move through the real domain code.
- The created ids are stored in `settings.sample_data`. **Clear sample data** deletes exactly those items with their payments and loan/savings rows, and unsets the income only if the sample set it. User-entered data is never touched.

## Verify on the phone (not yet seen on a device)

1. Splash light and dark, launcher icon (adaptive + themed/monochrome on Android 13+).
2. This month: hero number fits on one line for 4-digit totals; overdue label red; "All paid" card.
3. Stats chart: projected (dashed) vs ledger bars distinguishable, current label not clipped.
4. Dark mode on every tab (`scripts/portfolio-screenshots.sh` captures both).
5. Load → Clear sample data round trip leaves an empty app.

