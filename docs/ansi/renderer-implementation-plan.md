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
- The legacy xterm.js + CanvasAddon renderer is kept as the fallback.
- A `useFontBlocks` toggle (file-format field) picks which renderer the panel mounts — `true` = pixel renderer (default), `false` = xterm + CanvasAddon.
- No devicePixelRatio handling anywhere — the canvas is sized in source-pixel units and the browser scales it for display. Trade-off accepted: fractional-DPR displays show uneven pixels at Integer 1× scale.
- `integer-auto` is the default scale mode (replaces `fit` default).

---

## 2. Goals & Non-Goals

### Goals
- Block-drawing chars (U+2580–U+259F) render seamlessly on integer DPR displays and at Integer 2×/3× scale at any DPR.
- User can opt out of the new renderer (back to classic xterm.js + CanvasAddon) via the existing `useFontBlocks` file-format field. No UX regression for files authored to expect the old look.
- Runtime mode (a user program opening an ANSI terminal via `AnsiTabContent`) gets the same rendering pipeline automatically — the panel component is shared.
- The standalone HTML export honors `useFontBlocks` per screen.

### Non-Goals
- **Do not try to "fix" fractional DPR inside the renderer.** The prototype spent significant effort on DPR compensation (exact-device-pixel backing, CSS-size compensation, destination-space nearest-neighbor resampling, transform-scale arithmetic). Each approach traded one problem for another. The final decision: accept browser-level scaling, note that fractional DPRs look less crisp at Integer 1×, tell the user to use Integer 2× or switch to an integer-DPR monitor if they care. See §4 for why each DPR strategy failed.
- No reactive monitor-switch handling. The renderer does not read `window.devicePixelRatio`.
- No attempt to rebuild the WOFF runtime font to carry the bitmap strike. Use the TTF at build time only.
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
- Renderer owns its own `<canvas>`. Backing dimensions = CSS dimensions = `cols × CELL_W × rows × CELL_H` (8×16 per cell).
- On each `onWriteParsed` event, schedule a RAF. In the RAF:
  - Walk the terminal buffer, for each cell read `{code, fg, bg}`.
  - Hash `(code, fg, bg)` and compare to a per-cell `shadow: Uint32Array`. Skip cells whose signature is unchanged unless the whole canvas is dirty.
  - For changed cells: look up the code's 8×16 binary mask, build an `ImageData` with fg color where mask=1 and bg color where mask=0, `putImageData` to `(x * CELL_W, y * CELL_H)`.
- Style the canvas with `image-rendering: pixelated` so the browser uses nearest-neighbor for any CSS scaling.
- No `fillText` on the hot path. ASCII and any code outside the atlas falls back to a single fillText+alpha-threshold rasterization at init time, cached in the mask map.
- `setFontFamily(family)` clears the mask map and re-runs `buildGlyphMasks`.
- `setUseFontBlocks(false)` replaces U+2580–U+259F entries with the `BLOCK_GLYPH_REFERENCE` hand-coded canonical patterns instead of atlas entries. This gives the pixel renderer a secondary "reference patterns" mode, separate from the chooser-level toggle. Optional feature — can be dropped if the chooser is enough.

### 3.3 Atlas (build-time)

A Node script extracts binary glyph masks from the font's 16-ppem EBDT bitmap strike and emits a generated `glyphAtlas.generated.ts` file containing a `Map<codepoint, Uint8Array>`. The `.generated.ts` file is git-ignored and regenerated on every build via a prebuild hook.

