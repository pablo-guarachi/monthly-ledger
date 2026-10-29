# Monthly Ledger — Visual kit

Created on **23 October 2026** after reading the plan and checking the existing assets and theme. Local delivery for the personal Android app: no account, bank or cloud.

**Open [GALLERY.html](GALLERY.html)** to browse every asset, filter them and switch between light and dark backgrounds.

**Full favicon pack:** [favicons/README.md](favicons/README.md), with multi-resolution ICO, SVG, PNG, Apple Touch, Android Chrome, maskable icon and manifest. Regenerate with `python scripts/build-favicons.py`.

## What it contains

| Family | Content | Location |
|---|---|---|
| Identity | 5 mark variants, 2 horizontal logos, 2 stacked logos, 2 wordmarks | `brand/`, SVG and PNG |
| Android and small formats | App icon, 3 adaptive layers, 2 splash images, 5 notification sizes, 4 avatars, 3 favicons + ICO | `platform/` |
| Illustrations | 10 original compositions with transparency | `illustrations/`, PNG and WEBP |
| Pictograms | 7 item kinds, 11 categories, 4 tabs, 8 actions/states | `icons/`, SVG and 96 px PNG |
| Presentation | Project cover, identity sheet, icons and illustrations on both themes | `previews/` |
| Inventory | Paths, dimensions, file sizes, provenance, prompts and alt text for the illustrations | `manifest.json`, `illustration-briefs.json` |

**70 entries in the manifest**: 11 identity, 18 platform, 10 illustrations, 30 pictograms and 1 cover. Format variants and inspection sheets are additional files.

## Visual direction

The mark builds on the ledger already drawn in `scripts/gen-assets.py`: three rules, one shorter, and a confirmation dot. It is simple enough to stay recognisable in the notification bar. No wealth symbols, financial charts or bank connections.

- Paper: `#F6F1E6`; ink: `#14232B`; dark theme: `#0F1D26`.
- Primary green: `#1F8F74`; green on dark backgrounds: `#3FBF9C`.
- Manrope Bold for the wordmark; SVG text is converted to outlines. The files do not depend on remote fonts or on a font installed on the device.
- App numbers stay in JetBrains Mono. Do not introduce fonts inside interface images.
- The illustrations are small paper constructions with subjects specific to each feature. They are decorative: they contain no text, amounts or essential information.

## Choosing a logo

- `logo-horizontal-light.*`: variant **for light backgrounds**, dark lettering.
- `logo-horizontal-dark.*`: variant **for dark backgrounds**, paper-coloured lettering.
- `logo-stacked-*`: vertical composition; use it where a single-line title would become too small.
- `wordmark-*`: name only; for headers where the mark is already present.
- `mark-ink`, `mark-green`, `mark-paper`: marks without the name.
- `mark-white`, `mark-black`: truly monochrome, dot included.

Leave clear space around the logo at least equal to the height of one inner ledger row. Do not distort or stretch it. In the interface, prefer the mark over the full logo below 160 px of width.

## Illustrations: screen map

| Name | Intended placement | Alt text |
|---|---|---|
| `welcome-month` | Introduction/documentation; possible future welcome screen | An open paper ledger surrounded by a calm monthly arc and three organised expense tabs. |
| `empty-ledger` | This month / Items when there are no active items | A blank open ledger with a single green bookmark ready for its first entry. |
| `month-complete` | Confirmation: every occurrence of the month is paid | A neat stack of ledger slips held by a green band with one modest confirmation tick. |
| `upcoming-clear` | Nothing due in the selected period | A clear unnumbered calendar beside a smooth paper path with no obstacles. |
| `statistics-start` | Not enough data for statistics yet | A few low paper tiles begin an unfinished series, leaving space for more monthly data. |
| `savings-goal` | Savings detail/introduction | Small folded green steps lead towards an open paper arch and one gold disc. |
| `loan-progress` | Loan detail/introduction | A short chain of folded paper loops becomes a neatly arranged set of separate rings. |
| `backup-export` | Local JSON backup export | A small ledger is placed inside an open portable archive case with a folded corner tab. |
| `backup-restore` | Restore from backup, distinct from export | Ledger pages unfold from an archive case and settle into an open book. |
| `reminders` | Explaining local reminders or asking for the permission | A folded paper bell leans gently towards a single due-date card. |

