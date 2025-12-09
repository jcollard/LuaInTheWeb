#!/usr/bin/env node

/**
 * Screenshot capture utility for visual verification during PR reviews.
 *
 * Usage: node scripts/capture-screenshots.js [options] <routes...>
 *
 * Options:
 *   --output-dir <dir>  Output directory for screenshots (default: ../.tmp/screenshots)
 *   --base-url <url>    Base URL for the app (default: http://localhost:4173)
 *   --no-build          Skip building the app (assume already built)
 *   --help              Show help message
 *
 * Environment Variables:
 *   SCREENSHOT_WAIT_TIMEOUT     Page load timeout in ms (default: 30000)
 *   SCREENSHOT_SERVER_TIMEOUT   Server start timeout in ms (default: 30000)
 *
 * Examples:
 *   node scripts/capture-screenshots.js /editor /repl
 *   node scripts/capture-screenshots.js --output-dir ./screenshots /editor
 *   node scripts/capture-screenshots.js --no-build --base-url http://localhost:5173 /editor
 *   SCREENSHOT_WAIT_TIMEOUT=60000 node scripts/capture-screenshots.js /editor
 *
 * The script will:
 * 1. Build the app (unless --no-build)
 * 2. Start a preview server
 * 3. Navigate to each route and capture a screenshot
 * 4. Save screenshots with descriptive names
 */

