# Adding a new bitmap font

The ANSI pixel renderer is **font-agnostic**: cell dimensions come from the active font's atlas, not module-level constants. Adding a new font is a registry entry plus two asset drops — no renderer or panel code changes if the font meets the requirements.

See [`renderer-implementation-plan.md`](renderer-implementation-plan.md) §3.7 for the registry's design and the scope of the initial font set. This guide is a practical checklist.

---

## 1. Font requirements

- **Must be a true bitmap font.** The TTF must contain an `EBDT` / `EBLC` table pair with at least one strike at the cell height you want to use. Outline-only "pixel-styled" fonts do not work and are rejected at build time by the atlas generator.
- **Strike format:** the parser currently supports `indexFormat=2` + `imageFormat=5` (fixed-size, **bit-aligned** 1-bit bitmaps). Other EBDT combos (`imageFormat=1`, `2`, `6`, `7`) require extending `parseBitmapStrike()` / `extractGlyphBytes()` in `packages/lua-runtime/scripts/generate-glyph-atlas.js`.
- **Cell width:** 8 and 9 are exercised. Other widths should work but may reveal bit-packing assumptions — the glyph bytes are packed across the entire `cellW × cellH` bitmap with no row padding, so a `11 × 16` glyph is 176 bits = 22 bytes. Verify by rendering in `/glyph-debug` after adding.
- **`nativePpem` matches a real strike:** the Int10h MxPlus `*_8x14` and `*_9x14` variants package 14-row bitmaps inside a **16ppem** metric box, not a true 14ppem strike — that's why those fonts are deferred in the initial ship set. The atlas generator fails loud with "no strike at Nppem (available: …)" when there's a mismatch.
- **License compatibility:** SIL OFL / public domain / similar permissive. Include the license text in `packages/lua-runtime/scripts/fonts/LICENSE.txt`; it is bundled into exports.

---

## 2. Steps

### 2.1 Obtain and verify the TTF

Download the TTF and verify its EBDT strike at the target ppem:

```bash
# Needs fontTools: pip install fonttools
python3 -c "from fontTools.ttLib import TTFont; f = TTFont('the-font.ttf'); print('EBDT' in f, [s.ppemY for s in f['EBLC'].strikes])"
```

Must print `True` and a list containing your target ppem. If it prints `False` or the list is empty, the font is outline-only and can't be used.

### 2.2 Drop assets

- **Build-time TTF** (not shipped to runtime):
  ```
  packages/lua-runtime/scripts/fonts/NewFont.ttf
  ```
- **Runtime WOFF** (for the xterm-path fallback and fillText rasterization of codepoints missing from the atlas):
  ```
  lua-learning-website/public/fonts/NewFont.woff
  ```
  If you only have a TTF, convert with `fonttools`:
  ```bash
  python3 -c "from fontTools.ttLib import TTFont; f = TTFont('in.ttf'); f.flavor='woff'; f.save('out.woff')"
  ```

### 2.3 Register the font

Add an entry to `packages/lua-runtime/src/fontRegistry.ts`:

```ts
{
  id: 'NEW_FONT',
  label: 'New Font 8×16',
  ttfPath: 'scripts/fonts/NewFont.ttf',
  woffPath: '/fonts/NewFont.woff',
  fontFamily: 'Web New Font',
  cellW: 8,
  cellH: 16,
  nativePpem: 16,
}
```

**Also add parallel entries** to these scripts — they read registry-like lists directly because they're plain Node scripts and can't import the TS registry:

- `packages/lua-runtime/scripts/generate-glyph-atlas.js` — `FONTS` array.
- `packages/lua-runtime/scripts/bundle-ansi-fonts.js` — `FONTS` array.

The `fontRegistry.test.ts` unit test catches TTF asset mismatches; the two bundler scripts fail loud on their own file-missing paths.

### 2.4 Add the `@font-face` rule

In `lua-learning-website/src/components/AnsiTerminalPanel/AnsiTerminalPanel.module.css`:

```css
@font-face {
  font-family: 'Web New Font';
  src: url('/fonts/NewFont.woff') format('woff');
}
```

No change needed in the standalone HTML export — `AnsiHtmlGenerator` iterates `ANSI_FONT_DATA` (from `bundle-ansi-fonts.js`) and emits one `@font-face` rule per entry automatically.

### 2.5 Regenerate

```bash
npm run build -w @lua-learning/lua-runtime
```

This runs `prebuild`, which regenerates both `glyphAtlas.generated.ts` and `ansi-fonts-inline.generated.ts`. Watch the output:

- `[NEW_FONT] N glyphs, M missing` — healthy.
- `[NEW_FONT] no strike at Nppem (available: …)` — wrong `nativePpem`; pick one the font actually provides.
- `[NEW_FONT] extracted zero glyphs — is this really a bitmap font at Nppem?` — font is outline-only or uses an unsupported `indexFormat` / `imageFormat`.
- `[NEW_FONT] WOFF not found at …` — asset is missing from `public/fonts/`.

