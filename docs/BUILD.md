# Build APK — Monthly Ledger (personal use, sideload)

The app is not published: the APK is installed by hand on the phone. No Play Store, **never EAS**.

## Prerequisites
- Android SDK in `%LOCALAPPDATA%\Android\Sdk` (`ANDROID_HOME` set), Android Studio's JDK 21 (`JAVA_HOME`)
- Node 24, `npm install` done
- Local keystore in `signing/` (gitignored): `monthly-ledger-release.jks` + `keystore.properties`. Read by `plugins/withReleaseSigning.js` during `expo prebuild`. Without those files the release build stays debug-signed.

> ⚠️ Windows MAX_PATH: build **`arm64-v8a` only** (`-PreactNativeArchitectures=arm64-v8a`). The test phone is 64-bit.

## Signed release (standard command)

```powershell
# from the repository root
npx expo prebuild --platform android --no-install      # regenerates/updates android/ and applies the signing plugin
cd android
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
```

APK: `android\app\build\outputs\apk\release\app-release.apk` → copy it to the phone (USB/Drive) and open it. Or with adb (from the Android SDK `platform-tools` folder):

```powershell
adb install -r android\app\build\outputs\apk\release\app-release.apk
```

Equivalent npm scripts: `npm run prebuild`, `npm run build:release`, `npm run build:debug`.

## Updating the app
1. Bump `expo.android.versionCode` (and `version`) in `app.json`
2. Repeat prebuild + assembleRelease
3. `adb install -r` over the installed version: the SQLite data is kept (same signature)

## Known issues and fixes

| Symptom | Cause | Fix |
|---|---|---|
| `ninja: error: ... Filename longer than 260 characters` | Windows MAX_PATH, or the wrong version of a native module | `arm64-v8a` only; gesture-handler / reanimated / worklets versions **must** match the SDK (`npx expo install react-native-gesture-handler react-native-reanimated react-native-worklets`), npm tends to auto-install the latest ones as peers of `expo-router` |
| `libworklets.so ... missing and no known rule to make it` (in `expo-modules-core:buildCMake`) | Stale CMake cache in `node_modules/expo-modules-core/android/.cxx` after a worklets version change | delete `node_modules/expo-modules-core/android/{.cxx,build}` and `node_modules/react-native-worklets/android/{.cxx,build}`, then rebuild (`gradlew clean` alone is NOT enough and may fail) |
| `ninja: error: manifest 'build.ninja' still dirty after 100 tries` in `:react-native-reanimated:buildCMakeRelWithDebInfo` (release only, debug passes) | `build.ninja` depends on `../prefab/.../react-native-workletsConfigVersion.cmake`; the **raw** path (with `..`) is exactly 260 characters long in `RelWithDebInfo` (251 in `Debug`), so ninja's stat fails → endless reconfiguration. Diagnose with `ninja -C <.cxx dir> -d explain -n reanimated` | this app does not use reanimated/gesture-handler/worklets (peers of expo-router for the Drawer): they are excluded from autolinking in `package.json` → `expo.autolinking.exclude`. Alternative if they are ever needed: move the project to a shorter path (but a directory junction breaks Metro) |
| `gradlew.bat is not recognized` from `cmd //c` in bash | cmd's working directory | run `./gradlew.bat` from Git Bash or PowerShell inside the `android` folder |
| `expo install --check` complains about `jest@30` | jest-expo 57 declares jest 29 but works with 30 | ignore |

## Built APKs
- `dist/monthly-ledger-<version>-arm64.apk` (gitignored): copy of the latest signed release. First build: 2026-10-23, 43.6 MB, certificate `CN=Monthly Ledger` SHA-256 `d08a5892…1508f5`.
- `dist/monthly-ledger-portfolio-arm64.apk`: 1.1.0 / versionCode 2, branch `portfolio-ui` (UI review + sample data + visual-kit icon/splash), 2026-10-28, 43.9 MB, same certificate. The build succeeded on the first attempt after `expo prebuild --clean`.

## Tests and typecheck
```powershell
npm test          # jest, lib/domain only (33 tests)
npm run typecheck # tsc --noEmit
```
