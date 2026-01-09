# Trena

Trena is a gym/sport training app for logging workouts and tracking progress over time.

## Get started

1. Install dependencies

```bash
pnpm install
```

Optional: verify your Expo-managed dependency versions match the current SDK:

```bash
npx expo install --check
```

2. Start the app

```bash
npx expo start
```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Current screens

- `app/index.tsx`: Hero screen
- `app/get-started.tsx`: Login (Supabase magic link + Google + Facebook)
- `app/home.tsx`: Home stub
- `app/auth/callback.tsx`: Auth callback (handles magic link + OAuth redirects)

## Supabase Auth (magic link + Google + Facebook)

### Environment variables

Create a local `.env` (gitignored) with:

- `EXPO_PUBLIC_SUPABASE_URL` (example: `https://YOUR_PROJECT_REF.supabase.co`)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Supabase **anon public key**)

Optional (recommended for stable redirects in dev builds / production):

- `EXPO_PUBLIC_SUPABASE_REDIRECT_URL` (example: `trena://auth/callback`)
- `EXPO_PUBLIC_APP_SCHEME` (defaults to `trena` from `app.json`)

#### Local dev vs EAS builds (important)

- **Local dev** (`npx expo start`): values come from your local `.env`.
- **EAS Build (cloud)**: your local `.env` is **not** automatically uploaded. You must set these as **EAS Secrets** (recommended) or otherwise configure build-time env vars.

If you build a release without `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, the app will fail at startup (Supabase client can’t initialize).

### Configure Supabase env vars for EAS Build (recommended)

Set build-time env vars once (replace values with yours).

When `eas` prompts you:

- **Select environment**:
  - Choose **`production`** for Play Store builds (`--profile production`).
  - (Optional) Also create them for **`preview`** if you build APKs for manual testing (`--profile preview`).
  - (Optional) Also create them for **`development`** if you use EAS development builds.
  - Important: your `eas.json` build profiles should set `"environment": "production" | "preview" | "development"` so the right vars are injected.
- **Select visibility**:
  - For `EXPO_PUBLIC_*` vars, choose **Plain text**.
    These values are bundled into the app at build time and are not truly secret inside a shipped app.
    (Supabase **anon** key is designed to be public; protect your data with Supabase RLS policies.)

```bash
npx eas-cli@latest login

npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT_REF.supabase.co"
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_SUPABASE_ANON_KEY"
```

You can verify what’s set with:

```bash
npx eas-cli@latest env:list
```

### Supabase provider setup (fixes “missing oauth secret”)

If you see a Supabase error like **“missing oauth secret”**, it means the provider is enabled but its **secret** is not configured in Supabase.

In Supabase Dashboard → **Authentication → Providers**:

- **Google**: set **Client ID** + **Client Secret**
- **Facebook**: set **App ID** + **App Secret**

### Required OAuth callback URL (Google/Facebook)

In your provider console (Google/Facebook), you must whitelist Supabase’s callback URL:

- `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### Required redirect URL whitelist (deep link back into the app)

In Supabase Dashboard → **Authentication → URL Configuration → Redirect URLs**, add:

- `trena://auth/callback`

This is where Supabase will redirect after the hosted callback, so the app can finish sign-in.

## Android (debug keystore + SHA fingerprints)

Some Android integrations (Google Sign-In, Firebase, deep links, etc.) require **SHA-1/SHA-256** fingerprints.

### If `~/.android/debug.keystore` does not exist

It’s usually auto-created the first time you build/run Android locally. If you don’t have it yet, you can create it:

```bash
mkdir -p ~/.android

keytool -genkeypair -v \
  -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Android Debug,O=Android,C=US"
```

### Print SHA-1 / SHA-256 from the debug keystore

```bash
keytool -list -v \
  -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android
```

### If you use EAS Build (recommended for release)

EAS can manage the Android keystore for you. To view/download credentials and fingerprints:

```bash
eas credentials -p android
```

## Production TODOs (before publishing)

