# Technical overview

## General architecture

A single-user, offline Android app. Three layers: screens (expo-router) → Zustand stores → SQLite repositories. The domain logic (cycles, due dates, monthly ledger, loans, savings, statistics) lives in pure, testable functions. Details in `architecture.md`.

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| App | Expo + React Native + TypeScript | local build, no EAS |
| Navigation | expo-router | 4 tabs + modals |
| Data | expo-sqlite + migrations | local |
| State | zustand | |
| Notifications | expo-notifications | local |
| Charts | react-native-svg | custom |

## Main flow

Fixed items → lazy generation of each month's occurrences → home with total/paid/remaining → mark as paid updates the ledger and the loan/savings details → reminders reconciled.

## Key documents

- Functional spec: `plan/00-functional-spec.md`
- Plan: `plan/PHASE-PLAN.md`
- Competitor research: `research/2026-10-23-competitor-features.md`
