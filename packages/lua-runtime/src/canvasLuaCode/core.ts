/**
 * Core canvas Lua code - lifecycle, configuration, drawing state, and shapes.
 */

export const canvasLuaCoreCode = `
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
    local __current_font_size = 16  -- Track current font size for draw_label

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

    function _canvas.clear_rect(x, y, width, height)
      __canvas_clearRect(x, y, width, height)
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
      __current_font_size = size
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
    -- Supports two forms:
    -- 1. draw_image(name, x, y, width?, height?) - draws at destination with optional scaling
    -- 2. draw_image(name, sx, sy, sw, sh, dx, dy, dw, dh) - crops source and draws to destination
    function _canvas.draw_image(name, x, y, width, height, sx, sy, sw, sh)
      __canvas_drawImage(name, x, y, width, height, sx, sy, sw, sh)
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

    -- Timing
    function _canvas.get_delta()
      return __canvas_getDelta()
    end

    function _canvas.get_time()
      return __canvas_getTime()
    end
`
