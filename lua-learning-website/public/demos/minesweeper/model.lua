-- model.lua
-- Minesweeper data model following functional, lazy-evaluation principles
-- Stores minimal state, computes derived values on-demand

local model = {}

-- ============================================================================
-- Private Helper Functions
-- ============================================================================

--- Create empty board with all cells initialized to default values
--- @param width: number of columns
--- @param height: number of rows
--- @return: 2D array [1..height][1..width] of cell tables
function model._create_empty_board(width, height)
  local board = {}
  for row = 1, height do
    board[row] = {}
    for col = 1, width do
      board[row][col] = {
        is_mine = false,
        is_revealed = false,
        is_flagged = false
      }
    end
  end
  return board
end

-- ============================================================================
-- Public API Functions
-- ============================================================================

--- Create a new game instance
--- @param width: board width (columns), must be >= 1
--- @param height: board height (rows), must be >= 1
--- @param mine_count: number of mines to place, must be < (width * height - 9) for first-click safety
--- @return: new model instance
function model.new(width, height, mine_count)
  -- Validate parameters
  assert(width >= 1, "Width must be at least 1")
  assert(height >= 1, "Height must be at least 1")
  assert(mine_count >= 0, "Mine count must be non-negative")
  assert(mine_count < (width * height), "Mine count must be less than total cells")

  -- For first-click safety, we need room for at least 9 cells (clicked + 8 neighbors)
  -- to be safe. However, for small boards this might not be possible.
  -- We'll warn but not enforce for flexibility
  if mine_count > (width * height - 9) then
    print("Warning: High mine count may make first-click safety difficult on small boards")
  end

  local instance = {
    width = width,
    height = height,
    mine_count = mine_count,
    state = "not_started",
    board = model._create_empty_board(width, height)
  }

  -- Set up metatable to access model functions
  setmetatable(instance, { __index = model })

  return instance
end

--- Check if a position is within board bounds
--- @param row: row index (1-based)
--- @param col: column index (1-based)
--- @return: true if position is valid, false otherwise
function model:is_valid_position(row, col)
  return row >= 1 and row <= self.height and col >= 1 and col <= self.width
end

--- Get cell at position
--- @param row: row index (1-based)
--- @param col: column index (1-based)
--- @return: cell table or nil if position is invalid
function model:get_cell(row, col)
  if not self:is_valid_position(row, col) then
    return nil
  end
  return self.board[row][col]
end

--- Get array of valid neighbor coordinates for a cell
--- @param row: row index (1-based)
--- @param col: column index (1-based)
--- @return: array of {row, col} tables for valid neighbors
function model:get_neighbors(row, col)
  local neighbors = {}

  -- Check all 8 directions: N, NE, E, SE, S, SW, W, NW
  local offsets = {
    {-1, -1}, {-1, 0}, {-1, 1},  -- top-left, top, top-right
    {0, -1},           {0, 1},   -- left, right
    {1, -1},  {1, 0},  {1, 1}    -- bottom-left, bottom, bottom-right
  }

  for _, offset in ipairs(offsets) do
    local neighbor_row = row + offset[1]
    local neighbor_col = col + offset[2]

    if self:is_valid_position(neighbor_row, neighbor_col) then
      table.insert(neighbors, {row = neighbor_row, col = neighbor_col})
    end
  end

  return neighbors
end

-- ============================================================================
-- Cell State Mutations (Simple Setters)
-- ============================================================================

--- Set a cell as containing a mine
--- @param row: row index (1-based)
--- @param col: column index (1-based)
--- @return: true if successful, false if position invalid
function model:set_mine(row, col)
  local cell = self:get_cell(row, col)
  if not cell then
    return false
  end

  cell.is_mine = true
  return true
end

--- Set a cell's revealed state
--- @param row: row index (1-based)
--- @param col: column index (1-based)
--- @param value: boolean value to set
--- @return: true if successful, false if position invalid
function model:set_revealed(row, col, value)
  local cell = self:get_cell(row, col)
  if not cell then
    return false
  end

  cell.is_revealed = value
  return true
end

--- Set a cell's flagged state
--- @param row: row index (1-based)
--- @param col: column index (1-based)
--- @param value: boolean value to set
--- @return: true if successful, false if position invalid
function model:set_flagged(row, col, value)
  local cell = self:get_cell(row, col)
  if not cell then
    return false
  end

  cell.is_flagged = value
  return true
end

--- Set game state
--- @param state: string value ("not_started", "playing", "won", "lost")
function model:set_state(state)
  self.state = state
end

-- ============================================================================
-- Query Functions (Computed On-Demand)
-- ============================================================================

--- Get count of mines in neighboring cells (computed on-demand)
--- @param row: row index (1-based)
--- @param col: column index (1-based)
--- @return: count of mines in neighbors (0-8), or 0 if position invalid
function model:get_adjacent_mine_count(row, col)
  if not self:is_valid_position(row, col) then
    return 0
  end

  local count = 0
  local neighbors = self:get_neighbors(row, col)

  for _, neighbor in ipairs(neighbors) do
    local neighbor_cell = self:get_cell(neighbor.row, neighbor.col)
    if neighbor_cell and neighbor_cell.is_mine then
      count = count + 1
    end
  end

  return count
end

--- Get count of flagged cells (computed by iterating board)
--- @return: number of flagged cells
function model:get_flags_placed()
  local count = 0

  for row = 1, self.height do
    for col = 1, self.width do
      if self.board[row][col].is_flagged then
        count = count + 1
      end
    end
  end

  return count
end

--- Get count of bombs remaining (mines not flagged)
--- @return: mine_count - flags_placed (can be negative if over-flagged)
function model:get_bombs_remaining()
  return self.mine_count - self:get_flags_placed()
end

--- Check if game is won (all non-mine cells revealed)
--- @return: true if won, false otherwise
function model:is_won()
  for row = 1, self.height do
    for col = 1, self.width do
      local cell = self.board[row][col]
      -- If a non-mine cell is not revealed, game is not won
      if not cell.is_mine and not cell.is_revealed then
        return false
      end
    end
  end

  -- All non-mine cells are revealed
  return true
end

--- Get game statistics
--- @return: table with flags_placed, bombs_remaining, and state
function model:get_statistics()
  return {
    flags_placed = self:get_flags_placed(),
    bombs_remaining = self:get_bombs_remaining(),
    state = self.state,
    width = self.width,
    height = self.height,
    mine_count = self.mine_count
  }
end

-- ============================================================================
-- Return module
-- ============================================================================

return model
