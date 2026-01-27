/**
 * Canvas WebView Script
 *
 * This script runs inside the VS Code webview and handles:
 * - Canvas rendering from DrawCommands
 * - Input capture (keyboard, mouse)
 * - Communication with the extension host
 *
 * Note: This is bundled separately for the webview context.
 */

import type { DrawCommand, InputState } from '@lua-learning/canvas-runtime'

// Declare VS Code API
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void
  getState(): unknown
  setState(state: unknown): void
}

// Initialize VS Code API
const vscode = acquireVsCodeApi()

// Get canvas and context
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

// Input state
const inputState: InputState = {
  keysDown: [],
  keysPressed: [],
  mouseX: 0,
  mouseY: 0,
  mouseButtonsDown: [],
  mouseButtonsPressed: [],
  gamepads: Array.from({ length: 4 }, () => ({
    connected: false,
    id: '',
    buttons: new Array(17).fill(0),
    buttonsPressed: [],
    axes: new Array(4).fill(0),
  })),
}

// Image cache for assets
const imageCache = new Map<string, HTMLImageElement>()

// Audio cache for sounds
const audioCache = new Map<string, HTMLAudioElement>()

// Font state
let currentFontSize = 16
let currentFontFamily = 'monospace'

/**
 * Initialize canvas with given dimensions.
 */
function initCanvas(width: number, height: number): void {
  canvas.width = width
  canvas.height = height
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
}

/**
 * Handle an array of draw commands.
 */
function handleDrawCommands(commands: DrawCommand[]): void {
  for (const cmd of commands) {
    executeDrawCommand(cmd)
  }
}

/**
 * Execute a single draw command.
 */
