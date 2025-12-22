-- minesweeper_shell.lua
-- Terminal-based UI for Minesweeper using the shell API
-- Handles rendering, input, and user interaction (MVC: View layer)

local shell = require("shell")
local model = require("model")
local controller = require("controller")

-- ============================================================================
-- Constants
-- ============================================================================

local DIFFICULTIES = {
  easy = {width = 9, height = 9, mines = 10},
  medium = {width = 16, height = 16, mines = 40},
  hard = {width = 30, height = 16, mines = 99}
}

-- ============================================================================
-- Helper Functions - Rendering
-- ============================================================================

--- Get color for mine count number (classic Minesweeper colors)
--- @param count: adjacent mine count (1-8)
--- @return: hex color string
local function get_number_color(count)
  if count == 1 then
    return '#4080FF'  -- light blue (readable)
  elseif count == 2 then
    return shell.GREEN
  elseif count == 3 then
    return shell.RED
  elseif count == 4 then
    return '#6060FF'  -- medium-light blue (readable, distinct from 1)
  elseif count == 5 then
    return '#8B0000'  -- dark red
  else
    return shell.MAGENTA
  end
end

--- Draw a single cell
--- @param cell: cell data from model
--- @param row: cell row position
--- @param col: cell column position
--- @param is_cursor: boolean, true if this is the cursor position
--- @param game_model: model instance for computing adjacent mines
local function draw_cell(cell, row, col, is_cursor, game_model)
  -- Set background if cursor
  if is_cursor then
    shell.background(shell.YELLOW)
  end

  -- Choose character and color based on cell state
  -- When cursor is active, always use black text for contrast
  if cell.is_flagged then
    shell.foreground(is_cursor and shell.BLACK or shell.ORANGE)
    io.write("!")
  elseif not cell.is_revealed then
    shell.foreground(is_cursor and shell.BLACK or shell.GRAY)
    io.write(".")
  elseif cell.is_mine then
    shell.foreground(is_cursor and shell.BLACK or shell.RED)
    io.write("*")
  else
    -- Revealed non-mine: show adjacent mine count
    local count = game_model:get_adjacent_mine_count(row, col)
    if count == 0 then
      io.write(" ")
    else
      shell.foreground(is_cursor and shell.BLACK or get_number_color(count))
      io.write(tostring(count))
    end
  end

  -- Reset colors
  shell.reset()
end

--- Draw status bar at top of screen
--- @param game_model: model instance
local function draw_status_bar(game_model)
  local stats = game_model:get_statistics()

  -- Set color based on game state
  if stats.state == "playing" then
    shell.foreground(shell.GREEN)
  elseif stats.state == "won" then
    shell.foreground(shell.YELLOW)
  elseif stats.state == "lost" then
    shell.foreground(shell.RED)
  end

  -- Format: "Flags: X/Y | Bombs: Z | State: PLAYING"
  local status_text = string.format(
    "Flags: %d/%d | Bombs: %d | %s",
    stats.flags_placed,
    stats.mine_count,
    stats.bombs_remaining,
    string.upper(stats.state)
  )

  io.write(status_text)
  shell.reset()
  io.write("\n")
end

--- Draw controls legend at bottom of screen
local function draw_controls_legend()
  shell.foreground(shell.GRAY)
  io.write("WASD:Move | SPACE:Reveal | !:Flag | M:Menu")
  shell.reset()
  io.write("\n")
end

--- Draw entire game board
--- @param state: game state object
local function draw_board(state)
  shell.clear()

  -- Draw status bar
  draw_status_bar(state.game_model)
  io.write("\n")

  -- Draw board grid
  for row = 1, state.game_model.height do
    io.write("  ")  -- Left margin
    for col = 1, state.game_model.width do
      local cell = state.game_model:get_cell(row, col)
      local is_cursor = (row == state.cursor_row and col == state.cursor_col)
      draw_cell(cell, row, col, is_cursor, state.game_model)
      io.write(" ")  -- Space between cells
    end
    io.write("\n")
  end

  io.write("\n")
  draw_controls_legend()
end

-- ============================================================================
-- Helper Functions - Menu
-- ============================================================================

--- Display main menu
--- @param state: game state object
local function show_menu(state)
  shell.clear()
  shell.hide_cursor()

  -- Title
  shell.foreground(shell.CYAN)
  io.write("\n")
  io.write("  ╔═══════════════════════════╗\n")
  io.write("  ║     MINESWEEPER SHELL     ║\n")
  io.write("  ╚═══════════════════════════╝\n")
  shell.reset()
  io.write("\n")

  -- Menu options
  shell.foreground(shell.GREEN)
  io.write("  [E] Easy (9x9, 10 mines)\n")
  shell.foreground(shell.YELLOW)
  io.write("  [M] Medium (16x16, 40 mines)\n")
  shell.foreground(shell.RED)
  io.write("  [H] Hard (30x16, 99 mines)\n")
  shell.foreground(shell.MAGENTA)
  io.write("  [C] Custom\n")

  -- Resume option if game exists
  if state.game_model ~= nil then
    shell.foreground('#4080FF')  -- light blue
    io.write("  [R] Resume\n")
  end

  shell.foreground(shell.GRAY)
  io.write("  [Q] Quit\n")
  shell.reset()
  io.write("\n")
  io.write("  Select an option: ")
  io.flush()
