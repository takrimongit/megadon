// Wrap a generated video clip with a cinematic intro (headline title card) and
// outro (CTA + logo), stitched with ffmpeg. The card TEXT is drawn with
// @napi-rs/canvas — real text, so the heading is always spelled correctly
// (never an AI-drawn/garbled overlay). Gated by config.videoIntroOutro.

import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { fetchBrandLogo } from './composite.js';
import type { BrandContext, CopyResult } from '../providers/types.js';

const run = promisify(execFile);
const CARD_SECONDS = 2.6;

/** Target frame for the composed video — horizontal for feed/long-form, vertical
 * for short-form — mirroring how the clip itself was generated. */
export function targetVideoDimension(platform: string): { width: number; height: number } {
  if (platform === 'youtube' || platform === 'linkedin' || platform === 'facebook') {
    return { width: 1280, height: 720 };
  }
  return { width: 720, height: 1280 };
}

interface ComposeInput {
  clip: Buffer;
  copy: Pick<CopyResult, 'headline' | 'cta'>;
  brand?: BrandContext | null;
  width: number;
  height: number;
}

/** Compose intro + clip + outro into a single mp4. Returns the final bytes. */
export async function composeVideoWithBookends(input: ComposeInput): Promise<Buffer> {
  if (!ffmpegPath) throw new Error('ffmpeg-static binary not found');
  const { clip, copy, brand, width, height } = input;
  const dir = await mkdtemp(join(tmpdir(), 'adforge-vid-'));
  try {
    const logo = await fetchBrandLogo(brand);
    const intro = await renderTitleCard({ kind: 'intro', heading: copy.headline, brand, logo, width, height });
    const outro = await renderTitleCard({ kind: 'outro', heading: copy.cta, brand, logo, width, height });

    const p = (n: string) => join(dir, n);
    await Promise.all([
      writeFile(p('intro.png'), intro),
      writeFile(p('outro.png'), outro),
      writeFile(p('main.mp4'), clip),
    ]);

    const mainHasAudio = await hasAudioStream(p('main.mp4'));
    // Normalise all three segments to identical streams so concat can copy.
    await run(ffmpegPath, cardSegmentArgs(p('intro.png'), p('intro.mp4'), width, height));
    await run(ffmpegPath, cardSegmentArgs(p('outro.png'), p('outro.mp4'), width, height));
    await run(ffmpegPath, mainSegmentArgs(p('main.mp4'), p('mainN.mp4'), width, height, mainHasAudio));

    await writeFile(p('list.txt'), ['intro.mp4', 'mainN.mp4', 'outro.mp4'].map((f) => `file '${f}'`).join('\n'));
    await run(ffmpegPath, [
      '-y', '-f', 'concat', '-safe', '0', '-i', p('list.txt'),
      '-c', 'copy', '-movflags', '+faststart', p('out.mp4'),
    ]);
    return await readFile(p('out.mp4'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** ffmpeg args: a still card PNG → a CARD_SECONDS clip with Ken-Burns push + fades + silent audio. */
export function cardSegmentArgs(png: string, out: string, w: number, h: number): string[] {
  const frames = Math.round(CARD_SECONDS * 30);
  return [
    '-y',
    '-loop', '1', '-t', String(CARD_SECONDS), '-i', png,
    '-f', 'lavfi', '-t', String(CARD_SECONDS), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-vf', `scale=${w}:${h},zoompan=z='min(zoom+0.0012,1.12)':d=${frames}:s=${w}x${h}:fps=30,` +
      `fade=t=in:st=0:d=0.4,fade=t=out:st=${(CARD_SECONDS - 0.4).toFixed(2)}:d=0.4,format=yuv420p,setsar=1`,
    '-r', '30',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-shortest',
    out,
  ];
}

/** ffmpeg args: normalise the generated clip to the target frame + audio params. */
export function mainSegmentArgs(src: string, out: string, w: number, h: number, hasAudio: boolean): string[] {
  const vf = `scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
    `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,fade=t=in:st=0:d=0.3,format=yuv420p,setsar=1`;
  if (hasAudio) {
    return [
      '-y', '-i', src, '-vf', vf, '-r', '30',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-c:a', 'aac', '-ar', '44100', '-ac', '2', out,
    ];
  }
  // No audio on the source (e.g. silent scenic clip) — synthesise silence so
  // every segment has a matching stream for concat.
  return [
    '-y', '-i', src, '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-vf', vf, '-r', '30', '-map', '0:v:0', '-map', '1:a:0', '-shortest',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-ar', '44100', '-ac', '2', out,
  ];
}

async function hasAudioStream(path: string): Promise<boolean> {
  if (!ffmpegPath) return false;
  try {
    // ffmpeg -i exits non-zero but prints stream info to stderr.
    await run(ffmpegPath, ['-i', path]);
    return false;
  } catch (e) {
    const stderr = String((e as { stderr?: string }).stderr ?? '');
    return /Stream #\d+:\d+.*: Audio:/.test(stderr);
  }
}

// ---------------- card rendering (real text = correct spelling) ----------------

interface CardInput {
  kind: 'intro' | 'outro';
  heading?: string;
  brand?: BrandContext | null;
  logo?: Buffer | null;
  width: number;
  height: number;
}

async function renderTitleCard(input: CardInput): Promise<Buffer> {
  const { kind, heading, brand, logo, width: W, height: H } = input;
  const colors = brand?.analysis?.colors ?? [];
  const primary = colors.find((c) => c.role === 'primary')?.hex ?? colors[0]?.hex ?? '#3525cd';
  const accent = colors.find((c) => c.role === 'accent')?.hex ?? colors[1]?.hex ?? '#831ada';

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as SKRSContext2D;

  // Diagonal brand gradient + vignette.
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, primary);
  grad.addColorStop(1, accent);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Logo, centred above the text.
  if (logo) {
    try {
      const img = await loadImage(logo);
      const targetH = Math.round(H * 0.10);
      const targetW = Math.round(targetH * (img.width / img.height));
      ctx.drawImage(img, (W - targetW) / 2, H * 0.24 - targetH / 2, targetW, targetH);
    } catch { /* skip logo */ }
  }

  // Heading / CTA.
  const text = (heading ?? (kind === 'outro' ? 'Learn more' : '')).trim();
  if (text) {
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    const fontSize = Math.round(W * (kind === 'intro' ? 0.075 : 0.06));
    ctx.font = `700 ${fontSize}px sans-serif`;
    const lines = wrap(ctx, text, Math.round(W * 0.82));
    const lineH = Math.round(fontSize * 1.2);
    const startY = H / 2 - ((lines.length - 1) * lineH) / 2;
    lines.slice(0, 4).forEach((line, i) => ctx.fillText(line, W / 2, startY + i * lineH));
    ctx.shadowColor = 'transparent';

    if (kind === 'outro') {
      // Small "pill" underline accent.
      ctx.fillStyle = '#ffffff';
      const pillW = Math.round(W * 0.18);
      ctx.fillRect((W - pillW) / 2, startY + lines.length * lineH + Math.round(H * 0.02), pillW, Math.round(H * 0.006));
    }
  }

  return canvas.encode('png');
}

function wrap(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else { if (line) lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}