The originals are **1254 × 1254 px**. Use **PNG** for direct Android integration and **WEBP** when you want smaller files. Both keep the alpha channel and the original resolution. Render with `contain`, without cropping: roughly 160–220 dp for empty states, 240–280 dp for an introduction. These are suggested composition sizes, to be checked when integrating on the phone.

Do not show a confirmation illustration before the save has succeeded. The backup image does not imply encryption, upload or guaranteed recovery. Charts, paid/due states, amounts, dates and progress remain real, accessible app components.

## Android: files ready for integration

| Use | File | Size |
|---|---|---|
| Standard icon | `platform/icon.png` | 1024 × 1024, opaque background, no pre-applied rounded corners |
| Adaptive foreground | `platform/android-icon-foreground.png` | 1080 × 1080, alpha, centred mark |
| Adaptive background | `platform/android-icon-background.png` | 1080 × 1080, flat opaque background |
| Adaptive monochrome | `platform/android-icon-monochrome.png` | 1080 × 1080, white on transparent |
| Splash on light | `platform/splash-light.png` | 512 × 512, dark mark with alpha |
| Splash on dark | `platform/splash-dark.png` | 512 × 512, light mark with alpha |
| Notification | `platform/notification-96.png` | 96 × 96, white and alpha only |
| Notifications per density | `notification-24/36/48/72/96.png` | 24/36/48/72/96 px |

The essential adaptive content sits inside the central **660 px** circle of the 1080 px layer (10× scale of the 66 dp zone on 108 dp). The system applies the masks: do not add them to the layers. The simulations in `previews/identity.jpg` are for checking the result; they are not launcher assets.

References checked for this delivery: [Android adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive), [Expo SDK 57 SplashScreen](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/), [Expo SDK 57 Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).

`expo-assets.example.json` contains **only the sections to merge** into the existing configuration. It is not a complete app.json and must not replace it. Keep the other plugins and existing settings. The app configuration was not changed by this delivery, and no build or test on the phone was run.

## Screen icons

The SVGs use a 24 px grid, 1.8 stroke, round caps and `currentColor`. Tint them with the theme tokens or `kindColors`. The bundled PNGs are 96 px ink previews, not variants already adapted to the dark theme.

The app already uses Ionicons. The SVG kit is optional: do not add a second icon language without replacing icons consistently. Do not `require('icon.svg')` in an Image component without a loader: use `react-native-svg` with the SVG content, or keep the existing Ionicons.

For decorative illustrations next to an explanatory title, avoid duplicate screen-reader announcements (`accessible={false}`); the informative content stays in the text. Icon-only buttons need an accessible label in the app.

## Reproduction, provenance and maintenance

1. From the project root: `python scripts/build-visual-kit.py`.
2. Requires Pillow, PyMuPDF and fontTools; uses the Manrope font already installed in `node_modules/@expo-google-fonts/manrope/700Bold/`. Font licence: `node_modules/@expo-google-fonts/manrope/LICENSE_FONT`.
3. The command only writes files in `assets/visual-kit/`. The existing assets at the root of `assets/` are preserved.
4. The command calls no API: it recreates the native SVGs and PNGs, copies the generated originals only if they are missing, exports WEBP and regenerates the gallery and sheets.
5. The ten illustrations were created with the **built-in image_gen** tool, one dedicated request per subject. Full prompts and provenance are kept in the manifest. All final masters are also stored here in the project; they do not depend on the private generation folder.
6. The original illustration PNGs were not retouched. The inspection sheets composite thumbnails on light/dark backgrounds without modifying the masters.

## Verification

Results and reproducible checks are in `quality-report.json` and `scripts/verify-visual-kit.py`. Checked: raster decoding, valid SVG XML, gallery paths, subject alpha, monochrome notifications, dimensions and the adaptive safe circle. All illustrations, the small-size logo, the masks and the icons were inspected visually on the sheets.

This is an asset delivery, not an app integration: no changes to screens or to `app.json`, no build, installation, publishing, commit or push.
