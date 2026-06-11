// Mustache-lite template interpolation for Geek Mode prompt overrides.
// Supports {{path.to.var}} syntax. Unknown placeholders are left intact
// so the user can spot typos in the rendered prompt.

import type { Brief, Platform } from '@megadon/types';
import type { BrandContext, CopyResult } from './types.js';

export interface InterpolationContext {
  brief: Brief;
  platform: Platform;
  copy?: CopyResult;
  brand?: BrandContext | null;
  revisionInstruction?: string;
}

function flatten(obj: any, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  if (obj == null) return out;
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      out[key] = v
        .map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x)))
        .join(', ');
    } else if (typeof v === 'object') {
      flatten(v, key, out);
    } else {
      out[key] = String(v);
    }
  }
  return out;
}

function brandVars(brand: BrandContext, out: Record<string, string>) {
  flatten(brand.info, 'brand.info', out);
  flatten(brand.analysis, 'brand.analysis', out);
  // Convenience aliases for the most common cases.
  out['brand.companyName'] = brand.info?.companyName ?? '';
  out['brand.industry'] = brand.info?.industry ?? '';
  out['brand.colorHexes'] = (brand.analysis?.colors ?? [])
    .map((c) => c.hex)
    .join(', ');
  out['brand.colorNames'] = (brand.analysis?.colors ?? [])
    .map((c) => `${c.hex} (${c.name}${c.role ? ' — ' + c.role : ''})`)
    .join(', ');
  out['brand.personality'] = (brand.analysis?.personality ?? []).join(', ');
  out['brand.brandRules'] = (brand.analysis?.brandRules ?? [])
    .map((r) => '- ' + r)
    .join('\n');
  out['brand.creativeStyles'] = (brand.analysis?.creativeStyles ?? []).join(', ');
  out['brand.toneOfVoice'] = brand.analysis?.toneOfVoice ?? '';
  out['brand.visualStyle'] = brand.analysis?.visualStyle ?? '';
  out['brand.targetAudience'] = brand.analysis?.targetAudience ?? '';
}

/** Build the flat var map exposed to a template. */
export function buildVars(ctx: InterpolationContext): Record<string, string> {
  const vars: Record<string, string> = {
    platform: ctx.platform,
    revisionInstruction: ctx.revisionInstruction ?? '',
  };
  flatten(ctx.brief, 'brief', vars);
  if (ctx.copy) flatten(ctx.copy, 'copy', vars);
  if (ctx.brand) brandVars(ctx.brand, vars);
  return vars;
}

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v !== undefined ? v : `{{${key}}}`;
  });
}

/** Convenience: interpolate from a structured context. */
export function interpolateWithContext(template: string, ctx: InterpolationContext): string {
  return interpolate(template, buildVars(ctx));
}

/**
 * Interpolation for chat-surface system prompt overrides, where parts of
 * the context may be unavailable (e.g. personas has no brief/platform).
 * Unknown placeholders stay intact, same as the media path.
 */
export function interpolateSystemPrompt(
  template: string,
  ctx: Partial<InterpolationContext>,
): string {
  const vars: Record<string, string> = {};
  if (ctx.platform) vars.platform = ctx.platform;
  if (ctx.revisionInstruction !== undefined) vars.revisionInstruction = ctx.revisionInstruction;
  if (ctx.brief) flatten(ctx.brief, 'brief', vars);
  if (ctx.copy) flatten(ctx.copy, 'copy', vars);
  if (ctx.brand) brandVars(ctx.brand, vars);
  return interpolate(template, vars);
}
