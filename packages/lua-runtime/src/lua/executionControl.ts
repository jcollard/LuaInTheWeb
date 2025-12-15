/**
 * Generate Lua code for execution control infrastructure.
 * Note: Due to wasmoon limitations, debug hooks don't persist across doString calls.
 * The hook must be set up within each code execution using __setup_execution_hook().
 * @param lineLimit - Maximum lines before triggering callback
 * @param checkInterval - How often to check line count (every N lines)
 */
export function generateExecutionControlCode(
  lineLimit: number,
  checkInterval: number
): string {
  return `
__stop_requested = false
__line_count = 0
__instruction_limit = ${lineLimit}
__check_interval = ${checkInterval}
__lines_since_check = 0

function __request_stop()
    __stop_requested = true
end

-- Internal helper for dynamic limit adjustment (used by processes)
function __set_instruction_limit(limit)
    __instruction_limit = limit
end

function __reset_instruction_count()
    __line_count = 0
    __lines_since_check = 0
end

-- Hook function that counts lines and checks for stop conditions
function __execution_hook()
    __line_count = __line_count + 1
    __lines_since_check = __lines_since_check + 1

    -- Only check conditions every check_interval lines for performance
    if __lines_since_check >= __check_interval then
        __lines_since_check = 0

        if __stop_requested then
            __stop_requested = false
            __line_count = 0
            error("Execution stopped by user", 0)
        end

        if __line_count >= __instruction_limit then
            -- Call synchronous JS callback that returns true to continue, false to stop
            -- Note: Cannot use async/await here due to Lua debug hook limitations
            local should_continue = __on_limit_reached_sync()
            if should_continue then
                __reset_instruction_count()
            else
                error("Execution stopped by instruction limit", 0)
            end
        end
    end
end

-- Set up the execution hook (must be called before executing user code)
function __setup_execution_hook()
    __reset_instruction_count()
    debug.sethook(__execution_hook, "l")
end

-- Clear the execution hook (call after user code completes)
function __clear_execution_hook()
    debug.sethook()
end
`
}
