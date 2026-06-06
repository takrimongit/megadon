# AdForge AI — API Reference (v1)

REST API powering the AdForge AI mobile app. Built with Fastify on Cloud Run, backed by Firestore and Firebase Auth. See [backend-design.md](./backend-design.md) for the architectural rationale and [mobile-integration.md](./mobile-integration.md) for how the mobile app uses this API.

## Base URLs

| Environment | URL |
|---|---|
| Local (emulators) | `http://localhost:8080` |
| Staging | `https://api-staging.adforge.ai` *(TBD)* |
| Production | `https://api.adforge.ai` *(TBD)* |

All endpoints below are prefixed with `/v1` unless noted.

## Authentication

Every request requires:

| Header | Format | Notes |
|---|---|---|
| `Authorization` | `Bearer <firebase-id-token>` | Firebase ID token from the mobile SDK. Verified server-side via the Admin SDK. |
| `x-workspace-id` | Workspace doc id | Required on every `/v1/*` endpoint **except** `/v1/workspaces` (create/list). Server verifies the caller is a member. |

Get a token on the client:

```ts
import { getAuth } from 'firebase/auth';
const token = await getAuth().currentUser?.getIdToken();
```

## Response envelope

Every JSON response uses the same shape:

```ts
type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } };
```

Always check `error` first before reading `data`. The mobile client (`apps/mobile/src/lib/api.ts`) already does this and throws an `ApiClientError` on failure.

## Error codes

| Code | HTTP | When |
|---|---|---|
| `AUTH_REQUIRED` | 401 | Missing or invalid ID token |
| `WORKSPACE_FORBIDDEN` | 403 | Missing `x-workspace-id`, or caller not a member, or insufficient role |
| `VALIDATION_FAILED` | 400 | Zod schema rejected the request body |
| `NOT_FOUND` | 404 | Resource id doesn't exist (or not visible to caller) |
| `PROVIDER_FAILED` | 502 | kie.ai call failed (chat or image) |
| `RATE_LIMITED` | 429 | Reserved — not yet emitted |
| `INTERNAL` | 500 | Uncaught server error |

---

## Endpoints

### Health

#### `GET /healthz`
No auth. Returns `{ ok: true, role: 'api' | 'worker' }`.

---

### Workspaces

#### `POST /v1/workspaces`
Create a workspace. Caller becomes `owner`. Auto-bootstraps a `users/{uid}` profile if missing.

**Body**
```json
{ "name": "Acme Co" }
```
**Response 201**
```json
{
  "data": {
    "id": "<workspaceId>",
    "name": "Acme Co",
    "ownerId": "<uid>",
    "plan": "free",
    "createdAt": "2026-06-06T10:00:00.000Z"
  },
  "error": null
}
```

#### `GET /v1/workspaces`
List workspaces the caller is a member of. No `x-workspace-id` required.

#### `POST /v1/workspaces/:id/members` *(owner only)*
Invite a user by email. The target user must already exist in `users/`.

**Body**
```json
{ "email": "teammate@acme.com", "role": "editor" }
```
`role` is one of `owner | editor | viewer`. Defaults to `viewer`.

---

### Wizard

#### `GET /v1/wizard/options`
Returns the static option sets the wizard renders (goals, age groups, interests, platforms, visual styles, tones). Backed by `config/wizardOptions` in Firestore; falls back to a hard-coded default if the doc doesn't exist.

#### `POST /v1/personas/suggest`
Wizard step 3 — generates 3 audience personas. Results cached in Firestore for 24h per input hash.

**Body**
```json
{
  "ageGroups": ["25–34"],
  "interests": ["Fashion", "Tech"],
  "personaDescription": "Urban professionals who shop online"
}
```
**Response 200**
```json
{
  "data": [
    { "id": "p1", "name": "The Trendsetter", "desc": "...", "tags": ["Instagram"], "reach": "2.4M" },
    { "id": "p2", "name": "...", "desc": "...", "tags": [...], "reach": "..." },
    { "id": "p3", "name": "...", "desc": "...", "tags": [...], "reach": "..." }
  ],
  "error": null
}
```

---

### Batches

#### `POST /v1/batches`
Submit a complete `Brief` to start a batch. Server validates with Zod, creates the batch doc, pre-creates `batchSize` placeholder ad docs (`status: 'generating'`), and enqueues one Cloud Task per ad. Returns immediately — generation runs in workers.

**Body**
```json
{
  "name": "Summer Sale",
  "brief": {
    "goal": "conversion",
    "audience": {
      "ageGroups": ["25–34"],
      "interests": ["Fashion"],
      "personaDescription": "...",
      "selectedPersona": { "id": "p1", "name": "...", ... }
    },
    "offer": "30% off summer collection",
    "platforms": ["instagram", "tiktok"],
    "batchSize": 10,
    "creativeStyle": "bold",
    "tones": ["Urgent", "Inspiring"]
  }
}
```

