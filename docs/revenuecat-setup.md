# RevenueCat setup for Vocali

Vocali's interface is a Next.js/React app inside a Capacitor iOS wrapper. The
RevenueCat Capacitor packages are therefore the correct integration point. They
install the native RevenueCat iOS SDK into the Xcode project through Swift
Package Manager when `npm run cap:sync:ios` runs. A separate SwiftUI app layer
would not be connected to Vocali's current screens.

## What is implemented in the repository

- RevenueCat configuration when the native iOS app starts.
- Supabase user IDs used as RevenueCat App User IDs after sign-in.
- Anonymous RevenueCat users supported before sign-in.
- Current offering and localized App Store prices loaded from RevenueCat.
- Monthly and annual purchases from Vocali's custom paywall.
- Restore Purchases from the paywall and Settings.
- `vocali_pro` entitlement checks using `CustomerInfo`.
- RevenueCat-hosted Paywall and Customer Center entry points in Settings.
- Customer info listener so renewals and purchase changes update the app.
- Safe, user-facing errors for cancellation, network, availability, purchase
  permission, and configuration failures.
- A Codemagic release check that rejects missing or Test Store configuration.

The implementation lives in:

- `src/lib/revenueCat.ts`
- `src/lib/revenueCatConfig.ts`
- `src/components/subscriptions/RevenueCatProvider.tsx`
- `src/components/paywall/PaywallScreen.tsx`
- `src/app/settings/page.tsx`

## 1. Finish App Store Connect products

1. Open App Store Connect and select **Vocali - Speaking Confidence**.
2. Open **Monetization > Subscriptions**.
3. Create one subscription group, such as **Vocali Pro**.
4. In that group, create these auto-renewable subscriptions exactly:

   | Reference name | Product ID | Duration | Australia price | Intro offer |
   | --- | --- | --- | --- | --- |
   | Vocali Pro Monthly | `monthly` | 1 month | A$9.99 | 3 days free |
   | Vocali Pro Yearly | `yearly` | 1 year | A$69.99 | 7 days free |

5. Add English (Australia) display names and concise descriptions.
6. Select the intended storefront availability.
7. Add the subscription review screenshot and review notes.
8. Confirm Agreements, Tax, and Banking are active.

Use the exact product IDs above. Price text in Vocali is replaced by the
localized App Store price once RevenueCat loads the current offering.

## 2. Connect the Apple app in RevenueCat

1. Open the RevenueCat dashboard and select the Vocali project.
2. Open **Project settings > Apps** and add an Apple App Store app.
3. Use bundle ID `com.vocali.app`.
4. Add the Apple shared secret and In-App Purchase key requested by RevenueCat.
5. Add an App Store Connect API key so RevenueCat can import products.
6. Configure App Store Server Notifications using RevenueCat's generated URL.
7. Import the `monthly` and `yearly` products from App Store Connect.

Follow RevenueCat's current Apple connection guide for the exact Apple portal
screens: <https://www.revenuecat.com/docs/projects/connect-a-store>

## 3. Configure the entitlement

1. In RevenueCat, open **Product catalog > Entitlements**.
2. Create an entitlement with the exact identifier `vocali_pro`.
3. Open the entitlement and attach both `monthly` and `yearly`.

Both products must be attached or a successful purchase will not unlock Vocali
Pro.

## 4. Configure the current offering

1. Open **Product catalog > Offerings**.
2. Create an offering such as `default` and mark it **Current**.
3. Add the **Monthly** package and attach product `monthly`.
4. Add the **Annual** package and attach product `yearly`.
5. Keep Annual as the highlighted/default selection in Vocali.

The app first matches exact product IDs and then falls back to RevenueCat's
standard Monthly and Annual package types.

## 5. Configure RevenueCat Paywalls and Customer Center

1. Open **Paywalls** in RevenueCat and create a paywall for the current
   offering.
2. Include both packages, Restore Purchases, legal links, and a close control.
3. Publish the paywall.
4. Open **Customer Center**, configure its support and management options, then
   publish it.

Vocali keeps its branded paywall as the main purchase screen. The hosted
RevenueCat Paywall is available from **Settings > Subscription > View
subscription options**. Customer Center appears as **Manage subscription** for
an active Vocali Pro customer.

## 6. Configure keys without committing them

The supplied Test Store key is already present only in the ignored local
`.env.local`. It is intentionally absent from Git.

For development or a RevenueCat Test Store preview, set:

```text
NEXT_PUBLIC_REVENUECAT_API_KEY=<RevenueCat Test Store public SDK key>
```

Before TestFlight or App Review:

1. In RevenueCat, open the Apple app's API keys.
2. Copy its **iOS public SDK key** (normally prefixed `appl_`).
3. In Vercel, open the Vocali project, then **Settings > Environment Variables**.
4. Add or replace `NEXT_PUBLIC_REVENUECAT_API_KEY` for **Production**.
5. Redeploy Production and open:
   `https://vocali-zeta.vercel.app/api/release-readiness`.
6. Confirm it reports `configured: true` and `productionKey: true`.

RevenueCat public SDK keys are designed to be embedded in clients. Secret
RevenueCat keys and Apple credentials must never use a `NEXT_PUBLIC_` variable.

## 7. Test before release

1. Run the web checks and Capacitor sync.
2. Open the iOS project on a Mac with Xcode.
3. Confirm **Signing & Capabilities > In-App Purchase** is enabled.
4. Test on a physical iPhone with an Apple sandbox tester:
   - anonymous user opens the paywall;
   - Monthly purchase and three-day trial;
   - Annual purchase and seven-day trial;
   - cancellation leaves access locked;
   - successful purchase activates `vocali_pro`;
   - restore works after reinstall;
   - sign-in keeps the correct customer identity;
   - Customer Center opens for an active subscriber;
   - offline and purchase-not-allowed errors are understandable.
5. Confirm the RevenueCat customer timeline and entitlement state after each
   purchase.
6. Only after the production iOS key is deployed should a new `ios-v*` tag be
   created for Codemagic.

Official references:

- <https://www.revenuecat.com/docs/getting-started/installation/capacitor>
- <https://www.revenuecat.com/docs/getting-started/entitlements>
- <https://www.revenuecat.com/docs/tools/paywalls/displaying-paywalls>
- <https://www.revenuecat.com/docs/tools/customer-center/customer-center-capacitor>
- <https://www.revenuecat.com/docs/test-and-launch/launch-checklist>
