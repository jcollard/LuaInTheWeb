/**
 * Path API Lua code - path drawing, arcs, bezier curves, hit testing, pixel manipulation.
 */

export const canvasLuaPathCode = `
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

    function _canvas.arc(x, y, radius, startAngle, endAngle, counterclockwise)
      __canvas_arc(x, y, radius, startAngle, endAngle, counterclockwise or false)
    end

    function _canvas.arc_to(x1, y1, x2, y2, radius)
      __canvas_arcTo(x1, y1, x2, y2, radius)
    end

    function _canvas.quadratic_curve_to(cpx, cpy, x, y)
      __canvas_quadraticCurveTo(cpx, cpy, x, y)
    end

    function _canvas.bezier_curve_to(cp1x, cp1y, cp2x, cp2y, x, y)
      __canvas_bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
    end

    function _canvas.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise)
      __canvas_ellipse(x, y, radiusX, radiusY, rotation or 0, startAngle or 0, endAngle or (math.pi * 2), counterclockwise or false)
    end

    function _canvas.round_rect(x, y, width, height, radii)
      __canvas_roundRect(x, y, width, height, radii)
    end

    -- Add a rectangle to the current path (does not draw, use fill() or stroke() after)
    function _canvas.rect(x, y, width, height)
      __canvas_rectPath(x, y, width, height)
    end

    function _canvas.clip(fillRule)
      __canvas_clip(fillRule)
    end

    -- Hit Testing API
    function _canvas.is_point_in_path(x, y, fillRule)
      return __canvas_isPointInPath(x, y, fillRule or "nonzero")
    end

    function _canvas.is_point_in_stroke(x, y)
      return __canvas_isPointInStroke(x, y)
    end

    -- Pixel Manipulation API
    -- ImageData class for pixel-level access
    -- Uses JS-side storage for O(1) put_image_data performance
    local ImageData = {}
    ImageData.__index = ImageData

    function ImageData.new(jsInfo)
      local self = setmetatable({}, ImageData)
      self._jsId = jsInfo.id
      self.width = jsInfo.width
      self.height = jsInfo.height
      return self
    end

    function ImageData:get_pixel(x, y)
      local rgba = __canvas_imageDataGetPixel(self._jsId, x, y)
      return rgba[1], rgba[2], rgba[3], rgba[4]
    end

    function ImageData:set_pixel(x, y, r, g, b, a)
      __canvas_imageDataSetPixel(self._jsId, x, y, r, g, b, a or 255)
    end

    function _canvas.create_image_data(width, height)
      local info = __canvas_createImageData(width, height)
      return ImageData.new(info)
    end

    function _canvas.get_image_data(x, y, width, height)
      local info = __canvas_getImageData(x, y, width, height)
      if not info then return nil end
      return ImageData.new(info)
    end

    function _canvas.put_image_data(image_data, dx, dy, options)
      local dirtyX = nil
      local dirtyY = nil
      local dirtyWidth = nil
      local dirtyHeight = nil
      if options then
        dirtyX = options.dirty_x
        dirtyY = options.dirty_y
        dirtyWidth = options.dirty_width
        dirtyHeight = options.dirty_height
      end
      __canvas_putImageData(image_data._jsId, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight)
    end

    function _canvas.clone_image_data(image_data)
      local info = __canvas_cloneImageData(image_data._jsId)
      if not info then return nil end
      return ImageData.new(info)
    end

    -- ==========================================================================
    -- Path2D API - Reusable path objects
    -- ==========================================================================

    -- Path2D class for reusable path objects
    local Path2D = {}
    Path2D.__index = Path2D

    function Path2D.new(jsInfo)
      local self = setmetatable({}, Path2D)
      self._jsId = jsInfo.id
      return self
    end

    -- Path building methods (all chainable, return self)
    function Path2D:move_to(x, y)
      __canvas_pathMoveTo(self._jsId, x, y)
      return self
    end

    function Path2D:line_to(x, y)
      __canvas_pathLineTo(self._jsId, x, y)
      return self
    end

    function Path2D:close_path()
      __canvas_pathClosePath(self._jsId)
      return self
    end

    function Path2D:rect(x, y, width, height)
      __canvas_pathRect(self._jsId, x, y, width, height)
      return self
    end

    function Path2D:round_rect(x, y, width, height, radii)
      __canvas_pathRoundRect(self._jsId, x, y, width, height, radii)
      return self
    end

    function Path2D:arc(x, y, radius, startAngle, endAngle, counterclockwise)
      __canvas_pathArc(self._jsId, x, y, radius, startAngle, endAngle, counterclockwise or false)
      return self
    end

    function Path2D:arc_to(x1, y1, x2, y2, radius)
      __canvas_pathArcTo(self._jsId, x1, y1, x2, y2, radius)
      return self
    end

    function Path2D:ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise)
      __canvas_pathEllipse(self._jsId, x, y, radiusX, radiusY, rotation or 0, startAngle or 0, endAngle or (math.pi * 2), counterclockwise or false)
      return self
    end

    function Path2D:quadratic_curve_to(cpx, cpy, x, y)
      __canvas_pathQuadraticCurveTo(self._jsId, cpx, cpy, x, y)
      return self
    end

    function Path2D:bezier_curve_to(cp1x, cp1y, cp2x, cp2y, x, y)
      __canvas_pathBezierCurveTo(self._jsId, cp1x, cp1y, cp2x, cp2y, x, y)
      return self
    end

    function Path2D:add_path(other_path)
      __canvas_pathAddPath(self._jsId, other_path._jsId)
      return self
    end

    -- Dispose method to free memory
    function Path2D:dispose()
      __canvas_disposePath(self._jsId)
    end

    -- Create a new Path2D object
    -- Can be created empty, from SVG path string, or by cloning another path
    function _canvas.create_path(arg)
      if type(arg) == "string" then
        -- SVG path string
        local info = __canvas_createPath(arg)
        if not info then return nil end
        return Path2D.new(info)
      elseif type(arg) == "table" and arg._jsId then
        -- Clone from another Path2D
        local info = __canvas_clonePath(arg._jsId)
        if not info then return nil end
        return Path2D.new(info)
      else
        -- Empty path (arg is nil or ignored)
        local info = __canvas_createPath(nil)
        if not info then return nil end
        return Path2D.new(info)
      end
    end

    -- Extend fill/stroke/clip to accept optional Path2D argument
    local _original_fill = _canvas.fill
    function _canvas.fill(path_or_fill_rule, fill_rule)
      if type(path_or_fill_rule) == "table" and path_or_fill_rule._jsId then
        -- Path2D object passed
        __canvas_fillPath(path_or_fill_rule._jsId, fill_rule)
      else
        -- Original behavior (no path, just fill rule)
        _original_fill()
      end
    end

    local _original_stroke = _canvas.stroke
    function _canvas.stroke(path)
      if type(path) == "table" and path._jsId then
        -- Path2D object passed
        __canvas_strokePath(path._jsId)
      else
        -- Original behavior
        _original_stroke()
      end
    end

    local _original_clip = _canvas.clip
    function _canvas.clip(path_or_fill_rule, fill_rule)
      if type(path_or_fill_rule) == "table" and path_or_fill_rule._jsId then
        -- Path2D object passed
        __canvas_clipPath(path_or_fill_rule._jsId, fill_rule)
      else
        -- Original behavior (no path, just fill rule)
        _original_clip(path_or_fill_rule)
      end
    end

    -- Extend hit testing to accept optional Path2D argument
    local _original_is_point_in_path = _canvas.is_point_in_path
    function _canvas.is_point_in_path(path_or_x, x_or_y, y_or_fill_rule, fill_rule)
      if type(path_or_x) == "table" and path_or_x._jsId then
        -- Path2D object passed: is_point_in_path(path, x, y, fillRule?)
        return __canvas_isPointInStoredPath(path_or_x._jsId, x_or_y, y_or_fill_rule, fill_rule or "nonzero")
      else
        -- Original behavior: is_point_in_path(x, y, fillRule?)
        return _original_is_point_in_path(path_or_x, x_or_y, y_or_fill_rule)
      end
    end

    local _original_is_point_in_stroke = _canvas.is_point_in_stroke
    function _canvas.is_point_in_stroke(path_or_x, x_or_y, y)
      if type(path_or_x) == "table" and path_or_x._jsId then
        -- Path2D object passed: is_point_in_stroke(path, x, y)
        return __canvas_isPointInStoredStroke(path_or_x._jsId, x_or_y, y)
      else
        -- Original behavior: is_point_in_stroke(x, y)
        return _original_is_point_in_stroke(path_or_x, x_or_y)
      end
    end
`
