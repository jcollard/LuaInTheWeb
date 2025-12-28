/**
 * Styling Lua code - line styles, gradients, patterns, shadows, compositing.
 */

export const canvasLuaStylingCode = `
    -- Line Style API
    function _canvas.set_line_cap(cap)
      __canvas_setLineCap(cap)
    end

    function _canvas.set_line_join(join)
      __canvas_setLineJoin(join)
    end

    function _canvas.set_miter_limit(limit)
      __canvas_setMiterLimit(limit)
    end

    function _canvas.set_line_dash(segments)
      -- Convert Lua table to JS array
      local js_segments = {}
      for i, v in ipairs(segments or {}) do
        js_segments[i] = v
      end
      __canvas_setLineDash(js_segments)
    end

    function _canvas.get_line_dash()
      local js_array = __canvas_getLineDash()
      local t = {}
      for i = 1, #js_array do
        t[i] = js_array[i]
      end
      return t
    end

    function _canvas.set_line_dash_offset(offset)
      __canvas_setLineDashOffset(offset)
    end

    -- Gradient API
    -- Metatable for gradient objects with add_color_stop method
    local GradientMT = {
      __index = {
        add_color_stop = function(self, offset, color)
          table.insert(self.stops, {offset = offset, color = color})
          return self  -- Enable method chaining
        end
      }
    }

    function _canvas.create_linear_gradient(x0, y0, x1, y1)
      return setmetatable({
        type = "linear",
        x0 = x0, y0 = y0, x1 = x1, y1 = y1,
        stops = {}
      }, GradientMT)
    end

    function _canvas.create_radial_gradient(x0, y0, r0, x1, y1, r1)
      return setmetatable({
        type = "radial",
        x0 = x0, y0 = y0, r0 = r0,
        x1 = x1, y1 = y1, r1 = r1,
        stops = {}
      }, GradientMT)
    end

    function _canvas.create_conic_gradient(startAngle, x, y)
      return setmetatable({
        type = "conic",
        startAngle = startAngle,
        x = x, y = y,
        stops = {}
      }, GradientMT)
    end

    function _canvas.create_pattern(imageName, repetition)
      repetition = repetition or "repeat"
      return {
        type = "pattern",
        imageName = imageName,
        repetition = repetition
      }
    end

    function _canvas.set_fill_style(style)
      __canvas_setFillStyle(style)
    end

    function _canvas.set_stroke_style(style)
      __canvas_setStrokeStyle(style)
    end

    -- Shadows
    function _canvas.set_shadow_color(color)
      __canvas_setShadowColor(color)
    end

    function _canvas.set_shadow_blur(blur)
      __canvas_setShadowBlur(blur)
    end

    function _canvas.set_shadow_offset_x(offset)
      __canvas_setShadowOffsetX(offset)
    end

    function _canvas.set_shadow_offset_y(offset)
      __canvas_setShadowOffsetY(offset)
    end

    function _canvas.set_shadow(color, blur, offsetX, offsetY)
      __canvas_setShadow(color, blur or 0, offsetX or 0, offsetY or 0)
    end

    function _canvas.clear_shadow()
      __canvas_clearShadow()
    end

    -- Compositing
    function _canvas.set_global_alpha(alpha)
      __canvas_setGlobalAlpha(alpha)
    end

    function _canvas.set_composite_operation(operation)
      __canvas_setCompositeOperation(operation)
    end

    -- Image smoothing (anti-aliasing for scaled images)
    -- Disable for crisp pixel art, enable for smooth scaled images
    function _canvas.set_image_smoothing(enabled)
      __canvas_setImageSmoothing(enabled)
    end

    -- CSS Filter
    function _canvas.set_filter(filter)
      __canvas_setFilter(filter)
    end
`
