-- minesweeper_canvas.lua
-- Graphical UI for Minesweeper using the canvas API
-- Handles rendering, mouse input, and user interaction (MVC: View layer)

local canvas = require("canvas")
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
-- Helper Functions - Layout
-- ============================================================================

--- Calculate layout for current board
--- @param state: game state object
local function calculate_layout(state)
  local canvas_width = canvas.get_width()
  local canvas_height = canvas.get_height()
  local available_width = canvas_width - 40  -- 20px margin each side
  local available_height = canvas_height - 100  -- 60px status bar + 40px margin

  local cell_size_width = math.floor(available_width / state.game_model.width)
  local cell_size_height = math.floor(available_height / state.game_model.height)
  local cell_size = math.min(cell_size_width, cell_size_height, 60)  -- Max 60px per cell

  -- Center the board
  local board_width = cell_size * state.game_model.width
  local board_height = cell_size * state.game_model.height
  local board_offset_x = (canvas_width - board_width) / 2
  local board_offset_y = 60 + (available_height - board_height) / 2

  -- Update state
  state.cell_size = cell_size
  state.board_offset_x = board_offset_x
  state.board_offset_y = board_offset_y
end

--- Convert screen coordinates to board position
--- @param state: game state object
--- @param screen_x: mouse x coordinate
--- @param screen_y: mouse y coordinate
--- @return: row, col (1-based) or nil, nil if outside board
local function screen_to_board(state, screen_x, screen_y)
  -- Calculate relative position within board
  local rel_x = screen_x - state.board_offset_x
  local rel_y = screen_y - state.board_offset_y

  -- Check if outside board bounds
  if rel_x < 0 or rel_y < 0 then
    return nil, nil
  end

  -- Calculate grid position
  local col = math.floor(rel_x / state.cell_size) + 1
  local row = math.floor(rel_y / state.cell_size) + 1

  -- Validate position
  if not state.game_model:is_valid_position(row, col) then
    return nil, nil
  end

  return row, col
end

--- Get color for mine count number (classic Minesweeper colors)
--- @param count: adjacent mine count (1-8)
--- @return: hex color string
local function get_number_color(count)
  if count == 1 then
    return '#4080FF'  -- light blue
  elseif count == 2 then
    return '#00FF00'  -- green
  elseif count == 3 then
    return '#FF0000'  -- red
  elseif count == 4 then
    return '#6060FF'  -- medium-light blue
  elseif count == 5 then
    return '#8B0000'  -- dark red
  else
    return '#FF00FF'  -- magenta
  end
end

-- ============================================================================
-- Helper Functions - Drawing
-- ============================================================================

--- Draw a menu button
--- @param x: button x position
--- @param y: button y position
--- @param width: button width
--- @param height: button height
--- @param text: button text
--- @param is_hovered: whether button is hovered
local function draw_button(x, y, width, height, text, is_hovered)
  -- Draw button background
  if is_hovered then
    canvas.set_color('#808080')  -- Light gray when hovered
  else
    canvas.set_color('#444444')  -- Dark gray when not hovered
  end
  canvas.fill_rect(x, y, width, height)

  -- Draw button border
  if is_hovered then
    canvas.set_color('#FFFFFF')
  else
    canvas.set_color('#666666')
  end
  canvas.set_line_width(2)
  canvas.draw_rect(x, y, width, height)

  -- Draw button text
  canvas.set_color('#FFFFFF')
  canvas.set_font_size(20)
  local text_width = canvas.get_text_width(text)
  canvas.draw_text(x + (width - text_width) / 2, y + (height - 24) / 2, text)
end

