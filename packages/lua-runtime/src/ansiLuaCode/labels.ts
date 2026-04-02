/**
 * ANSI Lua label functions: create_label (tag markup) and create_escaped_label (ANSI escapes).
 * Concatenated after core.ts in the same Lua chunk — shares locals like ansi_parse_hex and _ansi.
 */

export const ansiLuaLabelsCode = `
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

    local function ansi_resolve_color(name)
      local alt = _ansi_alt_pairs[name]
      if alt then
        return nil, true, alt
      end
      local c = _ansi.colors[name]
      if c then
        return {c[1], c[2], c[3]}, false, nil
      end
      local stripped = name:match("^CGA_(.+)$")
      if stripped then
        c = _ansi.colors[stripped]
        if c then
          return {c[1], c[2], c[3]}, false, nil
        end
      end
      if name:sub(1, 1) == '#' then
        local r, g, b = ansi_parse_hex(name)
        return {r, g, b}, false, nil
      end
      error("Unknown color name: " .. name)
    end

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
      local parsed_text = __ansi_createEscapedLabel(
        text, def_fg[1], def_fg[2], def_fg[3], bg_r, bg_g, bg_b
      )
      return {
        text = parsed_text,
        _escaped = true,
        default_color = {def_fg[1], def_fg[2], def_fg[3]},
      }
    end

    function _ansi.create_label(markup, default_color, default_bg)
      if type(markup) ~= 'string' then
        error("ansi.create_label() expects a string, got " .. type(markup))
      end
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
        local tag_start, tag_end, color_name = markup:find("%[color=(.-)%]", pos)
        local close_start, close_end = markup:find("%[/color%]", pos)
        local bg_tag_start, bg_tag_end, bg_color_name = markup:find("%[bg=(.-)%]", pos)
        local bg_close_start, bg_close_end = markup:find("%[/bg%]", pos)

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

        if next_pos > pos then
          local segment = markup:sub(pos, next_pos - 1)
          for i = 1, #segment do
            char_count = char_count + 1
            text_chars[#text_chars + 1] = segment:sub(i, i)
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
            local bg_current = #bg_color_stack > 0 and bg_color_stack[#bg_color_stack] or nil
            if bg_current then
              has_bg = true
              bg_colors[#bg_colors + 1] = {bg_current.rgb[1], bg_current.rgb[2], bg_current.rgb[3]}
            elseif def_bg_rgb then
              bg_colors[#bg_colors + 1] = {def_bg_rgb[1], def_bg_rgb[2], def_bg_rgb[3]}
            else
              bg_colors[#bg_colors + 1] = false
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
