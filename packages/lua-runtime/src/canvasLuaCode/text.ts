/**
 * Text Lua code - text alignment and draw_label function.
 */

export const canvasLuaTextCode = `
    -- Text Alignment
    function _canvas.set_text_align(align)
      __canvas_setTextAlign(align)
    end

    function _canvas.set_text_baseline(baseline)
      __canvas_setTextBaseline(baseline)
    end

    -- Draw text within a bounded rectangle with alignment and overflow options
    function _canvas.draw_label(x, y, width, height, text, options)
      options = options or {}
      local align_h = options.align_h or "center"
      local align_v = options.align_v or "middle"
      local overflow = options.overflow or "visible"
      local padding = options.padding or {}
      local wrap = options.wrap or false
      local line_height = options.line_height or 1.2
      local char_count = options.char_count  -- nil means show all

      -- Normalize padding to {left, top, right, bottom}
      local pad_left = padding.left or 0
      local pad_top = padding.top or 0
      local pad_right = padding.right or 0
      local pad_bottom = padding.bottom or 0

      -- Calculate inner bounds after padding
      local inner_x = x + pad_left
      local inner_y = y + pad_top
      local inner_w = width - pad_left - pad_right
      local inner_h = height - pad_top - pad_bottom

      -- Calculate horizontal text position based on alignment
      local text_x
      if align_h == "left" then
        text_x = inner_x
      elseif align_h == "right" then
        text_x = inner_x + inner_w
      else -- center
        text_x = inner_x + inner_w / 2
      end

      -- Map align_h to Canvas textAlign values
      local canvas_align
      if align_h == "left" then
        canvas_align = "left"
      elseif align_h == "right" then
        canvas_align = "right"
      else
        canvas_align = "center"
      end

      -- Save state
      _canvas.save()

      -- Apply clipping if overflow is hidden or ellipsis
      if overflow == "hidden" or overflow == "ellipsis" then
        _canvas.begin_path()
        _canvas.move_to(x, y)
        _canvas.line_to(x + width, y)
        _canvas.line_to(x + width, y + height)
        _canvas.line_to(x, y + height)
        _canvas.close_path()
        _canvas.clip()
      end

      _canvas.set_text_align(canvas_align)

      -- Get font size for line height calculation
      local font_size = __current_font_size or 16
      local actual_line_height = font_size * line_height

      -- Word wrap logic (always wrap based on full text for stable layout)
      local lines = {}
      if wrap and inner_w > 0 then
        -- Split text into words
        local words = {}
        for word in text:gmatch("%S+") do
          table.insert(words, word)
        end

        local current_line = ""
        for i, word in ipairs(words) do
          local test_line = current_line == "" and word or (current_line .. " " .. word)
          local test_width = _canvas.get_text_width(test_line)

          if test_width > inner_w and current_line ~= "" then
            table.insert(lines, current_line)
            current_line = word
          else
            current_line = test_line
          end
        end
        if current_line ~= "" then
          table.insert(lines, current_line)
        end
      else
        -- No wrapping - single line
        local display_text = text

        if overflow == "ellipsis" and inner_w > 0 then
          local text_width = _canvas.get_text_width(text)
          if text_width > inner_w then
            local ellipsis = "..."
            local ellipsis_width = _canvas.get_text_width(ellipsis)
            local available = inner_w - ellipsis_width

            if available > 0 then
              local truncated = ""
              for i = 1, #text do
                local test = text:sub(1, i)
                if _canvas.get_text_width(test) > available then
                  break
                end
                truncated = test
              end
              display_text = truncated .. ellipsis
            else
              display_text = ellipsis
            end
          end
        end

        table.insert(lines, display_text)
      end

      -- Calculate total text block height
      local total_height = #lines * actual_line_height

      -- Calculate starting Y position based on vertical alignment
      local start_y
      if align_v == "top" then
        start_y = inner_y + actual_line_height / 2
      elseif align_v == "bottom" then
        start_y = inner_y + inner_h - total_height + actual_line_height / 2
      else -- middle
        start_y = inner_y + (inner_h - total_height) / 2 + actual_line_height / 2
      end

      -- Draw each line, applying char_count limit if specified
      _canvas.set_text_baseline("middle")
      local chars_remaining = char_count  -- nil means unlimited
      for i, line in ipairs(lines) do
        local line_y = start_y + (i - 1) * actual_line_height

        if chars_remaining == nil then
          -- No limit, draw full line
          _canvas.draw_text(text_x, line_y, line)
        elseif chars_remaining > 0 then
          -- Apply character limit
          local line_to_draw = line:sub(1, chars_remaining)
          _canvas.draw_text(text_x, line_y, line_to_draw)
          chars_remaining = chars_remaining - #line - 1  -- -1 for space between lines
        end
        -- If chars_remaining <= 0, skip drawing this line
      end

      -- Restore state
      _canvas.restore()
    end
`
