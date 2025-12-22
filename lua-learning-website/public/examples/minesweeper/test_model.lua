-- test_model.lua
-- Test script for the Minesweeper model

local model = require("model")

print("=== Testing Minesweeper Model ===\n")

-- Test 1: Create a new game
print("Test 1: Creating a 5x5 board with 3 mines...")
local game = model.new(5, 5, 3)
print("✓ Board created successfully")
print("  Width:", game.width)
print("  Height:", game.height)
print("  Mine count:", game.mine_count)
print("  Initial state:", game.state)
print()

-- Test 2: Validate positions
print("Test 2: Testing position validation...")
assert(game:is_valid_position(1, 1) == true, "Top-left should be valid")
assert(game:is_valid_position(5, 5) == true, "Bottom-right should be valid")
assert(game:is_valid_position(0, 0) == false, "Out of bounds should be invalid")
assert(game:is_valid_position(6, 6) == false, "Out of bounds should be invalid")
print("✓ Position validation works correctly")
print()

-- Test 3: Get and set cells
print("Test 3: Testing cell access and mutation...")
local cell = game:get_cell(3, 3)
assert(cell ~= nil, "Should get valid cell")
assert(cell.is_mine == false, "Initially no mines")
assert(cell.is_revealed == false, "Initially not revealed")
assert(cell.is_flagged == false, "Initially not flagged")

game:set_mine(3, 3)
assert(cell.is_mine == true, "Mine should be set")

game:set_revealed(3, 3, true)
assert(cell.is_revealed == true, "Revealed should be set")

game:set_flagged(2, 2, true)
local cell2 = game:get_cell(2, 2)
assert(cell2.is_flagged == true, "Flag should be set")
print("✓ Cell mutations work correctly")
print()

-- Test 4: Get neighbors
print("Test 4: Testing neighbor calculation...")
local neighbors_center = game:get_neighbors(3, 3)
assert(#neighbors_center == 8, "Center cell should have 8 neighbors")

local neighbors_corner = game:get_neighbors(1, 1)
assert(#neighbors_corner == 3, "Corner cell should have 3 neighbors")

local neighbors_edge = game:get_neighbors(1, 3)
assert(#neighbors_edge == 5, "Edge cell should have 5 neighbors")
print("✓ Neighbor calculation works correctly")
print("  Center (3,3):", #neighbors_center, "neighbors")
print("  Corner (1,1):", #neighbors_corner, "neighbors")
print("  Edge (1,3):", #neighbors_edge, "neighbors")
print()

-- Test 5: Adjacent mine count
print("Test 5: Testing adjacent mine count...")
-- Create a fresh board for clean testing
local game_test5 = model.new(5, 5, 3)
-- Place mines around position (2, 2)
game_test5:set_mine(1, 1)
game_test5:set_mine(1, 2)
game_test5:set_mine(2, 1)

local adjacent_count = game_test5:get_adjacent_mine_count(2, 2)
assert(adjacent_count == 3, "Should count 3 adjacent mines")
print("✓ Adjacent mine count works correctly")
print("  Position (2,2) has", adjacent_count, "adjacent mines")
print()

-- Test 6: Flags counting
print("Test 6: Testing flag counting...")
local flags_before = game:get_flags_placed()
game:set_flagged(4, 4, true)
game:set_flagged(5, 5, true)
local flags_after = game:get_flags_placed()
assert(flags_after == flags_before + 2, "Should count 2 more flags")
print("✓ Flag counting works correctly")
print("  Flags placed:", flags_after)
print()

-- Test 7: Bombs remaining
print("Test 7: Testing bombs remaining calculation...")
local bombs_remaining = game:get_bombs_remaining()
print("  Mines:", game.mine_count)
print("  Flags:", game:get_flags_placed())
print("  Bombs remaining:", bombs_remaining)
assert(bombs_remaining == game.mine_count - game:get_flags_placed(), "Calculation should match")
print("✓ Bombs remaining calculation works correctly")
print()

-- Test 8: Win condition
print("Test 8: Testing win condition...")
local game2 = model.new(3, 3, 1)
-- Place one mine
game2:set_mine(1, 1)

-- Initially not won
assert(game2:is_won() == false, "Game should not be won initially")

-- Reveal all non-mine cells
for row = 1, 3 do
  for col = 1, 3 do
    local c = game2:get_cell(row, col)
    if not c.is_mine then
      game2:set_revealed(row, col, true)
    end
  end
end

assert(game2:is_won() == true, "Game should be won when all non-mine cells revealed")
print("✓ Win condition detection works correctly")
print()

-- Test 9: Game state
print("Test 9: Testing game state...")
assert(game.state == "not_started", "Initial state should be not_started")
game:set_state("playing")
assert(game.state == "playing", "State should be updated")
game:set_state("won")
assert(game.state == "won", "State should be updated")
print("✓ Game state management works correctly")
print()

-- Test 10: Statistics
print("Test 10: Testing statistics...")
local stats = game:get_statistics()
assert(stats.flags_placed ~= nil, "Should include flags_placed")
assert(stats.bombs_remaining ~= nil, "Should include bombs_remaining")
assert(stats.state ~= nil, "Should include state")
assert(stats.width == 5, "Should include width")
assert(stats.height == 5, "Should include height")
assert(stats.mine_count == 3, "Should include mine_count")
print("✓ Statistics function works correctly")
print("  Statistics:", string.format("flags=%d, bombs=%d, state=%s",
                                      stats.flags_placed, stats.bombs_remaining, stats.state))
print()

-- Test 11: Edge cases
print("Test 11: Testing edge cases...")
-- Invalid position should return nil for get_cell
assert(game:get_cell(0, 0) == nil, "Invalid position should return nil")
assert(game:get_cell(10, 10) == nil, "Invalid position should return nil")

-- Set operations on invalid positions should return false
assert(game:set_mine(0, 0) == false, "Setting mine on invalid position should fail")
assert(game:set_revealed(10, 10, true) == false, "Setting revealed on invalid position should fail")
assert(game:set_flagged(10, 10, true) == false, "Setting flagged on invalid position should fail")

print("✓ Edge case handling works correctly")
print()

print("=== All Tests Passed! ===")
print()
print("Summary:")
print("  ✓ Model initialization")
print("  ✓ Position validation")
print("  ✓ Cell access and mutations")
print("  ✓ Neighbor calculation")
print("  ✓ Adjacent mine counting (on-demand)")
print("  ✓ Flag counting (on-demand)")
print("  ✓ Bombs remaining calculation")
print("  ✓ Win condition detection (on-demand)")
print("  ✓ Game state management")
print("  ✓ Statistics reporting")
print("  ✓ Edge case handling")
print()
print("The model is functional and ready to use!")
