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

- This setup does not add Supabase, payments, RevenueCat, service workers, or offline caching.
- Recordings and practice history remain local to the app WebView unless submitted for transcription.
- The wrapper currently depends on the hosted Vercel app being available.
- If the Vercel URL changes, update `capacitor.config.ts` and run `npm run cap:sync:ios` again.

## Codemagic Cloud iOS Build

The Codemagic workflow lives at:

```text
codemagic.yaml
```

This first workflow builds Vocali as a Capacitor iOS app for the iOS Simulator without Apple code signing. It is meant to confirm that Codemagic can read the repository, install dependencies, sync Capacitor, and build the native iOS wrapper.

It does not rewrite Vocali in React Native. It keeps the current Next.js app hosted on Vercel and wraps that production URL with Capacitor.

### Codemagic Workflow Details

The workflow currently uses:

```text
Workflow: ios-capacitor-cloud-build
Machine: mac_mini_m2
Xcode project: ios/App/App.xcodeproj
Scheme: App
Bundle ID: com.vocali.app
Server URL: CAPACITOR_SERVER_URL
```

The build steps are:

1. Install npm dependencies with `npm ci`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Run `npx cap sync ios`.
5. Build the iOS project with `xcodebuild`.

### Codemagic Environment Variables

Add or confirm these in Codemagic when you connect the repository:

```text
CAPACITOR_SERVER_URL=https://vocali-zeta.vercel.app/
```

For the first unsigned simulator build, this is the only app-specific variable you need.

For a later signed iPhone/TestFlight build, you will also need Apple signing values in Codemagic:

```text
APPLE_TEAM_ID=your Apple Developer Team ID
BUNDLE_ID=com.vocali.app
APP_STORE_CONNECT_ISSUER_ID=from App Store Connect API
APP_STORE_CONNECT_KEY_IDENTIFIER=from App Store Connect API
APP_STORE_CONNECT_PRIVATE_KEY=private API key stored securely in Codemagic
```

You may also need signing certificate and provisioning profile references, depending on whether you use Codemagic automatic signing or manual signing.

Do not commit any Apple private keys, certificates, provisioning profiles, or API secrets into this repository.

Before running it in Codemagic:

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Connect the repository in Codemagic.
3. Click `Check for configuration file`.
4. Select the `iOS Capacitor cloud build` workflow.
5. Confirm the `CAPACITOR_SERVER_URL` value points to the current production Vercel URL.
6. Start a manual build from Codemagic.

From Windows PowerShell, commit and push the workflow file with:

```powershell
git add codemagic.yaml capacitor.config.ts README.md package.json package-lock.json ios
git commit -m "Add Codemagic iOS workflow"
git push
```

### What Still Needs Apple Setup

To install the app on a real iPhone or submit to TestFlight, you will still need Apple Developer code signing configured in Codemagic.

Manual Apple/Codemagic steps still required:

1. Enroll in the Apple Developer Program if you have not already.
2. Create or confirm the bundle identifier `com.vocali.app` in Apple Developer.
3. Create the app record in App Store Connect.
4. Create an App Store Connect API key for Codemagic.
5. Configure Codemagic iOS code signing.
6. Switch from the unsigned simulator build to a signed archive/export workflow.

This first workflow deliberately avoids signing so you can verify the cloud build quickly before setting up App Store credentials.
