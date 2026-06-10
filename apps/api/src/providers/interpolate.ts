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

/** Build the flat var map exposed to a template. */
export function buildVars(ctx: InterpolationContext): Record<string, string> {
  const vars: Record<string, string> = {
    platform: ctx.platform,
    revisionInstruction: ctx.revisionInstruction ?? '',
  };
  flatten(ctx.brief, 'brief', vars);
  if (ctx.copy) flatten(ctx.copy, 'copy', vars);
  if (ctx.brand) {
    flatten(ctx.brand.info, 'brand.info', vars);
    flatten(ctx.brand.analysis, 'brand.analysis', vars);
    // Convenience aliases for the most common cases.
    vars['brand.companyName'] = ctx.brand.info?.companyName ?? '';
    vars['brand.industry'] = ctx.brand.info?.industry ?? '';
    vars['brand.colorHexes'] = (ctx.brand.analysis?.colors ?? [])
      .map((c) => c.hex)
      .join(', ');
    vars['brand.colorNames'] = (ctx.brand.analysis?.colors ?? [])
      .map((c) => `${c.hex} (${c.name}${c.role ? ' — ' + c.role : ''})`)
      .join(', ');
    vars['brand.personality'] = (ctx.brand.analysis?.personality ?? []).join(', ');
    vars['brand.brandRules'] = (ctx.brand.analysis?.brandRules ?? [])
      .map((r) => '- ' + r)
      .join('\n');
    vars['brand.creativeStyles'] = (ctx.brand.analysis?.creativeStyles ?? []).join(', ');
    vars['brand.toneOfVoice'] = ctx.brand.analysis?.toneOfVoice ?? '';
    vars['brand.visualStyle'] = ctx.brand.analysis?.visualStyle ?? '';
    vars['brand.targetAudience'] = ctx.brand.analysis?.targetAudience ?? '';
  }
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
