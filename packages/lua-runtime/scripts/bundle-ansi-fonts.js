#!/usr/bin/env node
/**
 * Bundle the WOFFs for every registered bitmap font as base64 data URLs.
 *
 * Keeps the fonts list in sync with src/fontRegistry.ts (same approach
 * as generate-glyph-atlas.js — the registry isn't machine-readable from
 * a pure Node script). When adding a font, update BOTH this list and the
 * fontRegistry.ts entries. The fontRegistry test in packages/lua-runtime
 * catches TTF mismatches; a build-time failure here catches WOFF gaps.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WEBSITE_FONTS = join(__dirname, '..', '..', '..', 'lua-learning-website', 'public', 'fonts');
const OUTPUT_DIR = join(__dirname, '..', 'src');
const OUTPUT_TS = join(OUTPUT_DIR, 'ansi-fonts-inline.generated.ts');

// Keep in sync with src/fontRegistry.ts.
const FONTS = [
  { id: 'IBM_CGA_8x8',   woff: 'WebPlus_IBM_CGA.woff',      fontFamily: 'Web IBM CGA' },
  { id: 'IBM_VGA_8x16',  woff: 'WebPlus_IBM_VGA_8x16.woff', fontFamily: 'Web IBM VGA 8x16' },
  { id: 'IBM_VGA_9x16',  woff: 'WebPlus_IBM_VGA_9x16.woff', fontFamily: 'Web IBM VGA 9x16' },
];

function bundleFonts() {
  console.log(`Bundling ${FONTS.length} ANSI font WOFFs for inline export...`);

  const entries = [];
  let total = 0;
  for (const { id, woff, fontFamily } of FONTS) {
    const abs = join(WEBSITE_FONTS, woff);
    if (!existsSync(abs)) {
      throw new Error(`[${id}] WOFF not found at ${abs}`);
    }
    const data = readFileSync(abs);
    total += data.length;
    const dataUrl = `data:font/woff;base64,${data.toString('base64')}`;
    entries.push({ id, woff, fontFamily, dataUrl, bytes: data.length });
    console.log(`  [${id}] ${woff} — ${data.length} bytes`);
  }

  const lines = [];
  lines.push('/* eslint-disable max-lines */');
  lines.push('/**');
  lines.push(' * Auto-generated. Base64 data URLs for the registered bitmap fonts so the');
  lines.push(' * standalone HTML export can inline @font-face rules without external WOFF fetches.');
  lines.push(' * Regenerate: npm run build:ansi-fonts -w @lua-learning/lua-runtime');
  lines.push(' */');
  lines.push('');
  lines.push('export interface AnsiFontDataEntry {');
  lines.push('  readonly id: string');
  lines.push('  readonly fontFamily: string');
  lines.push('  readonly dataUrl: string');
  lines.push('}');
  lines.push('');
  lines.push('export const ANSI_FONT_DATA: readonly AnsiFontDataEntry[] = [');
  for (const e of entries) {
    lines.push('  {');
    lines.push(`    id: ${JSON.stringify(e.id)},`);
    lines.push(`    fontFamily: ${JSON.stringify(e.fontFamily)},`);
    lines.push(`    dataUrl: ${JSON.stringify(e.dataUrl)},`);
    lines.push('  },');
  }
  lines.push(']');
  lines.push('');

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  writeFileSync(OUTPUT_TS, lines.join('\n'));
  console.log(`Generated: ansi-fonts-inline.generated.ts (${(total / 1024).toFixed(1)} KB fonts, ${FONTS.length} entries)`);
}

bundleFonts();
