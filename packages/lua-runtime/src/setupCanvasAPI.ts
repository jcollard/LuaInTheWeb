/**
 * Shared canvas API setup for Lua processes.
 * Used by both LuaReplProcess and LuaScriptProcess to avoid code duplication.
 */

import type { LuaEngine } from 'wasmoon'
import type { CanvasController } from './CanvasController'

/**
 * Set up canvas API functions in the Lua engine.
 * This registers all the JS functions and Lua wrapper code needed for
 * canvas.start(), canvas.stop(), and drawing/input functions.
 *
 * @param engine - The Lua engine to set up
 * @param getController - Function to get the canvas controller (allows lazy access)
 */
export function setupCanvasAPI(
  engine: LuaEngine,
  getController: () => CanvasController | null
): void {
  // --- Canvas lifecycle functions ---
  engine.global.set('__canvas_is_active', () => {
    return getController()?.isActive() ?? false
  })

  engine.global.set('__canvas_start', () => {
    const controller = getController()
    if (!controller) {
      throw new Error('Canvas not available')
    }
    return controller.start()
  })

  engine.global.set('__canvas_stop', () => {
    const controller = getController()
    if (controller?.isActive()) {
      controller.stop()
    }
  })

  engine.global.set('__canvas_onDraw', (callback: () => void) => {
    getController()?.setOnDrawCallback(callback)
  })

  // --- Drawing functions ---
  engine.global.set('__canvas_clear', () => {
    getController()?.clear()
  })

  engine.global.set('__canvas_setColor', (r: number, g: number, b: number, a?: number | null) => {
    getController()?.setColor(r, g, b, a ?? undefined)
  })

  engine.global.set('__canvas_setLineWidth', (width: number) => {
    getController()?.setLineWidth(width)
  })

  engine.global.set('__canvas_setSize', (width: number, height: number) => {
    getController()?.setSize(width, height)
  })

  engine.global.set('__canvas_rect', (x: number, y: number, width: number, height: number) => {
    getController()?.drawRect(x, y, width, height)
  })

  engine.global.set('__canvas_fillRect', (x: number, y: number, width: number, height: number) => {
    getController()?.fillRect(x, y, width, height)
  })

  engine.global.set('__canvas_circle', (x: number, y: number, radius: number) => {
    getController()?.drawCircle(x, y, radius)
  })

  engine.global.set('__canvas_fillCircle', (x: number, y: number, radius: number) => {
    getController()?.fillCircle(x, y, radius)
  })

  engine.global.set('__canvas_line', (x1: number, y1: number, x2: number, y2: number) => {
    getController()?.drawLine(x1, y1, x2, y2)
  })

  engine.global.set('__canvas_text', (x: number, y: number, text: string) => {
    getController()?.drawText(x, y, text)
  })

  // --- Timing functions ---
  engine.global.set('__canvas_getDelta', () => {
    return getController()?.getDelta() ?? 0
  })

  engine.global.set('__canvas_getTime', () => {
    return getController()?.getTime() ?? 0
  })

  // --- Canvas dimensions ---
  engine.global.set('__canvas_getWidth', () => {
    return getController()?.getWidth() ?? 0
  })

  engine.global.set('__canvas_getHeight', () => {
    return getController()?.getHeight() ?? 0
  })

  // --- Input functions ---
  engine.global.set('__canvas_isKeyDown', (key: string) => {
    return getController()?.isKeyDown(key) ?? false
  })

  engine.global.set('__canvas_isKeyPressed', (key: string) => {
    return getController()?.isKeyPressed(key) ?? false
  })

  engine.global.set('__canvas_getKeysDown', () => {
    return getController()?.getKeysDown() ?? []
  })

  engine.global.set('__canvas_getKeysPressed', () => {
    return getController()?.getKeysPressed() ?? []
  })

  engine.global.set('__canvas_getMouseX', () => {
    return getController()?.getMouseX() ?? 0
  })

  engine.global.set('__canvas_getMouseY', () => {
    return getController()?.getMouseY() ?? 0
  })

  engine.global.set('__canvas_isMouseDown', (button: number) => {
    return getController()?.isMouseButtonDown(button) ?? false
  })

  engine.global.set('__canvas_isMousePressed', (button: number) => {
    return getController()?.isMouseButtonPressed(button) ?? false
  })

  // --- Set up Lua-side canvas table ---
  engine.doStringSync(`
    canvas = {}

    -- Canvas lifecycle
    function canvas.start()
      if __canvas_is_active() then
        error("Canvas is already running. Call canvas.stop() first.")
      end
      __canvas_start():await()
    end

    function canvas.stop()
      __canvas_stop()
    end

    function canvas.on_draw(callback)
      __canvas_onDraw(callback)
    end

    -- Canvas configuration
    function canvas.set_size(width, height)
      __canvas_setSize(width, height)
    end

    function canvas.get_width()
      return __canvas_getWidth()
    end

    function canvas.get_height()
      return __canvas_getHeight()
    end

    -- Drawing state
    function canvas.clear()
      __canvas_clear()
    end

    function canvas.set_color(r, g, b, a)
      __canvas_setColor(r, g, b, a)
    end

    function canvas.set_line_width(width)
      __canvas_setLineWidth(width)
    end

    -- Shape drawing
    function canvas.draw_rect(x, y, w, h)
      __canvas_rect(x, y, w, h)
    end

    function canvas.fill_rect(x, y, w, h)
      __canvas_fillRect(x, y, w, h)
    end

    function canvas.draw_circle(x, y, r)
      __canvas_circle(x, y, r)
    end

    function canvas.fill_circle(x, y, r)
      __canvas_fillCircle(x, y, r)
    end

    function canvas.draw_line(x1, y1, x2, y2)
      __canvas_line(x1, y1, x2, y2)
    end

    function canvas.draw_text(x, y, text)
      __canvas_text(x, y, text)
    end

    -- Timing
    function canvas.get_delta()
      return __canvas_getDelta()
    end

    function canvas.get_time()
      return __canvas_getTime()
    end

    -- Helper to normalize key names
    local function normalize_key(key)
      if type(key) ~= 'string' then return key end
      -- Single letter keys
      if #key == 1 and key:match('%a') then
        return 'Key' .. key:upper()
      end
      -- Arrow keys
      local arrows = { up = 'ArrowUp', down = 'ArrowDown', left = 'ArrowLeft', right = 'ArrowRight' }
      if arrows[key:lower()] then
        return arrows[key:lower()]
      end
      -- Space key
      if key:lower() == 'space' or key == ' ' then
        return 'Space'
      end
      -- Common keys
      local common = {
        enter = 'Enter', escape = 'Escape', esc = 'Escape',
        tab = 'Tab', shift = 'ShiftLeft', ctrl = 'ControlLeft',
        alt = 'AltLeft', backspace = 'Backspace'
      }
      if common[key:lower()] then
        return common[key:lower()]
      end
      return key
    end

    -- Keyboard input
    function canvas.is_key_down(key)
      return __canvas_isKeyDown(normalize_key(key))
    end

    function canvas.is_key_pressed(key)
      return __canvas_isKeyPressed(normalize_key(key))
    end

    function canvas.get_keys_down()
      return __canvas_getKeysDown()
    end

    function canvas.get_keys_pressed()
      return __canvas_getKeysPressed()
    end

    -- Mouse input
    function canvas.get_mouse_x()
      return __canvas_getMouseX()
    end

    function canvas.get_mouse_y()
      return __canvas_getMouseY()
    end

    function canvas.is_mouse_down(button)
      return __canvas_isMouseDown(button)
    end

    function canvas.is_mouse_pressed(button)
      return __canvas_isMousePressed(button)
    end

    -- Key constants for discoverability
    canvas.keys = {
      -- Letters
      A = 'KeyA', B = 'KeyB', C = 'KeyC', D = 'KeyD', E = 'KeyE',
      F = 'KeyF', G = 'KeyG', H = 'KeyH', I = 'KeyI', J = 'KeyJ',
      K = 'KeyK', L = 'KeyL', M = 'KeyM', N = 'KeyN', O = 'KeyO',
      P = 'KeyP', Q = 'KeyQ', R = 'KeyR', S = 'KeyS', T = 'KeyT',
      U = 'KeyU', V = 'KeyV', W = 'KeyW', X = 'KeyX', Y = 'KeyY', Z = 'KeyZ',

      -- Number row
      ['0'] = 'Digit0', ['1'] = 'Digit1', ['2'] = 'Digit2', ['3'] = 'Digit3',
      ['4'] = 'Digit4', ['5'] = 'Digit5', ['6'] = 'Digit6', ['7'] = 'Digit7',
      ['8'] = 'Digit8', ['9'] = 'Digit9',
      DIGIT_0 = 'Digit0', DIGIT_1 = 'Digit1', DIGIT_2 = 'Digit2', DIGIT_3 = 'Digit3',
      DIGIT_4 = 'Digit4', DIGIT_5 = 'Digit5', DIGIT_6 = 'Digit6', DIGIT_7 = 'Digit7',
      DIGIT_8 = 'Digit8', DIGIT_9 = 'Digit9',

      -- Arrow keys
      UP = 'ArrowUp', DOWN = 'ArrowDown', LEFT = 'ArrowLeft', RIGHT = 'ArrowRight',
      ARROW_UP = 'ArrowUp', ARROW_DOWN = 'ArrowDown', ARROW_LEFT = 'ArrowLeft', ARROW_RIGHT = 'ArrowRight',

      -- Function keys
      F1 = 'F1', F2 = 'F2', F3 = 'F3', F4 = 'F4', F5 = 'F5', F6 = 'F6',
      F7 = 'F7', F8 = 'F8', F9 = 'F9', F10 = 'F10', F11 = 'F11', F12 = 'F12',

      -- Modifier keys
      SHIFT = 'ShiftLeft', SHIFT_LEFT = 'ShiftLeft', SHIFT_RIGHT = 'ShiftRight',
      CTRL = 'ControlLeft', CTRL_LEFT = 'ControlLeft', CTRL_RIGHT = 'ControlRight',
      CONTROL = 'ControlLeft', CONTROL_LEFT = 'ControlLeft', CONTROL_RIGHT = 'ControlRight',
      ALT = 'AltLeft', ALT_LEFT = 'AltLeft', ALT_RIGHT = 'AltRight',
      META = 'MetaLeft', META_LEFT = 'MetaLeft', META_RIGHT = 'MetaRight',
      CAPS_LOCK = 'CapsLock',

      -- Special keys
      SPACE = 'Space', ENTER = 'Enter', ESCAPE = 'Escape', TAB = 'Tab',
      BACKSPACE = 'Backspace', DELETE = 'Delete', INSERT = 'Insert',
      HOME = 'Home', END = 'End', PAGE_UP = 'PageUp', PAGE_DOWN = 'PageDown',
      PRINT_SCREEN = 'PrintScreen', SCROLL_LOCK = 'ScrollLock', PAUSE = 'Pause',
      NUM_LOCK = 'NumLock',

      -- Numpad keys
      NUMPAD_0 = 'Numpad0', NUMPAD_1 = 'Numpad1', NUMPAD_2 = 'Numpad2', NUMPAD_3 = 'Numpad3',
      NUMPAD_4 = 'Numpad4', NUMPAD_5 = 'Numpad5', NUMPAD_6 = 'Numpad6', NUMPAD_7 = 'Numpad7',
      NUMPAD_8 = 'Numpad8', NUMPAD_9 = 'Numpad9',
      NUMPAD_ADD = 'NumpadAdd', NUMPAD_SUBTRACT = 'NumpadSubtract',
      NUMPAD_MULTIPLY = 'NumpadMultiply', NUMPAD_DIVIDE = 'NumpadDivide',
      NUMPAD_DECIMAL = 'NumpadDecimal', NUMPAD_ENTER = 'NumpadEnter',

      -- Punctuation and symbols
      MINUS = 'Minus', EQUAL = 'Equal', BRACKET_LEFT = 'BracketLeft', BRACKET_RIGHT = 'BracketRight',
      BACKSLASH = 'Backslash', SEMICOLON = 'Semicolon', QUOTE = 'Quote',
      BACKQUOTE = 'Backquote', COMMA = 'Comma', PERIOD = 'Period', SLASH = 'Slash',

      -- Context menu key
      CONTEXT_MENU = 'ContextMenu',
    }

    -- Register canvas as a module so require('canvas') works
    package.preload['canvas'] = function()
      return canvas
    end
  `)
}
