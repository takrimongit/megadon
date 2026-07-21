// Pure arg-builder checks + a real end-to-end ffmpeg run (the binary ships via
// ffmpeg-static, so we can actually verify the bookend pipeline works).

import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import {
  composeVideoWithBookends,
  cardSegmentArgs,
  mainSegmentArgs,
  targetVideoDimension,
} from '../src/jobs/videoCompose.js';

const run = promisify(execFile);
const ffmpeg = ffmpegPath as string;

describe('bookend arg builders', () => {
  it('card args: loop image, ken-burns, fades, silent aac audio', () => {
    const s = cardSegmentArgs('in.png', 'out.mp4', 720, 1280).join(' ');
    expect(s).toContain('-loop 1');
    expect(s).toContain('zoompan');
    expect(s).toContain('fade=t=in');
    expect(s).toContain('anullsrc');
    expect(s).toContain('libx264');
  });

  it('main args synthesise silence only when the source has no audio', () => {
    expect(mainSegmentArgs('s.mp4', 'o.mp4', 720, 1280, true).join(' ')).not.toContain('anullsrc');
    expect(mainSegmentArgs('s.mp4', 'o.mp4', 720, 1280, false).join(' ')).toContain('anullsrc');
  });

  it('targetVideoDimension: horizontal for feed, vertical otherwise', () => {
    expect(targetVideoDimension('youtube')).toEqual({ width: 1280, height: 720 });
    expect(targetVideoDimension('instagram')).toEqual({ width: 720, height: 1280 });
  });
});

describe('composeVideoWithBookends (real ffmpeg)', () => {
  async function probeDuration(path: string): Promise<number> {
    try {
      await run(ffmpeg, ['-i', path]);
    } catch (e) {
      const m = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(String((e as { stderr?: string }).stderr ?? ''));
      if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3];
    }
    return 0;
  }

  it('wraps a narrated clip with intro + outro', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vct-'));
    try {
      const clipPath = join(dir, 'clip.mp4');
      await run(ffmpeg, [
        '-y', '-f', 'lavfi', '-i', 'testsrc=size=360x640:rate=30:duration=2',
        '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', clipPath,
      ]);
      const clip = await readFile(clipPath);

      const out = await composeVideoWithBookends({
        clip,
        copy: { headline: 'Move faster today', cta: 'Start free' },
        brand: null,
        width: 360,
        height: 640,
      });
      expect(out.length).toBeGreaterThan(1000);

      const outPath = join(dir, 'out.mp4');
      await writeFile(outPath, out);
      // clip is 2s; two ~2.6s cards should push total past ~6s.
      expect(await probeDuration(outPath)).toBeGreaterThan(5);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 90000);

  it('handles a silent clip (no audio stream)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vcs-'));
    try {
      const clipPath = join(dir, 'silent.mp4');
      await run(ffmpeg, [
        '-y', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=30:duration=2',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', clipPath,
      ]);
      const clip = await readFile(clipPath);
      const out = await composeVideoWithBookends({
        clip, copy: { headline: 'Scenic ad', cta: 'Shop now' }, brand: null, width: 640, height: 360,
      });
      expect(out.length).toBeGreaterThan(1000);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 90000);
});
