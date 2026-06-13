# Bill Splitter

Split expenses with friends — a React Native (Expo) mobile app.

**Package**: `com.ptimsina.billsplitter` | **Version**: 1.0.0 (28)

---

## Quick Start

```bash
npm install
npx expo start
```

Then open in Expo Go (scan QR code) or run on emulator.

---

## Project Structure

```
src/
  api/client.js          # Axios HTTP client (API_BASE_URL)
  config.js              # API_BASE_URL, APP_BASE_URL
  screens/
    HomeScreen.jsx       # Landing: new session or join via ID/code
    SetupScreen.jsx      # Create session (name + number of people)
    SessionScreen.jsx    # Expense management, settlement, share
  components/
    ParticipantCard.jsx  # Per-participant expense card with inline edit
  utils/
    avatarColor.js       # Deterministic color from participant name
App.jsx                  # Navigation: 3 screens (Home → Setup → Session)
index.js                 # AppRegistry entry point
app.json                 # Expo config (versionCode 28, splash, icons)
metro.config.js          # Metro bundler with drop_console
babel.config.js          # @react-native/babel-preset
eas.json                 # EAS Build config (local credentials)
plugins/
  fix-bundle-path.js     # Config plugin: bundles index.android not .virtual-metro-entry
patches/
  expo+node_modules+@expo+cli.patch  # Excludes web streams polyfill on Android
polyfill-global-require.js            # Fallback: globalThis.require = __r
```

---

## Backend API

The app talks to a Spring Boot backend:

| Endpoint | Method | Purpose |
|---|---|---|
| `/sessions` | POST | Create session (name + participantNames) |
| `/sessions/{id}` | GET | Load session with participants + items |
| `/sessions/{id}` | PUT | Update session name |
| `/sessions/by-short-code/{code}` | GET | Lookup session by short code |
| `/sessions/{id}/participants/{pid}` | PUT | Rename participant |
| `/sessions/{id}/items` | POST | Add expense |
| `/sessions/{id}/items/{itemId}` | PUT | Edit expense (desc, amount, sharedWith) |
| `/sessions/{id}/items/{itemId}` | DELETE | Delete expense |
| `/sessions/{id}/calculate` | POST | Run settlement calculation |

**`src/config.js`** sets `API_BASE_URL` and `APP_BASE_URL` (both point to `https://www.groupbillsplit.me`).

---

## Navigation Flow

```
HomeScreen ──"Start New Session"──→ SetupScreen ──"Create"──→ SessionScreen
HomeScreen ──"Join (ID/Short Code)"──→ SessionScreen
SessionScreen ──"Leave"──→ HomeScreen
```

---

## Building for Production

### AAB (Google Play)

```bash
cd android
.\gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

The AAB is signed with `release-keystore.jks` (alias: `upload_key`). That file is **gitignored** — keep it backed up separately.

### APK (sideload / testing)

```bash
cd android
.\gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

### Build via EAS (alternative)

```bash
npx eas build -p android --profile production
```

---

## Known Issues & Fixes

| Problem | Cause | Fix |
|---|---|---|
| Crash on launch: `JavaScriptExecutorFactory is null` | `hermesEnabled=false` — RN 0.81.5 removed JSC | Set `hermesEnabled=true` in `android/gradle.properties` |
| Crash: `require is not defined` | Expo CLI injects `expo/virtual/streams.js` which uses bare `require()` | Patch `@expo/cli` to exclude streams polyfill on Android (see `patches/`) |
| Play Console rejects: "wrong signing key" | AAB signed with debug keystore | Added `release` signing config in `android/app/build.gradle` pointing to `release-keystore.jks` |

---

## Key Dependencies

- React Native 0.81.5
- Expo SDK ~54.0.35
- React Navigation (native-stack)
- Axios (HTTP client)
- react-native-gesture-handler (swipe-to-delete)
- expo-clipboard (copy share link)
- Hermes JS engine
