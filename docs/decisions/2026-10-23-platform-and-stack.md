# 2026-10-23 — Android Expo platform, local data, builds without EAS

## Context

A personal app is needed to track fixed monthly costs (subscriptions, loans, rent, savings). The competitor research (`../research/2026-10-23-competitor-features.md`) shows two families: manual local apps (Bobby, Subby, Wallos) and bank-connected apps (Rocket Money, Monarch). Options considered: local web PWA, PWA + backend on a VPS, Android Expo app.

## Decision

- **Native Android app with Expo**, following the BPaper pattern: expo-router, expo-sqlite, Zustand, local notifications, custom SVG charts.
- **Local-only data**, no account/cloud/bank; exportable JSON backup.
- **Local build** (`expo run:android`, `gradlew assembleRelease`), never EAS: EAS credits are reserved for another project.
- **Personal use**: no Play Store publishing, sideloaded APK.
- Project name: `monthly-ledger`.

## Rationale

- Reliable native notifications and a possible future widget: the main need is "don't forget due dates".
- Toolchain already proven on the PC with previous Expo apps, and the device paired over wireless adb.
- Manual/local apps are the right reference for a personal tool: no recurring costs, no privacy given away.

## Consequences

- Data on a single device: PC/phone sync postponed (possible backlog item).
- Every phase ends with a build and a check on the phone.
- Rejected alternative: PWA (installable anywhere, but web notifications on Android are less reliable and there is no widget).