`brief` follows the `Brief` schema in [packages/types/src/index.ts](../packages/types/src/index.ts).

**Response 201**
```json
{ "data": { "batchId": "abc123", "estimatedSeconds": 80 }, "error": null }
```

The mobile app should now subscribe directly to Firestore at `workspaces/{wid}/batches/{batchId}` for live progress — there is **no polling endpoint**.

#### `POST /v1/batches/:batchId/decisions`
Bulk approve/reject. Used by `ReviewBatchScreen`'s "Submit Approvals" button. Single transactional write; auto-finalizes batch status when all ads are decided.

**Body**
```json
{
  "decisions": [
    { "adId": "ad1", "status": "approved" },
    { "adId": "ad2", "status": "approved" },
    { "adId": "ad3", "status": "rejected" }
  ]
}
```

When `approved + rejected === progress.total`, the batch transitions to `approved` (if any approved) or `archived` (if all rejected).

---

### Ads

#### `PATCH /v1/ads/:adId`
Single approve/reject. Used by `RapidReviewScreen` swipe gestures.

**Body**
```json
{ "status": "approved" }
```
Same batch finalization rules as bulk decisions.

#### `POST /v1/ads/:adId/revisions`
Request an AI revision. Creates a revision doc in `status: 'queued'`, enqueues a worker job, returns the revision id. The mobile app should subscribe to the revision doc to watch `status` flip to `ready`.

**Body**
```json
{ "instruction": "Make the headline more urgent" }
```
**Response 201**
```json
{ "data": { "revisionId": "rev-abc" }, "error": null }
```

#### `POST /v1/ads/:adId/revisions/:rid/accept`
Apply a `status: 'ready'` revision to the ad: copies `headline/body/cta` from the revision onto the ad, flips ad to `approved`, pushes the previous copy into `ad.history[]`.

No request body. Returns `{ data: { ok: true }, error: null }`.

---

### Reads

#### `GET /v1/dashboard/stats`
Returns the cached aggregate doc at `workspaces/{wid}/aggregates/dashboard`. Defaults to all zeros when no aggregate exists yet.

```json
{
  "data": {
    "activeCampaigns": 24,
    "adsGenerated": 1248,
    "approvalRate": 0.84,
    "avgRoas": 3.2
  },
  "error": null
}
```

#### `GET /v1/assets/:adId/signed-url`
Returns a 15-minute signed read URL for the ad's primary asset in Cloud Storage.

```json
{ "data": { "url": "https://storage.googleapis.com/...", "expiresIn": 900 }, "error": null }
```

---

### Analytics stubs

These return deterministic mock data in MVP. Schema is real so wiring real pipelines later is a swap-in.

| Endpoint | Purpose |
|---|---|
| `GET /v1/campaigns/:id/metrics?period=7d\|30d\|90d` | Impressions, clicks, CTR, ROAS, spend, conversions, top 3 ads |
| `GET /v1/ads/:adId/intelligence` | Per-ad metrics, audience breakdown, AI analysis notes |
| `GET /v1/playbook` | Brand intelligence playbook — learned rules with confidence scores |
| `GET /v1/insights` | Top insights cards for the Learn tab |

---

### Internal (Cloud Tasks only)

These are not part of the public API. Cloud Tasks dispatches them with OIDC-signed requests; direct calls are rejected.

- `POST /internal/jobs/generate-ad`
- `POST /internal/jobs/poll-creative`
- `POST /internal/jobs/revise-ad`

---

## Read patterns: REST vs Firestore listeners

The API is intentionally lean. **Live data flows through Firestore, not REST.** The mobile app subscribes directly to these collections via the Firebase Web SDK (secured by `firestore.rules`):

| Mobile screen | Subscribes to |
|---|---|
| `BatchesScreen` | `workspaces/{wid}/batches` ordered by `createdAt desc` |
| `ReviewBatchScreen` | `workspaces/{wid}/batches/{bid}` + its `ads` subcollection |
| `BatchGeneratingScreen` | `workspaces/{wid}/batches/{bid}` (progress.completed / total) |
| `AIRevisionScreen` | `workspaces/{wid}/batches/{bid}/ads/{adId}/revisions/{rid}` (watch `status: ready`) |
| `QueueScreen` | `batches` filtered to `status == 'pending_review'` |

REST endpoints are reserved for writes, AI-touching operations, and signed-URL minting.

---

## Versioning

The current version is `v1`. Breaking changes will ship under `/v2`. Adding fields to existing responses is non-breaking and won't change the version.
