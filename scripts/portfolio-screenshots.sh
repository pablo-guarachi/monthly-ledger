#!/usr/bin/env bash
# Portfolio screenshots for Monthly Ledger (Git Bash on Windows, or any bash with adb).
#
# Prerequisite: the phone is already connected, e.g.  adb connect <ip>:<port>
#
#   bash scripts/portfolio-screenshots.sh            # install APK, first-launch shot, light + dark sets
#   bash scripts/portfolio-screenshots.sh --no-install
#   bash scripts/portfolio-screenshots.sh --skip-empty   # data already loaded: skip the first-launch shot
#   SERIAL=192.168.1.20:41234 bash scripts/portfolio-screenshots.sh   # pick a device when several are attached
#
# Navigation uses the app's deep-link scheme (monthlyledger://<route>, from app.json "scheme").
# Three moments need a human tap, the script waits for Enter:
#   1. "Try it with sample data" -> Load   (only on a fresh install)
#   2-3. opening the "Car loan" item for the detail screenshot (light, then dark)
#
# Output: docs/screenshots/portfolio/{light,dark}/NN-name.png (+ 00-first-launch.png)
set -euo pipefail

export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'   # keep Git Bash from rewriting "monthlyledger://..." and "/sdcard"

PKG="com.peo88.monthlyledger"
SCHEME="monthlyledger"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APK="$ROOT/dist/monthly-ledger-portfolio-arm64.apk"
OUT="$ROOT/docs/screenshots/portfolio"

INSTALL=1
SKIP_EMPTY=0
for arg in "$@"; do
  case "$arg" in
    --no-install) INSTALL=0 ;;
    --skip-empty) SKIP_EMPTY=1 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

# --- adb (not on PATH on this PC) -------------------------------------------------
if [[ -z "${ADB:-}" ]]; then
  for cand in \
    "${LOCALAPPDATA:-}/Android/Sdk/platform-tools/adb.exe" \
    "${ANDROID_HOME:-}/platform-tools/adb.exe" \
    "/c/Users/${USERNAME:-$USER}/AppData/Local/Android/Sdk/platform-tools/adb.exe" \
    "${ANDROID_HOME:-}/platform-tools/adb"; do
    if command -v cygpath >/dev/null 2>&1 && [[ "$cand" == *:* ]]; then cand="$(cygpath -u "$cand")"; fi
    if [[ -x "$cand" ]]; then ADB="$cand"; break; fi
  done
fi
if [[ -z "${ADB:-}" ]]; then
  ADB="$(command -v adb || true)"
fi
[[ -n "${ADB:-}" ]] || { echo "adb not found. Set ADB=/path/to/adb.exe" >&2; exit 1; }

adb() { if [[ -n "${SERIAL:-}" ]]; then "$ADB" -s "$SERIAL" "$@"; else "$ADB" "$@"; fi; }

# --- device -----------------------------------------------------------------------
devices="$("$ADB" devices | awk 'NR>1 && $2=="device" {print $1}')"
count="$(printf '%s\n' "$devices" | grep -c . || true)"
if [[ -z "${SERIAL:-}" ]]; then
  if [[ "$count" -eq 0 ]]; then
    echo "No device connected. Run: \"$ADB\" connect <phone-ip>:<port>  (Developer options > Wireless debugging)" >&2
    exit 1
  elif [[ "$count" -gt 1 ]]; then
    echo "Several devices attached, pick one with SERIAL=...:" >&2
    printf '  %s\n' $devices >&2
    exit 1
  fi
  SERIAL="$devices"
fi
echo "Device: $SERIAL ($(adb shell getprop ro.product.model | tr -d '\r'), Android $(adb shell getprop ro.build.version.release | tr -d '\r'))"

# --- helpers ----------------------------------------------------------------------
shot() { # shot <dir> <name>
  local dir="$1" name="$2" file
  mkdir -p "$dir"
  file="$dir/$name.png"
  sleep 1.5   # let navigation transitions and charts settle
  adb exec-out screencap -p > "$file"
  if [[ ! -s "$file" ]]; then echo "  !! empty screenshot: $file" >&2; return 1; fi
  echo "  saved ${file#"$ROOT"/}"
}

open_route() { # open_route <path without leading slash>
  adb shell am start -W -a android.intent.action.VIEW -d "$SCHEME://$1" "$PKG" >/dev/null
}

wait_enter() { echo; echo ">>> $1"; read -r -p "    Press Enter when ready... " _; }

demo_mode() { # clean status bar: fixed clock, full battery, no notification icons
  if [[ "$1" == on ]]; then
    adb shell settings put global sysui_demo_allowed 1 >/dev/null 2>&1 || true
    adb shell am broadcast -a com.android.systemui.demo -e command enter >/dev/null 2>&1 || true
    adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941 >/dev/null 2>&1 || true
    adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false >/dev/null 2>&1 || true
    adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4 >/dev/null 2>&1 || true
    adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false >/dev/null 2>&1 || true
  else
    adb shell am broadcast -a com.android.systemui.demo -e command exit >/dev/null 2>&1 || true
  fi
}

ORIGINAL_NIGHT="$(adb shell cmd uimode night 2>/dev/null | tr -d '\r' | awk '{print $NF}')"
cleanup() {
  demo_mode off
  case "${ORIGINAL_NIGHT:-}" in yes|no|auto) adb shell cmd uimode night "$ORIGINAL_NIGHT" >/dev/null 2>&1 || true ;; esac
}
trap cleanup EXIT

# --- install + launch -------------------------------------------------------------
if [[ "$INSTALL" -eq 1 ]]; then
  [[ -f "$APK" ]] || { echo "APK not found: $APK (build it first, see docs/BUILD.md)" >&2; exit 1; }
  echo "Installing $(basename "$APK") ..."
  adb install -r "$APK"
fi
# pre-grant notifications so the permission dialog never covers a screenshot (Android 13+)
adb shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true

demo_mode on
adb shell cmd uimode night no >/dev/null 2>&1 || true
adb shell am force-stop "$PKG"
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 4

if [[ "$SKIP_EMPTY" -eq 0 ]]; then
  open_route ""
  shot "$OUT" "00-first-launch"
  wait_enter "On the phone: tap 'Try it with sample data' -> Load (or Settings > Sample data > Load sample data)."
fi

# --- light + dark sets ------------------------------------------------------------
for mode in light dark; do
  echo "== $mode =="
  if [[ "$mode" == dark ]]; then adb shell cmd uimode night yes >/dev/null; else adb shell cmd uimode night no >/dev/null; fi
  sleep 2
  dir="$OUT/$mode"
  open_route "";         shot "$dir" "01-this-month"
  open_route "items";    shot "$dir" "02-items"
  open_route "upcoming"; shot "$dir" "03-upcoming"
  open_route "stats";    shot "$dir" "04-stats"
  open_route "settings"; shot "$dir" "06-settings"
  adb shell input keyevent KEYCODE_BACK
  open_route "item/new"; shot "$dir" "07-new-item"
  adb shell input keyevent KEYCODE_BACK
  # item ids are generated on the device, so the detail page needs one tap
  open_route "items"
  wait_enter "On the phone ($mode): tap 'Car loan' in the Items list so its detail page is on screen."
  shot "$dir" "05-item-detail"
  adb shell input keyevent KEYCODE_BACK
done

echo
echo "Done. Screenshots in ${OUT#"$ROOT"/}/  (light/ and dark/)."
echo "Check them, then reference the ones you like in README.md."
