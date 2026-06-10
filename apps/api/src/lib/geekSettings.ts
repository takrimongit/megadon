import { db } from './firebase.js';
import type {
  GeekSettings,
  GeekChatOverride,
  GeekMediaOverride,
} from '@megadon/types';

export const settingsRef = (workspaceId: string) =>
  db().doc(`workspaces/${workspaceId}/settings/geek`);

const EMPTY: GeekSettings = {
  enabled: false,
  updatedAt: new Date(0).toISOString(),
};

/** Returns the workspace's Geek Mode settings, or an empty/disabled
 *  default. Returns null when Geek Mode is disabled so call sites can
 *  do `geek ? geek.chat?.model ?? default : default`. */
export async function loadGeekSettings(workspaceId: string): Promise<GeekSettings | null> {
  const snap = await settingsRef(workspaceId).get();
  if (!snap.exists) return null;
  const data = snap.data() as GeekSettings;
  if (!data.enabled) return null;
  return data;
}

export function pickChat(
  geek: GeekSettings | null | undefined,
  key: 'chat' | 'revise' | 'personas' | 'analyze',
): GeekChatOverride | undefined {
  if (!geek?.enabled) return undefined;
  return geek[key];
}

export function pickMedia(
  geek: GeekSettings | null | undefined,
  key: 'image' | 'video',
): GeekMediaOverride | undefined {
  if (!geek?.enabled) return undefined;
  return geek[key];
}

export { EMPTY as EMPTY_GEEK };
