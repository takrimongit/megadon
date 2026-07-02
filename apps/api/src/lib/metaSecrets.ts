import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { config } from './config.js';

// Per-workspace Meta Page access tokens live in Secret Manager, one secret
// per workspace. In emulator/dev we never call the real Graph API (the fake
// Meta provider is used), so the token value is irrelevant and we skip
// Secret Manager entirely.

let client: SecretManagerServiceClient | null = null;
function getClient(): SecretManagerServiceClient {
  if (!client) client = new SecretManagerServiceClient();
  return client;
}

function secretId(workspaceId: string): string {
  return `meta-page-token-${workspaceId}`;
}

/** Returns the Page access token: env var (single-brand) → Secret Manager. */
export async function getMetaToken(workspaceId: string): Promise<string | null> {
  // Single-brand deployment: Cloud Run injects META_PAGE_TOKEN from Secret
  // Manager (same pattern as KIE_API_KEY). Used for every workspace.
  if (config.metaPageToken) return config.metaPageToken;
  if (config.isEmulator()) return 'emulator-token';
  const name = `projects/${config.gcpProject}/secrets/${secretId(workspaceId)}/versions/latest`;
  try {
    const [version] = await getClient().accessSecretVersion({ name });
    const data = version.payload?.data;
    if (!data) return null;
    return Buffer.from(data).toString('utf8');
  } catch {
    // NOT_FOUND (never set) or no enabled version.
    return null;
  }
}

/** Stores (or rotates) the Page access token for a workspace. */
export async function setMetaToken(workspaceId: string, token: string): Promise<void> {
  if (config.isEmulator()) return; // fake provider ignores the token
  const parent = `projects/${config.gcpProject}`;
  const id = secretId(workspaceId);
  const secretName = `${parent}/secrets/${id}`;

  try {
    await getClient().getSecret({ name: secretName });
  } catch {
    await getClient().createSecret({
      parent,
      secretId: id,
      secret: { replication: { automatic: {} } },
    });
  }

  await getClient().addSecretVersion({
    parent: secretName,
    payload: { data: Buffer.from(token, 'utf8') },
  });
}
