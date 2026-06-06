# AdForge AI — Backend Technical Design (MVP, GCP/Firebase)

Low-level spec for the v1 backend that powers the mobile app. Targets MVP scope: **auth + workspaces + wizard + batch generation + review/revision**. Analytics & learning-loop endpoints are stubbed (schema-only, mock data returned) so the UI keeps working but no real pipelines run.

Recommended stack: **Cloud Run (Node 20 + TypeScript + Fastify)** for the API, **Firebase Auth** for identity, **Firestore (Native mode)** as the system of record, **Cloud Storage** for creative assets, **Cloud Tasks** as the job queue, **Secret Manager** for provider keys, **Firebase Emulator Suite** for local dev. Generation workers run as authenticated HTTP endpoints on the same Cloud Run service, invoked by Cloud Tasks (one task per ad → easy retry/backoff and concurrency control).

Architectural pattern: **Hybrid REST + Firestore listeners**. Writes and AI-touching operations go through REST (validation, auth scoping, queue dispatch, secret access). Reads from mobile use the Firestore SDK directly under security rules so the UI gets free real-time updates (no polling for generation progress).

---

## Phase 1 — Foundations *(blocking everything else)*

1. Create `/apps/api` (Node 20, TS, Fastify, ESM, `tsx` for dev) and `/packages/types` (shared DTOs/enums imported by both `apps/api` and `apps/mobile`).
2. Bootstrap GCP project + Firebase project linked to it. Enable: Firebase Auth, Firestore (Native), Cloud Storage, Cloud Run, Cloud Tasks, Secret Manager, Cloud Build.
3. Wire root `package.json` workspaces (npm workspaces) so `apps/mobile`, `apps/api`, `packages/types` share TS types via path mapping.
4. Install Firebase Emulator Suite (Auth, Firestore, Storage, Functions emulator unused) and document `npm run dev:emulators` in `apps/api`.
5. Add `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules` at repo root.
6. Stand up the Fastify server skeleton with: request-id middleware, Pino logger, Zod validation, error envelope, `/healthz`, Firebase Admin SDK init (ADC in prod, emulator host in dev).
7. Auth middleware: verify Firebase ID token from `Authorization: Bearer <jwt>` → attach `{ uid, email }` to request. Workspace middleware: read `x-workspace-id` header, verify caller is a member, attach `{ workspaceId, role }`.

## Phase 2 — Data Model & Security *(depends on Phase 1)*

8. Define Firestore collections (see "Firestore Schema" below). Create composite indexes for the queries in §"Indexes".
9. Write `firestore.rules`: deny-by-default; allow read on `workspaces/{wid}/...` only to members; deny client writes on `batches/*` and `ads/*` (server-only); allow user profile self-read.
10. Write `storage.rules`: signed-URL-only access for `gs://<bucket>/workspaces/{wid}/batches/{bid}/ads/{adId}/*`; deny direct client access.
11. Add shared TS types in `packages/types` mirroring schema: `Workspace`, `Membership`, `Brief`, `Batch`, `Ad`, `Revision`, `Asset`, `BatchStatus`, `AdStatus`, plus Zod schemas.

## Phase 3 — Workspaces & Wizard Endpoints *(depends on Phase 2; sub-steps parallelizable)*

12. `POST /v1/workspaces` — create workspace; caller becomes `owner`. Bootstraps default workspace on first sign-in.
13. `GET /v1/workspaces` — list workspaces the caller is a member of.
14. `POST /v1/workspaces/:id/members` (owner-only) — invite by email (stub: just adds membership if user exists).
15. `POST /v1/personas/suggest` — wizard step 3 helper. Input: `{ ageGroups, interests, personaDescription }`. Calls kie.ai (`gpt-4o-mini` by default, configurable via `KIE_MODEL`) with a structured-output schema → returns 3 `Persona` candidates `{ id, name, desc, tags[], reach }`. Cached by input hash for 24h in Firestore `personaCache`.
16. `GET /v1/wizard/options` — returns static option sets (goals, age groups, interests catalog, platforms, visual styles, tones) so the mobile app stops hard-coding them. Backed by a single config doc `config/wizardOptions`.

## Phase 4 — Batch Generation Pipeline *(depends on Phase 3)*

