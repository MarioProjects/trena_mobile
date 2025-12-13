# Trena

Trena is a gym/sport training app for logging workouts and tracking progress over time.

## Get started

1. Install dependencies

   ```bash
   npm install
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

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
