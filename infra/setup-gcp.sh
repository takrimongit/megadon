#!/usr/bin/env bash
# One-time GCP bootstrap for the AdForge AI backend.
#
# What it does:
#   - Enables all required GCP APIs
#   - Creates an Artifact Registry Docker repo
#   - Creates runtime service accounts (api, worker, tasks-invoker) and grants them roles
#   - Creates Cloud Tasks queues (staging + prod)
#   - Creates Cloud Storage buckets (staging + prod)
#   - Creates a Firestore database (single, shared by both envs)
#   - Creates placeholder Secret Manager secrets (you populate values separately)
#   - Sets up Workload Identity Federation for GitHub Actions
#   - Creates the deploy service account that GitHub impersonates
#   - Prints the GitHub Actions secret values at the end
#
# Idempotent: re-running is safe.
#
# Requirements: gcloud CLI authenticated as a user with Owner or
# (Editor + Project IAM Admin) on the target project.

set -euo pipefail

# ============ Edit these for your setup ============
PROJECT_ID="${PROJECT_ID:-megadon}"
REGION="${REGION:-us-central1}"
GITHUB_REPO="${GITHUB_REPO:-takrimongit/megadon}"

# Resource names — change only if you know why.
ARTIFACT_REPO="api"
POOL_ID="github-pool"
PROVIDER_ID="github-provider"
DEPLOYER_SA="github-deployer"

# Runtime service accounts.
API_SA="api-runtime"
WORKER_SA="worker-runtime"
TASKS_SA="tasks-invoker"

# ============ Helpers ============
log()  { printf "\033[36m▸ %s\033[0m\n" "$*" >&2; }
done_msg() { printf "\033[32m✓ %s\033[0m\n" "$*" >&2; }
warn() { printf "\033[33m! %s\033[0m\n" "$*" >&2; }

sa_email() { echo "${1}@${PROJECT_ID}.iam.gserviceaccount.com"; }

require() { command -v "$1" >/dev/null || { echo "missing: $1" >&2; exit 1; }; }
require gcloud
require jq

# ============ Step 1: set project ============
log "Setting active project to ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
log "Project number: ${PROJECT_NUMBER}"

# ============ Step 2: enable APIs ============
log "Enabling required APIs (this can take 1–2 minutes)..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  cloudtasks.googleapis.com \
  firestore.googleapis.com \
  firebase.googleapis.com \
  iamcredentials.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  >/dev/null
done_msg "APIs enabled"

# ============ Step 3: Artifact Registry repo ============
log "Creating Artifact Registry repo ${ARTIFACT_REPO}"
if ! gcloud artifacts repositories describe "${ARTIFACT_REPO}" --location="${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${ARTIFACT_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="AdForge AI container images"
fi
done_msg "Artifact Registry ready"

# ============ Step 4: runtime service accounts ============
create_sa() {
  local name="$1"; local desc="$2"
  if ! gcloud iam service-accounts describe "$(sa_email "$name")" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$name" --display-name="$desc"
  fi
}

log "Creating runtime service accounts"
create_sa "${API_SA}"    "AdForge API runtime"
create_sa "${WORKER_SA}" "AdForge worker runtime"
create_sa "${TASKS_SA}"  "Cloud Tasks invoker (OIDC)"

grant() {
  local sa="$1"; local role="$2"
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:$(sa_email "$sa")" \
    --role="$role" \
    --condition=None \
    --quiet >/dev/null
}

log "Granting roles to runtime accounts"
# API + worker need: Firestore RW, Storage RW, Secret access, Cloud Tasks enqueue.
for sa in "${API_SA}" "${WORKER_SA}"; do
  grant "$sa" "roles/datastore.user"
  grant "$sa" "roles/storage.objectAdmin"
  grant "$sa" "roles/secretmanager.secretAccessor"
  grant "$sa" "roles/cloudtasks.enqueuer"
done

# tasks-invoker needs only the right to call Cloud Run worker via OIDC.
grant "${TASKS_SA}" "roles/run.invoker"
done_msg "Runtime roles granted"

# ============ Step 5: Firestore database ============
log "Creating Firestore database (Native mode)"
if ! gcloud firestore databases describe --database='(default)' >/dev/null 2>&1; then
  gcloud firestore databases create --location="${REGION}" --type=firestore-native
else
  log "Firestore database already exists"
fi
done_msg "Firestore ready"

# ============ Step 6: Cloud Storage buckets (per env) ============
for env in staging prod; do
  bucket="${PROJECT_ID}-${env}-assets"
  log "Creating bucket gs://${bucket}"
  if ! gcloud storage buckets describe "gs://${bucket}" >/dev/null 2>&1; then
    gcloud storage buckets create "gs://${bucket}" \
      --location="${REGION}" \
      --uniform-bucket-level-access
  fi