--- Draw main menu
--- @param state: game state object
local function draw_menu(state)
  -- Background
  canvas.set_color('#2B2B2B')
  canvas.fill_rect(0, 0, canvas.get_width(), canvas.get_height())

  -- Title
  canvas.set_color('#FFFFFF')
  canvas.set_font_size(48)
  local title = "MINESWEEPER"
  local title_width = canvas.get_text_width(title)
  canvas.draw_text((canvas.get_width() - title_width) / 2, 80, title)

  -- Menu buttons
  local button_width = 400
  local button_height = 50
  local button_x = (canvas.get_width() - button_width) / 2
  local y = 180

  -- Easy button
  draw_button(button_x, y, button_width, button_height, "Easy (9x9, 10 mines)", state.menu_hover == "easy")
  y = y + 60

  -- Medium button
  draw_button(button_x, y, button_width, button_height, "Medium (16x16, 40 mines)", state.menu_hover == "medium")
  y = y + 60

  -- Hard button
  draw_button(button_x, y, button_width, button_height, "Hard (30x16, 99 mines)", state.menu_hover == "hard")
  y = y + 60

  -- Resume button (if game exists)
  if state.game_model ~= nil then
    draw_button(button_x, y, button_width, button_height, "Resume", state.menu_hover == "resume")
    y = y + 60
  end

  -- Quit button
  draw_button(button_x, y, button_width, button_height, "Quit", state.menu_hover == "quit")
end

--- Draw status bar at top
--- @param state: game state object
local function draw_status_bar(state)
  local stats = state.game_model:get_statistics()

  -- Calculate elapsed time
  local elapsed_time
  if stats.state == "playing" then
    elapsed_time = canvas.get_time() - state.game_start_time
  else
    elapsed_time = state.final_time
  end

  -- Format time as MM:SS
  local minutes = math.floor(elapsed_time / 60)
  local seconds = math.floor(elapsed_time % 60)
  local time_str = string.format("%02d:%02d", minutes, seconds)

  -- Set color
  canvas.set_color('#FFFFFF')

  -- Draw status text
  canvas.set_font_size(20)
  local status_text = string.format(
    "Flags: %d/%d  |  Bombs: %d  |  Time: %s",
    stats.flags_placed,
    stats.mine_count,
    stats.bombs_remaining,
    time_str
  )

  local text_width = canvas.get_text_width(status_text)
  canvas.draw_text((canvas.get_width() - text_width) / 2, 20, status_text)
end

--- Draw a single cell
--- @param state: game state object
--- @param row: cell row position (1-based)
--- @param col: cell column position (1-based)
local function draw_cell(state, row, col)
  local cell = state.game_model:get_cell(row, col)
  local is_hovered = (row == state.hover_row and col == state.hover_col)

  -- Calculate screen position
  local x = state.board_offset_x + (col - 1) * state.cell_size
  local y = state.board_offset_y + (row - 1) * state.cell_size
  local size = state.cell_size

  -- Draw cell background
  if cell.is_revealed then
    -- Revealed cell - white background
    canvas.set_color('#FFFFFF')
    canvas.fill_rect(x, y, size, size)
  else
    -- Unrevealed cell - gray background
    if is_hovered then
      canvas.set_color('#DDDDDD')  -- Lighter when hovered
    else
      canvas.set_color('#CCCCCC')
    end
    canvas.fill_rect(x, y, size, size)
  end

  -- Draw cell border
  canvas.set_color('#999999')
  canvas.set_line_width(1)
  canvas.draw_rect(x, y, size, size)

  -- Draw cell content
  if cell.is_flagged then
    -- Draw flag
    canvas.set_color('#FF6400')  -- Orange
    canvas.set_font_size(math.floor(size * 0.6))
    local flag_width = canvas.get_text_width("!")
    canvas.draw_text(x + (size - flag_width) / 2, y + size * 0.2, "!")
  elseif cell.is_revealed then
    if cell.is_mine then
      -- Draw mine
      canvas.set_color('#000000')
      canvas.set_font_size(math.floor(size * 0.6))
      local mine_width = canvas.get_text_width("*")
      canvas.draw_text(x + (size - mine_width) / 2, y + size * 0.2, "*")
    else
      -- Draw number if count > 0
      local count = state.game_model:get_adjacent_mine_count(row, col)
      if count > 0 then
        canvas.set_color(get_number_color(count))
        canvas.set_font_size(math.floor(size * 0.5))
        local num_text = tostring(count)
        local num_width = canvas.get_text_width(num_text)
        canvas.draw_text(x + (size - num_width) / 2, y + size * 0.25, num_text)
      end
    end
  end
