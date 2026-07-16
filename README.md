# Vocali

Vocali is a mobile-first speaking practice MVP built with Next.js, TypeScript, and Tailwind CSS.

The iOS wrapper uses Capacitor as a fast App Store path. It loads the hosted Vercel production app inside a native iOS shell, so recording and transcription continue to use the existing HTTPS deployment.

## Web Development

Install dependencies:

```bash
npm install
```

Run the web app locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Build the web app:

```bash
npm run build
```

Run lint:

```bash
npm run lint
```

## Capacitor iOS Setup

Capacitor is configured in:

```text
capacitor.config.ts
```

The app loads the hosted Vercel production URL from `CAPACITOR_SERVER_URL` when it is set, otherwise it uses:

```text
https://vocali-zeta.vercel.app/
```

If the Vercel URL changes, update `CAPACITOR_SERVER_URL` in your local shell, Codemagic variables, or `capacitor.config.ts`.

The bundle ID is currently:

```text
com.vocali.app
```

The iOS project lives in:

```text
ios/App
```

## Sync Capacitor

After editing `capacitor.config.ts`, run:

```bash
npm run cap:sync:ios
```

This copies the Capacitor config into the iOS project and updates native dependencies.

## Open in Xcode

On your Mac, open the iOS project with:

```bash
npm run cap:open:ios
```

Or open this file directly in Xcode:

```text
ios/App/App.xcodeproj
```

In Xcode:

1. Select the `App` project.
2. Select the `App` target.
3. Check `Signing & Capabilities`.
4. Choose your Apple Developer Team.
5. Confirm the bundle identifier is `com.vocali.app` or change it to your final App Store bundle ID.
6. Select a connected iPhone as the run target.
7. Press Run.

## iOS Microphone Permission

The required iOS microphone purpose string is in:

```text
ios/App/App/Info.plist
```

Current value:

```text
Vocali uses your microphone so you can record speaking practice attempts.
```

Keep this clear and user-facing for App Store review.

## What to Test First on iPhone

Use a real iPhone when testing recording. The Simulator may not behave the same as a physical device.

1. Launch the Capacitor app from Xcode.
2. Confirm the app loads the Vercel production URL.
3. Go to Practice.
4. Start a short practice session.
5. Allow microphone access when iOS prompts.
6. Confirm the sound meter moves while speaking.
7. Stop the recording.
8. Confirm replay appears.
9. Tap Submit.
10. Confirm transcription either succeeds or fails gracefully into basic feedback.
11. Finish the attempt.
12. Confirm Home and Progress update from local browser storage.

## Notes

- Supabase provides account authentication and cross-device profile/attempt sync when the public Supabase environment variables are configured.
- Recordings remain in the device browser database; practice attempts are cached locally and synced to Supabase for signed-in users.
- The app does not currently include payments, RevenueCat, service workers, or offline caching.
- The wrapper currently depends on the hosted Vercel app being available.
- If the Vercel URL changes, update `capacitor.config.ts` and run `npm run cap:sync:ios` again.

## Development Workflow

Run the complete local quality gate before considering a change ready:

```bash
npm run check
```

This runs ESLint, TypeScript checking, unit tests, and a production Next.js build. GitHub runs the same command for pull requests and pushes to `main`.

Most changes under `src/` are web-only. Use a branch and pull request, test the Vercel preview on a mobile viewport, and merge after the `Quality` workflow passes. Because the installed Capacitor wrapper loads the production Vercel URL, web-only changes do not require a new TestFlight build.

Changes to `ios/`, `capacitor.config.ts`, native plugins, permissions, entitlements, signing, icons, splash assets, or native server configuration require native verification and may require a new TestFlight build.

## Codemagic TestFlight Release

The Codemagic workflow lives at:

```text
codemagic.yaml
```

The workflow builds a signed App Store IPA, uploads it to App Store Connect, and submits it to TestFlight. It retains the Next.js-on-Vercel architecture and packages the hosted application in the Capacitor iOS wrapper.

### Codemagic Workflow Details

The workflow currently uses:

```text
Workflow: ios-capacitor-cloud-build
Machine: mac_mini_m2
Xcode project: ios/App/App.xcodeproj
Scheme: App
Bundle ID: com.vocali.app
Server URL: CAPACITOR_SERVER_URL
Trigger: a pushed tag matching ios-v*
```

The build steps are:

1. Install npm dependencies with `npm ci`.
2. Run the full `npm run check` quality gate.
3. Sync the Capacitor iOS project.
4. Apply App Store signing profiles.
5. Read the latest uploaded Apple build number and increment it automatically.
6. Build the signed IPA and upload it to TestFlight.

### Release Trigger

TestFlight releases are deliberately separate from ordinary pushes. After a native change has been reviewed and merged, create and push a unique tag beginning with `ios-v`, for example `ios-v1.0.0`. Codemagic must have a repository webhook configured for tag events.

Creating or pushing a release tag uploads an external build, so it should only be done after explicit release approval.

### Codemagic Configuration

The workflow expects the Codemagic App Store Connect integration named `vocali-upload`, an Apple Distribution certificate, and an App Store provisioning profile for `com.vocali.app`. Confirm these non-secret values in `codemagic.yaml`:

```text
CAPACITOR_SERVER_URL=https://vocali-zeta.vercel.app/
BUNDLE_ID=com.vocali.app
APP_APPLE_ID=6780807774
IOS_MARKETING_VERSION=1.0
```

Do not commit any Apple private keys, certificates, provisioning profiles, or API secrets into this repository.
