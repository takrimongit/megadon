// The display aspect ratio (width / height) of an ad's creative, mirroring the
// backend's per-platform choices: designed image ads are 4:5 (feed) or 9:16
// (short-form), avatar/scenic video is 16:9 (feed) or 9:16 (short-form). Used
// to size review frames so the full ad shows with no crop or letterbox bars.

export function adFrameAspect(ad: { mediaType?: 'image' | 'video'; platform?: string }): number {
  const p = ad.platform;
  if (ad.mediaType === 'video') {
    return p === 'youtube' || p === 'linkedin' || p === 'facebook' ? 16 / 9 : 9 / 16;
  }
  if (p === 'tiktok' || p === 'youtube') return 9 / 16;
  if (p === 'instagram' || p === 'facebook') return 4 / 5;
  return 1; // linkedin / unknown
}
