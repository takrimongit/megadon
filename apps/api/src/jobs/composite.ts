// Composites the brand logo + headline + CTA onto a FLUX-generated
// background. Uses @napi-rs/canvas which bundles its own native binary
// and fonts (no system deps), so it works on distroless Cloud Run.

import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { bucket } from '../lib/firebase.js';
import type { BrandContext } from '../providers/types.js';

interface CompositeInput {
  /** The raw bytes downloaded from the AI provider (PNG or JPEG). */
  background: Buffer;
  /** Optional brand context — if absent or has no approved logo, no overlay. */
  brand?: BrandContext | null;
  /** Logo bytes (already downloaded by caller from GCS). */
  logo?: Buffer | null;
  copy: { headline?: string; cta?: string };
}

interface CompositeOutput {
  buffer: Buffer;
  contentType: 'image/jpeg';
  ext: 'jpg';
}

const ENABLED_COMPOSITES = (process.env.COMPOSITE_ENABLED ?? 'true') !== 'false';

/**
 * Returns the composited image (always JPEG). If no brand context or
 * compositing is disabled, returns the raw background unchanged.
 */
export async function compositeBrandOverlay(input: CompositeInput): Promise<CompositeOutput> {
  if (!ENABLED_COMPOSITES) {
    return { buffer: input.background, contentType: 'image/jpeg', ext: 'jpg' };
  }
  const { background, brand, logo, copy } = input;

  // Decide accent colour from the playbook palette.
  const palette = brand?.analysis?.colors ?? [];
  const accent =
    palette.find((c) => c.role === 'accent')?.hex ??
    palette.find((c) => c.role === 'primary')?.hex ??
    palette[0]?.hex ??
    '#3525cd';
  const accentContrast = pickContrast(accent);

  let bgImg;
  try {
    bgImg = await loadImage(background);
  } catch {
    // If we can't decode the background, just hand it back untouched.
    return { buffer: background, contentType: 'image/jpeg', ext: 'jpg' };
  }

  const W = bgImg.width;
  const H = bgImg.height;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as SKRSContext2D;

  // 1. The background fills the canvas.
  ctx.drawImage(bgImg, 0, 0, W, H);

  const pad = Math.round(W * 0.035);

  // 2. Bottom gradient scrim to ensure overlays are legible against any bg.
  const scrimHeight = Math.round(H * 0.28);
  const gradient = ctx.createLinearGradient(0, H - scrimHeight, 0, H);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, H - scrimHeight, W, scrimHeight);

  // 3. Logo bottom-left.
  if (logo) {
    try {
      const logoImg = await loadImage(logo);
      const targetH = Math.round(W * 0.10);
      const aspect = logoImg.width / logoImg.height;
      const targetW = Math.round(targetH * aspect);
      ctx.drawImage(logoImg, pad, H - targetH - pad, targetW, targetH);
    } catch {
      // Logo couldn't decode — skip silently.
    }
  }

  // 4. Headline above the logo line.
  if (copy.headline) {
    drawHeadline(ctx, copy.headline.trim(), W, H, pad);
  }

  // 5. CTA pill bottom-right.
  if (copy.cta) {
    drawCta(ctx, copy.cta.trim(), W, H, pad, accent, accentContrast);
  }

  const buffer = await canvas.encode('jpeg', 92);
  return { buffer, contentType: 'image/jpeg', ext: 'jpg' };
}

/**
 * Reads the approved brand logo bytes from GCS, if available.
 * Returns null on any failure (missing, deleted, no logo asset).
 */
export async function fetchBrandLogo(brand?: BrandContext | null): Promise<Buffer | null> {
  if (!brand?.assets) return null;
  const logoAsset = brand.assets.find((a) => a.type === 'logo');
  if (!logoAsset) return null;
  try {
    const [buf] = await bucket().file(logoAsset.path).download();
    return buf;
  } catch {
    return null;
  }
}

// ============ helpers ============

function pickContrast(hex: string): string {
  // Luminance check — returns white for dark colours, dark slate for light.
  const m = /^#?([a-f\d]{6})$/i.exec(hex);
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#0B1C30' : '#ffffff';
}

function drawHeadline(
  ctx: SKRSContext2D,
  text: string,
  W: number,
  H: number,
  pad: number,
) {
  const truncated = text.length > 70 ? text.slice(0, 67) + '…' : text;
  const fontSize = Math.round(W * 0.048);
  ctx.font = `700 ${fontSize}px sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  const maxWidth = Math.round(W * 0.62);
  const lines = wrapText(ctx, truncated, maxWidth);
  const lineHeight = Math.round(fontSize * 1.15);
  const x = pad;
  // Anchor headline above the logo row.
  const baseY = H - Math.round(W * 0.10) - pad - Math.round(fontSize * 0.4);

  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#ffffff';
  lines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, x, baseY - (lines.length - 1 - i) * lineHeight);
  });
  ctx.shadowColor = 'transparent';
}

function drawCta(
  ctx: SKRSContext2D,
  text: string,
  W: number,
  H: number,
  pad: number,
  fillHex: string,
  textColor: string,
) {
  const truncated = text.length > 26 ? text.slice(0, 23) + '…' : text;
  const fontSize = Math.round(W * 0.032);
  ctx.font = `700 ${fontSize}px sans-serif`;

  const measure = ctx.measureText(truncated);
  const textW = measure.width;
  const padX = Math.round(W * 0.035);
  const padY = Math.round(W * 0.022);
  const btnH = fontSize + padY * 2;
  const btnW = Math.min(Math.round(textW + padX * 2), Math.round(W * 0.42));
  const btnX = W - btnW - pad;
  const btnY = H - btnH - pad;
  const r = Math.round(btnH / 2);

  // Pill background.
  ctx.fillStyle = fillHex;
  ctx.beginPath();
  ctx.moveTo(btnX + r, btnY);
  ctx.lineTo(btnX + btnW - r, btnY);
  ctx.arc(btnX + btnW - r, btnY + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(btnX + r, btnY + btnH);
  ctx.arc(btnX + r, btnY + r, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
  ctx.fill();

  // Label.
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(truncated, btnX + btnW / 2, btnY + btnH / 2 + 1);
}

function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}
