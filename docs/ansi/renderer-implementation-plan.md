# Implementation Plan — ANSI Pixel-Perfect Renderer with Legacy Fallback

> **Audience:** the next developer (human + LLM pair) picking this up after PR #763 lands as a prototype. You should **not reuse the prototype code directly.** Read this spec, read the diagnostic tools section, then build it clean on `main`.
>
> **Prototype reference:** https://github.com/jcollard/LuaInTheWeb/pull/763 (branch `worktree-ansi-font-blocks`). Leave it pushed. Link to it from the new PR's description.

---

## 1. Context

The ANSI editor and ANSI runtime use xterm.js with the Canvas addon to render cells. At fractional browser zoom and common DPRs (1.25 / 1.5 / 1.75) the block-drawing characters (U+2580–U+259F) show sub-pixel anti-aliasing seams between adjacent cells — most visibly as horizontal hairlines between stacked `▀` UPPER HALF BLOCKs. ANSI art relies on those blocks tiling seamlessly, so this is a correctness issue for the editor, not a cosmetic one.

PR #763 prototyped a fix: bypass xterm.js rendering entirely, use the font's embedded bitmap strike, paint cells with `putImageData` from pre-built binary glyph masks. The prototype works but arrived at its final architecture through many iterations. The goal of this plan is to let a clean reimplementation skip the dead ends.

**The outcome of the prototype that this plan commits to:**

- A pixel-perfect bitmap renderer (`PixelAnsiRenderer`) that uses xterm.js as an escape-sequence parser only, paints its own canvas from a build-time atlas extracted from a bitmap TTF.
- **Multi-bitmap-font support.** The renderer is not hardcoded to one cell size. An initial set of five IBM ROM bitmap fonts ships in this feature, covering 8×8 / 8×14 / 8×16 / 9×14 / 9×16 cell sizes. Adding a further bitmap font becomes a registry entry + asset drop — no architectural changes required. See §3.7 and Appendix A.
- The legacy xterm.js + CanvasAddon renderer is kept as the fallback.
- A `useFontBlocks` toggle (file-format field) picks which renderer the panel mounts — `true` = pixel renderer (default), `false` = xterm + CanvasAddon.
- No devicePixelRatio handling anywhere — the canvas is sized in source-pixel units and the browser scales it for display. Trade-off accepted: fractional-DPR displays show uneven pixels at Integer 1× scale.
- `integer-auto` is the default scale mode (replaces `fit` default). `IBM_VGA_8x16` remains the default font.

---

## 2. Goals & Non-Goals

### Goals
- Block-drawing chars (U+2580–U+259F) render seamlessly on integer DPR displays and at Integer 2×/3× scale at any DPR.
- **Multiple bitmap fonts supported** via a font registry. Ship with 5 IBM ROM fonts at 3 distinct cell sizes (see §3.7). Architecture is font-agnostic: any TTF with an EBDT bitmap strike we can parse works.
- User can opt out of the new renderer (back to classic xterm.js + CanvasAddon) via the existing `useFontBlocks` file-format field. No UX regression for files authored to expect the old look.
- Runtime mode (a user program opening an ANSI terminal via `AnsiTabContent`) gets the same rendering pipeline automatically — the panel component is shared.
- The standalone HTML export honors `useFontBlocks` per screen **and** bundles the active font's assets.

### Non-Goals
- **Do not try to "fix" fractional DPR inside the renderer.** The prototype spent significant effort on DPR compensation (exact-device-pixel backing, CSS-size compensation, destination-space nearest-neighbor resampling, transform-scale arithmetic). Each approach traded one problem for another. The final decision: accept browser-level scaling, note that fractional DPRs look less crisp at Integer 1×, tell the user to use Integer 2× or switch to an integer-DPR monitor if they care. See §4 for why each DPR strategy failed.
- No reactive monitor-switch handling. The renderer does not read `window.devicePixelRatio`.
- No attempt to rebuild the WOFF runtime fonts to carry the bitmap strike. Use the TTF at build time only.
- **No outline/vector fonts.** The renderer operates on binary glyph masks only. Any font without a parseable EBDT strike must be rejected at build time (the atlas generator fails loud). This is not a limitation to apologize for — ANSI art is a bitmap aesthetic and this is a deliberate scope.
- **No support for non-IBM-PC bitmap fonts in this feature** (Amiga Topaz, C64 PETSCII, Japanese DOS/V, etc.). The architecture will permit them as future additions via the registry, but the initial font set is IBM-PC only.
- No WebGL or DOM renderer variants.

---

## 3. Final Architecture (The Concept)

### 3.1 Two renderers, chosen at the React level

```
AnsiTerminalPanel (props: { useFontBlocks, ... })
├── if useFontBlocks → AnsiTerminalPanelPixel   (PixelAnsiRenderer)
└── else            → AnsiTerminalPanelXterm   (xterm.js + CanvasAddon)
```

The top-level panel is a thin component that picks one implementation and gives it a React `key` (`"pixel"` or `"xterm"`). Flipping `useFontBlocks` remounts the inner component, which cleanly tears down the previous renderer (dispose + `onTerminalReady(null)`) before the new one starts. Consumers observe a new handle via `onTerminalReady(newHandle)` after the swap.

Both variants present the same `AnsiTerminalHandle` surface (`write`, `resize`, `setCrt`, `setFontFamily`, `setUseFontBlocks`, `dispose`, `container`). `setUseFontBlocks` on the handle is a hint only — the primary toggle path is the prop; the method exists so the `AnsiController` in the runtime can forward the per-screen field without needing to know about React.

### 3.2 PixelAnsiRenderer (the "on" variant)

