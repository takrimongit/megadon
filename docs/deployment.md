# Deployment

How the AdForge AI API gets deployed to GCP. Two environments — **staging** (auto-deploy on push to `main`) and **prod** (manual workflow_dispatch with required reviewer approval).

## Architecture

- **Workload Identity Federation** — GitHub Actions authenticates to GCP via OIDC. No long-lived JSON keys.
- **Two Cloud Run services per environment**: `api-{env}` (public, `ROLE=api`) and `worker-{env}` (internal-only, `ROLE=worker`). Same Docker image, different `ROLE` env var.
- **One Firestore database** shared across both envs. For full prod isolation, split into two GCP projects later.
- **Per-env resources**: Cloud Tasks queue (`ad-generation-{env}`), Storage bucket (`{project}-{env}-assets`), Secret Manager secrets (`*_KEY_STAGING` / `*_KEY_PROD`).

## One-time setup

### 1. Bootstrap GCP

```bash
# From repo root
PROJECT_ID=megadon \
GITHUB_REPO=takrimongit/megadon \
REGION=us-central1 \
infra/setup-gcp.sh
```

This creates: APIs enabled, Artifact Registry repo, runtime + deployer service accounts, Firestore, Storage buckets, Cloud Tasks queues, Secret Manager placeholders, Workload Identity Pool + Provider for GitHub.

The script is **idempotent** — safe to re-run. At the end it prints the values you need for GitHub secrets.

### 2. Populate Secret Manager

The bootstrap creates secret names but leaves them empty. Set actual values:

```bash
echo -n "<kie-key>" | gcloud secrets versions add KIE_API_KEY_STAGING --data-file=-
echo -n "<kie-key>" | gcloud secrets versions add KIE_API_KEY_PROD --data-file=-
```

### 3. GitHub repo configuration

Add these as **repository secrets** at `https://github.com/<org>/<repo>/settings/secrets/actions`:

| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | (from bootstrap output) |
| `GCP_PROJECT_NUMBER` | (from bootstrap output) |
| `GCP_REGION` | `us-central1` |
| `GCP_WIF_PROVIDER` | (from bootstrap output, format: `projects/.../providers/...`) |
| `GCP_DEPLOYER_SA` | `github-deployer@<project>.iam.gserviceaccount.com` |

Create two **environments** at `https://github.com/<org>/<repo>/settings/environments`:

- `staging` — no protection rules
- `production` — add yourself as a **required reviewer**, and optionally restrict deployments to the `main` branch

The `production` environment gating is how manual prod promotes get approved.

## How a deploy runs

Every push to `main` that touches `apps/api/**`, `packages/types/**`, `.github/workflows/deploy-api.yml`, or `infra/**` triggers `.github/workflows/deploy-api.yml`:

```
test → build → deploy-staging
```

1. **test** — typecheck all workspaces, run API integration tests against Firebase emulators (boots emulators via `firebase emulators:exec`).
2. **build** — authenticate via WIF, push image to Artifact Registry with tag `:<short-sha>` and `:latest`. Uses GHA cache.
3. **deploy-staging** — deploy worker (internal-only) first to capture its URL, grant `tasks-invoker` SA permission to invoke worker, then deploy api with `WORKER_URL` pointing at the worker. Smoke-test `/health` at the end.

### Promoting to prod

Manual via `gh` or the GitHub UI:

```bash
# CLI
gh workflow run deploy-api.yml -f environment=prod
# or specify a specific image to deploy (defaults to the SHA of the workflow run)
gh workflow run deploy-api.yml -f environment=prod -f image_tag=a1b2c3d4e5f6
```

GitHub Actions waits for the required reviewer approval on the `production` environment before running the prod deploy job. Same steps as staging, against `worker-prod` + `api-prod`.

## URLs

After the first staging deploy, get the service URLs:

```bash
gcloud run services describe api-staging --region=us-central1 --format='value(status.url)'
gcloud run services describe api-prod    --region=us-central1 --format='value(status.url)'
```

Point the mobile app at these by setting `EXPO_PUBLIC_API_URL` accordingly.

## Cost notes

- Cloud Run scales to zero — no cost when idle.
- Firestore free tier covers MVP comfortably.
- Cloud Tasks free tier: 1M operations/month.
- Artifact Registry storage: ~$0.10/GB/month for cached images.
- Estimated steady-state: <$10/month until real load.

## Rollback

Cloud Run keeps every revision. To roll back to a previous version:

```bash
# List recent revisions
gcloud run revisions list --service=api-prod --region=us-central1

# Send 100% of traffic to a previous revision
gcloud run services update-traffic api-prod --region=us-central1 --to-revisions=api-prod-00042-xyz=100
```

Or just re-trigger the workflow with the previous good SHA as `image_tag`.

## What's not yet automated

- **Database migrations** — Firestore is schemaless, but future structured changes (e.g. denormalized aggregates rebuilds) need a separate one-off job.
- **firestore.rules / storage.rules deploy** — currently committed but not auto-pushed to Firebase. Run `firebase deploy --only firestore:rules,storage:rules --project megadon` manually for now.
- **Monitoring / alerting** — no alerts wired up. Cloud Run uptime + p99 latency dashboards exist in the GCP console; alerts are a TODO.
