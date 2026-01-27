/**
 * Lifecycle-related canvas Lua code - start screen support.
 */

export const canvasLuaLifecycleCode = `
    -- Start screen (for browser audio autoplay policy)
    -- Set a custom callback for rendering the start screen overlay.
    -- If callback is nil, the default "Click to Start" overlay is used.
    -- The callback will be called each frame until user clicks/presses a key.
    function _canvas.set_start_screen(callback)
      __canvas_setStartScreen(callback)
    end

    -- Check if the canvas is waiting for user interaction.
    -- Returns true if the start screen is being shown (user hasn't clicked yet).
    function _canvas.is_waiting_for_interaction()
      return __canvas_isWaitingForInteraction()
    end
`
