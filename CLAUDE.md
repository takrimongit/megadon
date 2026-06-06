# CLAUDE.md

## Product

This project is a SaaS platform for a **self-improving batch AI ad generator**.

The app helps a client/team generate, revise, approve, and improve batches of marketing ads over time.

Core loop:

Brief → Batch Ads → AI Creative → Review → Revision → Approval → Performance → Learning → Better Next Batch

The system may internally use Higgsfield AI or other creative generation providers, but the product should not be tightly coupled to one provider.

---

## Applications

This repo contains:

1. Backend API
2. Mobile app

Recommended structure:

```txt
/apps
  /api
  /mobile

/packages
  /shared
  /types
  /ai
  /db```

---

## Mobile App (`apps/mobile`)

### Commands

```bash
cd apps/mobile
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npx tsc --noEmit   # Type check

# TestFlight / EAS
eas build --platform ios --profile preview    # Build for TestFlight
eas build --platform ios --profile production # Production build
eas submit --platform ios                     # Submit to App Store Connect
```

### Architecture

- **`App.tsx`** — Root: loads fonts (Inter + JetBrains Mono), shows splash, mounts `SafeAreaProvider` + `Navigation`
- **`src/navigation/index.tsx`** — Stack navigator wrapping a bottom tab navigator (Dashboard / Batches / Queue / Learn). Wizard steps, review screens, and analytics details are in the root stack.
- **`src/theme/index.ts`** — Single source of truth for colors, typography, spacing, and border radii. No inline hex codes in screens.
- **`src/components/`** — `AppHeader`, `StatCard`, `PrimaryButton` (gradient + ghost), `WizardProgress`
- **`src/screens/`** organized by flow:
  - `dashboard/` — Executive dashboard with stats, AI insight banner, recent batches
  - `wizard/` — 6-step campaign creation: Goal → Audience → Refined Audience → Offer & Platforms → Creative Style → Final Review → Generating → Summary
  - `review/` — Batch list, grid review, swipe-based rapid review, AI revision loop
  - `analytics/` — Learn tab, campaign insights, ad intelligence detail, brand playbook

### Design System

Follows `stitch_adforge_ai_platform/high_velocity_intelligence/DESIGN.md`.
- Primary: `#3525cd` (Deep Indigo), Secondary: `#831ada` (Vibrant Purple)
- Fonts: Inter (all text), JetBrains Mono (labels/metadata/caps)
- 4px spacing grid, 8px base border radius

### TestFlight Setup

1. `eas login` (use Expo account)
2. Fill in `eas.json`: `appleTeamId` and `ascAppId`
3. `eas build --platform ios --profile preview`
4. `eas submit --platform ios`

---

## Backend API (`apps/api`)

Fastify + TypeScript on Cloud Run. Firebase Auth, Firestore, Cloud Storage, Cloud Tasks.

**Docs:**
- [docs/backend-design.md](docs/backend-design.md) — architecture & build phases
- [docs/api.md](docs/api.md) — REST endpoint reference (request/response shapes, error codes)
- [docs/deployment.md](docs/deployment.md) — CI/CD flow, one-time GCP bootstrap, staging vs prod
- [docs/mobile-integration.md](docs/mobile-integration.md) — how mobile screens map to API calls + Firestore listeners (**integration not yet done**)

### Commands

```bash
# From repo root
npm install                        # Installs all workspaces

# Dev (with emulators)
npm run dev:emulators              # Boots Auth + Firestore + Storage emulators
npm run dev:api                    # Starts Fastify against emulators
npm run typecheck                  # Typecheck across all workspaces

# Build / deploy
cd apps/api && npm run build       # Compile TS → dist/
gcloud builds submit --config apps/api/cloudbuild.yaml
```

### Architecture

- **Two roles, one image.** `ROLE=api` boots the public API + worker routes. `ROLE=worker` only registers `/internal/jobs/*` for Cloud Tasks delivery. Same Docker image, different env var.
- **`src/server.ts`** — Fastify entry: helmet, CORS, request ID, error handler that maps `AppError` and `ZodError` to envelope.
- **`src/routes/`** — REST endpoints under `/v1` (workspaces, wizard, batches, ads, reads/stubs) and `/internal/jobs/*` for Cloud Tasks.
- **`src/jobs/`** — Worker handlers (`generateAd`, `pollHiggsfield`, `reviseAd`). Each is idempotent and assumes Cloud Tasks retry/backoff.
- **`src/providers/`** — `CopyProvider` (OpenAI) and `CreativeProvider` (Higgsfield) interfaces. `getCreativeProvider()` returns a fake provider in emulator mode.
- **`src/middleware/`** — `requireAuth` (verifies Firebase ID token), `requireWorkspace` (verifies membership via `x-workspace-id`), `requireCloudTasks` (verifies OIDC caller email).

### Read pattern

Mobile reads batches/ads **directly from Firestore** via the Web SDK under security rules. The `BatchGeneratingScreen` watches `workspaces/{wid}/batches/{bid}` for real-time progress updates — no polling endpoint exists.

### Analytics stubs

`/v1/campaigns/:id/metrics`, `/v1/ads/:id/intelligence`, `/v1/playbook`, `/v1/insights` return deterministic mock data with the real schema shape. Swap implementations later without changing the mobile contract.

---

## Shared Types (`packages/types`)

Zod schemas + TS types imported by both `apps/api` and `apps/mobile` via the `@megadon/types` workspace alias. Single source of truth for `Brief`, `Batch`, `Ad`, `Revision`, error codes, and request/response shapes.

### Integration tests

API tests live in `apps/api/tests/` and hit the Firebase Emulator Suite (Auth + Firestore + Storage). They use Fastify's `app.inject()` so no HTTP listener is started, and Firestore is cleared between tests via the emulator's REST endpoint.

```bash
# Requires Java 11+ for Firestore emulator
cd apps/api
npm run test:emulator        # Boots emulators, runs tests, tears down
npm run test                 # Skip the boot step if emulators are already running
```

`tests/helpers/app.ts` — boots Fastify in-process via `buildApp()` and exposes a `call({ method, url, idToken, workspaceId, body })` helper.
`tests/helpers/auth.ts` — `createTestUser(email)` mints emulator users + ID tokens; `clearFirestore()` wipes between tests.
`tests/helpers/mocks.ts` — `mockOpenAI()` vi.mock helper that swaps the OpenAI provider for deterministic responses (no real API calls).