done
done_msg "Buckets ready"

# ============ Step 7: Cloud Tasks queues (per env) ============
for env in staging prod; do
  queue="ad-generation-${env}"
  log "Creating Cloud Tasks queue ${queue}"
  if ! gcloud tasks queues describe "${queue}" --location="${REGION}" >/dev/null 2>&1; then
    gcloud tasks queues create "${queue}" \
      --location="${REGION}" \
      --max-dispatches-per-second=10 \
      --max-concurrent-dispatches=20 \
      --max-attempts=5 \
      --min-backoff=10s \
      --max-backoff=300s
  fi
done
done_msg "Queues ready"

# ============ Step 8: Secret Manager placeholders ============
ensure_secret() {
  local name="$1"
  if ! gcloud secrets describe "$name" >/dev/null 2>&1; then
    gcloud secrets create "$name" --replication-policy=automatic
    warn "Secret '$name' created with NO value — set it with: gcloud secrets versions add $name --data-file=/path/to/key"
  fi
  # Grant runtime SAs access.
  for sa in "${API_SA}" "${WORKER_SA}"; do
    gcloud secrets add-iam-policy-binding "$name" \
      --member="serviceAccount:$(sa_email "$sa")" \
      --role="roles/secretmanager.secretAccessor" \
      --quiet >/dev/null
  done
}

log "Setting up Secret Manager entries"
for env in STAGING PROD; do
  ensure_secret "KIE_API_KEY_${env}"
done
done_msg "Secrets configured"

# ============ Step 9: Workload Identity Federation for GitHub ============
log "Creating Workload Identity Pool '${POOL_ID}'"
if ! gcloud iam workload-identity-pools describe "${POOL_ID}" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "${POOL_ID}" \
    --location=global \
    --display-name="GitHub Actions"
fi

log "Creating WIF OIDC provider '${PROVIDER_ID}' for GitHub"
if ! gcloud iam workload-identity-pools providers describe "${PROVIDER_ID}" \
      --location=global --workload-identity-pool="${POOL_ID}" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_ID}" \
    --location=global \
    --workload-identity-pool="${POOL_ID}" \
    --display-name="GitHub OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.actor=assertion.actor" \
    --attribute-condition="attribute.repository=='${GITHUB_REPO}'"
fi
done_msg "WIF provider ready"

# ============ Step 10: deployer SA + grants ============
log "Creating deployer service account '${DEPLOYER_SA}'"
create_sa "${DEPLOYER_SA}" "GitHub Actions deployer"

log "Granting deployer roles (Cloud Run admin, push to Artifact Registry, act-as runtime SAs)"
grant "${DEPLOYER_SA}" "roles/run.admin"
grant "${DEPLOYER_SA}" "roles/artifactregistry.writer"
grant "${DEPLOYER_SA}" "roles/iam.serviceAccountUser"
grant "${DEPLOYER_SA}" "roles/storage.admin"  # for staging buckets used by Cloud Build cache if any

# Allow the GitHub repo (via WIF) to impersonate the deployer SA.
WIF_PRINCIPAL="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO}"
gcloud iam service-accounts add-iam-policy-binding "$(sa_email "${DEPLOYER_SA}")" \
  --role="roles/iam.workloadIdentityUser" \
  --member="${WIF_PRINCIPAL}" \
  --quiet >/dev/null
done_msg "Deployer SA + WIF binding ready"

# ============ Step 11: print GitHub secrets ============
WIF_PROVIDER_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"

cat <<EOF

╔══════════════════════════════════════════════════════════════════════════╗
║  ✅  Bootstrap complete.                                                  ║
║                                                                          ║
║  Add these as GitHub Actions secrets at:                                 ║
║    https://github.com/${GITHUB_REPO}/settings/secrets/actions            ║
╚══════════════════════════════════════════════════════════════════════════╝

GCP_PROJECT_ID:       ${PROJECT_ID}
GCP_PROJECT_NUMBER:   ${PROJECT_NUMBER}
GCP_REGION:           ${REGION}
GCP_WIF_PROVIDER:     ${WIF_PROVIDER_RESOURCE}
GCP_DEPLOYER_SA:      $(sa_email "${DEPLOYER_SA}")

Next:
  1. Populate the secrets in Secret Manager:
     gcloud secrets versions add KIE_API_KEY_STAGING --data-file=<(echo -n "<your-key>")
     gcloud secrets versions add KIE_API_KEY_PROD    --data-file=<(echo -n "<your-key>")
  2. Set the GitHub secrets above.
  3. Push to main → the deploy workflow will run.

EOF