end

--- Handle menu input
--- @return: action string ("easy", "medium", "hard", "custom", "resume", "quit", or nil)
local function handle_menu_input()
  local char = io.read(1)
  if not char then return nil end

  -- Convert to lowercase for comparison
  char = char:lower()

  if char == "e" then
    return "easy"
  elseif char == "m" then
    return "medium"
  elseif char == "h" then
    return "hard"
  elseif char == "c" then
    return "custom"
  elseif char == "r" then
    return "resume"
  elseif char == "q" then
    return "quit"
  else
    return nil
  end
end

--- Prompt for custom game parameters
--- @return: width, height, mine_count (or nil if cancelled)
local function prompt_custom_game()
  shell.clear()
  shell.show_cursor()

  io.write("\n  Custom Game Setup\n")
  io.write("  ─────────────────\n\n")

  -- Prompt for width
  io.write("  Board width (3-50): ")
  io.flush()
  local width_str = io.read()
  local width = tonumber(width_str)
  if not width or width < 3 or width > 50 then
    shell.foreground(shell.RED)
    io.write("\n  Invalid width! Press any key to return to menu...")
    shell.reset()
    io.read(1)
    return nil
  end

  -- Prompt for height
  io.write("  Board height (3-50): ")
  io.flush()
  local height_str = io.read()
  local height = tonumber(height_str)
  if not height or height < 3 or height > 50 then
    shell.foreground(shell.RED)
    io.write("\n  Invalid height! Press any key to return to menu...")
    shell.reset()
    io.read(1)
    return nil
  end

  -- Prompt for mine count
  local max_mines = width * height - 9
  io.write(string.format("  Mine count (1-%d): ", max_mines))
  io.flush()
  local mines_str = io.read()
  local mines = tonumber(mines_str)
  if not mines or mines < 1 or mines > max_mines then
    shell.foreground(shell.RED)
    io.write("\n  Invalid mine count! Press any key to return to menu...")
    shell.reset()
    io.read(1)
    return nil
  end

  shell.hide_cursor()
  return width, height, mines
end

-- ============================================================================
-- Helper Functions - Game Flow
-- ============================================================================

--- Start a new game
--- @param state: game state object
--- @param difficulty: difficulty string or nil for custom
--- @param width: custom width (if difficulty is nil)
--- @param height: custom height (if difficulty is nil)
--- @param mines: custom mine count (if difficulty is nil)
local function start_new_game(state, difficulty, width, height, mines)
  -- Get dimensions from difficulty preset or custom params
  if difficulty then
    local preset = DIFFICULTIES[difficulty]
    width = preset.width
    height = preset.height
    mines = preset.mines
  end

  -- Create new model
  state.game_model = model.new(width, height, mines)

  -- Reset cursor to center of board
  state.cursor_row = math.floor(height / 2) + 1
  state.cursor_col = math.floor(width / 2) + 1
end

--- Check terminal size and return if adequate
--- @param board_width: board width in cells
--- @param board_height: board height in cells
--- @return: true if adequate, false if too small
local function check_terminal_size(board_width, board_height)
  -- Calculate required size
  local required_width = board_width * 2 + 4
  local required_height = board_height + 6

  -- Get current terminal size
  local current_width = shell.width()
  local current_height = shell.height()

  return current_width >= required_width and current_height >= required_height,
         required_width, required_height
end

--- Wait for user to resize terminal
--- @param required_width: minimum terminal width needed
--- @param required_height: minimum terminal height needed
local function wait_for_resize(required_width, required_height)
  while true do
    shell.clear()

    local current_width = shell.width()
    local current_height = shell.height()

    -- Check if size is now adequate
    if current_width >= required_width and current_height >= required_height then
      break
    end

    -- Show resize message
    shell.foreground(shell.YELLOW)
    io.write("\n  Terminal too small!\n\n")
    shell.reset()
    io.write(string.format("  Current:  %d x %d\n", current_width, current_height))
    io.write(string.format("  Required: %d x %d\n\n", required_width, required_height))
    io.write("  Please resize your terminal and press any key to continue...")
    io.flush()

    io.read(1)
  end
end

--- Check if game is over and show message
--- @param game_model: model instance
--- @return: true if game is over, false otherwise
local function check_game_over(game_model)
  if game_model.state == "won" then
    shell.foreground(shell.GREEN)
    io.write("\n\n  🎉 YOU WON! 🎉\n\n")
    shell.reset()
    io.write("  Press any key to return to menu...")
    io.flush()
    io.read(1)
    return true
  elseif game_model.state == "lost" then
    shell.foreground(shell.RED)
    io.write("\n\n  💥 GAME OVER 💥\n\n")
    shell.reset()
    io.write("  Press any key to return to menu...")
    io.flush()
    io.read(1)
    return true
  end

  return false