- `new Terminal(...)` from xterm.js, **never `.open()`-ed.** Used purely to parse ANSI escape sequences into a cell buffer.
- **Cell dimensions are per-font**, taken from the atlas entry for the active font ID — NOT module-level constants. Consumers read `renderer.cellW` / `renderer.cellH` off the instance (or receive them on a display-info object). `CELL_W` / `CELL_H` exports from the prototype are removed.
- Renderer owns its own `<canvas>`. Backing dimensions = CSS dimensions = `cols × cellW × rows × cellH`.
- On each `onWriteParsed` event, schedule a RAF. In the RAF:
  - Walk the terminal buffer, for each cell read `{code, fg, bg}`.
  - Hash `(code, fg, bg)` and compare to a per-cell `shadow: Uint32Array`. Skip cells whose signature is unchanged unless the whole canvas is dirty.
  - For changed cells: look up the code's `cellW × cellH` binary mask, build an `ImageData` with fg color where mask=1 and bg color where mask=0, `putImageData` to `(x * cellW, y * cellH)`.
- Style the canvas with `image-rendering: pixelated` so the browser uses nearest-neighbor for any CSS scaling.
- No `fillText` on the hot path. ASCII and any code outside the atlas falls back to a single fillText+alpha-threshold rasterization at init time, cached in the mask map. Fallback rasterization uses the active font's `cellW × cellH` — so it adapts when the font changes.
- `setFontFamily(fontId)` **fully reinitializes**: reads new cell dimensions from the atlas, reallocates the canvas backing (canvas size can change — e.g. 9×16 vs 8×16), reallocates `shadow` and `reusableImageData`, clears and rebuilds the mask map. The handle's `cellW` / `cellH` reflect the new font after this resolves.
- `setUseFontBlocks(false)` replaces U+2580–U+259F entries with the `BLOCK_GLYPH_REFERENCE` hand-coded canonical patterns instead of atlas entries. Reference patterns must be available at the active font's cell size — either pre-computed per size, or parametrically generated. This is an optional feature — can be dropped if the chooser is enough.

### 3.3 Atlas (build-time)

A Node script iterates the font registry (see §3.7), extracts the native-ppem EBDT bitmap strike from each font's TTF, and emits a single generated `glyphAtlas.generated.ts` file containing **a per-font atlas map**:

```ts
// Conceptual shape — implementation detail can vary.
export interface FontAtlas {
  id: string;           // e.g. "IBM_VGA_8x16"
  fontFamily: string;   // the CSS family name loaded at runtime
  cellW: number;        // e.g. 8, 9
  cellH: number;        // e.g. 8, 14, 16
  glyphs: Map<number, Uint8Array>;  // codepoint → 1-byte-per-pixel mask of length cellW*cellH
}
export const FONT_ATLASES: Map<string, FontAtlas>;
export const DEFAULT_FONT_ID = 'IBM_VGA_8x16';
```

The `.generated.ts` file is git-ignored and regenerated on every build via a prebuild hook. If any registered font's TTF lacks a parseable EBDT strike, the generator **fails loud** — no silent fallback to outline rasterization at build time.

Covered codepoints per font: ASCII printable, Latin-1 supplement, Box Drawing (U+2500–U+257F), Block Elements (U+2580–U+259F), Geometric Shapes (U+25A0–U+25FF), Arrows (U+2190–U+21FF), card suits & misc (U+2660–U+266F) — whichever of those the font actually defines. Any codepoint in the terminal buffer not present in the active font's atlas falls back to runtime `fillText+alpha-threshold` at the font's cell size (accepted quality loss).

**Glyph mask storage:** store masks as 1-byte-per-pixel (value 0 or 1), length = `cellW * cellH`. Do NOT bit-pack into a `Uint8Array` of `ceil(cellW/8)` bytes per row — 9-wide fonts and future non-power-of-2 widths make packed bytes awkward, and the renderer reads these masks per-pixel anyway so the unpack step would just add cost.

**The atlas must be extracted with a hand-rolled EBLC/EBDT parser**, not via fontkit 2.x's built-in EBLC parser — see §4. The parser walks each font's strikes, picks the native-ppem strike (cellH ppem for the font), and iterates all index subtables.

### 3.4 AnsiTerminalPanelXterm (the "off" variant)

Restore the pre-prototype behavior, parameterized by active font:
- `new Terminal(...)` with `fontSize: cellH`, `fontFamily` (from the registry entry), etc. `cellH` is the active font's native cell height (e.g. 16 for IBM_VGA_8x16, 14 for IBM_EGA_8x14, 8 for IBM_CGA_8x8).
- `terminal.open(wrapper)` + `terminal.loadAddon(new CanvasAddon())`.
- Apply a `fillRect` integer-snap patch to every canvas xterm creates (MutationObserver re-patches when xterm rebuilds canvases on font size change).
- `attachCustomKeyEventHandler(() => false)` so xterm doesn't swallow keyboard input (the panel is display-only).
- Scale mode changes font size (`terminal.options.fontSize = cellH * N`) instead of a CSS transform, so the canvas stays at native resolution at 2×/3×.
- On `setFontFamily(fontId)`: update `terminal.options.fontFamily` and `fontSize` from the registry. xterm rebuilds its canvases; the MutationObserver reapplies the integer-snap patch.

Caveats for 9-wide fonts (`IBM_MDA_9x14`, `IBM_VGA_9x16`) in the xterm path: xterm measures cell width from the font's advance width. For 9-wide ROM fonts derived from 8-wide outlines with extended advance, the result may be off by a pixel. If this shows seams, treat it as an accepted xterm-path limitation (the pixel renderer handles 9-wide correctly via its own `cellW`).