function executeDrawCommand(cmd: DrawCommand): void {
  switch (cmd.type) {
    case 'clear':
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      break

    case 'clearRect':
      ctx.clearRect(cmd.x, cmd.y, cmd.width, cmd.height)
      break

    case 'setColor': {
      const alpha = cmd.a !== undefined ? cmd.a / 255 : 1
      const color = `rgba(${cmd.r}, ${cmd.g}, ${cmd.b}, ${alpha})`
      ctx.fillStyle = color
      ctx.strokeStyle = color
      break
    }

    case 'setLineWidth':
      ctx.lineWidth = cmd.width
      break

    case 'setFontSize':
      currentFontSize = cmd.size
      ctx.font = `${currentFontSize}px ${currentFontFamily}`
      break

    case 'setFontFamily':
      currentFontFamily = cmd.family
      ctx.font = `${currentFontSize}px ${currentFontFamily}`
      break

    case 'setSize':
      canvas.width = cmd.width
      canvas.height = cmd.height
      break

    case 'rect':
      ctx.strokeRect(cmd.x, cmd.y, cmd.width, cmd.height)
      break

    case 'fillRect':
      ctx.fillRect(cmd.x, cmd.y, cmd.width, cmd.height)
      break

    case 'circle':
      ctx.beginPath()
      ctx.arc(cmd.x, cmd.y, cmd.radius, 0, Math.PI * 2)
      ctx.stroke()
      break

    case 'fillCircle':
      ctx.beginPath()
      ctx.arc(cmd.x, cmd.y, cmd.radius, 0, Math.PI * 2)
      ctx.fill()
      break

    case 'line':
      ctx.beginPath()
      ctx.moveTo(cmd.x1, cmd.y1)
      ctx.lineTo(cmd.x2, cmd.y2)
      ctx.stroke()
      break

    case 'text': {
      const font = `${cmd.fontSize || currentFontSize}px ${cmd.fontFamily || currentFontFamily}`
      ctx.font = font
      if (cmd.maxWidth) {
        ctx.fillText(cmd.text, cmd.x, cmd.y, cmd.maxWidth)
      } else {
        ctx.fillText(cmd.text, cmd.x, cmd.y)
      }
      break
    }

    case 'strokeText': {
      const strokeFont = `${cmd.fontSize || currentFontSize}px ${cmd.fontFamily || currentFontFamily}`
      ctx.font = strokeFont
      if (cmd.maxWidth) {
        ctx.strokeText(cmd.text, cmd.x, cmd.y, cmd.maxWidth)
      } else {
        ctx.strokeText(cmd.text, cmd.x, cmd.y)
      }
      break
    }

    case 'drawImage': {
      const img = imageCache.get(cmd.name)
      if (img) {
        if (cmd.sx !== undefined && cmd.sw !== undefined && cmd.sh !== undefined) {
          // Source cropping mode
          ctx.drawImage(
            img,
            cmd.sx,
            cmd.sy ?? 0,
            cmd.sw,
            cmd.sh,
            cmd.x,
            cmd.y,
            cmd.width ?? cmd.sw,
            cmd.height ?? cmd.sh
          )
        } else if (cmd.width !== undefined && cmd.height !== undefined) {
          // Scaled mode
          ctx.drawImage(img, cmd.x, cmd.y, cmd.width, cmd.height)
        } else {
          // Simple mode
          ctx.drawImage(img, cmd.x, cmd.y)
        }
      }
      break
    }

    case 'translate':
      ctx.translate(cmd.dx, cmd.dy)
      break

    case 'rotate':
      ctx.rotate(cmd.angle)
      break

    case 'scale':
      ctx.scale(cmd.sx, cmd.sy)
      break

    case 'save':
      ctx.save()
      break

    case 'restore':
      ctx.restore()
      break

    case 'transform':
      ctx.transform(cmd.a, cmd.b, cmd.c, cmd.d, cmd.e, cmd.f)
      break

    case 'setTransform':
      ctx.setTransform(cmd.a, cmd.b, cmd.c, cmd.d, cmd.e, cmd.f)
      break

    case 'resetTransform':
      ctx.resetTransform()
      break

    case 'beginPath':
      ctx.beginPath()
      break

    case 'closePath':
      ctx.closePath()
      break

    case 'moveTo':
      ctx.moveTo(cmd.x, cmd.y)
      break

    case 'lineTo':
      ctx.lineTo(cmd.x, cmd.y)
      break

    case 'fill':
      ctx.fill()
      break

    case 'stroke':
      ctx.stroke()
      break

    case 'arc':
      ctx.arc(cmd.x, cmd.y, cmd.radius, cmd.startAngle, cmd.endAngle, cmd.counterclockwise)
      break

    case 'arcTo':
      ctx.arcTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.radius)
      break

    case 'quadraticCurveTo':
      ctx.quadraticCurveTo(cmd.cpx, cmd.cpy, cmd.x, cmd.y)
      break

    case 'bezierCurveTo':
      ctx.bezierCurveTo(cmd.cp1x, cmd.cp1y, cmd.cp2x, cmd.cp2y, cmd.x, cmd.y)
      break

    case 'ellipse':
      ctx.ellipse(
        cmd.x,
        cmd.y,
        cmd.radiusX,
        cmd.radiusY,
        cmd.rotation,
        cmd.startAngle,
        cmd.endAngle,
        cmd.counterclockwise
      )
      break

    case 'roundRect':
      ctx.roundRect(cmd.x, cmd.y, cmd.width, cmd.height, cmd.radii)
      break

    case 'rectPath':
      ctx.rect(cmd.x, cmd.y, cmd.width, cmd.height)
      break

    case 'clip':
      ctx.clip(cmd.fillRule)
      break

    case 'setLineCap':
      ctx.lineCap = cmd.cap
      break

    case 'setLineJoin':
      ctx.lineJoin = cmd.join
      break

    case 'setMiterLimit':
      ctx.miterLimit = cmd.limit
      break

    case 'setLineDash':
      ctx.setLineDash(cmd.segments)
      break

    case 'setLineDashOffset':
      ctx.lineDashOffset = cmd.offset
      break

    case 'setFillStyle':
      if (typeof cmd.style === 'string') {
        ctx.fillStyle = cmd.style
      }
      // TODO: Handle gradient and pattern styles
      break

    case 'setStrokeStyle':
      if (typeof cmd.style === 'string') {
        ctx.strokeStyle = cmd.style
      }
      // TODO: Handle gradient and pattern styles
      break

    case 'setShadowColor':
      ctx.shadowColor = cmd.color
      break

    case 'setShadowBlur':
      ctx.shadowBlur = cmd.blur
      break

    case 'setShadowOffsetX':
      ctx.shadowOffsetX = cmd.offset
      break

    case 'setShadowOffsetY':
      ctx.shadowOffsetY = cmd.offset
      break

    case 'setShadow':
      ctx.shadowColor = cmd.color
      ctx.shadowBlur = cmd.blur
      ctx.shadowOffsetX = cmd.offsetX
      ctx.shadowOffsetY = cmd.offsetY
      break

    case 'clearShadow':
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      break

    case 'setGlobalAlpha':
      ctx.globalAlpha = cmd.alpha
      break

    case 'setCompositeOperation':
      ctx.globalCompositeOperation = cmd.operation
      break

    case 'setTextAlign':
      ctx.textAlign = cmd.align
      break

    case 'setTextBaseline':
      ctx.textBaseline = cmd.baseline
      break

    case 'setImageSmoothing':
      ctx.imageSmoothingEnabled = cmd.enabled
      break

    case 'setDirection':
      ctx.direction = cmd.direction
      break

    case 'setFilter':
      ctx.filter = cmd.filter
      break

    case 'putImageData': {
      const imageData = new ImageData(
        new Uint8ClampedArray(cmd.data),
        cmd.width,
        cmd.height
      )
      if (
        cmd.dirtyX !== undefined &&
        cmd.dirtyY !== undefined &&
        cmd.dirtyWidth !== undefined &&
        cmd.dirtyHeight !== undefined
      ) {
        ctx.putImageData(imageData, cmd.dx, cmd.dy, cmd.dirtyX, cmd.dirtyY, cmd.dirtyWidth, cmd.dirtyHeight)
      } else {
        ctx.putImageData(imageData, cmd.dx, cmd.dy)
      }
      break
    }

    // Audio commands
    case 'playSound': {
      const audio = audioCache.get(cmd.name)
      if (audio) {
        const clone = audio.cloneNode() as HTMLAudioElement
        clone.volume = cmd.volume
        clone.play().catch(() => { /* ignore autoplay errors */ })
      }
      break
    }

    case 'playMusic': {
      // For music, we'd need a dedicated music player
      // This is simplified for now
      break
    }

    case 'stopMusic':
    case 'pauseMusic':
    case 'resumeMusic':
    case 'setMusicVolume':
    case 'setMasterVolume':
    case 'mute':
    case 'unmute':
      // Audio control commands - implement as needed
      break

    default:
      // Unknown command - ignore
      break
  }
}

