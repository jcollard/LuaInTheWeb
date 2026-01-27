/**
 * Canvas View Provider
 *
 * Provides a WebView panel for canvas graphics rendering.
 * Communicates with the Lua runtime to receive draw commands and send input state.
 */

import * as vscode from 'vscode'
import type { DrawCommand, InputState } from '@lua-learning/canvas-runtime'

export class CanvasViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'luaCanvas.canvasView'

  private context: vscode.ExtensionContext
  private webviewView: vscode.WebviewView | undefined
  private webviewPanel: vscode.WebviewPanel | undefined
  private inputState: InputState = {
    keysDown: [],
    keysPressed: [],
    mouseX: 0,
    mouseY: 0,
    mouseButtonsDown: [],
    mouseButtonsPressed: [],
    gamepads: [],
  }
  private canvasWidth = 800
  private canvasHeight = 600

  constructor(context: vscode.ExtensionContext) {
    this.context = context
  }

  /**
   * Called when the webview view is resolved.
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.webviewView = webviewView

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    }

    webviewView.webview.html = this.getWebviewContent()

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((message) => {
      this.handleWebviewMessage(message)
    })
  }

  /**
   * Show the canvas in a separate panel.
   */
  showCanvas(): void {
    if (this.webviewPanel) {
      this.webviewPanel.reveal()
      return
    }

    this.webviewPanel = vscode.window.createWebviewPanel(
      'luaCanvas',
      'Lua Canvas',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri],
      }
    )

    this.webviewPanel.webview.html = this.getWebviewContent()

    // Handle messages from the webview
    this.webviewPanel.webview.onDidReceiveMessage((message) => {
      this.handleWebviewMessage(message)
    })

    this.webviewPanel.onDidDispose(() => {
      this.webviewPanel = undefined
    })
  }

  /**
   * Initialize the canvas with the given dimensions.
   */
  async initCanvas(width: number, height: number): Promise<void> {
    this.canvasWidth = width
    this.canvasHeight = height

    // Ensure canvas panel is shown
    if (!this.webviewPanel && !this.webviewView) {
      this.showCanvas()
    }

    // Send init message to webview
    this.postMessage({
      type: 'init',
      width,
      height,
    })
  }

  /**
   * Close the canvas.
   */
  closeCanvas(): void {
    this.postMessage({ type: 'stop' })
  }

  /**
   * Send draw commands to the webview.
   */
  sendDrawCommands(commands: unknown[]): void {
    this.postMessage({
      type: 'draw',
      commands: commands as DrawCommand[],
    })
  }

  /**
   * Get the current input state.
   */
  getInputState(): InputState {
    return this.inputState
  }

  /**
   * Load an image into the WebView.
   */
  loadImage(name: string, dataUrl: string): void {
    this.postMessage({
      type: 'loadImage',
      name,
      dataUrl,
    })
  }

  /**
   * Load audio into the WebView.
   */
  loadAudio(name: string, dataUrl: string): void {
    this.postMessage({
      type: 'loadAudio',
      name,
      dataUrl,
    })
  }

  /**
   * Load a font into the WebView.
   */
  loadFont(name: string, dataUrl: string): void {
    this.postMessage({
      type: 'loadFont',
      name,
      dataUrl,
    })
  }

  /**
   * Handle messages from the webview.
   */
  private handleWebviewMessage(message: { type: string; [key: string]: unknown }): void {
    switch (message.type) {
      case 'input':
        this.inputState = message.state as InputState
        break
      case 'ready':
        console.log('Canvas webview ready')
        break
      case 'error':
        console.error('Canvas error:', message.error)
        break
    }
  }

  /**
   * Post a message to the webview.
   */
  private postMessage(message: unknown): void {
    if (this.webviewPanel) {
      this.webviewPanel.webview.postMessage(message)
    } else if (this.webviewView) {
      this.webviewView.webview.postMessage(message)
    }
  }

  /**
   * Generate the webview HTML content.
   */
  private getWebviewContent(): string {
    // Get configuration
    const config = vscode.workspace.getConfiguration('luaCanvas')
    const defaultWidth = config.get<number>('canvasWidth') ?? 800
    const defaultHeight = config.get<number>('canvasHeight') ?? 600

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:;">
  <title>Lua Canvas</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #1e1e1e;
      overflow: hidden;
    }
    #canvas-container {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    #game-canvas {
      background: #000;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    .placeholder {
      color: #888;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="canvas-container">
    <canvas id="game-canvas" width="${defaultWidth}" height="${defaultHeight}"></canvas>
  </div>

  <script>
    (function() {
      const vscode = acquireVsCodeApi();
      const canvas = document.getElementById('game-canvas');
      const ctx = canvas.getContext('2d');

      // Input state
      const inputState = {
        keysDown: [],
        keysPressed: [],
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
        gamepads: []
      };

      // Image cache for assets
      const imageCache = new Map();

      // Font state
      let currentFontSize = 16;
      let currentFontFamily = 'monospace';

      // Initialize canvas
      function initCanvas(width, height) {
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
      }

      // Handle draw commands
      function handleDrawCommands(commands) {
        for (const cmd of commands) {
          executeDrawCommand(cmd);
        }
      }

      // Execute a single draw command
      function executeDrawCommand(cmd) {
        switch (cmd.type) {
          case 'clear':
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;

          case 'clearRect':
            ctx.clearRect(cmd.x, cmd.y, cmd.width, cmd.height);
            break;

          case 'setColor':
            const alpha = cmd.a !== undefined ? cmd.a / 255 : 1;
            const color = \`rgba(\${cmd.r}, \${cmd.g}, \${cmd.b}, \${alpha})\`;
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            break;

          case 'setLineWidth':
            ctx.lineWidth = cmd.width;
            break;

          case 'setFontSize':
            currentFontSize = cmd.size;
            ctx.font = \`\${currentFontSize}px \${currentFontFamily}\`;
            break;

          case 'setFontFamily':
            currentFontFamily = cmd.family;
            ctx.font = \`\${currentFontSize}px \${currentFontFamily}\`;
            break;

          case 'setSize':
            canvas.width = cmd.width;
            canvas.height = cmd.height;
            break;

          case 'rect':
            ctx.strokeRect(cmd.x, cmd.y, cmd.width, cmd.height);
            break;

          case 'fillRect':
            ctx.fillRect(cmd.x, cmd.y, cmd.width, cmd.height);
            break;

          case 'circle':
            ctx.beginPath();
            ctx.arc(cmd.x, cmd.y, cmd.radius, 0, Math.PI * 2);
            ctx.stroke();
            break;

          case 'fillCircle':
            ctx.beginPath();
            ctx.arc(cmd.x, cmd.y, cmd.radius, 0, Math.PI * 2);
            ctx.fill();
            break;

          case 'line':
            ctx.beginPath();
            ctx.moveTo(cmd.x1, cmd.y1);
            ctx.lineTo(cmd.x2, cmd.y2);
            ctx.stroke();
            break;

          case 'text':
            const font = \`\${cmd.fontSize || currentFontSize}px \${cmd.fontFamily || currentFontFamily}\`;
            ctx.font = font;
            if (cmd.maxWidth) {
              ctx.fillText(cmd.text, cmd.x, cmd.y, cmd.maxWidth);
            } else {
              ctx.fillText(cmd.text, cmd.x, cmd.y);
            }
            break;

          case 'strokeText':
            const strokeFont = \`\${cmd.fontSize || currentFontSize}px \${cmd.fontFamily || currentFontFamily}\`;
            ctx.font = strokeFont;
            if (cmd.maxWidth) {
              ctx.strokeText(cmd.text, cmd.x, cmd.y, cmd.maxWidth);
            } else {
              ctx.strokeText(cmd.text, cmd.x, cmd.y);
            }
            break;

          case 'drawImage': {
            const img = imageCache.get(cmd.name);
            if (img) {
              if (cmd.sx !== undefined) {
                // Source cropping mode
                ctx.drawImage(img, cmd.sx, cmd.sy, cmd.sw, cmd.sh, cmd.x, cmd.y, cmd.width, cmd.height);
              } else if (cmd.width !== undefined) {
                // Scaled mode
                ctx.drawImage(img, cmd.x, cmd.y, cmd.width, cmd.height);
              } else {
                // Simple mode
                ctx.drawImage(img, cmd.x, cmd.y);
              }
            }
            break;
          }

          case 'translate':
            ctx.translate(cmd.dx, cmd.dy);
            break;

          case 'rotate':
            ctx.rotate(cmd.angle);
            break;

          case 'scale':
            ctx.scale(cmd.sx, cmd.sy);
            break;

          case 'save':
            ctx.save();
            break;

          case 'restore':
            ctx.restore();
            break;

          case 'resetTransform':
            ctx.resetTransform();
            break;

          case 'beginPath':
            ctx.beginPath();
            break;

          case 'closePath':
            ctx.closePath();
            break;

          case 'moveTo':
            ctx.moveTo(cmd.x, cmd.y);
            break;

          case 'lineTo':
            ctx.lineTo(cmd.x, cmd.y);
            break;

          case 'fill':
            ctx.fill();
            break;

          case 'stroke':
            ctx.stroke();
            break;

          case 'arc':
            ctx.arc(cmd.x, cmd.y, cmd.radius, cmd.startAngle, cmd.endAngle, cmd.counterclockwise);
            break;

          case 'setGlobalAlpha':
            ctx.globalAlpha = cmd.alpha;
            break;

          case 'setCompositeOperation':
            ctx.globalCompositeOperation = cmd.operation;
            break;

          case 'setTextAlign':
            ctx.textAlign = cmd.align;
            break;

          case 'setTextBaseline':
            ctx.textBaseline = cmd.baseline;
            break;

          case 'setImageSmoothing':
            ctx.imageSmoothingEnabled = cmd.enabled;
            break;

          case 'setLineCap':
            ctx.lineCap = cmd.cap;
            break;

          case 'setLineJoin':
            ctx.lineJoin = cmd.join;
            break;

          case 'setLineDash':
            ctx.setLineDash(cmd.segments);
            break;

          default:
            // Unknown command - ignore
            break;
        }
      }

      // Set up input event listeners
      canvas.tabIndex = 0;
      canvas.focus();

      canvas.addEventListener('keydown', (e) => {
        e.preventDefault();
        if (!inputState.keysDown.includes(e.code)) {
          inputState.keysDown.push(e.code);
          inputState.keysPressed.push(e.code);
        }
        sendInputState();
      });

      canvas.addEventListener('keyup', (e) => {
        e.preventDefault();
        const idx = inputState.keysDown.indexOf(e.code);
        if (idx !== -1) {
          inputState.keysDown.splice(idx, 1);
        }
        sendInputState();
      });

      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        inputState.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        inputState.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        sendInputState();
      });

      canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (!inputState.mouseButtonsDown.includes(e.button)) {
          inputState.mouseButtonsDown.push(e.button);
          inputState.mouseButtonsPressed.push(e.button);
        }
        sendInputState();
      });

      canvas.addEventListener('mouseup', (e) => {
        const idx = inputState.mouseButtonsDown.indexOf(e.button);
        if (idx !== -1) {
          inputState.mouseButtonsDown.splice(idx, 1);
        }
        sendInputState();
      });

      canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });

      // Send input state to extension
      function sendInputState() {
        vscode.postMessage({
          type: 'input',
          state: inputState
        });
        // Clear pressed arrays after sending
        inputState.keysPressed = [];
        inputState.mouseButtonsPressed = [];
      }

      // Handle messages from the extension
      window.addEventListener('message', (event) => {
        const message = event.data;
        switch (message.type) {
          case 'init':
            initCanvas(message.width, message.height);
            break;

          case 'draw':
            handleDrawCommands(message.commands);
            break;

          case 'loadImage': {
            const img = new Image();
            img.onload = () => {
              imageCache.set(message.name, img);
              vscode.postMessage({ type: 'imageLoaded', name: message.name });
            };
            img.onerror = () => {
              vscode.postMessage({ type: 'imageError', name: message.name });
            };
            img.src = message.dataUrl;
            break;
          }

          case 'loadAudio': {
            // Store audio data URL for later playback
            const audioElement = new Audio(message.dataUrl);
            audioElement.preload = 'auto';
            window.__audioCache = window.__audioCache || new Map();
            window.__audioCache.set(message.name, audioElement);
            vscode.postMessage({ type: 'audioLoaded', name: message.name });
            break;
          }

          case 'loadFont': {
            // Load custom font using FontFace API
            const fontName = message.name;
            const fontFace = new FontFace(fontName, 'url(' + message.dataUrl + ')');
            fontFace.load().then(function(loadedFont) {
              document.fonts.add(loadedFont);
              vscode.postMessage({ type: 'fontLoaded', name: fontName });
            }).catch(function(error) {
              vscode.postMessage({ type: 'fontError', name: fontName, error: error.message });
            });
            break;
          }

          case 'stop':
            // Clear canvas
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
        }
      });

      // Notify extension that webview is ready
      vscode.postMessage({ type: 'ready' });
    })();
  </script>
</body>
</html>`
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    if (this.webviewPanel) {
      this.webviewPanel.dispose()
    }
  }
}
