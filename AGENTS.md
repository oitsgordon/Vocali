<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Vocali project guidance

## Product and architecture

- Vocali is a mobile-first speaking practice app built with Next.js, TypeScript, Tailwind CSS, Supabase, and a Capacitor iOS wrapper.
- The iOS wrapper loads the hosted Vercel app from `CAPACITOR_SERVER_URL`. Most changes under `src/` are web releases and do not require a new App Store binary.
- Treat changes to `ios/`, `capacitor.config.ts`, native plugins, entitlements, permissions, signing, icons, splash assets, or the native server configuration as native iOS changes.
- Never commit API keys, Apple credentials, certificates, provisioning profiles, or populated environment files.

## Default agent workflow

For implementation tasks, own the complete local loop:

1. Inspect the relevant code and repository state.
2. Plan within the active task when the change is non-trivial.
3. Implement the change without asking the user to copy prompts or run routine shell commands.
4. Add or update tests for behavior that can be verified automatically.
5. Run the narrowest relevant checks during development, then run `npm run check` before declaring the task complete.
6. Review the final diff for correctness, regressions, secrets, and accidental unrelated edits.
7. Report the outcome, verification performed, and any remaining risk.

Do not commit, push, create a pull request, create a release tag, or deploy unless the user explicitly asks. When requested, run those Git and release operations directly instead of giving the user commands to copy.

## Verification commands

- Full local gate: `npm run check`
- Lint only: `npm run lint`
- Type checking only: `npm run typecheck`
- Unit tests once: `npm test`
- Unit tests in watch mode: `npm run test:watch`
- Production build: `npm run build`
- Native sync after native or Capacitor configuration changes: `npm run cap:sync:ios`

If a relevant automated test is not practical, document the exact manual verification still required. Recording, microphone permissions, native Apple sign-in, and final TestFlight behavior must be verified on a real iPhone when affected.

## Git and review

- Create feature branches with the `codex/` prefix unless the user requests another name.
- Keep commits focused and use messages that describe the user-visible or operational outcome.
- Before committing, inspect `git diff` and `git status`; preserve unrelated user changes.
- GitHub pull requests must pass the `Quality` workflow before merge.

## Delivery lanes

### Web-only changes

Use a feature branch and pull request. Verify the Vercel preview on a mobile viewport, merge after checks pass, and verify the production deployment through the installed wrapper when the changed flow is mobile-specific. Do not create a TestFlight build solely for a web-only change.

### Native iOS changes

Run `npm run cap:sync:ios` and relevant local checks. After the change is merged and the user explicitly requests a TestFlight release, create and push a unique tag matching `ios-v*`. Codemagic uses that tag to build, automatically increment the Apple build number, sign the IPA, and submit it to TestFlight.