17. `POST /v1/batches` — accepts complete `Brief` (validated with Zod). Creates `batches/{bid}` doc with `status: 'queued'`, `progress: { total: brief.batchSize, completed: 0 }`, snapshots the brief. Creates `batchSize` placeholder `ads/{adId}` docs in `status: 'generating'`. Enqueues one Cloud Task per ad to `POST /internal/jobs/generate-ad` (OIDC-authenticated, header-scoped). Returns `{ batchId, estimatedSeconds }`.
18. `POST /internal/jobs/generate-ad` — Cloud Tasks handler (verifies OIDC token issued for the service account). Steps per ad:
    a. Load batch + brief.
    b. Call kie.ai to produce `{ headline, body, hook, cta }` (structured output, prompt templated from brief + platform).
    c. Call kie.ai's image generation endpoint (`/v1/images/generations` with model from `KIE_IMAGE_MODEL`, default `flux-schnell`). Image responses are synchronous; the polling path in step 19 is reserved for future async video models.
    d. Download asset → upload to Cloud Storage at `workspaces/{wid}/batches/{bid}/ads/{adId}/v1.{ext}`.
    e. Patch ad doc with copy fields, `assetPath`, `score` (stub: random 60–95), `status: 'pending'`.
    f. Atomically increment batch `progress.completed`; if `completed === total`, set batch `status: 'pending_review'`.
19. Long-running creative jobs (reserved for future video models): if the provider returns an async job ID instead of an inline asset URL, persist it on the ad doc and enqueue a delayed Cloud Task (`scheduleTime` = now + 30s) hitting `POST /internal/jobs/poll-creative` until terminal status; same retry/backoff config. Current kie.ai image generation is synchronous and skips this path.
20. Retry/error handling: Cloud Tasks max 5 attempts with exponential backoff (`minBackoff=10s`, `maxBackoff=300s`). On final failure, ad doc → `status: 'failed'` with `error.code/message`; batch doc tracks `progress.failed`. Batch finalizes when `completed + failed === total`.
21. Mobile progress UX: `GeneratingBatchScreen` and `BatchGeneratingScreen` subscribe to `batches/{bid}` via Firestore SDK — no polling endpoint needed.

## Phase 5 — Review, Revision, Approval *(depends on Phase 4)*

22. `PATCH /v1/ads/:adId` body `{ status: 'approved' | 'rejected' }` — single-ad decision (used by `RapidReviewScreen` swipes). Validates the caller can write this ad's workspace; updates ad doc and increments `batch.counters.{approved|rejected}`.
23. `POST /v1/batches/:batchId/decisions` — bulk variant for `ReviewBatchScreen`'s "Submit Approvals". Body: `{ decisions: [{ adId, status }] }`. Single transactional batched write.
24. `POST /v1/ads/:adId/revisions` — body `{ instruction: string }`. Creates `revisions/{rid}` doc in `status: 'queued'`, enqueues Cloud Task `POST /internal/jobs/revise-ad`. Returns `{ revisionId }`. Mobile subscribes to the revision doc for the streamed result.
25. `POST /internal/jobs/revise-ad` — loads ad + instruction, calls kie.ai with revise prompt (current copy + brief context + instruction → structured output), writes revised `{ headline, body, cta }` to the revision doc, sets `status: 'ready'`. Does **not** mutate the ad until the user accepts.
26. `POST /v1/ads/:adId/revisions/:rid/accept` — applies revision fields to ad doc, flips `ad.status` to `approved`, marks revision `accepted: true`, keeps prior copy in `ad.history[]`.
27. Counters/derived state: when `batch.counters.approved + rejected === batch.progress.total`, automatically flip `batch.status` to `approved` (if any approved) or `archived` (if all rejected). Triggered inside the Firestore transaction in steps 22/23.

## Phase 6 — Read APIs & Stubs *(parallel with Phase 5)*

28. Keep all list/detail reads on direct Firestore (secured by rules). Provide one server endpoint only when computation is required:
29. `GET /v1/dashboard/stats` — aggregates counts via cached `workspaces/{wid}/aggregates/dashboard` doc updated on batch finalize. Returns `{ activeCampaigns, adsGenerated, approvalRate, avgRoas }`. ROAS is **mock-stubbed** in MVP.
30. **Stubbed analytics endpoints (return deterministic mock data; schema is real so we can wire reality later):**
    - `GET /v1/campaigns/:campaignId/metrics?period=7d|30d|90d`
    - `GET /v1/ads/:adId/intelligence`
    - `GET /v1/playbook`
    - `GET /v1/insights`
31. Asset serving: `GET /v1/assets/:adId/signed-url` returns a 15-minute signed read URL for the ad's primary asset.

## Phase 7 — Deploy & Verify *(depends on prior phases)*

