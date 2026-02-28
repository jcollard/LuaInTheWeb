/**
 * Input Lua code - keyboard, mouse input and key constants.
 */

export const canvasLuaInputCode = `
    -- Helper to normalize key names
    local function normalize_key(key)
      if type(key) ~= 'string' then return key end
      -- Single letter keys
      if #key == 1 and key:match('%a') then
        return 'Key' .. key:upper()
      end
      -- Single digit keys
      if #key == 1 and key:match('%d') then
        return 'Digit' .. key
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
    function _canvas.is_key_down(key)
      return __canvas_isKeyDown(normalize_key(key))
    end

    function _canvas.is_key_pressed(key)
      return __canvas_isKeyPressed(normalize_key(key))
    end

    -- Cache for keys_down Lua table (reduces GC pressure #608)
    local _keys_down_cache = {}
    local _keys_down_last_ref = nil

    -- Cache for keys_pressed Lua table (reduces GC pressure #608)
    local _keys_pressed_cache = {}
    local _keys_pressed_last_ref = nil

    function _canvas.get_keys_down()
      local js_array = __canvas_getKeysDown()
      -- JS returns same reference if unchanged (issue #597)
      if js_array ~= _keys_down_last_ref then
        _keys_down_last_ref = js_array
        -- Clear and repopulate cache table (reuse allocation)
        local i = 1
        while i <= #js_array do
          _keys_down_cache[i] = js_array[i]
          i = i + 1
        end
        -- Clear any extra entries from previous larger arrays
        while _keys_down_cache[i] ~= nil do
          _keys_down_cache[i] = nil
          i = i + 1
        end
      end
      return _keys_down_cache
    end

    function _canvas.get_keys_pressed()
      local js_array = __canvas_getKeysPressed()
      if js_array ~= _keys_pressed_last_ref then
        _keys_pressed_last_ref = js_array
        local i = 1
        while i <= #js_array do
          _keys_pressed_cache[i] = js_array[i]
          i = i + 1
        end
        while _keys_pressed_cache[i] ~= nil do
          _keys_pressed_cache[i] = nil
          i = i + 1
        end
      end
      return _keys_pressed_cache
    end

    -- Mouse input
    function _canvas.get_mouse_x()
      return __canvas_getMouseX()
    end

    function _canvas.get_mouse_y()
      return __canvas_getMouseY()
    end

    function _canvas.is_mouse_down(button)
      return __canvas_isMouseDown(button)
    end

    function _canvas.is_mouse_pressed(button)
      return __canvas_isMousePressed(button)
    end

    -- Gamepad input
    -- Note: Lua uses 1-based indexing, so we subtract 1 when calling JS functions

    function _canvas.get_gamepad_count()
      return __canvas_getGamepadCount()
    end

    function _canvas.is_gamepad_connected(index)
      return __canvas_isGamepadConnected(index - 1)
    end

    function _canvas.get_gamepad_button(gamepad_index, button)
      -- Both indices are 1-based in Lua, convert to 0-based for JS
      return __canvas_getGamepadButton(gamepad_index - 1, button - 1)
    end

    function _canvas.is_gamepad_button_pressed(gamepad_index, button)
      return __canvas_isGamepadButtonPressed(gamepad_index - 1, button - 1)
    end

    function _canvas.get_gamepad_axis(gamepad_index, axis)
      return __canvas_getGamepadAxis(gamepad_index - 1, axis - 1)
    end

    -- Gamepad button constants (1-based for Lua)
    -- Following W3C Standard Gamepad mapping with position-based names (SDL3/Unity convention)
    _canvas.buttons = {
      -- Position-based (PRIMARY - recommended for cross-platform code)
      SOUTH = 1, EAST = 2, WEST = 3, NORTH = 4,

      -- Xbox aliases
      A = 1, B = 2, X = 3, Y = 4,
      LB = 5, RB = 6, LT = 7, RT = 8,
      BACK = 9, START = 10,

      -- PlayStation aliases
      CROSS = 1, CIRCLE = 2, SQUARE = 3, TRIANGLE = 4,
      L1 = 5, R1 = 6, L2 = 7, R2 = 8,
      SELECT = 9, OPTIONS = 10, SHARE = 9,
      L3 = 11, R3 = 12,

      -- Generic names
      LEFT_BUMPER = 5, RIGHT_BUMPER = 6,
      LEFT_TRIGGER = 7, RIGHT_TRIGGER = 8,
      LEFT_STICK = 11, RIGHT_STICK = 12, LS = 11, RS = 12,
      DPAD_UP = 13, DPAD_DOWN = 14, DPAD_LEFT = 15, DPAD_RIGHT = 16,
      HOME = 17, GUIDE = 17,
    }

    -- Gamepad axis constants (1-based for Lua)
    _canvas.axes = {
      LEFT_STICK_X = 1,
      LEFT_STICK_Y = 2,
      RIGHT_STICK_X = 3,
      RIGHT_STICK_Y = 4,
    }

    -- Key constants for discoverability
    _canvas.keys = {
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
    -- Note: canvas is NOT a global - it must be accessed via require('canvas')
    package.preload['canvas'] = function()
      return _canvas
    end
`