### 2.6 Verify visually

Run the dev server and open `/glyph-debug`:

```bash
npm --prefix lua-learning-website run dev
# → http://localhost:5173/glyph-debug
```

Select the new font from the dropdown. For `A` (U+0041) and `▒` (U+2592):

- **Native DOM** and **Atlas** columns should render the same shape.
- **Raw fillText α** should show visible AA artifacts on shades — that's the reason the atlas path exists.
- The atlas column reports "on pixels N / W×H" — non-zero unless the font doesn't ship the codepoint, in which case the column shows "not in {font} atlas — renderer falls back to fillText".

### 2.7 Add a file-coverage note (if you maintain one)

Consumers need to know which Unicode ranges each font actually covers. IBM CGA 8×8 ships U+2591/2592/2593 but not the full box-drawing range; IBM MDA doesn't ship block elements at all. Document gaps so users don't author against ranges the font doesn't support.

---

## 3. If the atlas generator rejects the font

Common causes and fixes:

| Symptom | Cause | Fix |
|---|---|---|
| `no EBLC/EBDT tables` | Font is outline-only. | Find a true bitmap variant, or commission one. |
| `no strike at Nppem (available: 12,24)` | `nativePpem` doesn't match the font's strikes. | Pick a `nativePpem` the font provides, or find a font with the size you want. |
| `extracted zero glyphs` | Unsupported `indexFormat` / `imageFormat`. | Extend `extractGlyphBytes()` in the atlas generator. Microsoft's [OpenType EBDT spec](https://learn.microsoft.com/en-us/typography/opentype/spec/ebdt) documents all formats. `imageFormat=2` (small metrics, bit-aligned) is the most common one you might hit. |
| `WOFF not found` | WOFF wasn't dropped under `lua-learning-website/public/fonts/`. | Copy or convert the WOFF. |

---

## 4. Bit-packing note for future maintainers

`imageFormat=5` packs bits **across the entire `cellW × cellH` glyph**, MSB-first, with no row-padding bits. So:

- `cellW=8`: each row fits in exactly 1 byte; the format coincidentally looks row-packed.
- `cellW=9`: a 9×16 glyph is `9 × 16 = 144` bits = **18 bytes**. Rows span byte boundaries.
- `cellW=16`: a 16×16 glyph is 32 bytes.

The build-time parser reads `Math.ceil((cellW × cellH) / 8)` bytes per glyph and decodes per-pixel. The runtime mask is 1-byte-per-pixel `Uint8Array` of length `cellW × cellH`. Verify this logic holds if adding a font wider than 9 pixels.

## 5. 9-wide col-8 replication (IBM VGA hardware accuracy vs modern tile-continuity)

For 9-wide fonts, the generator applies a post-processing step: **col (cellW-2) is copied into col (cellW-1) for codepoints in U+2500..U+259F** (box drawing + block elements). Other codepoints are left as the font authored them.

**Why:** Int10h's MxPlus 9x16 encodes the CP437 pattern in cols 0..7 and leaves col 8 blank — faithful to IBM VGA 9-dot hardware, where the "line graphics enable" bit only triggered col-8 replication for CP437 0xC0..0xDF. Shades (0xB0..0xB2) and other block chars were blank in col 8, producing visible gaps when rendering adjacent ░/▒/▓ cells. We match modern terminal-emulator convention (xterm, iTerm) and replicate col 8 across the full box/block range instead.

**Caveat:** a fundamental limitation — a two-pixel checkerboard CANNOT tile continuously across odd-width cells. Replication eliminates the "blank strip" artifact but introduces "double-pixel bands" every 9 cols on alternate rows. For perfectly uniform dither, users should pick an 8-wide font (IBM_VGA_8x16 is the default).

If you're adding a font with `cellW=9` or odd-width ≥9, the same replication will apply — update `replicateLastColumnIfNeeded()` in `generate-glyph-atlas.js` if the rule should differ for your font.

---

## 5. Checklist

- [ ] TTF has an EBDT strike at `nativePpem`
- [ ] TTF copied to `packages/lua-runtime/scripts/fonts/`
- [ ] WOFF copied to `lua-learning-website/public/fonts/`
- [ ] Entry added to `fontRegistry.ts`
- [ ] Entry added to `generate-glyph-atlas.js` `FONTS` array
- [ ] Entry added to `bundle-ansi-fonts.js` `FONTS` array
- [ ] `@font-face` rule added to `AnsiTerminalPanel.module.css`
- [ ] `npm run build -w @lua-learning/lua-runtime` succeeds
- [ ] `/glyph-debug` renders the font at the expected cell size
- [ ] License text in `packages/lua-runtime/scripts/fonts/LICENSE.txt`