- **Set an Android package name**: add `expo.android.package` in `app.json` (example: `com.yourcompany.trena`).  
  This becomes the permanent Android application id once you publish.
- **Use a release keystore** (not the debug keystore): use EAS-managed credentials or your own `.jks` file.
- **Register the correct SHA-1/SHA-256** for production services (Google/Firebase/etc.): use the **release** keystore fingerprints, not debug.
- **Verify deep link scheme/domains**: confirm `expo.scheme` and any intent filters you rely on.
- **Build and install a release build** on a device before launch (sanity check auth, redirects, notifications, etc.).

## Build for Google Play (release)

### TL;DR

- Google Play requires **AAB** (Android App Bundle) for new apps (not APK).
- Use **EAS Build** to produce the `.aab`, then upload it in Play Console → **Internal testing** to start testing.

### 1) Make sure you have the required env vars in EAS

See **“Configure Supabase env vars for EAS Build”** above.

### 2) Build the AAB with EAS

From the project root:

```bash
npx eas-cli@latest build -p android --profile production
```

Notes:
- If EAS asks about Android credentials/keystore, choose **EAS-managed credentials** unless you already have your own.
- If EAS CLI prompts for **app version source**, choose **remote (recommended)** so EAS auto-increments Android `versionCode` for each build without editing local files.

When the build finishes, download the artifact: **`*.aab`**.

### 3) Upload to Google Play Console (Internal testing)

In **Google Play Console**:

- Create your app (if you haven’t).
- Go to **Testing → Internal testing**.
- Create a new release.
- Upload the `.aab`.
- Save → Review → Roll out.
- Add testers (emails / Google Group) and share the opt-in link.

Testers install from the Play Store using that opt-in link.

### Rebuild after changing EAS env vars

EAS env vars are injected **at build time**. If you add/change them with `eas env:create` (or update them), you must **create a new build**.

- Your existing `.aab` / `.apk` will **not** be updated automatically.
- For Play testing, upload the **new `.aab`** as a new release.

If you change Supabase keys/URL (or add them for the first time), just run the build command again:

```bash
npx eas-cli@latest build -p android --profile production
```

## Build an APK (optional, for direct install)

APK is useful for quick manual installs (outside Play Console), but it’s not the format you upload to Google Play.

```bash
npx eas-cli@latest build -p android --profile preview
```

Download the resulting `*.apk` and install it on a device.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.


## Resources

- Icons: [Hugeicons](https://hugeicons.com/)

## Setup

```bash
npx eas-cli@latest env:create \
  --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://ptbtsljumkvlatebdgjp.supabase.co" \
  --environment preview \
  --visibility sensitive
  
npx eas-cli@latest env:create \
  --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://ptbtsljumkvlatebdgjp.supabase.co" \
  --environment development \
  --visibility sensitive

npx eas-cli@latest env:create \
  --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://ptbtsljumkvlatebdgjp.supabase.co" \
  --environment production \
  --visibility sensitive
```

```bash
npx eas-cli@latest env:create \
  --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YnRzbGp1bWt2bGF0ZWJkZ2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Mjc2MzgsImV4cCI6MjA4MTIwMzYzOH0.ob3WRH79wG2_uMar39GUZ1ClVuHpPgXvYOsM3qoxs28" \
  --environment preview \
  --visibility sensitive
  
npx eas-cli@latest env:create \
  --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YnRzbGp1bWt2bGF0ZWJkZ2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Mjc2MzgsImV4cCI6MjA4MTIwMzYzOH0.ob3WRH79wG2_uMar39GUZ1ClVuHpPgXvYOsM3qoxs28" \
  --environment development \
  --visibility sensitive

npx eas-cli@latest env:create \
  --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YnRzbGp1bWt2bGF0ZWJkZ2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Mjc2MzgsImV4cCI6MjA4MTIwMzYzOH0.ob3WRH79wG2_uMar39GUZ1ClVuHpPgXvYOsM3qoxs28" \
  --environment production \
  --visibility sensitive
```