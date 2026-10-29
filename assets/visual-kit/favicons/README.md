# Monthly Ledger — Favicon pack

The ledger mark on an ink background, derived from the project's SVG logo.

- `favicon.svg`: vector for modern browsers.
- `favicon.ico`: six embedded resolutions, 16/32/48/64/128/256 px.
- `favicon-16x16.png` to `favicon-256x256.png`: seven PNGs, 96 px included.
- `apple-touch-icon.png`: 180×180, opaque background.
- `android-chrome-192x192.png`, `android-chrome-512x512.png`: web install icons, opaque background.
- `maskable-icon-512x512.png`: mark inside the central safe zone, opaque background.
- `site.webmanifest`: manifest for possible future web use.
- `head-snippet.html`: tags to add to the page after copying the folder into a public directory.
- `preview.png`: check of the small sizes; `quality-report.json`: verification results.

The current app is a personal Android app: this pack does not create a PWA and has not been published. If used on the web, adapt `start_url`, `scope` and the tag prefixes to the actual location of the site. The icons in the manifest are relative to the manifest's location.

Regenerate from the project root: `python scripts/build-favicons.py`. The essential favicons already in `platform/` remain available; this folder holds the complete pack.