The sub-pixel AA seams on block-drawing chars are inherent to this path; that's what the pixel renderer exists to solve.

### 3.5 No DPR handling

- Both renderers size their canvas in source-pixel units (`cols × cellW` × `rows × cellH`), both in `canvas.width` and `canvas.style.width`.
- The browser does whatever it does when mapping CSS → device pixels. On integer-DPR displays (1, 2, 3) that mapping is uniform. On fractional DPRs it's nearest-neighbor from the browser's side, with the 1-2-1-2 distribution pattern that comes from e.g. 12 device pixels ÷ 8 source pixels = 1.5 per source pixel.
- **Default scale mode is `integer-auto`.** On fractional DPR displays, users who dislike the uneven look can select Integer 2× or 3× manually.

### 3.6 Export parity

The standalone HTML export (`AnsiHtmlGenerator`) uses an inline-bundled copy of `PixelAnsiRenderer`. The inline handle forwards `setUseFontBlocks` and `setFontFamily` to the renderer so `AnsiController.applyFontSettings` (which already reads each screen's `useFontBlocks` and `fontFamily` fields) actually takes effect in the exported HTML.

**Font bundling:**
- The inline bundle includes **all registered font atlases** (the full `FONT_ATLASES` map from `glyphAtlas.generated.ts`) plus the matching runtime WOFFs (for the fillText fallback on missing codepoints).
- Export size impact: the atlas data is small (binary masks × a few hundred codepoints × 5 fonts ≈ tens of KB). The WOFFs are the bulk. Acceptable — ANSI exports are expected to be tens of KB and a few WOFFs don't change that meaningfully.
- If bundle size becomes a problem later, an optimization is to bundle only the fonts actually referenced by the exported project. Out of scope for this feature.

Optional follow-up (can ship without): bundle xterm + CanvasAddon into the export too, so exported files with `useFontBlocks: false` can render via that path. The prototype did not do this; the export always uses the pixel renderer. Acceptable because exported files are read-only — users can author with `useFontBlocks: true` and the export faithfully renders it.

### 3.7 Font registry

A single source of truth for all supported bitmap fonts. Define as `packages/lua-runtime/src/fontRegistry.ts`:

```ts
export interface BitmapFontRegistryEntry {
  id: string;                    // e.g. "IBM_VGA_8x16"
  label: string;                 // UI label, e.g. "IBM VGA 8×16"
  ttfPath: string;               // build-time path, relative to atlas generator cwd
  woffPath: string;              // runtime path (served from /fonts)
  fontFamily: string;            // CSS @font-face family name
  cellW: number;
  cellH: number;
  nativePpem: number;            // EBDT strike ppem to extract (usually === cellH)
}

export const BITMAP_FONT_REGISTRY: BitmapFontRegistryEntry[] = [
  {
    id: 'IBM_CGA_8x8',
    label: 'IBM CGA 8×8',
    ttfPath: 'scripts/fonts/MxPlus_IBM_CGA.ttf',
    woffPath: '/fonts/WebPlus_IBM_CGA.woff',
    fontFamily: 'Web IBM CGA',
    cellW: 8, cellH: 8, nativePpem: 8,
  },
  {
    id: 'IBM_EGA_8x14',
    label: 'IBM EGA 8×14',
    ttfPath: 'scripts/fonts/MxPlus_IBM_EGA_8x14.ttf',
    woffPath: '/fonts/WebPlus_IBM_EGA_8x14.woff',
    fontFamily: 'Web IBM EGA 8x14',
    cellW: 8, cellH: 14, nativePpem: 14,
  },
  {
    id: 'IBM_MDA_9x14',
    label: 'IBM MDA 9×14',
    ttfPath: 'scripts/fonts/MxPlus_IBM_MDA.ttf',
    woffPath: '/fonts/WebPlus_IBM_MDA.woff',
    fontFamily: 'Web IBM MDA',
    cellW: 9, cellH: 14, nativePpem: 14,
  },
  {
    id: 'IBM_VGA_8x16',
    label: 'IBM VGA 8×16',
    ttfPath: 'scripts/fonts/MxPlus_IBM_VGA_8x16.ttf',
    woffPath: '/fonts/WebPlus_IBM_VGA_8x16.woff',
    fontFamily: 'Web IBM VGA 8x16',
    cellW: 8, cellH: 16, nativePpem: 16,
  },
  {
    id: 'IBM_VGA_9x16',
    label: 'IBM VGA 9×16',
    ttfPath: 'scripts/fonts/MxPlus_IBM_VGA_9x16.ttf',
    woffPath: '/fonts/WebPlus_IBM_VGA_9x16.woff',
    fontFamily: 'Web IBM VGA 9x16',
    cellW: 9, cellH: 16, nativePpem: 16,
  },
];

export const DEFAULT_FONT_ID = 'IBM_VGA_8x16';
```

**Source of fonts:** Int10h "The Ultimate Oldschool PC Font Pack" (SIL OFL licensed). Use the MxPlus (exact pixel reproduction) variants, not the aesthetic variants. Download from [int10h.org/oldschool-pc-fonts](https://int10h.org/oldschool-pc-fonts/). License files go in `packages/lua-runtime/scripts/fonts/LICENSE.txt` and are bundled into the export.

**Verifying a font is truly a bitmap font:** The atlas generator must fail loud if it can't find an EBDT strike at `nativePpem`. Do not silently fall back to outline rasterization — that defeats the point of the whole renderer. Add a build-time assertion test: "every registry entry must have a parseable EBDT strike at `nativePpem` with at least the ASCII range extracted." This catches mistakes where someone adds an entry for a font that looks bitmap-styled but is actually outline-only (these exist — many retro-styled TTFs are outline-only).

**Adding new fonts:** See Appendix A. The architecture is deliberately generic — any bitmap font with an EBDT strike at a supported indexFormat/imageFormat combo works. Cell sizes beyond 9-wide should work but have not been exercised; the atlas generator's hand-rolled parser should be reviewed for hardcoded assumptions (see the bit-packed row read in `parseImageFormat5`).

---

## 4. Dead Ends — Do Not Re-Walk These

Each of these was tried in the prototype. Don't rediscover.

### 4.1 xterm render addons don't fix the block-drawing seams
All three xterm.js render addons (default DOM, `CanvasAddon`, `WebglAddon`) share the same CPU-side glyph rasterization path. WebGL only moves the final blit to GPU — the canvas it uploads already has the AA seams baked in. The prototype tried WebglAddon with hopeful framing and it was indistinguishable from CanvasAddon for block chars.

*Prototype commits:* `d43ae1b`, `fa18c82`.

### 4.2 WOFF fonts typically drop the EBDT bitmap strike
The runtime `WebPlus_IBM_VGA_8x16.woff` the project ships is **outline-only**. WOFF subsetting almost always drops embedded bitmaps to save bytes. Only the TTF (`MxPlus_IBM_VGA_8x16.ttf`) carries the strike. The atlas generator must read the TTF at build time; the runtime WOFF is fine for the xterm fallback path (and the TTF is too large to ship as a runtime asset).

### 4.3 fontkit 2.x's EBLC parser silently drops subtables
`font.bitmapSizeTables[i].indexSubTables` returns only the **first** subtable per strike, even though the spec allows many. The MxPlus font has 9 subtables per strike covering different codepoint ranges (box drawing, block elements, arrows, etc.) — fontkit reports 1. Block elements are in a later subtable, so fontkit-based extractors miss them entirely.

**Fix:** walk the EBLC table by hand — read `numberOfIndexSubTables` from the strike header and iterate the index subtable array yourself. Reference: `parseBitmapStrike()` in `packages/lua-runtime/scripts/generate-glyph-atlas.js` in PR #763. Handle `indexFormat=2` + `imageFormat=5` (fixed-size, 1-bit row-major) which is what MxPlus uses.

### 4.4 Canvas `fillText` does not honor embedded bitmap strikes
Even when the font has a perfect pixel bitmap at the exact size being requested, `ctx.fillText` renders from the outline. You will see the outlined-and-AA'd version, not the bitmap. This is why the pixel renderer must go through `putImageData` with pre-extracted masks rather than drawing text to a canvas and thresholding.

*Confirmed empirically via `/glyph-debug`:* the "Raw fillText α" column for U+2592 ▒ shows a uniform grey blob; the "Atlas" column shows the correct checkerboard.

### 4.5 Hand-coded block patterns are a dangerous source of truth
The prototype ships `BLOCK_GLYPH_REFERENCE` — hand-coded patterns for U+2580–U+259F based on a Bayer-dither interpretation of the shades. These **disagree with the font's actual bitmaps for some glyphs** (the font's ░ is `1144`, the reference is a different Bayer phase; same 25% density, different pixels on). Users will notice and push back.

**Use `BLOCK_GLYPH_REFERENCE` for diagnostics only** (the `/glyph-debug` page compares it side-by-side against the atlas and font DOM render). Do NOT use it as the primary source of truth. If `setUseFontBlocks(false)` substitutes it in, that's opt-in and labeled clearly.

### 4.6 DPR compensation traded one problem for another, every time
The prototype tried four DPR strategies in sequence. Each failed differently. Summarizing so you can skip the rediscovery:

1. **`ceil(DPR)` oversampled backing + authored CSS size.** Browser downsamples backing → device by a non-integer ratio. Nearest-neighbor produces 1-2-1-2 pixel asymmetry. "Stretching" complaint.
2. **Exact-device-pixel backing (`round(CELL_W × DPR)`) + authored CSS size + destination-space resampling inside the renderer.** Moves the asymmetry from browser to renderer. Pixels were deterministic per-redraw (user saw even/odd rows taller/wider than adjacent).
3. **Exact-device-pixel backing + CSS size = `backing / DPR`.** Achieves uniform source → device mapping, 1:1 backing→device. BUT: breaks overlay positioning, mouse coord math, fit-scale — everything that assumed CSS = `cols × CELL_W`. Also broke on monitor switch (DPR sampled at construction, stale after moving window).
4. **Authored CSS + composed transform `scale(N × pixelScale / dpr)`.** Works, keeps authored coord space. Still breaks on monitor switch. Still requires the renderer to track DPR.

**Final decision: don't try.** Bitmap fonts on fractional-DPR displays will always look a bit off at native size — this is a physical-pixel reality, not a bug you can code around without cost. The cost of each DPR strategy was worse than the visual cost of accepting fractional-DPR nearest-neighbor.

### 4.7 Dynamic DPR (monitor switching) is not worth solving
Supporting DPR change requires either (a) listening to `matchMedia` and rebuilding the canvas backing when DPR changes, or (b) continuously re-reading `window.devicePixelRatio` and adjusting. Both introduce state the renderer must keep consistent, and both produce visible flashes when DPR changes. Skip it.

### 4.8 Retina downsampling expectations
The bitmap is 8×16. At DPR=2 it displays as 16×32 device pixels per cell — that's **bigger** on the screen than a native 8×16 render, not "sharper." This is correct behavior for a pixel-art bitmap font on a hi-DPI display. Don't try to "optimize for retina" by using the font's larger-ppem strike — one atlas is enough, the browser handles the integer upscale cleanly.

---

## 5. Diagnostic Tools to Keep (or Rebuild)

These were expensive to build and will save hours on the reimplementation.

### 5.1 `/glyph-debug` route
A page that renders a target codepoint four ways side-by-side for visual comparison:
1. **Native DOM text** — `<span style="font: {cellH}px {fontFamily}">char</span>`. Browser's default glyph rendering for the selected font.
2. **Raw fillText α** — the raw alpha values from `ctx.fillText` into a `cellW × cellH` canvas, visualized. Shows what the outline path gives you.
3. **Binary mask (atlas)** — the extracted atlas entry for the selected font. This is what the renderer paints.
4. **Hand-coded reference** — `BLOCK_GLYPH_REFERENCE` for block elements, empty otherwise. Note: reference patterns only cover 8×16; for other cell sizes this column shows "no reference available."

**Must be font-aware.** Add a font dropdown populated from the registry. Switching fonts reloads all four columns at the new `cellW × cellH`. Codepoint input accepts decimal, `0x`-hex, or `U+`-hex.

Invaluable when diagnosing "does this glyph look right?" questions from users. Prototype path: `lua-learning-website/src/routes/GlyphDebug.tsx` + `GlyphDebug.module.css` (prototype is single-font; the reimplementation must generalize).

### 5.2 Atlas generator + TTFs
- `packages/lua-runtime/scripts/generate-glyph-atlas.js` — iterates the font registry, extracts each font's native-ppem bitmap strike from its TTF, emits `glyphAtlas.generated.ts`.
- `packages/lua-runtime/scripts/fonts/*.ttf` — build-time inputs (one per registered font). Not shipped to runtime.
- `packages/lua-runtime/scripts/fonts/LICENSE.txt` — SIL OFL license from Int10h font pack. Bundled into export.
- `glyphAtlas.generated.ts` — git-ignored, regenerated on every build via prebuild hook.

### 5.3 `BLOCK_GLYPH_REFERENCE`
Hand-coded 8×16 patterns for U+2580–U+259F (horizontal halves/eighths, vertical halves/eighths, shades via Bayer dither, quadrants). Diagnostic reference only — see §4.5.

**Only covers 8×16.** Other cell sizes are not supported; that's acceptable because this data structure exists for diagnostic comparison, not as a production fallback. If a future need arises, reference patterns could be parametrically generated per cell size (e.g. upper-half-block = `rows 0..cellH/2-1 set`), but the prototype's hand-coded form is fine for now.

Prototype path: `packages/lua-runtime/src/blockGlyphReference.ts`.

---

## 6. Implementation Outline

A suggested order of operations. Each step should land as an independent commit.

### Step 1 — Font registry + TTF/WOFF assets
- Download the 5 MxPlus TTFs from the Int10h font pack and place under `packages/lua-runtime/scripts/fonts/`.
- Download or convert the 5 WebPlus WOFFs (for runtime use by the xterm path and for fillText fallback) to `lua-learning-website/public/fonts/`.
- Add SIL OFL license text as `packages/lua-runtime/scripts/fonts/LICENSE.txt`.
- Create `packages/lua-runtime/src/fontRegistry.ts` with the `BITMAP_FONT_REGISTRY` array and `DEFAULT_FONT_ID` export (see §3.7).
- Add `@font-face` rules to the editor and export CSS for each registered `fontFamily`.
- Test: import the registry in a unit test, assert 5 entries, assert default ID is `IBM_VGA_8x16`, assert each TTF path exists on disk.

### Step 2 — Atlas generator (multi-font)
- Port `generate-glyph-atlas.js` (hand-rolled EBLC/EBDT parser).
- Generator iterates `BITMAP_FONT_REGISTRY`, extracts each font's native-ppem strike, writes a single `glyphAtlas.generated.ts` exporting `FONT_ATLASES: Map<string, FontAtlas>`.
- **Fail loud** on: missing TTF, missing EBDT table, missing strike at `nativePpem`, zero glyphs extracted for any font.
- Wire a `prebuild` npm script in `packages/lua-runtime/package.json` so `npm run build` regenerates it.
- Add `*.generated.ts` to `.gitignore` in `packages/lua-runtime/src/`.
- Test (build-time integration): run `npm run build -w @lua-learning/lua-runtime`, inspect generated file — each registered font has its atlas, each atlas contains at least ASCII + the block elements U+2591/2592/2593. MDA may be missing some glyphs (text-mode font) — document which ranges are expected per font.

### Step 3 — PixelAnsiRenderer class (font-parameterized)
- New file `packages/lua-runtime/src/pixelAnsiRenderer.ts` exporting `PixelAnsiRenderer`, interfaces. **No `CELL_W`/`CELL_H` module constants** — cell dimensions are instance properties read from the active font's atlas.
- Constructor takes `{ cols, rows, fontId?, theme?, extraCodepoints?, useFontBlocks? }`. `fontId` defaults to `DEFAULT_FONT_ID`.
- Handle interface: `write`, `resize`, `setFontFamily(fontId)`, `setUseFontBlocks`, `dispose`, `canvas`, `cols`, `rows`, `cellW`, `cellH`.
- `setFontFamily(fontId)` fully reinitializes: look up new atlas, reallocate canvas (`cols × newCellW × rows × newCellH`), reallocate `shadow` + `reusableImageData`, clear and rebuild mask map.
- Internals: xterm Terminal (never opened), shadow Uint32Array keyed on `hash(code, fg, bg)`, per-cell RAF-scheduled renders, mask map built from active font's atlas + fillText fallback at active cell size.
- Export from `packages/lua-runtime/src/index.ts`.
- Unit tests: construct with default font → cells are 8×16; `setFontFamily('IBM_CGA_8x8')` → cells are 8×8, canvas backing shrinks; `setFontFamily('IBM_VGA_9x16')` → cells are 9×16, canvas backing widens; write escape codes and assert expected cell contents (mock canvas via jsdom).

### Step 4 — `/glyph-debug` diagnostic route (font-aware)
- `lua-learning-website/src/routes/GlyphDebug.tsx` — codepoint input + **font dropdown** populated from the registry. Four-column comparison at the selected font's cell size.
- Route entry added to the app's router.
- Manual verification: visit `/glyph-debug`, select each font in turn, search U+2592 — atlas column renders at correct cell size for each font; MDA (which may not ship ▒) shows an empty atlas cell with a visible "missing from font" indicator.

### Step 5 — AnsiTerminalPanel dual-mode
- Rewrite `lua-learning-website/src/components/AnsiTerminalPanel/AnsiTerminalPanel.tsx` into:
  - Exported `AnsiTerminalPanel` — chooser by `useFontBlocks` prop with React `key`. Accepts `fontId` prop (default = `DEFAULT_FONT_ID`).
  - Internal `AnsiTerminalPanelPixel` — constructs `PixelAnsiRenderer` with `fontId`.
  - Internal `AnsiTerminalPanelXterm` — xterm + CanvasAddon; looks up `fontFamily` and `fontSize=cellH` from the registry.
  - Shared helpers: `makeSetCrt(...)` (both variants' CRT toggle), `patchFillRect(...)` (xterm canvas integer-snap).
- Default `scaleMode` prop: `'integer-auto'`.
- `useFontBlocks` default: `DEFAULT_USE_FONT_BLOCKS` from `@lua-learning/ansi-shared` (currently `true`).
- `fontId` changes flow through props → the renderer's `setFontFamily(fontId)` (Pixel) or font update logic (Xterm).
- Update the panel test. Tests mock `@lua-learning/lua-runtime`; the default `useFontBlocks` always hits the Pixel path. No xterm mock needed. Add a test that changing `fontId` prop calls `setFontFamily` on the renderer handle.

### Step 6 — Editor wiring
- `AnsiGraphicsEditor.tsx` default `scaleMode` state: `'integer-auto'`.
- Font picker in the file-options UI: dropdown populated from `BITMAP_FONT_REGISTRY` (values = IDs, labels = human-readable). Selected font saved to the file's `fontFamily` field in the `.ansi.lua` format.
- Verify the "Use font blocks" checkbox already flows to `AnsiTerminalPanel` via the `useFontBlocks` prop.
- File-format compat: existing `.ansi.lua` files that store a raw CSS `fontFamily` string should map to the matching registry ID on load (if any match), otherwise fall back to `DEFAULT_FONT_ID`. This migration is one-way; saves always write the registry ID.

### Step 7 — Runtime parity
- `AnsiTabContent.tsx` renders `AnsiTerminalPanel` with default props — inherits the new behavior automatically.
- `AnsiController.applyFontSettings` must forward per-screen `fontFamily` (now interpreted as font ID) to the handle's `setFontFamily`, in addition to forwarding `useFontBlocks` to `setUseFontBlocks`.

### Step 8 — Export parity
- `packages/export/src/AnsiHtmlGenerator.ts` — in the inline handle construction, make `setUseFontBlocks` and `setFontFamily` call through to the renderer (not no-ops).
- Inline the full `FONT_ATLASES` map into the export bundle.
- Inline `@font-face` rules for all registered WOFFs, base64-embed the WOFFs so the export is a single self-contained file.
- `packages/export/scripts/bundle-ansi-inline.js` — ensure the inline bundle re-exports `PixelAnsiRenderer`, `FONT_ATLASES`, `BITMAP_FONT_REGISTRY`, `DEFAULT_FONT_ID` from `@lua-learning/lua-runtime` via the esbuild shim. Forgetting to list one breaks the export build.
- Manual test: export a project authored in each of the 5 fonts, open the HTML, verify each renders at the correct cell size.

### Step 9 — Cleanup
- Remove dead code paths (old pixel-renderer-only panel if any remnants, any DPR-compensation code, any `getDisplayInfo` / `RendererDisplayInfo` / `dprFactor` references, any `CELL_W`/`CELL_H` module-constant references).
- Update `CLAUDE.md` or `/ansi` command docs if they reference the old architecture.
- Add `docs/ansi/adding-a-bitmap-font.md` pointing to Appendix A.

---

## 7. File Map (Prototype Branch for Reference)

When in doubt, read these files on `worktree-ansi-font-blocks`:

| Concern | Prototype file |
|---|---|
| Pixel renderer (single-font) | `packages/lua-runtime/src/pixelAnsiRenderer.ts` |
| Atlas generator (hand-rolled EBLC, single-font) | `packages/lua-runtime/scripts/generate-glyph-atlas.js` |
| Build-time font input | `packages/lua-runtime/scripts/fonts/MxPlus_IBM_VGA_8x16.ttf` |
| Hand-coded reference patterns (8×16 only) | `packages/lua-runtime/src/blockGlyphReference.ts` |
| Dual-mode panel chooser | `lua-learning-website/src/components/AnsiTerminalPanel/AnsiTerminalPanel.tsx` |
| Diagnostic page (single-font) | `lua-learning-website/src/routes/GlyphDebug.tsx` |
| Export inline bundle shim | `packages/export/scripts/bundle-ansi-inline.js` |
| Export HTML generator (inline handle) | `packages/export/src/AnsiHtmlGenerator.ts` |

**New files in the reimplementation** (no prototype equivalent):
| Concern | New file |
|---|---|
| Font registry | `packages/lua-runtime/src/fontRegistry.ts` |
| Additional TTFs | `packages/lua-runtime/scripts/fonts/MxPlus_IBM_{CGA,EGA_8x14,MDA,VGA_9x16}.ttf` |
| Additional WOFFs | `lua-learning-website/public/fonts/WebPlus_IBM_{CGA,EGA_8x14,MDA,VGA_9x16}.woff` |
| Font license | `packages/lua-runtime/scripts/fonts/LICENSE.txt` |
| "Adding a font" guide | `docs/ansi/adding-a-bitmap-font.md` |

> Clone the prototype branch locally and read the prototype files. Do not copy the code — study the data flow and rebuild. The prototype is single-font; generalization to multi-font is intentional in the reimplementation.

---

## 8. Verification

### 8.1 Unit / integration tests
- `npm run build` from repo root (regenerates atlas, compiles all packages).
- `npm --prefix lua-learning-website run lint` — 0 errors. Don't increase the warning baseline.
- `npx tsc -p lua-learning-website/tsconfig.app.json --noEmit 2>&1 | grep -v '@lua-learning/'` — no output.
- `TMPDIR=tmp npm test --prefix packages/lua-runtime -- --run` — all pass.
- `TMPDIR=tmp npm test --prefix packages/export -- --run` — all pass.
- `TMPDIR=../tmp npm test --prefix lua-learning-website -- --run` — all pass.

### 8.2 Manual checks — single-font (default `IBM_VGA_8x16`)
1. **Editor, default settings.** Open a new `.ansi.lua` file. Fill a row with `▀` (U+2580 UPPER HALF BLOCK) stacked vertically. At Integer 1× on an integer-DPR display, rows should tile with zero horizontal seam.
2. **Toggle Use Font Blocks OFF.** Same fill. You should see the pre-prototype xterm rendering with visible sub-pixel AA on the same blocks. This proves the fallback path works.
3. **Toggle back ON.** Seams disappear. Confirms live remount works.
4. **Integer 2× / 3×.** Both renderers should scale cleanly at integer multiples.
5. **`/glyph-debug`.** Select `IBM_VGA_8x16`, search U+2592. Native DOM and Atlas columns should show the same 1×1 checkerboard. "Raw fillText α" should be a uniform grey blob (proves the atlas is necessary). Hand-coded reference should show the Bayer variant.
6. **Runtime mode.** Run a program that calls `ansi.write("\x1b[38;5;2m▀\x1b[0m")` in a loop. Same rendering as editor.
7. **Export.** Export a project with `useFontBlocks: true`. Open the HTML file. Blocks render crisp.
8. **Monitor switch (if available).** Drag the editor window between a DPR=1 and a DPR=1.5 monitor. Rendering should not flicker or break; quality differs (fractional DPR shows uneven pixels) but the canvas keeps working. No console errors.

### 8.3 Manual checks — multi-font
9. **Font picker in editor.** Switch active font to each of the 5 registered fonts. Canvas resizes appropriately (e.g. same cols/rows render wider for 9-wide fonts, taller for 16-ppem fonts). Glyphs visibly change — `A` has a different shape for `IBM_MDA_9x14` than for `IBM_VGA_8x16`.
10. **9-wide font blocks.** Select `IBM_VGA_9x16`. Fill a row with stacked `▀` blocks. Pixel renderer should tile seamlessly. (xterm path may show a column seam — accepted, see §3.4.)
11. **Small font (CGA 8×8).** Select `IBM_CGA_8x8`. Character set is limited; block drawing range U+2500+ may not be fully present — missing glyphs fall back to fillText rasterization. Verify ASCII renders crisply at 8×8.
12. **Font-change during live program.** Open an ANSI tab from a running Lua program. Change the font via the app's font picker. Live content re-renders at the new cell size without disposing the program.
13. **`/glyph-debug` across fonts.** Select each font, search U+0041 ('A'). The native DOM and atlas columns should agree for each. For `IBM_MDA_9x14` confirm the 9th column is extracted correctly.
14. **Export in each font.** Author a project in each of the 5 fonts and export. Open each HTML file; verify font renders correctly and the file is self-contained (no external font requests).

### 8.4 Pre-push
- Pre-push hook runs full CI locally. Don't skip it.

---

## 9. Prototype Preservation

- Keep the branch `worktree-ansi-font-blocks` pushed to origin. Do not delete.
- The PR description should be updated (or a follow-up comment added) linking to this plan doc and noting: "This PR is preserved as a reference prototype. The final implementation lives at #NNN and was built from the spec in `docs/ansi/renderer-implementation-plan.md`."
- **Recommended home for this plan doc in the repo:** `docs/ansi/renderer-implementation-plan.md` (the `docs/ansi/` directory already exists).

---

## 10. Estimated Scope

Rough sizing for planning, assuming a human + LLM pair working from this doc:

- Step 1 (font registry + assets): **0.5 day** — download fonts, verify licenses, write registry, add `@font-face` rules.
- Step 2 (atlas generator, multi-font): **1 day** — EBLC/EBDT parsing is tricky but well-specified once you know to bypass fontkit. Multi-font adds loop + per-font validation. 9-wide fonts may reveal bit-packing edge cases in `indexFormat=2`/`imageFormat=5` that the 8-wide prototype didn't exercise.
- Step 3 (PixelAnsiRenderer, font-parameterized): **1.5 days** — xterm-as-parser setup, RAF loop, shadow diffing, mask lookup, fillText fallback, **full reinit on font change** (canvas resize, buffer reallocation, mask rebuild).
- Step 4 (glyph-debug, font-aware): **0.5 day** — straightforward UI with font dropdown.
- Step 5 (panel chooser): **1 day** — the pre-prototype xterm code is in git history; port it carefully, re-test CRT + mouse + resize. Add `fontId` prop threading.
- Step 6 (editor wiring + font picker UI): **0.5 day** — font dropdown, file-format read/write with migration.
- Step 7 (runtime parity): **0.5 day** — `AnsiController.applyFontSettings` per-screen font forwarding.
- Step 8 (export parity with bundled fonts): **0.5 day** — inline `FONT_ATLASES`, base64 WOFFs, font switching in inline handle.
- Step 9 (cleanup + docs including Appendix A writeup): **0.5 day**.

Total: **~6 days** for a focused pair. Multi-font support adds ~2 days vs. single-font; worth it vs. the alternative of retrofitting later (which requires touching every file that assumed `CELL_W=8`/`CELL_H=16`).

The prototype took much longer than this estimate because of the DPR detours. Don't re-walk those (see §4.6, §4.7).

---

## Appendix A — Adding a new bitmap font

The architecture is designed so adding a new bitmap font is a registry entry + two asset drops. No renderer or panel code needs to change if the font meets the requirements.

### A.1 Font requirements

- **Must be a true bitmap font.** The TTF must contain an `EBDT`/`EBLC` pair with at least one strike at the cell height you want to use. Outline-only "pixel-styled" fonts do not work and will be rejected by the atlas generator.
- **Strike format:** the parser currently supports `indexFormat=2` + `imageFormat=5` (fixed-size, 1-bit row-major). Other EBDT formats (`imageFormat=1`, `2`, `6`, `7`, etc.) require extending `parseBitmapStrike()` in the atlas generator.
- **Cell width:** 8 and 9 are exercised. Other widths should work but may reveal bit-packing assumptions in the parser — test with `/glyph-debug` after adding.
- **License compatibility:** SIL OFL / public domain / similar permissive. Include license text in `packages/lua-runtime/scripts/fonts/LICENSE.txt` and in the export bundle.

### A.2 Steps

1. **Obtain the TTF** and verify it has an EBDT strike at your target ppem:
   ```bash
   # quick sanity check via fonttools (pip install fonttools):
   python3 -c "from fontTools.ttLib import TTFont; f = TTFont('the-font.ttf'); print('EBDT' in f, [s.ppemY for s in f['EBLC'].strikes])"
   ```
   Must print `True` and a list containing your target ppem.

2. **Drop assets:**
   - `packages/lua-runtime/scripts/fonts/NewFont.ttf` (build-time; do not ship).
   - `lua-learning-website/public/fonts/NewFont.woff` (runtime; for xterm path + fillText fallback). If you only have a TTF, convert with `fonttools ttLib.woff2` or similar.

3. **Add to registry** (`packages/lua-runtime/src/fontRegistry.ts`):
   ```ts
   {
     id: 'NEW_FONT',
     label: 'New Font',
     ttfPath: 'scripts/fonts/NewFont.ttf',
     woffPath: '/fonts/NewFont.woff',
     fontFamily: 'New Font Family',
     cellW: 8, cellH: 16, nativePpem: 16,
   }
   ```

4. **Add `@font-face` rule** to the editor stylesheet (and export's inline CSS template):
   ```css
   @font-face { font-family: 'New Font Family'; src: url('/fonts/NewFont.woff') format('woff'); }
   ```

5. **Regenerate atlas:**
   ```bash
   npm run build -w @lua-learning/lua-runtime
   ```
   Watch for failures — "no EBDT strike at ppem N" means the TTF doesn't have what's needed; "unsupported imageFormat" means the parser needs extending.

6. **Verify in `/glyph-debug`:** select the new font, check ASCII, then spot-check a few Unicode blocks the font claims to cover.

7. **Add an entry to the font-coverage doc** (if you maintain one) noting which Unicode ranges this font actually covers — consumers need to know U+2591 is in IBM_VGA but not in IBM_CGA (for example).

### A.3 If the atlas generator rejects the font

Common causes:
- **No EBDT table at all.** Font is outline-only. Nothing to do — find a different font or commission a bitmap version.
- **Wrong ppem.** Font has EBDT at 12 but not at your `nativePpem: 16`. Pick a `nativePpem` the font provides, or find a font that has the size you want.
- **Unsupported indexFormat/imageFormat.** Extend `parseBitmapStrike()` in `generate-glyph-atlas.js`. Microsoft's [OpenType EBDT spec](https://learn.microsoft.com/en-us/typography/opentype/spec/ebdt) documents all formats. `imageFormat=2` (small metrics, bit-aligned) is the most common one you might hit.
- **Zero glyphs extracted.** Subtable range filtering bug. Walk the indexSubTables by hand (the prototype's `parseIndexSubTables` is the reference).

### A.4 Cell-width bit-packing note for future maintainers

`indexFormat=2` stores each row of pixels as a bit-aligned run starting at a known byte offset per glyph. For `cellW=8` each row fits in exactly 1 byte. For `cellW=9` each row spans 2 bytes with 7 bits of padding. For `cellW=16` each row is 2 bytes aligned. The parser must read `ceil(cellW / 8)` bytes per row and then mask off trailing padding bits, not assume 1 byte per row. Verify this logic holds if adding a font wider than 9 pixels.
