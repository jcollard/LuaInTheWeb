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

    function _canvas.put_image_data(image_data, dx, dy)
      __canvas_putImageData(image_data._jsId, dx, dy)
    end

    function _canvas.clone_image_data(image_data)
      local info = __canvas_cloneImageData(image_data._jsId)
      if not info then return nil end
      return ImageData.new(info)
    end
`