32. Add `Dockerfile` (multi-stage: build → distroless Node 20 runtime, non-root).
33. Add `cloudbuild.yaml`: build image → push to Artifact Registry → deploy to Cloud Run with `--no-allow-unauthenticated` for `/internal/*` (handled via path-based IAM is impossible on Cloud Run; instead deploy two services: `api` public + `worker` internal, sharing the same image with env flag `ROLE=api|worker`).
34. Cloud Tasks queue `ad-generation` with rate caps (`maxDispatchesPerSecond=10`, `maxConcurrentDispatches=20`) targeting the worker service URL with OIDC auth (service account: `tasks-invoker@<proj>.iam`).
35. Secret Manager entry: `KIE_API_KEY` (suffixed `_STAGING` / `_PROD` per env). Mounted to Cloud Run as an env var. Single key powers both copy and image generation.
36. Smoke test plan in §Verification.

---

## Firestore Schema (high-level)

- `users/{uid}` — `{ email, displayName, createdAt, defaultWorkspaceId }`
- `workspaces/{wid}` — `{ name, ownerId, createdAt, plan }`
- `workspaces/{wid}/members/{uid}` — `{ role: 'owner'|'editor'|'viewer', addedAt }`
- `workspaces/{wid}/batches/{bid}` — `{ name, status, brief, progress, counters, createdBy, createdAt, updatedAt }`
- `workspaces/{wid}/batches/{bid}/ads/{adId}` — `{ headline, body, hook, cta, platform, format, status, score, assetPath, providerJobIds, error, history[], createdAt, updatedAt }`
- `workspaces/{wid}/batches/{bid}/ads/{adId}/revisions/{rid}` — `{ instruction, status, headline?, body?, cta?, accepted, createdBy, createdAt }`
- `workspaces/{wid}/aggregates/dashboard` — denormalized stats doc updated on batch finalize
- `personaCache/{hash}` — wizard step-3 kie.ai response cache
- `config/wizardOptions` — static option sets (goals, interests, platforms, styles, tones)

**Indexes:** `batches` by `(workspaceId, status, createdAt desc)`; `ads` by `(batchId, status)`; collection-group on `ads` by `(workspaceId, status)`.

---

## API Surface (all under `/v1`, JWT-auth + `x-workspace-id`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/workspaces` | Create workspace |
| GET | `/workspaces` | List my workspaces |
| POST | `/workspaces/:id/members` | Add member |
| GET | `/wizard/options` | Static option sets |
| POST | `/personas/suggest` | Wizard step 3 — kie.ai personas |
| POST | `/batches` | Submit brief → enqueue generation |
| PATCH | `/ads/:adId` | Approve / reject single ad |
| POST | `/batches/:batchId/decisions` | Bulk approve/reject |
| POST | `/ads/:adId/revisions` | Request AI revision |
| POST | `/ads/:adId/revisions/:rid/accept` | Apply revision |
| GET | `/dashboard/stats` | Cached aggregates |
| GET | `/campaigns/:id/metrics` | **STUB** |
| GET | `/ads/:adId/intelligence` | **STUB** |
| GET | `/playbook` | **STUB** |
| GET | `/insights` | **STUB** |
| GET | `/assets/:adId/signed-url` | Signed Cloud Storage URL |
| POST | `/internal/jobs/generate-ad` | Cloud Tasks → worker (OIDC) |
| POST | `/internal/jobs/poll-creative` | Cloud Tasks → worker (OIDC) |
| POST | `/internal/jobs/revise-ad` | Cloud Tasks → worker (OIDC) |
| GET | `/healthz` | Liveness |

All responses wrapped as `{ data, error: null }` or `{ data: null, error: { code, message } }`. Errors use stable codes (`AUTH_REQUIRED`, `WORKSPACE_FORBIDDEN`, `VALIDATION_FAILED`, `RATE_LIMITED`, `PROVIDER_FAILED`, `NOT_FOUND`).

---

## Relevant files / locations to create