Covered codepoints: ASCII printable, Latin-1 supplement, Box Drawing (U+2500–U+257F), Block Elements (U+2580–U+259F), Geometric Shapes (U+25A0–U+25FF), Arrows (U+2190–U+21FF), card suits & misc (U+2660–U+266F). Anything outside the atlas falls back to runtime fillText+alpha-threshold (accepted quality loss for codepoints the author isn't drawing with).

**The atlas must be extracted with a hand-rolled EBLC/EBDT parser**, not via fontkit 2.x's built-in EBLC parser — see §4.

### 3.4 AnsiTerminalPanelXterm (the "off" variant)

Restore the pre-prototype behavior:
- `new Terminal(...)` with `fontSize: 16`, `fontFamily`, etc.
- `terminal.open(wrapper)` + `terminal.loadAddon(new CanvasAddon())`.
- Apply a `fillRect` integer-snap patch to every canvas xterm creates (MutationObserver re-patches when xterm rebuilds canvases on font size change).
- `attachCustomKeyEventHandler(() => false)` so xterm doesn't swallow keyboard input (the panel is display-only).
- Scale mode changes font size (`terminal.options.fontSize = FONT_SIZE * N`) instead of a CSS transform, so the canvas stays at native resolution at 2×/3×.

The sub-pixel AA seams on block-drawing chars are inherent to this path; that's what the pixel renderer exists to solve.

### 3.5 No DPR handling

- Both renderers size their canvas in source-pixel units (`cols × 8` × `rows × 16`), both in `canvas.width` and `canvas.style.width`.
- The browser does whatever it does when mapping CSS → device pixels. On integer-DPR displays (1, 2, 3) that mapping is uniform. On fractional DPRs it's nearest-neighbor from the browser's side, with the 1-2-1-2 distribution pattern that comes from e.g. 12 device pixels ÷ 8 source pixels = 1.5 per source pixel.
- **Default scale mode is `integer-auto`.** On fractional DPR displays, users who dislike the uneven look can select Integer 2× or 3× manually.

### 3.6 Export parity

The standalone HTML export (`AnsiHtmlGenerator`) uses an inline-bundled copy of `PixelAnsiRenderer`. The inline handle forwards `setUseFontBlocks` to the renderer so `AnsiController.applyFontSettings` (which already reads each screen's `useFontBlocks` field) actually takes effect in the exported HTML.

Optional follow-up (can ship without): bundle xterm + CanvasAddon into the export too, so exported files with `useFontBlocks: false` can render via that path. The prototype did not do this; the export always uses the pixel renderer. Acceptable because exported files are read-only — users can author with `useFontBlocks: true` and the export faithfully renders it.

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
1. **Native DOM text** — `<span style="font: 16px ...">char</span>`. Browser's default glyph rendering.
2. **Raw fillText α** — the raw alpha values from `ctx.fillText` into an 8×16 canvas, visualized. Shows what the outline path gives you.
3. **Binary mask (atlas)** — the extracted atlas entry. This is what the renderer paints.
4. **Hand-coded reference** — `BLOCK_GLYPH_REFERENCE` for block elements, empty otherwise.

Invaluable when diagnosing "does this glyph look right?" questions from users. Prototype path: `lua-learning-website/src/routes/GlyphDebug.tsx` + `GlyphDebug.module.css`.

### 5.2 Atlas generator + TTF
- `packages/lua-runtime/scripts/generate-glyph-atlas.js` — extracts 16ppem bitmap strike from the TTF, emits `glyphAtlas.generated.ts`.
- `packages/lua-runtime/scripts/fonts/MxPlus_IBM_VGA_8x16.ttf` — build-time input. Not shipped to runtime.
- `glyphAtlas.generated.ts` — git-ignored, regenerated on every build via prebuild hook.

### 5.3 `BLOCK_GLYPH_REFERENCE`
Hand-coded 8×16 patterns for U+2580–U+259F (horizontal halves/eighths, vertical halves/eighths, shades via Bayer dither, quadrants). Diagnostic reference only — see §4.5.

Prototype path: `packages/lua-runtime/src/blockGlyphReference.ts`.

---

## 6. Implementation Outline

A suggested order of operations. Each step should land as an independent commit.

### Step 1 — Atlas generator
- Add TTF to `packages/lua-runtime/scripts/fonts/`.
- Port `generate-glyph-atlas.js` (hand-rolled EBLC/EBDT parser, writes `glyphAtlas.generated.ts`).
- Wire a `prebuild` npm script in `packages/lua-runtime/package.json` so `npm run build` regenerates it.
- Add `*.generated.ts` to `.gitignore` in `packages/lua-runtime/src/`.
- Test: run `npm run build -w @lua-learning/lua-runtime`, inspect the generated file contains ~267 entries including U+2591/2592/2593.

### Step 2 — PixelAnsiRenderer class
- New file `packages/lua-runtime/src/pixelAnsiRenderer.ts` exporting `PixelAnsiRenderer`, `CELL_W=8`, `CELL_H=16`, interfaces.
- Constructor takes `{ cols, rows, fontFamily?, theme?, extraCodepoints?, useFontBlocks? }`.
- Handle interface: `write`, `resize`, `setFontFamily`, `setUseFontBlocks`, `dispose`, `canvas`, `cols`, `rows`.
- Internals: xterm Terminal (never opened), shadow Uint32Array keyed on `hash(code, fg, bg)`, per-cell RAF-scheduled renders, mask map built from atlas + fillText fallback.
- Export from `packages/lua-runtime/src/index.ts`.
- Unit test: construct renderer, write escape codes, check canvas has expected cell contents (mock canvas via node-canvas or jsdom).

### Step 3 — `/glyph-debug` diagnostic route
- `lua-learning-website/src/routes/GlyphDebug.tsx` — input field for codepoint, four-column comparison.
- Route entry added to the app's router.
- Manual verification: visit `/glyph-debug`, search U+2592, all four columns render; atlas matches Native DOM for in-font glyphs, differs from fillText for shade glyphs.

### Step 4 — AnsiTerminalPanel dual-mode
- Rewrite `lua-learning-website/src/components/AnsiTerminalPanel/AnsiTerminalPanel.tsx` into:
  - Exported `AnsiTerminalPanel` — chooser by `useFontBlocks` prop with React `key`.
  - Internal `AnsiTerminalPanelPixel` — new renderer.
  - Internal `AnsiTerminalPanelXterm` — xterm + CanvasAddon (exactly the pre-prototype behavior).
  - Shared helpers: `makeSetCrt(...)` (both variants' CRT toggle), `patchFillRect(...)` (xterm canvas integer-snap).
- Default `scaleMode` prop: `'integer-auto'`.
- `useFontBlocks` default: `DEFAULT_USE_FONT_BLOCKS` from `@lua-learning/ansi-shared` (currently `true`).
- Update the panel test. Tests mock `@lua-learning/lua-runtime`; the default `useFontBlocks` always hits the Pixel path. No xterm mock needed.

### Step 5 — Editor wiring
- `AnsiGraphicsEditor.tsx` default `scaleMode` state: `'integer-auto'`.
- Check the "Use font blocks" checkbox in the file-options UI — ensure it already flows through to `AnsiTerminalPanel` via the `useFontBlocks` prop. Should Just Work since the plumbing exists; this plan only changes what the prop does downstream.

### Step 6 — Runtime parity
- `AnsiTabContent.tsx` renders `AnsiTerminalPanel` with default props — inherits the new behavior automatically. Verify `AnsiController.applyFontSettings` forwards per-screen `useFontBlocks` to the handle's `setUseFontBlocks` (existing code; verify not broken).

### Step 7 — Export parity
- `packages/export/src/AnsiHtmlGenerator.ts` — in the inline handle construction, make `setUseFontBlocks` call through to `renderer.setUseFontBlocks(value)` instead of being a no-op. The export path always uses `PixelAnsiRenderer` (no xterm fallback in the exported HTML); files with `useFontBlocks: false` will render with `BLOCK_GLYPH_REFERENCE` patterns substituted for U+2580–U+259F.
- `packages/export/scripts/bundle-ansi-inline.js` — ensure the inline bundle re-exports `PixelAnsiRenderer`, `CELL_W`, `CELL_H` from `@lua-learning/lua-runtime` via the esbuild shim. This is a common gotcha — forgetting to list one breaks the export build.

### Step 8 — Cleanup
- Remove dead code paths (old pixel-renderer-only panel if any remnants, any DPR-compensation code, any `getDisplayInfo` / `RendererDisplayInfo` / `dprFactor` references).
- Update `CLAUDE.md` or `/ansi` command docs if they reference the old architecture.

---

## 7. File Map (Prototype Branch for Reference)

When in doubt, read these files on `worktree-ansi-font-blocks`:

| Concern | Prototype file |
|---|---|
| Pixel renderer | `packages/lua-runtime/src/pixelAnsiRenderer.ts` |
| Atlas generator (hand-rolled EBLC) | `packages/lua-runtime/scripts/generate-glyph-atlas.js` |
| Build-time font input | `packages/lua-runtime/scripts/fonts/MxPlus_IBM_VGA_8x16.ttf` |
| Hand-coded reference patterns | `packages/lua-runtime/src/blockGlyphReference.ts` |
| Dual-mode panel chooser | `lua-learning-website/src/components/AnsiTerminalPanel/AnsiTerminalPanel.tsx` |
| Diagnostic page | `lua-learning-website/src/routes/GlyphDebug.tsx` |
| Export inline bundle shim | `packages/export/scripts/bundle-ansi-inline.js` |
| Export HTML generator (inline handle) | `packages/export/src/AnsiHtmlGenerator.ts` |

> Clone the prototype branch locally and read these files. Do not copy the code — study the data flow and rebuild.

---

## 8. Verification

### 8.1 Unit / integration tests
- `npm run build` from repo root (regenerates atlas, compiles all packages).
- `npm --prefix lua-learning-website run lint` — 0 errors. Don't increase the warning baseline.
- `npx tsc -p lua-learning-website/tsconfig.app.json --noEmit 2>&1 | grep -v '@lua-learning/'` — no output.
- `TMPDIR=tmp npm test --prefix packages/lua-runtime -- --run` — all pass.
- `TMPDIR=tmp npm test --prefix packages/export -- --run` — all pass.
- `TMPDIR=../tmp npm test --prefix lua-learning-website -- --run` — all pass.

### 8.2 Manual checks
1. **Editor, default settings.** Open a new `.ansi.lua` file. Fill a row with `▀` (U+2580 UPPER HALF BLOCK) stacked vertically. At Integer 1× on an integer-DPR display, rows should tile with zero horizontal seam.
2. **Toggle Use Font Blocks OFF.** Same fill. You should see the pre-prototype xterm rendering with visible sub-pixel AA on the same blocks. This proves the fallback path works.
3. **Toggle back ON.** Seams disappear. Confirms live remount works.
4. **Integer 2× / 3×.** Both renderers should scale cleanly at integer multiples.
5. **`/glyph-debug`.** Search U+2592. Native DOM and Atlas columns should show the same 1×1 checkerboard. "Raw fillText α" should be a uniform grey blob (proves the atlas is necessary). Hand-coded reference should show the Bayer variant.
6. **Runtime mode.** Run a program that calls `ansi.write("\x1b[38;5;2m▀\x1b[0m")` in a loop. Same rendering as editor.
7. **Export.** Export a project with `useFontBlocks: true`. Open the HTML file. Blocks render crisp.
8. **Monitor switch (if available).** Drag the editor window between a DPR=1 and a DPR=1.5 monitor. Rendering should not flicker or break; quality differs (fractional DPR shows uneven pixels) but the canvas keeps working. No console errors.

### 8.3 Pre-push
- Pre-push hook runs full CI locally. Don't skip it.

---

## 9. Prototype Preservation

- Keep the branch `worktree-ansi-font-blocks` pushed to origin. Do not delete.
- The PR description should be updated (or a follow-up comment added) linking to this plan doc and noting: "This PR is preserved as a reference prototype. The final implementation lives at #NNN and was built from the spec in `docs/ansi/renderer-implementation-plan.md`."
- **Recommended home for this plan doc in the repo:** `docs/ansi/renderer-implementation-plan.md` (the `docs/ansi/` directory already exists).

---

## 10. Estimated Scope

Rough sizing for planning, assuming a human + LLM pair working from this doc:

- Step 1 (atlas generator): **0.5 day** — EBLC/EBDT parsing is tricky but well-specified once you know to bypass fontkit.
- Step 2 (PixelAnsiRenderer): **1 day** — xterm-as-parser setup, RAF loop, shadow diffing, mask lookup, fillText fallback.
- Step 3 (glyph-debug): **0.5 day** — straightforward UI.
- Step 4 (panel chooser): **1 day** — the pre-prototype xterm code is in git history; port it carefully, re-test CRT + mouse + resize.
- Steps 5–7 (wiring): **0.5 day** — mostly plumbing.
- Step 8 (cleanup + docs): **0.5 day**.

Total: ~4 days for a focused pair. The prototype took much longer because of the DPR detours.