end

--- Draw game board
--- @param state: game state object
local function draw_board(state)
  -- Draw background
  canvas.set_color('#2B2B2B')
  canvas.fill_rect(0, 0, canvas.get_width(), canvas.get_height())

  -- Draw all cells
  for row = 1, state.game_model.height do
    for col = 1, state.game_model.width do
      draw_cell(state, row, col)
    end
  end
end

--- Draw win message overlay
--- @param state: game state object
local function draw_win_message(state)
  -- Semi-transparent overlay
  canvas.set_color('#00000080')  -- Black with 50% alpha (128 = 0x80)
  canvas.fill_rect(0, 0, canvas.get_width(), canvas.get_height())

  -- Win message
  canvas.set_color('#00FF00')
  canvas.set_font_size(48)
  local msg = "YOU WON!"
  local msg_width = canvas.get_text_width(msg)
  canvas.draw_text((canvas.get_width() - msg_width) / 2, canvas.get_height() / 2 - 60, msg)

  -- Time
  canvas.set_color('#FFFF00')
  canvas.set_font_size(32)
  local minutes = math.floor(state.final_time / 60)
  local seconds = math.floor(state.final_time % 60)
  local time_msg = string.format("Time: %02d:%02d", minutes, seconds)
  local time_width = canvas.get_text_width(time_msg)
  canvas.draw_text((canvas.get_width() - time_width) / 2, canvas.get_height() / 2, time_msg)

  -- Instruction
  canvas.set_color('#FFFFFF')
  canvas.set_font_size(20)
  local instr = "Press ESC to return to menu"
  local instr_width = canvas.get_text_width(instr)
  canvas.draw_text((canvas.get_width() - instr_width) / 2, canvas.get_height() / 2 + 50, instr)
end

--- Draw loss message overlay
local function draw_loss_message()
  -- Semi-transparent overlay
  canvas.set_color('#00000080')  -- Black with 50% alpha (128 = 0x80)
  canvas.fill_rect(0, 0, canvas.get_width(), canvas.get_height())

  -- Loss message
  canvas.set_color('#FF0000')
  canvas.set_font_size(48)
  local msg = "GAME OVER"
  local msg_width = canvas.get_text_width(msg)
  canvas.draw_text((canvas.get_width() - msg_width) / 2, canvas.get_height() / 2 - 40, msg)

  -- Instruction
  canvas.set_color('#FFFFFF')
  canvas.set_font_size(20)
  local instr = "Press ESC to return to menu"
  local instr_width = canvas.get_text_width(instr)
  canvas.draw_text((canvas.get_width() - instr_width) / 2, canvas.get_height() / 2 + 20, instr)
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

  -- Calculate layout
  calculate_layout(state)

  -- Set scene to game
  state.scene = "game"

  -- Reset hover state
  state.hover_row = nil
  state.hover_col = nil

  -- Start timer
  state.game_start_time = canvas.get_time()
  state.final_time = 0
end

--- Check if game is over
--- @param state: game state object
--- @return: "won", "lost", or nil
local function check_game_over(state)
  if state.game_model.state == "won" then
    return "won"
  elseif state.game_model.state == "lost" then
    return "lost"
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
    scene = "menu",
    hover_row = nil,
    hover_col = nil,
    cell_size = 40,
    board_offset_x = 0,
    board_offset_y = 60,
    game_start_time = 0,  -- Time when game started
    final_time = 0,       -- Time when game ended
    menu_hover = nil      -- Which menu button is hovered (or nil)
  }
end

-- ============================================================================
-- Main Game Loop - Input → Update → Draw
-- ============================================================================

local state = create_state()

