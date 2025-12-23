/**
 * Lua wrapper code for the canvas module.
 * This string is executed in the Lua engine to create the canvas table
 * and all its functions.
 *
 * Extracted from setupCanvasAPI.ts to keep files under line limit.
 */

export const canvasLuaCode = `
    local _canvas = {}

    -- Canvas lifecycle
    function _canvas.start()
      if __canvas_is_active() then
        error("Canvas is already running. Call canvas.stop() first.")
      end
      __canvas_start():await()
    end

    function _canvas.stop()
      __canvas_stop()
    end

    -- Store the user's callback and wrap with error handling
    local __user_tick_callback = nil
    local __user_tick_location = nil  -- Stores callback definition location

    function _canvas.tick(callback)
      __user_tick_callback = callback
      -- Capture callback's definition location for better error messages
      local info = debug.getinfo(callback, "S")
      if info then
        local source = info.source or "?"
        local line = info.linedefined or 0
        -- Clean up source name (remove @ prefix if present)
        if source:sub(1, 1) == "@" then
          source = source:sub(2)
        end
        __user_tick_location = source .. ":" .. line
      end
      -- Create a wrapper that uses xpcall to capture stack trace on error
      __canvas_setOnDrawCallback(function()
        if __user_tick_callback then
          local success, err = xpcall(__user_tick_callback, function(e)
            -- Capture stack trace, skip internal frames
            return debug.traceback(e, 2)
          end)
          if not success then
            -- If error doesn't have Lua line info, add callback location
            local errStr = tostring(err)
            if __user_tick_location and not errStr:match(":%d+:") then
              err = __user_tick_location .. ": " .. errStr
            end
            error(err, 0)  -- Re-throw with location included
          end
        end
      end)
    end

    -- Canvas configuration
    function _canvas.set_size(width, height)
      __canvas_setSize(width, height)
    end

    function _canvas.get_width()
      return __canvas_getWidth()
    end

    function _canvas.get_height()
      return __canvas_getHeight()
    end

    -- Drawing state
    function _canvas.clear()
      __canvas_clear()
    end

    -- Helper function to parse hex color string to RGBA
    local function parse_hex_color(hex)
      -- Remove the # prefix
      local color = hex:sub(2)
      local len = #color

      local r, g, b, a

      if len == 3 then
        -- Short form #RGB -> expand to #RRGGBB
        local r1 = tonumber(color:sub(1, 1), 16)
        local g1 = tonumber(color:sub(2, 2), 16)
        local b1 = tonumber(color:sub(3, 3), 16)
        if not r1 or not g1 or not b1 then
          error("Invalid hex color: " .. hex .. ". Contains non-hexadecimal characters")
        end
        r = r1 * 17
        g = g1 * 17
        b = b1 * 17
        a = 255
      elseif len == 6 then
        -- Full form #RRGGBB
        r = tonumber(color:sub(1, 2), 16)
        g = tonumber(color:sub(3, 4), 16)
        b = tonumber(color:sub(5, 6), 16)
        a = 255
        if not r or not g or not b then
          error("Invalid hex color: " .. hex .. ". Contains non-hexadecimal characters")
        end
      elseif len == 8 then
        -- Full form with alpha #RRGGBBAA
        r = tonumber(color:sub(1, 2), 16)
        g = tonumber(color:sub(3, 4), 16)
        b = tonumber(color:sub(5, 6), 16)
        a = tonumber(color:sub(7, 8), 16)
        if not r or not g or not b or not a then
          error("Invalid hex color: " .. hex .. ". Contains non-hexadecimal characters")
        end
      else
        error("Invalid hex color format: " .. hex .. ". Expected #RGB, #RRGGBB, or #RRGGBBAA")
      end

      return r, g, b, a
    end

    function _canvas.set_color(r, g, b, a)
      -- Check if first argument is a hex color string
      if type(r) == 'string' and r:sub(1, 1) == '#' then
        local hr, hg, hb, ha = parse_hex_color(r)
        __canvas_setColor(hr, hg, hb, ha)
      else
        __canvas_setColor(r, g, b, a)
      end
    end

    function _canvas.set_line_width(width)
      __canvas_setLineWidth(width)
    end

    -- Font styling
    function _canvas.set_font_size(size)
      __canvas_setFontSize(size)
    end

    function _canvas.set_font_family(family)
      __canvas_setFontFamily(family)
    end

    function _canvas.get_text_width(text)
      return __canvas_getTextWidth(text)
    end

    -- Shape drawing
    function _canvas.draw_rect(x, y, w, h)
      __canvas_rect(x, y, w, h)
    end

    function _canvas.fill_rect(x, y, w, h)
      __canvas_fillRect(x, y, w, h)
    end

    function _canvas.draw_circle(x, y, r)
      __canvas_circle(x, y, r)
    end

    function _canvas.fill_circle(x, y, r)
      __canvas_fillCircle(x, y, r)
    end

    function _canvas.draw_line(x1, y1, x2, y2)
      __canvas_line(x1, y1, x2, y2)
    end

    function _canvas.draw_text(x, y, text, options)
      local fontSize = nil
      local fontFamily = nil
      if options then
        fontSize = options.font_size
        fontFamily = options.font_family
      end
      __canvas_text(x, y, text, fontSize, fontFamily)
    end

    -- Image drawing
    function _canvas.draw_image(name, x, y, width, height)
      __canvas_drawImage(name, x, y, width, height)
    end

    -- Asset management
    _canvas.assets = {}

    function _canvas.assets.image(name, path)
      __canvas_assets_image(name, path)
    end

    function _canvas.assets.font(name, path)
      __canvas_assets_font(name, path)
    end

    function _canvas.assets.get_width(name)
      return __canvas_assets_getWidth(name)
    end

    function _canvas.assets.get_height(name)
      return __canvas_assets_getHeight(name)
    end

    -- Transformation functions
    function _canvas.translate(dx, dy)
      __canvas_translate(dx, dy)
    end

    function _canvas.rotate(angle)
      __canvas_rotate(angle)
    end

    function _canvas.scale(sx, sy)
      __canvas_scale(sx, sy)
    end

    function _canvas.save()
      __canvas_save()
    end

    function _canvas.restore()
      __canvas_restore()
    end

    function _canvas.transform(a, b, c, d, e, f)
      __canvas_transform(a, b, c, d, e, f)
    end

    function _canvas.set_transform(a, b, c, d, e, f)
      __canvas_setTransform(a, b, c, d, e, f)
    end

    function _canvas.reset_transform()
      __canvas_resetTransform()
    end

    -- Path API
    function _canvas.begin_path()
      __canvas_beginPath()
    end

    function _canvas.close_path()
      __canvas_closePath()
    end

    function _canvas.move_to(x, y)
      __canvas_moveTo(x, y)
    end

    function _canvas.line_to(x, y)
      __canvas_lineTo(x, y)
    end

    function _canvas.fill()
      __canvas_fill()
    end

    function _canvas.stroke()
      __canvas_stroke()
    end

    -- Timing
    function _canvas.get_delta()
      return __canvas_getDelta()
    end

    function _canvas.get_time()
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
    function _canvas.is_key_down(key)
      return __canvas_isKeyDown(normalize_key(key))
    end

    function _canvas.is_key_pressed(key)
      return __canvas_isKeyPressed(normalize_key(key))
    end

    -- Helper to convert JS array proxy to plain Lua table
    -- This ensures proper Lua errors with line numbers instead of JS TypeErrors
    local function to_lua_array(js_array)
      local t = {}
      for i = 1, #js_array do
        t[i] = js_array[i]
      end
      return t
    end

    function _canvas.get_keys_down()
      return to_lua_array(__canvas_getKeysDown())
    end

    function _canvas.get_keys_pressed()
      return to_lua_array(__canvas_getKeysPressed())
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
