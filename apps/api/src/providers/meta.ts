import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';

// Organic publishing to a Facebook Page + linked Instagram Business account
// via the Meta Graph API. Meta fetches the media from a public URL, so callers
// pass a short-lived signed GCS read URL as `mediaUrl`.
//
// Facebook Page:
//   image → POST /{pageId}/photos      (url, caption)
//   video → POST /{pageId}/videos      (file_url, description)
// Instagram (two-step container publish):
//   image → POST /{igId}/media (image_url, caption) → media_publish
//   video → POST /{igId}/media (media_type=REELS, video_url, caption)
//           → poll container status → media_publish

export interface MetaPublishInput {
  caption: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
}

export interface MetaPublishResult {
  remoteId: string;
  permalink?: string;
}

export interface MetaProvider {
  publishToFacebook(pageId: string, token: string, input: MetaPublishInput): Promise<MetaPublishResult>;
  publishToInstagram(igUserId: string, token: string, input: MetaPublishInput): Promise<MetaPublishResult>;
}

const GRAPH = () => `https://graph.facebook.com/${config.metaGraphVersion}`;

async function graphPost(path: string, params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams(params);
  const resp = await fetch(`${GRAPH()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = json?.error?.message ?? `Graph API ${resp.status}`;
    throw AppError.provider(`Meta: ${msg}`);
  }
  return json;
}

async function graphGet(path: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const resp = await fetch(`${GRAPH()}${path}?${qs}`);
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = json?.error?.message ?? `Graph API ${resp.status}`;
    throw AppError.provider(`Meta: ${msg}`);
  }
  return json;
}

// Wait for an Instagram media container to finish processing (videos/Reels
// take time to transcode). Images are usually FINISHED immediately.
async function waitForContainer(creationId: string, token: string): Promise<void> {
  const maxAttempts = 20;
  const intervalMs = 4000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const json = await graphGet(`/${creationId}`, {
      fields: 'status_code',
      access_token: token,
    });
    const status = json?.status_code;
    if (status === 'FINISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw AppError.provider(`Meta: Instagram container ${status}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw AppError.provider('Meta: Instagram container still processing after timeout');
}

export const graphMetaProvider: MetaProvider = {
  async publishToFacebook(pageId, token, input) {
    if (input.mediaType === 'video') {
      const res = await graphPost(`/${pageId}/videos`, {
        file_url: input.mediaUrl,
        description: input.caption,
        access_token: token,
      });
      const id = res.id ?? res.post_id;
      return { remoteId: String(id), permalink: `https://www.facebook.com/${id}` };
    }
    const res = await graphPost(`/${pageId}/photos`, {
      url: input.mediaUrl,
      caption: input.caption,
      access_token: token,
    });
    const postId = res.post_id ?? res.id;
    return { remoteId: String(res.id ?? postId), permalink: `https://www.facebook.com/${postId}` };
  },

  async publishToInstagram(igUserId, token, input) {
    const containerParams: Record<string, string> =
      input.mediaType === 'video'
        ? { media_type: 'REELS', video_url: input.mediaUrl, caption: input.caption, access_token: token }
        : { image_url: input.mediaUrl, caption: input.caption, access_token: token };

    const container = await graphPost(`/${igUserId}/media`, containerParams);
    const creationId = String(container.id);

    await waitForContainer(creationId, token);

    const published = await graphPost(`/${igUserId}/media_publish`, {
      creation_id: creationId,
      access_token: token,
    });
    const mediaId = String(published.id);

    let permalink: string | undefined;
    try {
      const info = await graphGet(`/${mediaId}`, { fields: 'permalink', access_token: token });
      permalink = info?.permalink;
    } catch {
      // Permalink is best-effort; publish already succeeded.
    }
    return { remoteId: mediaId, permalink };
  },
};

// Fake provider for tests & the dev emulator — returns synthetic ids and
// never touches the network.
export const fakeMetaProvider: MetaProvider = {
  async publishToFacebook() {
    const id = `fb_${Math.random().toString(36).slice(2, 10)}`;
    return { remoteId: id, permalink: `https://www.facebook.com/${id}` };
  },
  async publishToInstagram() {
    const id = `ig_${Math.random().toString(36).slice(2, 10)}`;
    return { remoteId: id, permalink: `https://www.instagram.com/p/${id}` };
  },
};

export function getMetaProvider(): MetaProvider {
  if (config.isEmulator()) return fakeMetaProvider;
  return graphMetaProvider;
}