--- Handle all user input
--- @param state: game state object
local function user_input(state)
  local mouse_x = canvas.get_mouse_x()
  local mouse_y = canvas.get_mouse_y()

  if state.scene == "menu" then
    -- Detect which menu button is hovered
    local button_width = 400
    local button_height = 50
    local button_x = (canvas.get_width() - button_width) / 2
    local y = 180

    state.menu_hover = nil  -- Reset hover

    -- Check each button
    if mouse_x >= button_x and mouse_x <= button_x + button_width then
      -- Easy button
      if mouse_y >= y and mouse_y <= y + button_height then
        state.menu_hover = "easy"
      end
      y = y + 60

      -- Medium button
      if mouse_y >= y and mouse_y <= y + button_height then
        state.menu_hover = "medium"
      end
      y = y + 60

      -- Hard button
      if mouse_y >= y and mouse_y <= y + button_height then
        state.menu_hover = "hard"
      end
      y = y + 60

      -- Resume button (if game exists)
      if state.game_model ~= nil then
        if mouse_y >= y and mouse_y <= y + button_height then
          state.menu_hover = "resume"
        end
        y = y + 60
      end

      -- Quit button
      if mouse_y >= y and mouse_y <= y + button_height then
        state.menu_hover = "quit"
      end
    end
  elseif state.scene == "game" and state.game_model then
    -- Game board hover
    state.hover_row, state.hover_col = screen_to_board(state, mouse_x, mouse_y)
  end
end

--- Update game state based on input
--- @param state: game state object
local function update(state)
  if state.scene == "menu" then
    -- Handle menu clicks
    if canvas.is_mouse_pressed(0) then  -- Left click
      if state.menu_hover == "easy" then
        start_new_game(state, "easy", nil, nil, nil)
      elseif state.menu_hover == "medium" then
        start_new_game(state, "medium", nil, nil, nil)
      elseif state.menu_hover == "hard" then
        start_new_game(state, "hard", nil, nil, nil)
      elseif state.menu_hover == "resume" and state.game_model then
        state.scene = "game"
      elseif state.menu_hover == "quit" then
        canvas.stop()
      end
    end
  elseif state.scene == "game" then
    local game_state = check_game_over(state)

    if game_state then
      -- Capture final time if not already captured
      if state.final_time == 0 then
        state.final_time = canvas.get_time() - state.game_start_time
      end

      -- Game over - only accept ESC
      if canvas.is_key_pressed("Escape") then
        state.scene = "menu"
      end
    else
      -- Active gameplay
      if canvas.is_key_pressed("Escape") then
        state.scene = "menu"
      end

      -- Handle mouse clicks
      if canvas.is_mouse_pressed(0) then  -- Left click
        if state.hover_row and state.hover_col then
          -- Check if Shift is held (Shift + Click = flag)
          if canvas.is_key_down("ShiftLeft") or canvas.is_key_down("ShiftRight") then
            controller.toggle_flag(state.game_model, state.hover_row, state.hover_col)
          else
            controller.reveal_cell(state.game_model, state.hover_row, state.hover_col)
          end
        end
      elseif canvas.is_mouse_pressed(2) then  -- Right click
        if state.hover_row and state.hover_col then
          controller.toggle_flag(state.game_model, state.hover_row, state.hover_col)
        end
      end
    end
  end
end

--- Draw everything
--- @param state: game state object
local function draw(state)
  if state.scene == "menu" then
    draw_menu(state)
  elseif state.scene == "game" then
    draw_board(state)
    draw_status_bar(state)

    local game_state = check_game_over(state)
    if game_state == "won" then
      draw_win_message(state)
    elseif game_state == "lost" then
      draw_loss_message()
    end
  end
end

--- Main game loop callback
local function game()
  user_input(state)
  update(state)
  draw(state)
end

-- ============================================================================
-- Entry Point
-- ============================================================================

canvas.set_size(800, 600)
canvas.tick(game)
canvas.start()
