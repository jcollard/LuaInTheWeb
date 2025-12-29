/**
 * Input Lua code - keyboard, mouse input and key constants.
 */

export const canvasLuaInputCode = `
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

    -- Register audio_mixer module
    package.preload['audio_mixer'] = function()
      local canvas = require('canvas')
      local mixer = {}
      local Channel = {}
      Channel.__index = Channel

      -- Helper to sync channel and all ancestor volumes to the audio engine
      -- This is needed because volume may be set before the engine exists
      local function sync_volume_hierarchy(channel)
        -- Collect all channels in the hierarchy (child to parent)
        local chain = {}
        local current = channel
        while current do
          table.insert(chain, current)
          current = current._parent
        end

        -- Create and sync in reverse order (parent to child)
        -- This ensures parent channels exist before children connect to them
        for i = #chain, 1, -1 do
          local ch = chain[i]
          local parent_name = ch._parent and ch._parent.name or nil
          canvas.channel_create(ch.name, { parent = parent_name })
          canvas.channel_set_volume(ch.name, ch._volume)
        end
      end

      -- Channel Creation
      function mixer.create_channel(name, options)
        local opts = options or {}
        local parent_name = opts.parent and opts.parent.name or nil
        canvas.channel_create(name, { parent = parent_name })
        return setmetatable({
          name = name,
          _volume = 1.0,
          _parent = opts.parent or nil,
          _crossfade_pending = nil,
          _is_group = false,
        }, Channel)
      end

      -- Create a group channel (for volume grouping, no playback)
      function mixer.create_group(name, options)
        local opts = options or {}
        local parent_name = opts.parent and opts.parent.name or nil
        canvas.channel_create(name, { parent = parent_name })
        return setmetatable({
          name = name,
          _volume = 1.0,
          _parent = opts.parent or nil,
          _crossfade_pending = nil,
          _is_group = true,
        }, Channel)
      end

      function mixer.destroy_channel(channel)
        canvas.channel_destroy(channel.name)
      end

      -- Get effective volume (channel volume * all parent volumes * master)
      function mixer.get_effective_volume(channel)
        return canvas.channel_get_effective_volume(channel.name)
      end

      -- Playback Control
      function mixer.play(channel, audio, options)
        local opts = options or {}
        local start_volume = opts.fade_in and 0 or (opts.volume or channel._volume)
        local target_volume = opts.volume or channel._volume

        canvas.channel_play(channel.name, audio, {
          volume = start_volume,
          loop = opts.loop or false,
        })

        -- Sync volume hierarchy to engine (needed if volumes were set before engine existed)
        sync_volume_hierarchy(channel)

        if opts.fade_in and opts.fade_in > 0 then
          canvas.channel_fade_to(channel.name, target_volume, opts.fade_in)
        end

        channel._volume = target_volume
      end

      function mixer.stop(channel, options)
        local opts = options or {}
        if opts.fade_out and opts.fade_out > 0 then
          canvas.channel_fade_to(channel.name, 0, opts.fade_out)
        else
          canvas.channel_stop(channel.name)
        end
      end

      function mixer.pause(channel)
        canvas.channel_pause(channel.name)
      end

      function mixer.resume(channel)
        canvas.channel_resume(channel.name)
      end

      -- Volume Control
      function mixer.set_volume(channel, volume)
        channel._volume = volume
        canvas.channel_set_volume(channel.name, volume)
      end

      function mixer.get_volume(channel)
        -- Return locally tracked volume (works even before audio engine is initialized)
        return channel._volume
      end

      function mixer.fade_to(channel, volume, duration)
        canvas.channel_fade_to(channel.name, volume, duration)
        channel._volume = volume
      end

      -- Crossfade
      function mixer.crossfade(channel, audio, duration, options)
        local opts = options or {}
        local current_volume = channel._volume

        -- Sync parent volume hierarchy (needed if volumes were set before engine existed)
        if channel._parent then
          sync_volume_hierarchy(channel._parent)
        end

        -- Fade out current audio on the main channel
        canvas.channel_fade_to(channel.name, 0, duration)

        -- Create a temporary crossfade channel (under same parent as main channel)
        local xfade_channel = channel.name .. "_xfade"
        local parent_name = canvas.channel_get_parent(channel.name)
        canvas.channel_create(xfade_channel, { parent = parent_name })
        canvas.channel_play(xfade_channel, audio, {
          volume = 0,
          loop = opts.loop or false,
        })
        canvas.channel_fade_to(xfade_channel, current_volume, duration)

        -- Store crossfade info for cleanup
        channel._crossfade_pending = {
          temp_channel = xfade_channel,
          new_audio = audio,
          duration = duration,
          started_at = canvas.get_time(),
          loop = opts.loop or false,
          target_volume = current_volume,
        }
      end

      function mixer.update_crossfade(channel)
        if not channel._crossfade_pending then
          return false
        end

        local xf = channel._crossfade_pending
        local elapsed = canvas.get_time() - xf.started_at

        if elapsed >= xf.duration then
          -- Crossfade complete - swap channels
          -- Get the current playback position from the temp channel
          local current_time = canvas.channel_get_time(xf.temp_channel)

          canvas.channel_stop(channel.name)
          canvas.channel_stop(xf.temp_channel)
          canvas.channel_play(channel.name, xf.new_audio, {
            volume = xf.target_volume,
            loop = xf.loop,
            start_time = current_time,
          })
          canvas.channel_destroy(xf.temp_channel)
          channel._crossfade_pending = nil
          return true
        end

        return false
      end

      function mixer.is_crossfading(channel)
        return channel._crossfade_pending ~= nil
      end

      -- State Queries
      function mixer.is_playing(channel)
        return canvas.channel_is_playing(channel.name)
      end

      function mixer.is_fading(channel)
        return canvas.channel_is_fading(channel.name)
      end

      function mixer.get_time(channel)
        return canvas.channel_get_time(channel.name)
      end

      function mixer.get_duration(channel)
        return canvas.channel_get_duration(channel.name)
      end

      function mixer.get_audio(channel)
        return canvas.channel_get_audio(channel.name)
      end

      return mixer
    end
`
