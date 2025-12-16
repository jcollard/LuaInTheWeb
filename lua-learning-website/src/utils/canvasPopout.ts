/**
 * Canvas pop-out utility.
 * Creates a new browser window for running canvas games in isolation.
 */

export interface PopoutOptions {
  /** Window title */
  title?: string
  /** Canvas width */
  width?: number
  /** Canvas height */
  height?: number
}

/**
 * Opens a new browser window with an embedded canvas for running Lua code.
 * The window contains a minimal HTML page with:
 * - Dark theme matching the IDE
 * - A canvas element
 * - The canvas runtime loaded from the main window
 *
 * @param code - The Lua code to run
 * @param options - Optional configuration
 * @returns The opened window or null if popup was blocked
 */
export function openCanvasPopout(
  code: string,
  options: PopoutOptions = {}
): Window | null {
  const {
    title = 'Lua Canvas',
    width = 800,
    height = 600,
  } = options

  // Calculate window size (canvas size + padding for toolbar)
  const windowWidth = width + 32
  const windowHeight = height + 100

  // Open a blank window
  const popup = window.open(
    '',
    '_blank',
    `width=${windowWidth},height=${windowHeight},menubar=no,toolbar=no,location=no,status=no`
  )

  if (!popup) {
    return null
  }

  // Write the HTML content
  popup.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background: #1e1e1e;
      color: #d4d4d4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #252526;
      border-bottom: 1px solid #3c3c3c;
    }
    .status {
      font-size: 13px;
      color: #4ade80;
    }
    .status.error {
      color: #fca5a5;
    }
    .container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow: auto;
    }
    canvas {
      border: 1px solid #3c3c3c;
      background: #000;
      outline: none;
    }
    canvas:focus {
      border-color: #007acc;
      box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.3);
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="status" id="status">Initializing...</span>
  </div>
  <div class="container">
    <canvas id="canvas" width="${width}" height="${height}" tabindex="0"></canvas>
  </div>
  <script>
    // Store the code for the canvas runtime to access
    window.__canvasCode = ${JSON.stringify(code)};
    window.__canvasReady = false;

    // Update status
    function setStatus(text, isError) {
      const status = document.getElementById('status');
      status.textContent = text;
      status.className = isError ? 'status error' : 'status';
    }

    // Focus canvas on load
    window.onload = function() {
      const canvas = document.getElementById('canvas');
      canvas.focus();
      setStatus('Canvas ready - waiting for runtime');
    };

    // Listen for messages from opener
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'canvas-code') {
        window.__canvasCode = event.data.code;
        setStatus('Code received');
      }
    });

    // Notify opener that popup is ready
    if (window.opener) {
      window.opener.postMessage({ type: 'canvas-popup-ready' }, '*');
    }
  </script>
</body>
</html>
  `)
  popup.document.close()

  return popup
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
