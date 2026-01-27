/**
 * esbuild configuration for VS Code extension
 */

const esbuild = require('esbuild')
const path = require('path')

const isWatch = process.argv.includes('--watch')

// Extension bundle (Node.js context)
const extensionConfig = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: './dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
  target: 'node18',
  // Bundle wasmoon inline for the extension
  define: {
    'process.env.NODE_ENV': '"production"',
  },
}

// WebView bundle (Browser context)
const webviewConfig = {
  entryPoints: ['./webview/canvas.ts'],
  bundle: true,
  outfile: './dist/webview.js',
  format: 'esm',
  platform: 'browser',
  sourcemap: true,
  target: 'es2022',
}

async function build() {
  try {
    if (isWatch) {
      // Watch mode
      const extensionCtx = await esbuild.context(extensionConfig)
      const webviewCtx = await esbuild.context(webviewConfig)

      await Promise.all([extensionCtx.watch(), webviewCtx.watch()])

      console.log('Watching for changes...')
    } else {
      // Build mode
      await Promise.all([esbuild.build(extensionConfig), esbuild.build(webviewConfig)])

      console.log('Build complete!')
    }
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

build()
