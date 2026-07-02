import { db } from './firebase.js';
import { config } from './config.js';
import type { MetaSettings } from '@megadon/types';

export const metaSettingsRef = (workspaceId: string) =>
  db().doc(`workspaces/${workspaceId}/settings/meta`);

// Single-brand connection assembled from env vars (Cloud Run / .env). When
// META_PAGE_TOKEN + META_FACEBOOK_PAGE_ID are set, every workspace is
// considered connected without any Firestore/API setup.
function envMetaSettings(): MetaSettings | null {
  if (!config.metaPageToken || !config.metaFacebookPageId) return null;
  return {
    connected: true,
    facebookPageId: config.metaFacebookPageId,
    ...(config.metaInstagramUserId ? { instagramUserId: config.metaInstagramUserId } : {}),
    tokenSet: true,
    updatedAt: new Date(0).toISOString(),
  };
}

/** Loads the workspace's Meta connection: env (single-brand) → Firestore. */
export async function loadMetaSettings(workspaceId: string): Promise<MetaSettings | null> {
  const fromEnv = envMetaSettings();
  if (fromEnv) return fromEnv;
  const snap = await metaSettingsRef(workspaceId).get();
  if (!snap.exists) return null;
  return snap.data() as MetaSettings;
}
