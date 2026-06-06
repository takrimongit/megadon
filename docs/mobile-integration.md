# Mobile Integration Guide

How `apps/mobile` talks to the AdForge AI backend. See [api.md](./api.md) for the endpoint reference.

## Status

> **The mobile app is NOT yet wired to the backend.** Every screen currently reads from inline mock arrays at the top of its file.
>
> The integration plumbing is in place:
> - `apps/mobile/src/lib/firebase.ts` — Firebase Web SDK init (auth + Firestore + emulator switch)
> - `apps/mobile/src/lib/api.ts` — typed REST client using `@megadon/types`
> - `apps/mobile/src/components/`, screen files — unchanged from the mock build
>
> The remaining work is the wiring pass: swap the mock arrays for `useEffect(() => { api.foo(); })` and Firestore `onSnapshot()` subscriptions.

---

## Architecture

### Two transport mechanisms

| Mechanism | When used | Example |
|---|---|---|
| **REST** (`src/lib/api.ts`) | Writes, AI-touching operations, signed-URL minting | `api.createBatch()`, `api.approveAd()`, `api.requestRevision()` |
| **Firestore listener** (`src/lib/firebase.ts`) | All reads of live data | Watching batch progress, listing ads in a batch, watching a revision flip to `ready` |

This split removes about 10 polling endpoints from the API surface and gives the UI free real-time updates.

### Auth flow

1. User signs in via the Firebase Auth UI (email/password or Sign in with Apple — UI not yet built).
2. `getAuth().currentUser.getIdToken()` returns a fresh JWT (refresh handled by the SDK).
3. `api.ts` reads the token before every request and attaches `Authorization: Bearer <token>`.
4. On first sign-in, mobile calls `POST /v1/workspaces` to bootstrap a default workspace; the workspace id is cached locally and sent on every subsequent request via `x-workspace-id`.

### Configuration

Set these in `apps/mobile/.env` (or via EAS secrets for production builds):

```bash
EXPO_PUBLIC_API_URL=http://localhost:8080         # API base URL
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=megadon-dev
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=megadon-dev.appspot.com
EXPO_PUBLIC_FIREBASE_APP_ID=...

# Local dev only — connects to Firebase emulators
EXPO_PUBLIC_USE_EMULATOR=true
EXPO_PUBLIC_EMULATOR_HOST=localhost
```

---

## Screen-by-screen integration plan

### Dashboard (`DashboardScreen`)

Currently shows mocked stats and recent batches.

**Wire to:**
- `api.dashboardStats()` for the 4 stat cards
- `onSnapshot(workspaces/{wid}/batches orderBy createdAt desc limit 3)` for "Recent Batches"

### Wizard (6 screens)

`WizardGoalScreen`, `WizardAudienceScreen`, `WizardRefinedAudienceScreen`, `WizardOfferPlatformsScreen`, `WizardCreativeStyleScreen`, `WizardFinalReviewScreen`.

Most screens render static option lists. **All of them should pull from `api.wizardOptions()` once** at the entry point and pass the result down through navigation params or a React Context. Don't make 6 API calls.

`WizardRefinedAudienceScreen` calls `api.suggestPersonas({...})` on mount with the values collected in the previous step.

`WizardFinalReviewScreen` "Generate Batch" button calls `api.createBatch({ name, brief })` and then navigates to `GeneratingBatch` with the returned `batchId`.

### Generation (`GeneratingBatchScreen`, `BatchGeneratingScreen`)

Replace the local progress simulation with a real Firestore listener:

```ts
useEffect(() => {
  const unsub = onSnapshot(doc(getDb(), `workspaces/${wid}/batches/${batchId}`), (snap) => {
    setBatch(snap.data() as Batch);
  });
  return unsub;
}, [wid, batchId]);
```

When `batch.status === 'pending_review'`, auto-navigate to `ReviewBatch`.

### Review (`BatchesScreen`, `ReviewBatchScreen`)

`BatchesScreen` — subscribe to `workspaces/{wid}/batches orderBy createdAt desc`.

`ReviewBatchScreen` — subscribe to `workspaces/{wid}/batches/{bid}/ads`. Tap-to-approve calls `api.approveAd(adId)`; "Submit Approvals" calls `api.bulkDecisions(batchId, ...)`.

### Rapid Review (`RapidReviewScreen`)

Subscribe to the batch's `ads` subcollection filtered to `status == 'pending'`. Swipe right → `api.approveAd(adId)`. Swipe left → `api.rejectAd(adId)`. Tap edit → navigate to `AIRevision`.

### Revision (`AIRevisionScreen`)

1. User types instruction, hits "Revise with AI" → `api.requestRevision(adId, instruction)` returns `revisionId`.
2. Subscribe to the revision doc; render a loading state until `status === 'ready'`.
3. Render the new copy. "Accept" → `api.acceptRevision(adId, revisionId)`.

### Analytics tabs

| Screen | API call |
|---|---|
| `LearnScreen` | `api.insights()` |
| `CampaignInsightsScreen` | `api.campaignMetrics(campaignId, period)` |
| `AdIntelligenceScreen` | `api.adIntelligence(adId)` |
| `BrandPlaybookScreen` | `api.playbook()` |

All return mock data in MVP — the schema is real.

### Asset rendering

Wherever an ad displays its image:

```ts
const { url } = await api.signedUrl(adId);
<Image source={{ uri: url }} />
```

Cache aggressively client-side — the signed URL is valid for 15 minutes.

---

## Recommended next steps (wiring pass)

1. **Auth UI** — sign-in screen with email/password + Sign in with Apple. Cache the user's selected workspace id in `AsyncStorage` and call `setWorkspaceId()` on app boot.
2. **Replace dashboard mock data** — easiest first integration; validates the auth + API path end-to-end.
3. **Wire the wizard** — single fetch of `/wizard/options`, then the persona-suggest call.
4. **Replace `BatchGeneratingScreen` simulation** with a Firestore listener.
5. **Wire the review flow** — list + per-ad decisions are the highest-value loop.
6. **Replace analytics tabs** with the stub endpoints (low risk since data is mocked server-side too).

Each step is independently shippable.

---

## Testing the integration locally

```bash
# Terminal 1 — boot Firebase emulators
npm run dev:emulators

# Terminal 2 — boot the API against the emulators
npm run dev:api

# Terminal 3 — boot the mobile app pointed at localhost
cd apps/mobile
EXPO_PUBLIC_API_URL=http://localhost:8080 \
EXPO_PUBLIC_USE_EMULATOR=true \
EXPO_PUBLIC_FIREBASE_PROJECT_ID=megadon-dev \
npm start
```

On the iOS simulator, `localhost` works as-is. On a physical device, replace `localhost` with your machine's LAN IP (e.g. `192.168.1.42`).
