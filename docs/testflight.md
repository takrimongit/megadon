# TestFlight deploy

Ship the mobile app to internal TestFlight.

## Prerequisites

- `eas-cli` installed globally (already done on dev machines).
- An Expo account with access to the `megadon` project.
- Apple Developer Program membership on team **`Z3JJLJD2UT`**.
- App Store Connect app **`6777372110`** (bundle id `com.megadon.app`) provisioned.

Submit credentials (Apple ID, ASC app id, team id) are already encoded in `apps/mobile/eas.json` under `submit.production.ios`.

## 1. Authenticate Expo

```bash
eas login
```

One-time per machine. Uses your Expo account.

## 2. Build on EAS Build (cloud)

```bash
cd apps/mobile
eas build --platform ios --profile testflight
```

This runs on EAS Build infrastructure (Apple Silicon, `m-medium` class) and takes ~20 min. It uses the `testflight` profile in `eas.json`:

- `distribution: store` — produces an App Store-signed `.ipa`.
- `autoIncrement: true` — bumps the iOS build number automatically.
- Points at the prod API (`api-prod-66h55rjbsq-uc.a.run.app`).

The first run will prompt for iOS distribution certs / provisioning profiles; let EAS manage them (recommended).

## 3. Submit to App Store Connect

After the build finishes:

```bash
eas submit --platform ios
```

This picks the most recent `testflight` build and uploads it via the `production` submit profile (Apple ID `cliqueadmin@helpables.org`, team `Z3JJLJD2UT`, ASC app `6777372110`).

You will be prompted for an app-specific password the first time — generate one at https://appleid.apple.com/account/manage and let EAS store it.

## 4. TestFlight ingestion

Apple processes the build in ~10 min. Watch progress at:

https://appstoreconnect.apple.com/apps/6777372110/testflight/ios

Once it moves from "Processing" to "Ready to Submit", you can distribute it.

## 5. Add testers

In App Store Connect → TestFlight → **Internal Testing** (no review required, ~25 user limit; same Apple Developer team only):

1. Create / pick a group.
2. Add testers by Apple ID email.
3. Toggle the new build into the group.

For external testers, use **External Testing** — first build to a group requires a short Apple review (~24h).
