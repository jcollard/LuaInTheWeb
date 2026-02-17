/**
 * Input Lua code for ANSI terminal - keyboard input and key constants.
 */

export const ansiLuaInputCode = `
    -- Helper to normalize key names (same as canvas)
    local function ansi_normalize_key(key)
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
    function _ansi.is_key_down(key)
      return __ansi_isKeyDown(ansi_normalize_key(key))
    end

    function _ansi.is_key_pressed(key)
      return __ansi_isKeyPressed(ansi_normalize_key(key))
    end

    -- Cache for keys_down Lua table (reduces GC pressure)
    local _ansi_keys_down_cache = {}
    local _ansi_keys_down_last_ref = nil

    -- Cache for keys_pressed Lua table (reduces GC pressure)
    local _ansi_keys_pressed_cache = {}
    local _ansi_keys_pressed_last_ref = nil

    function _ansi.get_keys_down()
      local js_array = __ansi_getKeysDown()
      if js_array ~= _ansi_keys_down_last_ref then
        _ansi_keys_down_last_ref = js_array
        local i = 1
        while i <= #js_array do
          _ansi_keys_down_cache[i] = js_array[i]
          i = i + 1
        end
        while _ansi_keys_down_cache[i] ~= nil do
          _ansi_keys_down_cache[i] = nil
          i = i + 1
        end
      end
      return _ansi_keys_down_cache
    end

    function _ansi.get_keys_pressed()
      local js_array = __ansi_getKeysPressed()
      if js_array ~= _ansi_keys_pressed_last_ref then
        _ansi_keys_pressed_last_ref = js_array
        local i = 1
        while i <= #js_array do
          _ansi_keys_pressed_cache[i] = js_array[i]
          i = i + 1
        end
        while _ansi_keys_pressed_cache[i] ~= nil do
          _ansi_keys_pressed_cache[i] = nil
          i = i + 1
        end
      end
      return _ansi_keys_pressed_cache
    end

    -- Key constants (same as canvas.keys)
    _ansi.keys = {
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
    }

    -- Register ansi as a module so require('ansi') works
    package.preload['ansi'] = function()
      return _ansi
    end
`
