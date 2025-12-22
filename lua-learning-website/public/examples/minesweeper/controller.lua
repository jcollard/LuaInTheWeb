-- controller.lua
-- Minesweeper game logic controller (stateless, pure functions)
-- Orchestrates model mutations for game actions

local controller = {}

-- ============================================================================
-- Private Helper Functions
-- ============================================================================

--- Place mines on first click, avoiding safe zone
--- @param model: model instance
--- @param safe_row: clicked row
--- @param safe_col: clicked column
function controller._place_mines(model, safe_row, safe_col)
  -- Build safe zone (clicked cell + 8 neighbors)
  local safe_zone = {}
  safe_zone[safe_row .. "," .. safe_col] = true

  local neighbors = model:get_neighbors(safe_row, safe_col)
  for _, neighbor in ipairs(neighbors) do
    local key = neighbor.row .. "," .. neighbor.col
    safe_zone[key] = true
  end

  -- Build list of valid mine positions (excluding safe zone)
  local valid_positions = {}
  for row = 1, model.height do
    for col = 1, model.width do
      local key = row .. "," .. col
      if not safe_zone[key] then
        table.insert(valid_positions, {row = row, col = col})
      end
    end
  end

  -- Shuffle using Fisher-Yates algorithm
  math.randomseed(os.time())
  for i = #valid_positions, 2, -1 do
    local j = math.random(1, i)
    valid_positions[i], valid_positions[j] = valid_positions[j], valid_positions[i]
  end

  -- Place mines at first mine_count positions
  local mines_to_place = math.min(model.mine_count, #valid_positions)
  for i = 1, mines_to_place do
    local pos = valid_positions[i]
    model:set_mine(pos.row, pos.col)
  end

  -- Update game state
  model:set_state("playing")
end

--- Flood fill reveal from a cell using BFS
--- @param model: model instance
--- @param start_row: starting row
--- @param start_col: starting column
function controller._flood_fill(model, start_row, start_col)
  -- Initialize BFS queue
  local queue = {{row = start_row, col = start_col}}
  local visited = {}
  visited[start_row .. "," .. start_col] = true

  while #queue > 0 do
    -- Dequeue first element
    local current = table.remove(queue, 1)
    local row, col = current.row, current.col

    -- Reveal current cell
    model:set_revealed(row, col, true)

    -- Get adjacent mine count
    local mine_count = model:get_adjacent_mine_count(row, col)

    -- Only spread if this is an empty cell (no adjacent mines)
    if mine_count == 0 then
      local neighbors = model:get_neighbors(row, col)

      for _, neighbor in ipairs(neighbors) do
        local n_row, n_col = neighbor.row, neighbor.col
        local key = n_row .. "," .. n_col
        local cell = model:get_cell(n_row, n_col)

        -- Enqueue if not visited, not a mine, not flagged, and not already revealed
        if not visited[key] and cell and not cell.is_mine
           and not cell.is_flagged and not cell.is_revealed then
          visited[key] = true
          table.insert(queue, {row = n_row, col = n_col})
        end
      end
    end
  end
end

--- Reveal all mines (for win/loss visualization)
--- @param model: model instance
function controller._reveal_all_mines(model)
  for row = 1, model.height do
    for col = 1, model.width do
      local cell = model:get_cell(row, col)
      if cell.is_mine then
        model:set_revealed(row, col, true)
      end
    end
  end
end

-- ============================================================================
-- Public API - Game Actions
-- ============================================================================

--- Reveal a cell (may trigger flood fill, win/loss)
--- @param model: model instance
--- @param row: row index (1-based)
--- @param col: column index (1-based)
--- @return: true if successful, false if blocked
function controller.reveal_cell(model, row, col)
  -- Validate position
  if not model:is_valid_position(row, col) then
    return false
  end

  -- Block actions after game over
  local state = model.state
  if state == "won" or state == "lost" then
    return false
  end

  local cell = model:get_cell(row, col)

  -- Block revealing flagged cells
  if cell.is_flagged then
    return false
  end

  -- Ignore already revealed cells (no-op)
  if cell.is_revealed then
    return true
  end

  -- First click: place mines avoiding this cell
  if model.state == "not_started" then
    controller._place_mines(model, row, col)
  end

  -- Check if cell is a mine
  if cell.is_mine then
    model:set_revealed(row, col, true)
    model:set_state("lost")
    controller._reveal_all_mines(model)
    return true
  end

  -- Safe cell: flood fill from here
  controller._flood_fill(model, row, col)

  -- Check win condition
  if model:is_won() then
    model:set_state("won")
    controller._reveal_all_mines(model)
  end

  return true
end

--- Toggle flag on a cell
--- @param model: model instance
--- @param row: row index (1-based)
--- @param col: column index (1-based)
--- @return: true if toggled, false if blocked
function controller.toggle_flag(model, row, col)
  -- Validate position
  if not model:is_valid_position(row, col) then
    return false
  end

  -- Block actions after game over
  local state = model.state
  if state == "won" or state == "lost" then
    return false
  end

  local cell = model:get_cell(row, col)

  -- Can't flag revealed cells
  if cell.is_revealed then
    return false
  end

  -- Toggle the flag
  model:set_flagged(row, col, not cell.is_flagged)
  return true
end

-- ============================================================================
-- Return Module
-- ============================================================================

return controller
