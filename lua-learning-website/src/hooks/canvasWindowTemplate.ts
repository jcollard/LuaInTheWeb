import type { ScreenMode } from '@lua-learning/shell-core'

/**
 * Generate HTML content for the canvas popup window.
 * Creates a page with optional toolbar and canvas with scaling support.
 * @param screenMode - Initial screen mode (defaults to 'full')
 * @param noToolbar - If true, hides the toolbar entirely
 */
export function generateCanvasWindowHTML(screenMode?: ScreenMode, noToolbar?: boolean): string {
  // Toolbar is shown by default unless noToolbar is true
  const showToolbar = !noToolbar
  const initialMode = screenMode ?? 'full'
  // Map screen mode to CSS class name
  const scaleClass =
    initialMode === '1x' ? 'scale-native' : `scale-${initialMode}`

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Canvas Game</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: #1a1a2e;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Toolbar styling */
    .toolbar {
      background: #2d2d44;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #3d3d5c;
      flex-shrink: 0;
    }
    .toolbar.hidden {
      display: none;
    }
    .toolbar label {
      color: #a0a0b0;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
    }
    .toolbar select {
      background: #1a1a2e;
      color: #e0e0e0;
      border: 1px solid #3d3d5c;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 13px;
      font-family: system-ui, -apple-system, sans-serif;
      cursor: pointer;
    }
    .toolbar select:hover {
      border-color: #5d5d7c;
    }
    .toolbar select:focus {
      outline: none;
      border-color: #6d6d8c;
    }
    .toolbar button {
      border: none;
      border-radius: 4px;
      padding: 4px 12px;
      font-size: 13px;
      font-family: system-ui, -apple-system, sans-serif;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .toolbar button.reload-btn {
      background: #3d5afe;
      color: #fff;
    }
    .toolbar button.reload-btn:hover {
      background: #536dfe;
    }
    .toolbar button.reload-btn:active {
      background: #304ffe;
    }
    .toolbar button.pause-btn {
      background: #78350f;
      color: #fbbf24;
    }
    .toolbar button.pause-btn:hover {
      background: #92400e;
    }
    .toolbar button.play-btn {
      background: #166534;
      color: #4ade80;
    }
    .toolbar button.play-btn:hover {
      background: #15803d;
    }
    .toolbar button.stop-btn {
      background: #7f1d1d;
      color: #fca5a5;
    }
    .toolbar button.stop-btn:hover {
      background: #991b1b;
    }
    .toolbar button.step-btn {
      background: #1e3a5f;
      color: #60a5fa;
    }
    .toolbar button.step-btn:hover {
      background: #1e40af;
    }
    .toolbar button.hidden {
      display: none;
    }

    /* Canvas container */
    .canvas-container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      position: relative;
    }

    /* Scaling modes */
    .canvas-container.scale-fit canvas {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .canvas-container.scale-full canvas {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .canvas-container.scale-native {
      overflow: auto;
      justify-content: flex-start;
      align-items: flex-start;
    }
    .canvas-container.scale-native canvas {
      /* Native size - no scaling */
    }

    canvas {
      display: block;
      background: #000;
    }

    /* Disconnected overlay */
    .disconnected-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(26, 26, 46, 0.95);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 100;
    }
    .disconnected-overlay.hidden {
      display: none;
    }
    .disconnected-message {
      text-align: center;
      color: #a0a0b0;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .disconnected-icon {
      font-size: 48px;
      display: block;
      margin-bottom: 16px;
    }
    .disconnected-message p {
      margin: 8px 0;
      font-size: 18px;
    }
    .disconnected-hint {
      font-size: 13px !important;
      color: #6d6d8c;
    }
    /* Error overlay */
    .error-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 200;
    }
    .error-overlay.hidden {
      display: none;
    }
    .error-content {
      background: #2a1a1a;
      border: 2px solid #cc3333;
      border-radius: 8px;
      padding: 24px;
      max-width: 600px;
      max-height: 400px;
      overflow: auto;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    .error-title {
      color: #ff4444;
      font-size: 20px;
      margin: 0 0 16px 0;
      font-weight: bold;
    }
    .error-message {
      color: #ffcccc;
      font-size: 14px;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.5;
    }
    .error-dismiss {
      margin-top: 16px;
      padding: 8px 16px;
      background: #444;
      color: #fff;
      border: 1px solid #666;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .error-dismiss:hover {
      background: #555;
    }
    .toolbar button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  <div id="toolbar" class="toolbar${showToolbar ? '' : ' hidden'}">
    <button id="pause-btn" class="pause-btn" type="button">Pause</button>
    <button id="play-btn" class="play-btn hidden" type="button">Play</button>
    <button id="stop-btn" class="stop-btn" type="button">Stop</button>
    <button id="step-btn" class="step-btn hidden" type="button">Step</button>
    <button id="reload-btn" class="reload-btn" type="button">Reload</button>
    <label for="scale-select">Scale:</label>
    <select id="scale-select">
      <option value="fit"${initialMode === 'fit' ? ' selected' : ''}>Fit</option>
      <option value="full"${initialMode === 'full' ? ' selected' : ''}>Full</option>
      <option value="native"${initialMode === '1x' ? ' selected' : ''}>1x</option>
    </select>
  </div>
  <div id="canvas-container" class="canvas-container ${scaleClass}">
    <canvas id="game-canvas" width="800" height="600" tabindex="0"></canvas>
    <div id="disconnected-overlay" class="disconnected-overlay hidden">
      <div class="disconnected-message">
        <span class="disconnected-icon">&#x23F8;</span>
        <p>No canvas connected</p>
        <p class="disconnected-hint">Run a canvas script to reconnect</p>
      </div>
    </div>
    <div id="error-overlay" class="error-overlay hidden">
      <div class="error-content">
        <h3 class="error-title">Runtime Error</h3>
        <pre class="error-message" id="error-message"></pre>
        <button class="error-dismiss" id="error-dismiss-btn">Dismiss</button>
      </div>
    </div>
  </div>
  <script>
    (function() {
      var select = document.getElementById('scale-select');
      var container = document.getElementById('canvas-container');
      var reloadBtn = document.getElementById('reload-btn');
      var pauseBtn = document.getElementById('pause-btn');
      var playBtn = document.getElementById('play-btn');
      var stopBtn = document.getElementById('stop-btn');
      var stepBtn = document.getElementById('step-btn');
      var disconnectedOverlay = document.getElementById('disconnected-overlay');
      var errorOverlay = document.getElementById('error-overlay');
      var errorMessage = document.getElementById('error-message');
      var errorDismissBtn = document.getElementById('error-dismiss-btn');

      if (select) {
        select.addEventListener('change', function() {
          // Remove all scale classes
          container.classList.remove('scale-fit', 'scale-full', 'scale-native');
          // Add the selected scale class
          var mode = select.value;
          container.classList.add('scale-' + mode);
        });
      }

      if (reloadBtn) {
        reloadBtn.addEventListener('click', function() {
          if (window.opener) {
            window.opener.postMessage({ type: 'canvas-reload' }, '*');
          }
        });
      }

      if (pauseBtn) {
        pauseBtn.addEventListener('click', function() {
          if (window.opener) {
            window.opener.postMessage({ type: 'canvas-pause' }, '*');
          }
        });
      }

      if (playBtn) {
        playBtn.addEventListener('click', function() {
          if (window.opener) {
            window.opener.postMessage({ type: 'canvas-play' }, '*');
          }
        });
      }

      if (stopBtn) {
        stopBtn.addEventListener('click', function() {
          if (window.opener) {
            window.opener.postMessage({ type: 'canvas-stop' }, '*');
          }
        });
      }

      if (stepBtn) {
        stepBtn.addEventListener('click', function() {
          if (window.opener) {
            window.opener.postMessage({ type: 'canvas-step' }, '*');
          }
        });
      }

      // Listen for control state updates from parent
      // Dismiss error overlay
      if (errorDismissBtn) {
        errorDismissBtn.addEventListener('click', function() {
          errorOverlay.classList.add('hidden');
        });
      }

      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'canvas-control-state') {
          var isRunning = event.data.isRunning;
          var isPaused = event.data.isPaused;

          if (isRunning && !isPaused) {
            // Running, not paused: show Pause, hide Play/Step
            pauseBtn.classList.remove('hidden');
            playBtn.classList.add('hidden');
            stepBtn.classList.add('hidden');
          } else if (isRunning && isPaused) {
            // Paused: show Play/Step, hide Pause
            pauseBtn.classList.add('hidden');
            playBtn.classList.remove('hidden');
            stepBtn.classList.remove('hidden');
          }
        } else if (event.data && event.data.type === 'canvas-disconnected') {
          // Show overlay and disable toolbar buttons
          disconnectedOverlay.classList.remove('hidden');
          reloadBtn.disabled = true;
          pauseBtn.disabled = true;
          playBtn.disabled = true;
          stopBtn.disabled = true;
          stepBtn.disabled = true;
        } else if (event.data && event.data.type === 'canvas-connected') {
          // Hide overlay and re-enable toolbar buttons
          disconnectedOverlay.classList.add('hidden');
          reloadBtn.disabled = false;
          pauseBtn.disabled = false;
          playBtn.disabled = false;
          stopBtn.disabled = false;
          stepBtn.disabled = false;
        } else if (event.data && event.data.type === 'canvas-error') {
          // Show error overlay with message
          if (errorMessage && errorOverlay) {
            errorMessage.textContent = event.data.error || 'Unknown error';
            errorOverlay.classList.remove('hidden');
          }
        } else if (event.data && event.data.type === 'canvas-error-clear') {
          // Hide error overlay
          if (errorOverlay) {
            errorOverlay.classList.add('hidden');
          }
        } else if (event.data && event.data.type === 'canvas-fonts') {
          // Load fonts transferred from main window (popup has isolated document.fonts)
          (event.data.fonts || []).forEach(function(fontInfo) {
            try {
              var base64 = fontInfo.dataUrl.split(',')[1];
              var binary = atob(base64);
              var buffer = new ArrayBuffer(binary.length);
              var view = new Uint8Array(buffer);
              for (var i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
              new FontFace(fontInfo.name, buffer).load().then(function(f) { document.fonts.add(f); });
            } catch (e) { console.error('Failed to load font:', fontInfo.name, e); }
          });
        }
      });
    })();
  </script>
</body>
</html>
`
}
