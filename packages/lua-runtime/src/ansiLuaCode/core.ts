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

    -- CRT effect
    -- ansi.crt(true)              -- enable with defaults
    -- ansi.crt(false)             -- disable
    -- ansi.crt(true, 0.7)         -- legacy: scale all defaults by 0.7
    -- ansi.crt({ scanlineIntensity = 0.8 }) -- per-effect config (enables automatically)
    function _ansi.crt(enabled_or_config, intensity)
      if type(enabled_or_config) == 'table' then
        -- Table form: ansi.crt({ scanlineIntensity = 0.8, curvature = 0.3 })
        __ansi_setCrt(true, nil, enabled_or_config)
      else
        local enabled = enabled_or_config
        if enabled == nil then enabled = true end
        if intensity ~= nil then
          __ansi_setCrt(enabled, intensity)
        else
          __ansi_setCrt(enabled)
        end
      end
    end

    -- Timing
    function _ansi.get_delta()
      return __ansi_getDelta()
    end

    function _ansi.get_time()
      return __ansi_getTime()
    end

    -- Screen Display
    function _ansi.create_screen(data)
      if type(data) ~= 'table' then
        error("ansi.create_screen() expects a table, got " .. type(data))
      end
      local id = __ansi_createScreen(data)
      local screen = { id = id }
      function screen:get_layers()
        return __ansi_screenGetLayers(self.id)
      end
      function screen:layer_on(identifier)
        __ansi_screenLayerOn(self.id, tostring(identifier))
      end
      function screen:layer_off(identifier)
        __ansi_screenLayerOff(self.id, tostring(identifier))
      end
      function screen:layer_toggle(identifier)
        __ansi_screenLayerToggle(self.id, tostring(identifier))
      end
      function screen:play()
        __ansi_screenPlay(self.id)
      end
      function screen:pause()
        __ansi_screenPause(self.id)
      end
      function screen:is_playing()
        return __ansi_screenIsPlaying(self.id)
      end
      function screen:set_label(identifier, value)
        local id_str = tostring(identifier)
        if type(value) == 'string' then
          __ansi_screenSetLabel(self.id, id_str, value)
        elseif type(value) == 'table' and value._escaped then
          -- Escaped label from create_escaped_label(): colors stored on JS side
          __ansi_screenSetEscapedLabel(self.id, id_str)
        elseif type(value) == 'table' and value.text ~= nil then
          -- Label table from create_label()
          local flat_fg_colors = {}
          if value.colors then
            for i = 1, #value.colors do
              local c = value.colors[i]
              flat_fg_colors[#flat_fg_colors + 1] = c[1]
              flat_fg_colors[#flat_fg_colors + 1] = c[2]
              flat_fg_colors[#flat_fg_colors + 1] = c[3]
            end
          end
          -- Flatten bg_colors if present
          local flat_bg_colors = nil
          local bg_r, bg_g, bg_b = nil, nil, nil
          if value.bg_colors then
            flat_bg_colors = {}
            for i = 1, #value.bg_colors do
              local c = value.bg_colors[i]
              if c then
                flat_bg_colors[#flat_bg_colors + 1] = c[1]
                flat_bg_colors[#flat_bg_colors + 1] = c[2]
                flat_bg_colors[#flat_bg_colors + 1] = c[3]
              else
                flat_bg_colors[#flat_bg_colors + 1] = -1
                flat_bg_colors[#flat_bg_colors + 1] = -1
                flat_bg_colors[#flat_bg_colors + 1] = -1
              end
            end
          end
          if value.default_bg then
            bg_r = value.default_bg[1]
            bg_g = value.default_bg[2]
            bg_b = value.default_bg[3]
          end
          __ansi_screenSetLabel(
            self.id, id_str, value.text,
            value.default_color[1], value.default_color[2], value.default_color[3],
            flat_fg_colors,
            bg_r, bg_g, bg_b,
            flat_bg_colors
          )
        else
          error("set_label() expects a string or label table")
        end
      end
      return screen
    end

    function _ansi.set_screen(screen)
      local id = screen
      if type(screen) == 'table' then
        id = screen.id
      end
      if id ~= nil and type(id) ~= 'number' then
        error("ansi.set_screen() expects a screen, number, or nil")
      end
      __ansi_setScreen(id)
    end

    -- Load screen from file
    function _ansi.load_screen(path)
      if type(path) ~= 'string' then
        error("ansi.load_screen() expects a string path, got " .. type(path))
      end
      if type(__ansi_readFile) ~= 'function' then
        error("ansi.load_screen() is not available in this context")
      end
      local content = __ansi_readFile(path)
      local fn, err = load(content, "@" .. path)
      if not fn then
        error("Failed to parse ANSI file '" .. path .. "': " .. tostring(err))
      end

      -- Suspend instruction counting during file execution
      local has_exec_control = type(__loading_depth) == 'number'
      if has_exec_control then
        __loading_depth = __loading_depth + 1
      end

      local ok, data = pcall(fn)

      if has_exec_control and __loading_depth > 0 then
        __loading_depth = __loading_depth - 1
        if __loading_depth == 0 then
          __reset_instruction_count()
        end
      end

      if not ok then
        error("Failed to execute ANSI file '" .. path .. "': " .. tostring(data))
      end
      if type(data) ~= 'table' then
        error("ANSI file '" .. path .. "' did not return a table")
      end
      return _ansi.create_screen(data)
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

    -- CGA ALT pairs: alternating dark/bright per character
    local _ansi_alt_pairs = {
      CGA_ALT_BLACK   = { _ansi.colors.BLACK, _ansi.colors.DARK_GRAY },
      CGA_ALT_BLUE    = { _ansi.colors.BLUE, _ansi.colors.BRIGHT_BLUE },
      CGA_ALT_GREEN   = { _ansi.colors.GREEN, _ansi.colors.BRIGHT_GREEN },
      CGA_ALT_CYAN    = { _ansi.colors.CYAN, _ansi.colors.BRIGHT_CYAN },
      CGA_ALT_RED     = { _ansi.colors.RED, _ansi.colors.BRIGHT_RED },
      CGA_ALT_MAGENTA = { _ansi.colors.MAGENTA, _ansi.colors.BRIGHT_MAGENTA },
      CGA_ALT_BROWN   = { _ansi.colors.BROWN, _ansi.colors.YELLOW },
      CGA_ALT_GRAY    = { _ansi.colors.LIGHT_GRAY, _ansi.colors.WHITE },
    }

    -- Resolve a color name to an RGB table or ALT pair
    -- Returns: rgb_table, is_alt, alt_pair
    local function ansi_resolve_color(name)
      -- Check ALT pairs first
      local alt = _ansi_alt_pairs[name]
      if alt then
        return nil, true, alt
      end

      -- Direct CGA name
      local c = _ansi.colors[name]
      if c then
        return {c[1], c[2], c[3]}, false, nil
      end

      -- Strip CGA_ prefix and try again
      local stripped = name:match("^CGA_(.+)$")
      if stripped then
        c = _ansi.colors[stripped]
        if c then
          return {c[1], c[2], c[3]}, false, nil
        end
      end

      -- Hex color
      if name:sub(1, 1) == '#' then
        local r, g, b = ansi_parse_hex(name)
        return {r, g, b}, false, nil
      end

      error("Unknown color name: " .. name)
    end

    -- Parse ANSI escape sequences via JS bridge.
    -- Parsing happens entirely on the JS side to avoid wasmoon serialization issues.
    -- Returns a label table with a _escaped marker for set_label to use.
    function _ansi.create_escaped_label(text, default_fg, default_bg)
      if type(text) ~= 'string' then
        error("ansi.create_escaped_label() expects a string, got " .. type(text))
      end
      local def_fg = default_fg or {_ansi.colors.LIGHT_GRAY[1], _ansi.colors.LIGHT_GRAY[2], _ansi.colors.LIGHT_GRAY[3]}
      if type(def_fg) == 'string' and def_fg:sub(1, 1) == '#' then
        local r, g, b = ansi_parse_hex(def_fg)
        def_fg = {r, g, b}
      end
      local bg_r, bg_g, bg_b
      if default_bg then
        if type(default_bg) == 'string' and default_bg:sub(1, 1) == '#' then
          local r, g, b = ansi_parse_hex(default_bg)
          bg_r, bg_g, bg_b = r, g, b
        elseif type(default_bg) == 'table' then
          bg_r, bg_g, bg_b = default_bg[1], default_bg[2], default_bg[3]
        end
      end
      -- JS bridge parses escapes and stores colors on controller
      local parsed_text = __ansi_createEscapedLabel(
        text, def_fg[1], def_fg[2], def_fg[3], bg_r, bg_g, bg_b
      )
      return {
        text = parsed_text,
        _escaped = true,
        default_color = {def_fg[1], def_fg[2], def_fg[3]},
      }
    end

    -- Parse color markup into a label table
    function _ansi.create_label(markup, default_color, default_bg)
      if type(markup) ~= 'string' then
        error("ansi.create_label() expects a string, got " .. type(markup))
      end

      -- Resolve default color
      local def_rgb
      if default_color == nil then
        def_rgb = {_ansi.colors.LIGHT_GRAY[1], _ansi.colors.LIGHT_GRAY[2], _ansi.colors.LIGHT_GRAY[3]}
      elseif type(default_color) == 'string' and default_color:sub(1, 1) == '#' then
        local r, g, b = ansi_parse_hex(default_color)
        def_rgb = {r, g, b}
      elseif type(default_color) == 'table' then
        def_rgb = {default_color[1], default_color[2], default_color[3]}
      else
        def_rgb = {_ansi.colors.LIGHT_GRAY[1], _ansi.colors.LIGHT_GRAY[2], _ansi.colors.LIGHT_GRAY[3]}
      end

      -- Resolve default bg
      local def_bg_rgb
      if default_bg ~= nil then
        if type(default_bg) == 'string' and default_bg:sub(1, 1) == '#' then
          local r, g, b = ansi_parse_hex(default_bg)
          def_bg_rgb = {r, g, b}
        elseif type(default_bg) == 'table' then
          def_bg_rgb = {default_bg[1], default_bg[2], default_bg[3]}
        end
      end

      local text_chars = {}
      local colors = {}
      local bg_colors = {}
      local has_bg = false
      local color_stack = {}
      local bg_color_stack = {}
      local pos = 1
      local char_count = 0

      while pos <= #markup do
        -- Check for [color=X], [/color], [bg=X], [/bg]
        local tag_start, tag_end, color_name = markup:find("%[color=(.-)%]", pos)
        local close_start, close_end = markup:find("%[/color%]", pos)
        local bg_tag_start, bg_tag_end, bg_color_name = markup:find("%[bg=(.-)%]", pos)
        local bg_close_start, bg_close_end = markup:find("%[/bg%]", pos)

        -- Find whichever tag comes first
        local next_tag = nil
        local next_pos = #markup + 1

        if tag_start and tag_start < next_pos then
          next_tag = "fg_open"
          next_pos = tag_start
        end
        if close_start and close_start < next_pos then
          next_tag = "fg_close"
          next_pos = close_start
        end
        if bg_tag_start and bg_tag_start < next_pos then
          next_tag = "bg_open"
          next_pos = bg_tag_start
        end
        if bg_close_start and bg_close_start < next_pos then
          next_tag = "bg_close"
          next_pos = bg_close_start
        end

        -- Add text before the tag
        if next_pos > pos then
          local segment = markup:sub(pos, next_pos - 1)
          for i = 1, #segment do
            char_count = char_count + 1
            text_chars[#text_chars + 1] = segment:sub(i, i)
            -- Determine current fg color
            local current = #color_stack > 0 and color_stack[#color_stack] or nil
            if current and current.is_alt then
              if char_count % 2 == 1 then
                colors[#colors + 1] = {current.alt_pair[1][1], current.alt_pair[1][2], current.alt_pair[1][3]}
              else
                colors[#colors + 1] = {current.alt_pair[2][1], current.alt_pair[2][2], current.alt_pair[2][3]}
              end
            elseif current then
              colors[#colors + 1] = {current.rgb[1], current.rgb[2], current.rgb[3]}
            else
              colors[#colors + 1] = {def_rgb[1], def_rgb[2], def_rgb[3]}
            end
            -- Determine current bg color
            local bg_current = #bg_color_stack > 0 and bg_color_stack[#bg_color_stack] or nil
            if bg_current then
              has_bg = true
              bg_colors[#bg_colors + 1] = {bg_current.rgb[1], bg_current.rgb[2], bg_current.rgb[3]}
            elseif def_bg_rgb then
              bg_colors[#bg_colors + 1] = {def_bg_rgb[1], def_bg_rgb[2], def_bg_rgb[3]}
            else
              bg_colors[#bg_colors + 1] = false  -- placeholder for nil
            end
          end
        end

        if next_tag == "fg_open" then
          local rgb, is_alt, alt_pair = ansi_resolve_color(color_name)
          color_stack[#color_stack + 1] = { rgb = rgb, is_alt = is_alt, alt_pair = alt_pair }
          pos = tag_end + 1
        elseif next_tag == "fg_close" then
          if #color_stack > 0 then
            color_stack[#color_stack] = nil
          end
          pos = close_end + 1
        elseif next_tag == "bg_open" then
          local rgb = ansi_resolve_color(bg_color_name)
          bg_color_stack[#bg_color_stack + 1] = { rgb = rgb }
          pos = bg_tag_end + 1
        elseif next_tag == "bg_close" then
          if #bg_color_stack > 0 then
            bg_color_stack[#bg_color_stack] = nil
          end
          pos = bg_close_end + 1
        else
          -- No more tags, we're done
          break
        end
      end

      return {
        text = table.concat(text_chars),
        colors = colors,
        bg_colors = has_bg and bg_colors or nil,
        default_color = def_rgb,
        default_bg = def_bg_rgb,
      }
    end
`