- `apps/api/` — Fastify service (handlers, providers, jobs, middleware, schemas)
- `apps/api/src/providers/kie.ts` — kie.ai client (OpenAI-compatible) with structured-output helpers
- `apps/api/src/providers/creative.ts` — kie.ai image-gen client (kickoff + poll, poll is a no-op for sync image responses)
- `apps/api/src/providers/types.ts` — `CreativeProvider` interface so swapping providers is one file
- `apps/api/src/jobs/generateAd.ts`, `reviseAd.ts`, `pollCreative.ts`
- `apps/api/src/lib/firebase.ts` — Admin SDK init (emulator vs prod)
- `apps/api/src/lib/cloudTasks.ts` — enqueue helper, OIDC config
- `apps/api/src/lib/auth.ts` — token verification, workspace guard
- `apps/api/Dockerfile`, `apps/api/cloudbuild.yaml`
- `packages/types/src/index.ts` — shared DTOs + Zod schemas re-exported
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json` (repo root)
- `apps/mobile/src/lib/api.ts` (new) — typed fetch client using `packages/types`
- `apps/mobile/src/lib/firebase.ts` (new) — Firebase Web SDK init for auth + Firestore listeners
- Reference for data shapes: each `apps/mobile/src/screens/**` file already enumerates the fields each entity needs (see explored mock arrays).

---

## Verification

1. `cd apps/api && npm run dev:emulators` boots Auth + Firestore + Storage emulators; `npm run dev` starts Fastify against them.
2. Type-check across the monorepo: `npm run typecheck -w` (must pass in `apps/api`, `apps/mobile`, `packages/types`).
3. Integration tests with Vitest hitting emulators: workspace creation, brief submission creates correct number of `ads` docs, fake provider in test mode finalizes batch, decisions transition batch status.
4. Security-rules tests via `@firebase/rules-unit-testing`: cross-workspace read blocked; client write to `batches/*` blocked; member of workspace can read own batches.
5. End-to-end smoke from mobile against emulators: complete wizard, watch `BatchGeneratingScreen` flip via Firestore listener, approve ads in `RapidReviewScreen`, batch becomes `approved`.
6. Cloud Run deploy dry-run: `gcloud run deploy --no-traffic` for both `api` and `worker`; hit `/healthz` on the public URL.
7. Cloud Tasks loop test: post a real brief in staging with a stubbed `CreativeProvider` returning a static asset → batch finalizes in <30s.

---

## Decisions

- **Stack**: Cloud Run (Node 20 + Fastify + TypeScript), Firebase Auth, Firestore Native, Cloud Storage, Cloud Tasks, Secret Manager. Fits "GCP/Firebase" answer and avoids the cold-start/timeout limits of 1st-gen Cloud Functions for the generation worker.
- **Job system**: Cloud Tasks (HTTP target → same Cloud Run image deployed as `worker` service, OIDC-authenticated). Recommended over Pub/Sub because we need ordered per-ad retries with backoff and rate limits, not fan-out broadcast.
- **Read pattern**: Firestore SDK directly on mobile under security rules. Free real-time progress for `GeneratingBatchScreen`; eliminates ~10 list endpoints from the REST surface.
- **Tenancy**: Workspaces from day one, `workspaces/{wid}` as root of every resource (path-based isolation that maps cleanly to rules and IAM).
- **Auth**: Firebase Auth on mobile (email/password + Sign in with Apple for TestFlight). API verifies ID tokens via Admin SDK.
- **AI providers**: kie.ai (OpenAI-compatible gateway) for everything. Chat completions for copy + personas (default `gpt-4o-mini`, override via `KIE_MODEL`); image generations for ad creatives (default `flux-schnell`, override via `KIE_IMAGE_MODEL`). Both behind `CopyProvider`/`CreativeProvider` interfaces so swapping providers is one file.
- **Analytics endpoints**: Schema defined, returns mock data in MVP. UI stays functional; pipelines wired later.
- **No backend performance ingestion in MVP** (per "stub it" answer). `ad.score`/`roas` filled with deterministic mocks.
- **Out of scope (MVP)**: real ad-network publishing, billing/Stripe, role permissions beyond owner/editor/viewer, learning-loop training, push notifications.

## Further Considerations

1. **Function vs Cloud Run** — Cloud Run chosen for long-lived generation worker (up to 60 min timeout, easier local dev with same Node runtime). Alternative: Firebase Functions v2 (also Cloud Run under the hood, but tighter Firebase tooling). *Recommendation: Cloud Run for control; revisit if you want Firebase's deploy ergonomics.*
2. **Async video models** — kie.ai's image endpoint is synchronous, but video models (Veo, Sora) return job IDs. Option A: long-poll inside the worker (Cloud Run requests up to 60 min). Option B: persist `providerJobId`, enqueue a delayed Cloud Task to poll. *Recommendation: Option B (current plan) — survives instance restarts and is cheaper.*
3. **Default workspace creation** — Auto-create one on first sign-in vs require explicit creation. *Recommendation: auto-create named "Personal" so the wizard is reachable on first launch.*
