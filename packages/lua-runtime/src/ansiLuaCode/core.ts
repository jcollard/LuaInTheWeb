/**
 * Core ANSI Lua code - lifecycle, output, colors, timing, and color constants.
 */

export const ansiLuaCoreCode = `
    local _ansi = {}

    -- Terminal dimensions
    _ansi.COLS = 80
    _ansi.ROWS = 25

    -- Terminal lifecycle
    function _ansi.start()
      if __ansi_is_active() then
        error("ANSI terminal is already running. Call ansi.stop() first.")
      end
      __ansi_start():await()
    end

    function _ansi.stop()
      __ansi_stop()
    end

    -- Store the user's callback and wrap with error handling
    local __user_tick_callback = nil
    local __user_tick_location = nil

    function _ansi.tick(callback)
      __user_tick_callback = callback
      -- Capture callback's definition location for better error messages
      local info = debug.getinfo(callback, "S")
      if info then
        local source = info.source or "?"
        local line = info.linedefined or 0
        if source:sub(1, 1) == "@" then
          source = source:sub(2)
        end
        __user_tick_location = source .. ":" .. line
      end
      -- Create a wrapper that uses xpcall to capture stack trace on error
      __ansi_setOnTickCallback(function()
        if __user_tick_callback then
          local success, err = xpcall(__user_tick_callback, function(e)
            return debug.traceback(e, 2)
          end)
          if not success then
            local errStr = tostring(err)
            if __user_tick_location and not errStr:match(":%d+:") then
              err = __user_tick_location .. ": " .. errStr
            end
            error(err, 0)
          end
        end
      end)
    end

    -- Terminal output
    function _ansi.print(text)
      __ansi_write(tostring(text))
    end

    function _ansi.set_cursor(row, col)
      __ansi_setCursor(row, col)
    end

    function _ansi.clear()
      __ansi_clear()
    end

    -- Helper function to parse hex color string to RGB
    local function ansi_parse_hex(hex)
      local color = hex:sub(2)
      local len = #color
      local r, g, b

      if len == 3 then
        local r1 = tonumber(color:sub(1, 1), 16)
        local g1 = tonumber(color:sub(2, 2), 16)
        local b1 = tonumber(color:sub(3, 3), 16)
        if not r1 or not g1 or not b1 then
          error("Invalid hex color: " .. hex)
        end
        r = r1 * 17
        g = g1 * 17
        b = b1 * 17
      elseif len == 6 then
        r = tonumber(color:sub(1, 2), 16)
        g = tonumber(color:sub(3, 4), 16)
        b = tonumber(color:sub(5, 6), 16)
        if not r or not g or not b then
          error("Invalid hex color: " .. hex)
        end
      else
        error("Invalid hex color format: " .. hex .. ". Expected #RGB or #RRGGBB")
      end

      return r, g, b
    end

    -- Color functions
    function _ansi.foreground(r, g, b)
      if type(r) == 'string' and r:sub(1, 1) == '#' then
        local hr, hg, hb = ansi_parse_hex(r)
        __ansi_setForeground(hr, hg, hb)
      else
        __ansi_setForeground(r, g, b)
      end
    end

    function _ansi.background(r, g, b)
      if type(r) == 'string' and r:sub(1, 1) == '#' then
        local hr, hg, hb = ansi_parse_hex(r)
        __ansi_setBackground(hr, hg, hb)
      else
        __ansi_setBackground(r, g, b)
      end
    end

    function _ansi.reset()
      __ansi_reset()
    end

    -- Timing
    function _ansi.get_delta()
      return __ansi_getDelta()
    end

    function _ansi.get_time()
      return __ansi_getTime()
    end

    -- Standard CGA/VGA color palette
    _ansi.colors = {
      BLACK         = {0, 0, 0},
      BLUE          = {0, 0, 170},
      GREEN         = {0, 170, 0},
      CYAN          = {0, 170, 170},
      RED           = {170, 0, 0},
      MAGENTA       = {170, 0, 170},
      BROWN         = {170, 85, 0},
      LIGHT_GRAY    = {170, 170, 170},
      DARK_GRAY     = {85, 85, 85},
      BRIGHT_BLUE   = {85, 85, 255},
      BRIGHT_GREEN  = {85, 255, 85},
      BRIGHT_CYAN   = {85, 255, 255},
      BRIGHT_RED    = {255, 85, 85},
      BRIGHT_MAGENTA = {255, 85, 255},
      YELLOW        = {255, 255, 85},
      WHITE         = {255, 255, 255},
    }
`
