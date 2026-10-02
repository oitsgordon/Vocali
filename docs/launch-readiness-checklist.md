# Vocali launch-readiness checklist

Complete this checklist against the production project before enabling subscription enforcement or creating an `ios-v*` tag.

## Supabase

1. Apply every committed migration, including `20261002084457_guest_trial_subscription_access.sql`.
2. Run the database tests in `supabase/tests/` and confirm the RLS, quota, concurrency, and guest-cleanup tests pass.
3. In Authentication → Providers, enable Anonymous Sign-Ins.
4. In Authentication → Bot and Abuse Protection, enable Cloudflare Turnstile and enter its secret key.
5. In Authentication → Rate Limits, set anonymous sign-ins to five per IP per hour.
6. Confirm the `vocali-cleanup-anonymous-users` Cron job is enabled and review its run history after launch.
7. Review Supabase Security and Performance Advisors with no unresolved launch-critical finding.

## Vercel

1. Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` for Production.
2. Keep `NEXT_PUBLIC_ACCESS_GATE_ENABLED=false` until Supabase and RevenueCat are verified.
3. Confirm the production support email and RevenueCat iOS public SDK key are present.
4. Deploy, verify the guest flow and subscriptions, then set `NEXT_PUBLIC_ACCESS_GATE_ENABLED=true` and redeploy.
5. Confirm `/api/release-readiness` returns `"ready": true` without exposing configuration values.
6. Confirm `/`, `/privacy`, and `/support` are reachable and review Vercel function logs for transcription or entitlement failures.

## RevenueCat

1. Confirm the current production offering contains `monthly` and `yearly`.
2. Confirm both products grant `vocali_pro`.
3. Configure restore behavior to transfer purchases to the newly signed-in App User ID, including sandbox testing.
4. Leave RevenueCat-hosted paywall drafts unpublished; Vocali uses its custom screens.
5. Review integration errors before and after the TestFlight test pass.

## App Store Connect

1. Put Monthly and Annual in one subscription group at the same service level.
2. Confirm Monthly is A$9.99/month with a three-day introductory trial.
3. Confirm Annual is A$69.99/year with a seven-day introductory trial.
4. Complete availability, English (Australia) localization, descriptions, review screenshots, and review notes for both products.
5. Confirm Paid Apps agreement, banking, and tax details are active.
6. Complete privacy labels, age rating, export compliance, support/privacy URLs, reviewer contact details, screenshots, and reviewer access.
7. Add both first auto-renewable subscriptions and their group to the same version 1.0 submission.

## Exact TestFlight candidate

1. Verify fresh-install guest practice, account creation, email confirmation, Apple sign-in, and the account-to-paywall handoff.
2. Test monthly and annual purchase, trial eligibility wording, restore after reinstall, plan switching in both directions, cancellation, expiry, billing issues, and relaunch.
3. Test microphone allowed/denied, offline behavior, transcription quota/provider failures, and account deletion with the Apple-billing warning.
4. Test iPhone SE sizing, a Dynamic Island iPhone, iOS 15, and the current iOS release.
5. Compare the final archive privacy report with `PrivacyInfo.xcprivacy`; change the manifest only if the archive reports a missing declaration.
6. Only after these checks pass, explicitly approve creation of a unique `ios-v*` tag. App Store submission remains manual.
