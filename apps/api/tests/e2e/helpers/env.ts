// Required env for e2e tests:
//   STAGING_API_URL      — base URL of the deployed api service
//   GCP_PROJECT          — used by Admin SDK for user creation
//   FIREBASE_API_KEY     — Web SDK key used to exchange custom token → ID token
//                          (NOT a secret; safe to expose in mobile builds)
//
// Application Default Credentials must be available (GHA provides them via
// google-github-actions/auth@v2). Locally, run `gcloud auth application-default
// login` first.

const required = ['STAGING_API_URL', 'GCP_PROJECT', 'FIREBASE_API_KEY'] as const;
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(`[e2e] Missing required env: ${missing.join(', ')}`);
  process.exit(1);
}