/**
 * Send input state to extension.
 */
function sendInputState(): void {
  vscode.postMessage({
    type: 'input',
    state: inputState,
  })
  // Clear pressed arrays after sending
  inputState.keysPressed = []
  inputState.mouseButtonsPressed = []
}

// Set up input event listeners
canvas.tabIndex = 0
canvas.focus()

canvas.addEventListener('keydown', (e) => {
  e.preventDefault()
  if (!inputState.keysDown.includes(e.code)) {
    inputState.keysDown.push(e.code)
    inputState.keysPressed.push(e.code)
  }
  sendInputState()
})

canvas.addEventListener('keyup', (e) => {
  e.preventDefault()
  const idx = inputState.keysDown.indexOf(e.code)
  if (idx !== -1) {
    inputState.keysDown.splice(idx, 1)
  }
  sendInputState()
})

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect()
  inputState.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width)
  inputState.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height)
  sendInputState()
})

canvas.addEventListener('mousedown', (e) => {
  e.preventDefault()
  canvas.focus()
  if (!inputState.mouseButtonsDown.includes(e.button)) {
    inputState.mouseButtonsDown.push(e.button)
    inputState.mouseButtonsPressed.push(e.button)
  }
  sendInputState()
})

canvas.addEventListener('mouseup', (e) => {
  const idx = inputState.mouseButtonsDown.indexOf(e.button)
  if (idx !== -1) {
    inputState.mouseButtonsDown.splice(idx, 1)
  }
  sendInputState()
})

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault()
})

// Handle messages from the extension
window.addEventListener('message', (event) => {
  const message = event.data as { type: string; [key: string]: unknown }
  switch (message.type) {
    case 'init':
      initCanvas(message.width as number, message.height as number)
      break

    case 'draw':
      handleDrawCommands(message.commands as DrawCommand[])
      break

    case 'loadImage': {
      const img = new Image()
      img.onload = () => {
        imageCache.set(message.name as string, img)
        vscode.postMessage({ type: 'imageLoaded', name: message.name })
      }
      img.onerror = () => {
        vscode.postMessage({ type: 'imageError', name: message.name })
      }
      img.src = message.dataUrl as string
      break
    }

    case 'loadAudio': {
      const audio = new Audio(message.dataUrl as string)
      audioCache.set(message.name as string, audio)
      vscode.postMessage({ type: 'audioLoaded', name: message.name })
      break
    }

    case 'stop':
      // Clear canvas
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      break
  }
})

// Notify extension that webview is ready
vscode.postMessage({ type: 'ready' })
