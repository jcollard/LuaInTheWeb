#!/usr/bin/env node
/**
 * Bundle the ansi-inline-entry.ts into a self-contained JavaScript string.
 *
 * This script uses esbuild to:
 * 1. Bundle ansi-inline-entry.ts with all ANSI runtime dependencies
 * 2. Output an IIFE that exposes AnsiController, setupAnsiAPI, etc. globally
 * 3. Convert the bundled JS to a TypeScript string export
 *
 * Following the pattern established by bundle-canvas-inline.js
 */

import { build } from 'esbuild';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ENTRY_FILE = join(__dirname, '..', 'src', 'runtime', 'ansi-inline-entry.ts');
const OUTPUT_DIR = join(__dirname, '..', 'src', 'runtime');
const OUTPUT_TS = join(OUTPUT_DIR, 'ansi-inline.generated.ts');

// Source directories for direct imports (bypasses package exports)
const LUA_RUNTIME_SRC = join(__dirname, '..', '..', 'lua-runtime', 'src');
const CANVAS_RUNTIME_SRC = join(__dirname, '..', '..', 'canvas-runtime', 'src');
const ANSI_SHARED_SRC = join(__dirname, '..', '..', 'ansi-shared', 'src');
const SHELL_CORE_SRC = join(__dirname, '..', '..', 'shell-core', 'src');

async function bundleAnsiInline() {
  console.log('Bundling ansi-inline-entry.ts...');

  const result = await build({
    entryPoints: [ENTRY_FILE],
    bundle: true,
    format: 'iife',
    globalName: 'AnsiInline',
    minify: false,
    sourcemap: false,
    write: false,
    target: 'es2020',
    platform: 'browser',
    plugins: [
      {
        // Stub wasmoon — we only use types from it
        name: 'wasmoon-types-only',
        setup(build) {
          build.onResolve({ filter: /^wasmoon$/ }, () => ({
            path: 'wasmoon',
            namespace: 'wasmoon-stub',
          }));
          build.onLoad({ filter: /.*/, namespace: 'wasmoon-stub' }, () => ({
            contents: 'export default {}; export const LuaEngine = {};',
            loader: 'js',
          }));
        },
      },
      {
        // Resolve @lua-learning/lua-runtime to specific ANSI source files
        name: 'lua-runtime-resolver',
        setup(build) {
          build.onResolve({ filter: /^@lua-learning\/lua-runtime$/ }, () => ({
            path: '@lua-learning/lua-runtime',
            namespace: 'lua-runtime-shim',
          }));
          build.onLoad({ filter: /.*/, namespace: 'lua-runtime-shim' }, () => ({
            contents: `
              export { AnsiController } from '${join(LUA_RUNTIME_SRC, 'AnsiController.ts').replace(/\\/g, '/')}';
              export type { AnsiCallbacks, AnsiTerminalHandle, LayerInfo } from '${join(LUA_RUNTIME_SRC, 'AnsiController.ts').replace(/\\/g, '/')}';
              export { setupAnsiAPI } from '${join(LUA_RUNTIME_SRC, 'setupAnsiAPI.ts').replace(/\\/g, '/')}';
              export type { AnsiAPIOptions } from '${join(LUA_RUNTIME_SRC, 'setupAnsiAPI.ts').replace(/\\/g, '/')}';
              export { ansiLuaCode } from '${join(LUA_RUNTIME_SRC, 'ansiLuaWrapper.ts').replace(/\\/g, '/')}';
              export { ansiLuaCoreCode, ansiLuaInputCode } from '${join(LUA_RUNTIME_SRC, 'ansiLuaCode/index.ts').replace(/\\/g, '/')}';
              export { InputAPI } from '${join(LUA_RUNTIME_SRC, 'InputAPI.ts').replace(/\\/g, '/')}';
              export { CrtShader, CRT_DEFAULTS } from '${join(LUA_RUNTIME_SRC, 'crtShader.ts').replace(/\\/g, '/')}';
              export type { CrtConfig } from '${join(LUA_RUNTIME_SRC, 'crtShader.ts').replace(/\\/g, '/')}';
              export { LUA_LOCALSTORAGE_CODE } from '${join(LUA_RUNTIME_SRC, 'lua/localstorage.generated.ts').replace(/\\/g, '/')}';
            `,
            loader: 'ts',
            resolveDir: LUA_RUNTIME_SRC,
          }));
        },
      },
      {
        // Resolve @lua-learning/canvas-runtime to specific source files
        name: 'canvas-runtime-resolver',
        setup(build) {
          build.onResolve({ filter: /^@lua-learning\/canvas-runtime$/ }, () => ({
            path: '@lua-learning/canvas-runtime',
            namespace: 'canvas-runtime-shim',
          }));
          build.onLoad({ filter: /.*/, namespace: 'canvas-runtime-shim' }, () => ({
            contents: `
              export { InputCapture } from '${join(CANVAS_RUNTIME_SRC, 'renderer/InputCapture.ts').replace(/\\/g, '/')}';
              export { GameLoopController } from '${join(CANVAS_RUNTIME_SRC, 'renderer/GameLoopController.ts').replace(/\\/g, '/')}';
              export { createDefaultTimingInfo } from '${join(CANVAS_RUNTIME_SRC, 'shared/index.ts').replace(/\\/g, '/')}';
              export { createEmptyInputState } from '${join(CANVAS_RUNTIME_SRC, 'shared/index.ts').replace(/\\/g, '/')}';
            `,
            loader: 'ts',
            resolveDir: CANVAS_RUNTIME_SRC,
          }));
        },
      },
      {
        // Resolve @lua-learning/ansi-shared to source
        name: 'ansi-shared-resolver',
        setup(build) {
          build.onResolve({ filter: /^@lua-learning\/ansi-shared$/ }, () => ({
            path: join(ANSI_SHARED_SRC, 'index.ts'),
            namespace: 'file',
          }));
        },
      },
      {
        // Resolve @lua-learning/shell-core to source
        name: 'shell-core-resolver',
        setup(build) {
          build.onResolve({ filter: /^@lua-learning\/shell-core$/ }, () => ({
            path: join(SHELL_CORE_SRC, 'index.ts'),
            namespace: 'file',
          }));
        },
      },
    ],
  });

  if (result.outputFiles.length === 0) {
    throw new Error('esbuild produced no output');
  }

  const bundledCode = result.outputFiles[0].text;

  // Escape backticks and ${} for template literal
  const escapedCode = bundledCode
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');

  const tsContent = `/* eslint-disable max-lines */
/**
 * Auto-generated from ansi-inline-entry.ts
 * DO NOT EDIT THIS FILE DIRECTLY - edit the .ts source instead.
 *
 * Bundled ANSI bridge for standalone HTML exports.
 * Run "npm run build:ansi" to regenerate this file.
 */
export const ANSI_INLINE_JS = \`${escapedCode}\`
`;

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  writeFileSync(OUTPUT_TS, tsContent);
  console.log(`Generated: ansi-inline.generated.ts (${bundledCode.length} bytes)`);
}

bundleAnsiInline().catch((err) => {
  console.error('Failed to bundle ansi inline:', err);
  process.exit(1);
});
