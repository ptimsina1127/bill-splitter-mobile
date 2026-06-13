# Bill Splitter — Full Documentation

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [App Screens](#3-app-screens)
4. [Project File Reference](#4-project-file-reference)
5. [Build System](#5-build-system)
6. [Signing & Keystore](#6-signing--keystore)
7. [Deployment History](#7-deployment-history)
8. [Troubleshooting](#8-troubleshooting)
9. [Future Cleanup Plan](#9-future-cleanup-plan)

---

## 1. Overview

Bill Splitter is a mobile application for group expense tracking. Users create a session, add participants and expenses, then calculate who owes whom.

The app is built with **React Native 0.81.5** using the **Expo SDK 54** managed workflow but builds natively via Gradle (not EAS cloud). It connects to a Spring Boot REST API hosted at `https://www.groupbillsplit.me/spring-api`.

### Key Facts

| Property | Value |
|---|---|
| Package name | `com.ptimsina.billsplitter` |
| Version | 1.0.0 |
| Version code | 28 |
| Min SDK | 24 |
| Target / Compile SDK | 36 |
| JS Engine | Hermes |
| Architecture | Legacy (not new arch) |

---

## 2. Architecture

### Frontend (this repo)

```
                   ┌─────────────────┐
                   │    App.jsx       │
                   │ (Navigation)     │
                   └────────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        HomeScreen    SetupScreen   SessionScreen
              │             │             │
              │             │             ├── ParticipantCard (× N)
              │             │             ├── Settlement section
              │             │             └── Share / QR modal
              │             │
              └─────────────┘
                     │
                api/client.js (Axios)
                     │
                     ▼
          Spring Boot Backend API
```

### Navigation

The app uses `@react-navigation/native-stack` with three screens:

- **HomeScreen** (no header) — entry point: create or join a session
- **SetupScreen** — enter session name + number of participants
- **SessionScreen** — main expense management screen

Navigation flow:
```
Home ──→ Setup ──→ Session (replace, no back)
Home ──→ Session (direct join via ID)
Session ──→ Home (popToTop)
```

### API Communication

All API calls go through `src/api/client.js`, an Axios instance pre-configured with `baseURL` and `Content-Type: application/json`. The base URL is defined in `src/config.js` alongside `APP_BASE_URL` (used for share links).

---

## 3. App Screens

### HomeScreen (`src/screens/HomeScreen.jsx`)

- Minimal landing with logo, "Start New Session" button, and "Join Session" input
- Join accepts either a **UUID** or a **short code** (≤10 chars)
- Attempts smart lookup: short code first → session ID fallback

### SetupScreen (`src/screens/SetupScreen.jsx`)

- Input for session name and participant count (2–50)
- Creates session via `POST /sessions` with auto-generated names ("Person 1", "Person 2", …)
- Navigates to SessionScreen on success

### SessionScreen (`src/screens/SessionScreen.jsx`)

- Loads session data via `GET /sessions/{id}`
- Displays participants in a FlatList with pull-to-refresh
- Settlement section with three states:
  1. **Initial** — shows "Calculate Debts" + "Share" buttons
  2. **Calculated** — shows total expenses, debt arrows, "Recalculate"
  3. **Dismissed** (edits detected) — shows "Recalculate" prompt
- Share card with short URL (copy + OS share sheet)
- QR code modal via api.qrserver.com
- "Leave" button pops back to Home

### ParticipantCard (`src/components/ParticipantCard.jsx`)

- Avatar with deterministic color from name
- **Inline editing**: tap name or expense text/amount to edit (TextInput replaces Text on tap)
- **Swipe-to-delete** on expense rows (via react-native-gesture-handler)
- **Share modal**: grid of checkboxes for each participant; tap outside to save
- **Add expense**: inline form with description, amount, and "Split with" picker
- **ALL badge** when an expense is shared with everyone (or no share list = all)
- **Total spent badge** per participant
- **Unsaved/Saved indicator** on session header when editing

---

## 4. Project File Reference

### Configuration Files

| File | Purpose |
|---|---|
| `app.json` | Expo config: name, version, icons, splash, plugins, iOS/Android settings |
| `eas.json` | EAS Build config: profiles for development and production |
| `metro.config.js` | Metro bundler config — custom minifier drops `console.*` calls |
| `babel.config.js` | Babel preset: `module:@react-native/babel-preset` |
| `package.json` | Dependencies, scripts (start, android, ios, web, postinstall) |
| `android/gradle.properties` | Gradle settings: Hermes enabled, new arch disabled, architectures |

### Build Files (Android)

| File | Purpose |
|---|---|
| `android/app/build.gradle` | App-level build config: versionCode 28, signing configs, dependencies |
| `android/build.gradle` | Project-level Gradle config |
| `android/gradle/wrapper/gradle-wrapper.properties` | Gradle version |
| `android/app/src/main/AndroidManifest.xml` | Android manifest |

### Custom Plugins & Patches

| File | Purpose |
|---|---|
| `plugins/fix-bundle-path.js` | Expo config plugin that replaces `.expo/.virtual-metro-entry` with `index.android` in the generated MainApplication.kt — ensures the correct bundle path |
| `patches/expo+node_modules+@expo+cli.patch` | patch-package patch for `@expo/cli` — changes the web streams polyfill to only apply on `web` platform (not Android). Applied automatically via `postinstall` script |
| `polyfill-global-require.js` | Fallback polyfill that defines `globalThis.require = globalThis.__r` — kept as safety net but not actively used |

### Source Files

| File | Purpose |
|---|---|
| `App.jsx` | Root component: NavigationContainer + Stack.Navigator with 3 screens |
| `index.js` | Registers `App` component with `AppRegistry.registerComponent('main', …)` |
| `src/config.js` | Exports `API_BASE_URL` and `APP_BASE_URL` |
| `src/api/client.js` | Axios instance configured with base URL |
| `src/screens/HomeScreen.jsx` | Landing screen |
| `src/screens/SetupScreen.jsx` | Session creation screen |
| `src/screens/SessionScreen.jsx` | Session detail / expense management |
| `src/components/ParticipantCard.jsx` | Per-participant card with expenses |
| `src/utils/avatarColor.js` | Deterministic color generation from name string |

---

## 5. Build System

### Local Gradle Build (recommended)

**Prerequisites:**
- Java JDK 17+ (`JAVA_HOME` set)
- Android SDK (at `C:\Users\Pravat\AppData\Local\Android\Sdk`)
- Android project already generated (from `npx expo prebuild`)

**Commands:**

```bash
# AAB for Google Play
cd android
.\gradlew bundleRelease

# APK for sideloading
cd android
.\gradlew assembleRelease
```

**Output locations:**
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

### EAS Build (alternative)

```bash
# Using Expo's cloud servers
npx eas build -p android --profile production

# Local EAS build (uses your machine)
npx eas build -p android --local --profile production
```

### Build Process (what happens)

1. **Metro bundler** creates the JS bundle (`index.android.bundle`) with all source + dependencies
2. **Hermes** compiles the JS bundle to Hermes bytecode (binary `.hbc` format inside the bundle)
3. **Gradle** compiles Java/Kotlin source code
4. **AAPT2** packages resources
5. **D8** dexes the bytecode
6. **ApkBuilder / BundleTool** packages everything into an APK or AAB
7. **Signing** (release config signs with `release-keystore.jks`)

### NODE_ENV Warning

You may see this during build:
```
The NODE_ENV environment variable is required but was not specified.
```
It is **non-fatal** — the build succeeds regardless. It only affects which `.env` files are loaded.

---

## 6. Signing & Keystore

### Keystore File

- **Location**: `release-keystore.jks` (project root, gitignored)
- **Alias**: `upload_key`
- **Password**: `android`
- **SHA1 fingerprint**: `A0:27:D7:29:6D:98:1F:76:BD:B5:F8:36:46:D1:53:04:FC:5C:BD:03`
- **Created**: June 7, 2026
- **Expires**: October 23, 2053

This keystore is registered with Google Play Console as the upload key for package `com.ptimsina.billsplitter`.

### Signing Config

Located in `android/app/build.gradle` (lines 130-135):

```groovy
signingConfigs {
    release {
        storeFile file('../../release-keystore.jks')
        storePassword 'android'
        keyAlias 'upload_key'
        keyPassword 'android'
    }
}
```

And applied on line 142:
```groovy
release {
    signingConfig signingConfigs.release
```

### 🔴 Critical Warning

`release-keystore.jks` and `credentials.json` are **gitignored** and **not on GitHub**. If you lose this file, you cannot upload any future updates to the Play Store.

**Backup locations:**
- Local machine: `C:\Users\Pravat\Desktop\workspace\bill-splitter-mobile\release-keystore.jks`
- Recommended: Google Drive, password manager, or other secure storage

**Consider enabling Play App Signing** in Google Play Console — this allows resetting the upload key if the keystore is ever lost.

---

## 7. Deployment History

### Version 1.0.0 (28)

- **Release date**: June 13, 2026
- **Status**: Published to Google Play (closed testing)
- **Key changes**:
  - Fixed crash on launch (Hermes enabled, JSC no longer available in RN 0.81.5)
  - Fixed `require is not defined` crash (excluded web streams polyfill on Android)
  - Fixed signing key mismatch (added release signing config)
  - Configured Metro bundler to drop console calls

### Build method

The AAB was built locally via:
```bash
cd android
.\gradlew bundleRelease
```
(release-keystore.jks must be present in project root)

### Previous releases

Earlier builds were made via EAS Build on `expo.dev`. All previous EAS builds have been deleted from Expo's servers.

---

## 8. Troubleshooting

### App crashes on launch

**Symptom**: App opens to white screen and closes immediately

**Check adb logs:**
```bash
adb -s 127.0.0.1:7555 logcat -d | Select-String -Pattern "AndroidRuntime|SoLoader|ReactNative"
```

| Log message | Cause | Fix |
|---|---|---|
| `SoLoader couldn't find DSO to load: libhermes.so` | `hermesEnabled=false` | Set `hermesEnabled=true` in `android/gradle.properties` |
| `AssertionError: JavaScriptExecutorFactory is null` | Same as above | Same as above |
| `require is not defined` | Web streams polyfill injected into Android bundle | Check `@expo/cli` patch is applied (run `npx patch-package` or reinstall with `npm install`) |

### Play Console rejects upload

| Error | Cause | Fix |
|---|---|---|
| "signed with the wrong key" | AAB signed with debug.keystore instead of release keystore | Ensure `android/app/build.gradle` has `release` signing config pointing to `release-keystore.jks` |

### Build fails

| Error | Likely cause |
|---|---|
| `Could not find method ksp()` | Run `npx expo prebuild --clean` to regenerate android/ |
| Dependency version conflicts | Check versions in `package.json` match Expo SDK 54 compatibility |
| `The NODE_ENV environment variable is required` | Non-fatal warning; build proceeds anyway |

### 🧪 Testing on MUMU Emulator

```bash
# Install APK
adb -s 127.0.0.1:7555 install -r app-release.apk

# Launch app
adb -s 127.0.0.1:7555 shell am start -n com.ptimsina.billsplitter/.MainActivity

# Read logs
adb -s 127.0.0.1:7555 logcat -d | Select-String billsplitter
```

---

## 9. Future Cleanup Plan

The following changes are deferred to the next major version update:

### Dependencies to remove

| Package | Reason |
|---|---|
| `@expo/ngrok` | Only used for `expo start --tunnel` during dev |
| `react-dom` | Only needed for web; app is Android-only |
| `expo-updates` | OTA updates already disabled; package is dead weight |

### App config to fix

- **`app.json` line 35**: `"hermesEnabled": false` in `expo-build-properties` plugin contradicts the actual `gradle.properties` setting. Should be removed or set to `true`
- **`expo-build-properties` plugin**: Could be removed entirely if Hermes/arch settings are managed directly via `gradle.properties`
- **`./plugins/fix-bundle-path.js`**: Test if still needed after next prebuild
- **`polyfill-global-require.js`**: Safe to delete if no longer referenced

### Build process

After cleanup, regenerate `android/` with:
```bash
npx expo prebuild --clean
```

Then re-add the release signing config in `android/app/build.gradle` (it gets wiped by prebuild).

### Git

- `*.jks` and `credentials.json` are in `.gitignore` — ensure backups exist elsewhere
- Consider adding `polyfill-global-require.js` to `.gitignore` if deemed unused