end

--- Display a centered message
--- @param message: message text
--- @param color: color to use
local function show_message(message, color)
  shell.clear()
  shell.foreground(color)
  io.write("\n\n  " .. message .. "\n\n")
  shell.reset()
  io.write("  Press any key to continue...")
  io.flush()
  io.read(1)
end

-- ============================================================================
-- Helper Functions - Input
-- ============================================================================

--- Read single character input
--- @return: character or nil
local function get_input()
  return io.read(1)
end

--- Move cursor in a direction
--- @param state: game state object
--- @param direction: direction character ('w', 'a', 's', 'd')
local function move_cursor(state, direction)
  local new_row = state.cursor_row
  local new_col = state.cursor_col

  -- Calculate new position
  if direction == 'w' then
    new_row = new_row - 1
  elseif direction == 's' then
    new_row = new_row + 1
  elseif direction == 'a' then
    new_col = new_col - 1
  elseif direction == 'd' then
    new_col = new_col + 1
  end

  -- Clamp to board boundaries
  new_row = math.max(1, math.min(new_row, state.game_model.height))
  new_col = math.max(1, math.min(new_col, state.game_model.width))

  -- Update state
  state.cursor_row = new_row
  state.cursor_col = new_col
end

--- Process input and update state
--- @param state: game state object
--- @param char: input character
--- @return: action string ("menu" or nil)
local function process_input(state, char)
  if not char then return nil end

  -- Convert to lowercase
  local lower_char = char:lower()

  -- Movement
  if lower_char == 'w' or lower_char == 'a' or lower_char == 's' or lower_char == 'd' then
    move_cursor(state, lower_char)
    return nil
  end

  -- Reveal
  if char == ' ' then
    controller.reveal_cell(state.game_model, state.cursor_row, state.cursor_col)
    return nil
  end

  -- Toggle flag
  if char == '!' or char == '1' then
    controller.toggle_flag(state.game_model, state.cursor_row, state.cursor_col)
    return nil
  end

  -- Menu
  if lower_char == 'm' then
    return "menu"
  end

  return nil
end

-- ============================================================================
-- State Factory
-- ============================================================================

--- Create a new game state object
--- @return: state object
local function create_state()
  return {
    game_model = nil,
    cursor_row = 1,
    cursor_col = 1,
    running = true
  }
end

-- ============================================================================
-- Main Game Loop
-- ============================================================================

--- Game loop for active gameplay
--- @param state: game state object
--- @return: action string ("menu" to return to menu, nil to quit)
local function game_loop(state)
  while true do
    -- Check terminal size before drawing
    local adequate, req_w, req_h = check_terminal_size(
      state.game_model.width,
      state.game_model.height
    )
    if not adequate then
      wait_for_resize(req_w, req_h)
    end

    -- Draw board
    draw_board(state)

    -- Check if game is over
    if check_game_over(state.game_model) then
      return "menu"
    end

    -- Get input
    local char = get_input()

    -- Process input
    local action = process_input(state, char)
    if action == "menu" then
      return "menu"
    end
  end
end

--- Main entry point
local function main()
  local state = create_state()

  -- Main menu loop
  while state.running do
    -- Show menu
    show_menu(state)

    -- Get menu selection
    local action = handle_menu_input()

    -- Handle menu action
    if action == "quit" then
      show_message("Thanks for playing!", shell.CYAN)
      state.running = false
    elseif action == "easy" or action == "medium" or action == "hard" then
      start_new_game(state, action, nil, nil, nil)

      -- Check terminal size
      local adequate, req_w, req_h = check_terminal_size(
        state.game_model.width,
        state.game_model.height
      )
      if not adequate then
        wait_for_resize(req_w, req_h)
      end

      -- Start gameplay
      game_loop(state)
    elseif action == "custom" then
      local width, height, mines = prompt_custom_game()
      if width then
        start_new_game(state, nil, width, height, mines)

        -- Check terminal size
        local adequate, req_w, req_h = check_terminal_size(
          state.game_model.width,
          state.game_model.height
        )
        if not adequate then
          wait_for_resize(req_w, req_h)
        end

        -- Start gameplay
        game_loop(state)
      end
    elseif action == "resume" then
      if state.game_model then
        -- Check terminal size
        local adequate, req_w, req_h = check_terminal_size(
          state.game_model.width,
          state.game_model.height
        )
        if not adequate then
          wait_for_resize(req_w, req_h)
        end

        -- Resume gameplay
        game_loop(state)
      end
    end
  end

  -- Clean up
  shell.clear()
  shell.show_cursor()
  shell.reset()
end

-- ============================================================================
-- Entry Point
-- ============================================================================

main()
