# Monthly Ledger — Visual assets plan

Date: 2026-10-23. Brief: read the project, then plan and create the complete image kit. This work is a standalone asset package; it does not open the next app implementation phases.

## Inputs read and direction

- `docs/plan/PHASE-PLAN.md`, `docs/plan/00-functional-spec.md`.
- Also checked `app.json`, `scripts/gen-assets.py`, `lib/theme/tokens.ts`, `lib/domain/kinds.ts` and the current icon: the code already exists, even though the plan still described the scaffold as not started.
- Personal Android app, offline, with no bank/account/cloud. Three questions: how much does the month cost, what is left to pay, when is it due.
- Evolution of the existing mark: a ledger sheet with three rules and a green confirmation dot. No new currency symbol, bank or investment chart.
- Colours from the current theme: paper `#F6F1E6`, ink `#14232B`/`#0F1D26`, green `#1F8F74`/`#3FBF9C`; existing category accents. Manrope font, JetBrains Mono for numbers; never Inter.
- Light illustrations like small paper sculptures: a different subject per feature, few objects, transparent space, no generated text. They should accompany the interface, not become static screens.

## Inventory and production order

### 1. Identity and platform — reproducible vector and raster sources

- SVG mark: green, ink, paper, white and black.
- Horizontal and stacked logo, for light and dark backgrounds; Manrope wordmark converted to outlines, with no dependency on remote fonts.
- 1024 px app icon; 1080 px adaptive foreground/background layers with the mark inside the central safe circle; a truly monochrome monochrome layer.
- Transparent splash, light/dark variants; white notification icon with transparency at 24/36/48/72/96 px.
- Avatar and favicons for local documentation/previews.

### 2. Original illustrations — ten image_gen images

| Asset | Concept | Use |
|---|---|---|
| welcome-month | Monthly ledger, three rules, the month's cycle | Welcome/documentation; optional for a future introduction |
| empty-ledger | Open ledger and a first bookmark | This month / Items with no data |
| month-complete | Neat sheets and a discreet confirmation | All paid |
| upcoming-clear | Clear calendar and a calm path | Nothing due in the selected period |
| statistics-start | Small tiles starting to form a series | Not enough statistics yet |
| savings-goal | Small steps towards a goal | Savings |
| loan-progress | Paper rings coming apart one by one | Instalment progress, with no promise of automatic payoff |
| backup-export | Ledger going into a portable archive | Local JSON backup |
| backup-restore | Ledger reassembled from an archive | Restore, distinct from backup |
| reminders | A bell and a single folded sheet | Explaining local reminders |

Output for each: original PNG with alpha and WEBP with alpha, description/alt text, prompt and provenance in the manifest. No real data, no bank or sync cloud. Screens with amounts and charts remain app components.

### 3. Native iconography

- The 7 item kinds from the spec: subscription, loan, housing, utility, insurance, savings, other.
- 11 categories: streaming, software, phone-internet, home, utilities, insurance, transport, health, loans, savings, other.
- 4 tabs: month, items, upcoming, statistics.
- 8 actions/states: add, paid, due, overdue, autopay, archive, backup, restore.
- Stroke SVGs, `currentColor`, same 24 px grid. The Ionicons already used by the app keep working: this kit is an optional resource for whoever integrates it, not a silent replacement.

### 4. Documentation and delivery

- `assets/visual-kit/`: brand, platform, icons, illustrations, previews and manifest.
- Local HTML gallery with paper and ink views; inspection sheets with transparency composited only for the preview.
- Usage guide, screen map, sizes and crops to avoid, references for Expo and React Native integration.
- Documentation cover and identity sheet produced from the native sources.
- Checks: mark legibility at 24–48 px, alpha, dimensions, uniqueness and presence of every file; visual check of every image.

## Delivery boundaries

The existing assets in `assets/` and the app code are not overwritten: there were concurrent changes in the project. No build, server, APK install, publishing, commit or push. No Play Store material, social campaigns, third-party service logos or promotional screenshots are needed: they are outside the personal scope set by the plan.

## Status

**Completed on 2026-10-23.** All four sections delivered: 70 asset entries (11 identity, 18 platform, 10 illustrations, 30 pictograms, 1 cover). Original illustrations at 1254×1254 px, with alpha, kept unretouched. The final summary, files and prompts are in `assets/visual-kit/README.md` and `assets/visual-kit/manifest.json`; technical checks in `assets/visual-kit/quality-report.json`, result PASS. Visual check done on every sheet. Integration into the app and testing on the phone were left for the appropriate development phase.