import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import { mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Default configuration (timeouts configurable via environment variables)
const DEFAULTS = {
  outputDir: path.resolve(PROJECT_ROOT, '..', '.tmp', 'screenshots'),
  baseUrl: 'http://localhost:4173',
  viewport: { width: 1280, height: 720 },
  waitTimeout: parseInt(process.env.SCREENSHOT_WAIT_TIMEOUT, 10) || 30000,
  serverStartTimeout: parseInt(process.env.SCREENSHOT_SERVER_TIMEOUT, 10) || 30000,
};

/**
 * Normalize a route path (handle Git Bash path conversion on Windows)
 *
 * WINDOWS-SPECIFIC QUIRK:
 * When running in Git Bash on Windows, POSIX-style paths like "/editor" get
 * automatically converted to Windows paths by MSYS path conversion.
 * For example: "/editor" becomes "C:/Program Files/Git/editor"
 *
 * This happens because Git Bash interprets paths starting with "/" as references
 * to the Git installation directory. This is a known MSYS/MinGW behavior.
 *
 * To work around this, we detect converted paths (containing "Git" after a drive
 * letter) and extract the intended route from the end of the path.
 *
 * See: https://stackoverflow.com/questions/7250130/how-to-stop-mingw-and-msys-from-mangling-path-names-given-at-the-command-line
 */
function normalizeRoute(route) {
  // Check if this looks like a Git Bash converted path (e.g., "C:/Program Files/Git/editor")
  if (route.match(/^[A-Z]:.*Git/i)) {
    // Extract the intended route from the converted path
    // e.g., "C:/Program Files/Git/editor" -> "/editor"
    const match = route.match(/Git(.*)$/i);
    if (match) {
      return match[1] || '/';
    }
  }
  // Ensure route starts with /
  if (!route.startsWith('/') && !route.startsWith('http')) {
    return '/' + route;
  }
  return route;
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = {
    routes: [],
    outputDir: DEFAULTS.outputDir,
    baseUrl: DEFAULTS.baseUrl,
    skipBuild: false,
    showHelp: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.showHelp = true;
      i++;
    } else if (arg === '--output-dir' && i + 1 < args.length) {
      result.outputDir = path.resolve(args[i + 1]);
      i += 2;
    } else if (arg === '--base-url' && i + 1 < args.length) {
      result.baseUrl = args[i + 1];
      i += 2;
    } else if (arg === '--no-build') {
      result.skipBuild = true;
      i++;
    } else if (!arg.startsWith('-')) {
      // Treat as route (normalize to handle Git Bash path conversion)
      result.routes.push(normalizeRoute(arg));
      i++;
    } else {
      i++;
    }
  }

  return result;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Screenshot capture utility for visual verification during PR reviews.

Usage: node scripts/capture-screenshots.js [options] <routes...>

Options:
  --output-dir <dir>  Output directory for screenshots (default: ../.tmp/screenshots)
  --base-url <url>    Base URL for the app (default: http://localhost:4173)
  --no-build          Skip building the app (assume already built)
  --help              Show this help message

Environment Variables:
  SCREENSHOT_WAIT_TIMEOUT     Page load timeout in ms (default: 30000)
  SCREENSHOT_SERVER_TIMEOUT   Server start timeout in ms (default: 30000)

Examples:
  node scripts/capture-screenshots.js /editor /repl
  node scripts/capture-screenshots.js --output-dir ./screenshots /editor
  node scripts/capture-screenshots.js --no-build --base-url http://localhost:5173 /editor
  SCREENSHOT_WAIT_TIMEOUT=60000 node scripts/capture-screenshots.js /editor
`);
}

/**
 * Build the application
 */
async function buildApp() {
  console.log('Building application...');
  try {
    execSync('npm run build', {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
    });
    console.log('Build completed successfully.');
    return true;
  } catch (error) {
    console.error('Build failed:', error.message);
    return false;
  }
}

/**
 * Start the preview server and wait for it to be ready
 */
async function startPreviewServer(baseUrl) {
  console.log('Starting preview server...');

  const serverProcess = spawn('npm', ['run', 'preview'], {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: 'pipe',
  });

  // Wait for server to be ready
  const startTime = Date.now();
  while (Date.now() - startTime < DEFAULTS.serverStartTimeout) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        console.log(`Preview server ready at ${baseUrl}`);
        return serverProcess;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  serverProcess.kill();
  throw new Error('Preview server failed to start within timeout');
}

/**
 * Generate a filename from a route
 */
function routeToFilename(route) {
  // Remove leading slash and replace remaining slashes with dashes
  let name = route.replace(/^\//, '').replace(/\//g, '-') || 'home';
  // Replace any non-alphanumeric characters with dashes
  name = name.replace(/[^a-zA-Z0-9-]/g, '-');
  // Remove consecutive dashes
  name = name.replace(/-+/g, '-');
  // Remove trailing dashes
  name = name.replace(/-$/, '');
  return `${name}.png`;
}

/**
 * Capture screenshots for all routes
 */
async function captureScreenshots(routes, baseUrl, outputDir) {
  console.log(`\nCapturing screenshots for ${routes.length} route(s)...`);

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: DEFAULTS.viewport,
  });

  const results = [];

  for (const route of routes) {
    const page = await context.newPage();
    const url = route.startsWith('http') ? route : `${baseUrl}${route}`;
    const filename = routeToFilename(route);
    const filepath = path.join(outputDir, filename);

    console.log(`  Capturing: ${route} -> ${filename}`);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: DEFAULTS.waitTimeout });

      // Additional wait for any animations to settle
      await page.waitForTimeout(500);

      await page.screenshot({ path: filepath, fullPage: false });

      results.push({
        route,
        filename,
        filepath,
        success: true,
      });
    } catch (error) {
      console.error(`    Failed to capture ${route}: ${error.message}`);
      results.push({
        route,
        filename,
        filepath,
        success: false,
        error: error.message,
      });
    }

    await page.close();
  }

  await browser.close();

  return results;
}

/**
 * Main function
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.showHelp) {
    showHelp();
    process.exit(0);
  }

  if (args.routes.length === 0) {
    console.error('Error: No routes specified.');
    console.error('Usage: node scripts/capture-screenshots.js [options] <routes...>');
    console.error('Use --help for more information.');
    process.exit(1);
  }

  console.log('Visual Verification Screenshot Capture');
  console.log('======================================');
  console.log(`Routes: ${args.routes.join(', ')}`);
  console.log(`Output: ${args.outputDir}`);
  console.log(`Base URL: ${args.baseUrl}`);
  console.log('');

  let serverProcess = null;

  try {
    // Build if needed
    if (!args.skipBuild) {
      const buildSuccess = await buildApp();
      if (!buildSuccess) {
        console.error('Aborting due to build failure.');
        process.exit(1);
      }
    }

    // Start preview server
    serverProcess = await startPreviewServer(args.baseUrl);

    // Capture screenshots
    const results = await captureScreenshots(args.routes, args.baseUrl, args.outputDir);

    // Summary
    console.log('\nScreenshot Capture Summary');
    console.log('==========================');

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(`Successful: ${successful.length}/${results.length}`);

    if (successful.length > 0) {
      console.log('\nCaptured screenshots:');
      for (const r of successful) {
        console.log(`  ✓ ${r.filepath}`);
      }
    }

    if (failed.length > 0) {
      console.log('\nFailed captures:');
      for (const r of failed) {
        console.log(`  ✗ ${r.route}: ${r.error}`);
      }
    }

    // Output JSON result for programmatic use
    const jsonOutput = {
      outputDir: args.outputDir,
      screenshots: results,
    };
    console.log('\n--- JSON OUTPUT ---');
    console.log(JSON.stringify(jsonOutput, null, 2));
    console.log('--- END JSON ---');

    process.exit(failed.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

main();
