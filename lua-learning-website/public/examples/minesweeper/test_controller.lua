-- test_controller.lua
-- Test script for the Minesweeper controller

local model = require("model")
local controller = require("controller")

print("=== Testing Minesweeper Controller ===\n")

-- Test 1: First click safety
print("Test 1: First click safety...")
local game = model.new(5, 5, 3)
local success = controller.reveal_cell(game, 3, 3)
assert(success == true, "First reveal should succeed")
assert(game.state == "playing", "Game should be in playing state")

-- Verify no mines in safe zone (3,3 + 8 neighbors)
local safe_cells = {
  {3, 3}, {2, 2}, {2, 3}, {2, 4},
  {3, 2}, {3, 4}, {4, 2}, {4, 3}, {4, 4}
}
for _, pos in ipairs(safe_cells) do
  local cell = game:get_cell(pos[1], pos[2])
  assert(not cell.is_mine, string.format("Cell (%d,%d) should not have mine in safe zone", pos[1], pos[2]))
end

-- Count total mines placed
local mine_count = 0
for row = 1, 5 do
  for col = 1, 5 do
    if game:get_cell(row, col).is_mine then
      mine_count = mine_count + 1
    end
  end
end
assert(mine_count == 3, "Should have exactly 3 mines placed")
print("✓ First click safety works correctly")
print()

-- Test 2: Revealing an already revealed cell (no-op)
print("Test 2: Revealing already revealed cell...")
local game2 = model.new(5, 5, 3)
controller.reveal_cell(game2, 3, 3)
local cell_before = game2:get_cell(3, 3)
assert(cell_before.is_revealed == true, "Cell should be revealed")
assert(game2.state ~= "lost", "Game should not be lost")

local success2 = controller.reveal_cell(game2, 3, 3)
assert(success2 == true, "Re-revealing should return true (no-op)")
print("✓ Re-revealing works correctly")
print()

-- Test 3: Flag toggling
print("Test 3: Flag toggling...")
local game3 = model.new(3, 3, 1)
local cell = game3:get_cell(1, 1)
assert(cell.is_flagged == false, "Initially not flagged")

controller.toggle_flag(game3, 1, 1)
assert(cell.is_flagged == true, "Should be flagged after toggle")

controller.toggle_flag(game3, 1, 1)
assert(cell.is_flagged == false, "Should be unflagged after second toggle")
print("✓ Flag toggling works correctly")
print()

-- Test 4: Can't reveal flagged cell
print("Test 4: Blocking reveal of flagged cell...")
local game4 = model.new(3, 3, 1)
controller.toggle_flag(game4, 1, 1)
local success4 = controller.reveal_cell(game4, 1, 1)
assert(success4 == false, "Should not be able to reveal flagged cell")
assert(game4:get_cell(1, 1).is_revealed == false, "Cell should still be hidden")
print("✓ Can't reveal flagged cells")
print()

-- Test 5: Can't flag revealed cell
print("Test 5: Blocking flag of revealed cell...")
local game5 = model.new(3, 3, 1)
controller.reveal_cell(game5, 2, 2)  -- Reveal a cell
local cell5 = game5:get_cell(2, 2)
assert(cell5.is_revealed == true, "Cell should be revealed")

local success5 = controller.toggle_flag(game5, 2, 2)
assert(success5 == false, "Should not be able to flag revealed cell")
assert(cell5.is_flagged == false, "Cell should not be flagged")
print("✓ Can't flag revealed cells")
print()

-- Test 6: Loss condition
print("Test 6: Loss condition (revealing a mine)...")
local game6 = model.new(3, 3, 1)
-- Manually place a mine at (1,1)
game6:set_mine(1, 1)
game6:set_state("playing")  -- Skip first-click placement

controller.reveal_cell(game6, 1, 1)
assert(game6.state == "lost", "Game should be lost")
assert(game6:get_cell(1, 1).is_revealed == true, "Mine should be revealed")

-- Verify all mines are revealed on loss
for row = 1, 3 do
  for col = 1, 3 do
    local c = game6:get_cell(row, col)
    if c.is_mine then
      assert(c.is_revealed == true, "All mines should be revealed on loss")
    end
  end
end
print("✓ Loss condition works correctly")
print()

-- Test 7: Win condition
print("Test 7: Win condition (revealing all non-mine cells)...")
local game7 = model.new(3, 3, 1)
-- Manually place mine and set playing state
game7:set_mine(1, 1)
game7:set_state("playing")

-- Reveal all cells except the mine
for row = 1, 3 do
  for col = 1, 3 do
    local c = game7:get_cell(row, col)
    if not c.is_mine and not c.is_flagged then
      controller.reveal_cell(game7, row, col)
    end
  end
end

assert(game7.state == "won", "Game should be won")

-- Verify all mines are revealed on win
assert(game7:get_cell(1, 1).is_revealed == true, "Mine should be revealed on win")
print("✓ Win condition works correctly")
print()

-- Test 8: Game over blocking
print("Test 8: Blocking actions after game over...")
local game8 = model.new(3, 3, 1)
game8:set_mine(1, 1)
game8:set_state("playing")

-- Lose the game
controller.reveal_cell(game8, 1, 1)
assert(game8.state == "lost", "Game should be lost")

-- Try to make more moves
local success_reveal = controller.reveal_cell(game8, 2, 2)
local success_flag = controller.toggle_flag(game8, 2, 2)

assert(success_reveal == false, "Can't reveal after game over")
assert(success_flag == false, "Can't flag after game over")
print("✓ Actions blocked after game over")
print()

-- Test 9: Invalid positions
print("Test 9: Invalid position handling...")
local game9 = model.new(3, 3, 1)
local success_reveal = controller.reveal_cell(game9, 0, 0)
local success_flag = controller.toggle_flag(game9, 10, 10)

assert(success_reveal == false, "Invalid reveal should fail")
assert(success_flag == false, "Invalid flag should fail")
print("✓ Invalid positions handled correctly")
print()

-- Test 10: Flood fill
print("Test 10: Flood fill for empty cells...")
local game10 = model.new(5, 5, 1)
-- Place mine in corner
game10:set_mine(1, 1)
game10:set_state("playing")

-- Reveal cell far from mine (should flood fill)
controller.reveal_cell(game10, 5, 5)

-- Check that multiple cells were revealed (flood fill happened)
local revealed_count = 0
for row = 1, 5 do
  for col = 1, 5 do
    if game10:get_cell(row, col).is_revealed then
      revealed_count = revealed_count + 1
    end
  end
end

assert(revealed_count > 1, "Flood fill should reveal multiple cells")
print("  Flood fill revealed", revealed_count, "cells")
print("✓ Flood fill works correctly")
print()

-- Test 11: Static functions (no instance state)
print("Test 11: Static function behavior...")
local model_a = model.new(5, 5, 3)
local model_b = model.new(7, 7, 5)

-- Use controller with both models
controller.reveal_cell(model_a, 3, 3)
controller.reveal_cell(model_b, 4, 4)

-- Both models should have independent state
assert(model_a.state == "playing" or model_a.state == "won", "Model A should be playing or won")
assert(model_b.state == "playing" or model_b.state == "won", "Model B should be playing or won")
assert(model_a.width == 5, "Model A has correct width")
assert(model_b.width == 7, "Model B has correct width")

-- Verify they maintain separate game states
local cell_a = model_a:get_cell(3, 3)
local cell_b = model_b:get_cell(4, 4)
assert(cell_a.is_revealed == true, "Model A cell should be revealed")
assert(cell_b.is_revealed == true, "Model B cell should be revealed")
print("✓ Static functions work with multiple models")
print()

print("=== All Controller Tests Passed! ===")
print()
print("Summary:")
print("  ✓ First-click safety (9-cell safe zone)")
print("  ✓ Re-revealing cells (no-op)")
print("  ✓ Flag toggling")
print("  ✓ Flagged cell reveal blocking")
print("  ✓ Revealed cell flag blocking")
print("  ✓ Loss condition and mine revealing")
print("  ✓ Win condition detection")
print("  ✓ Game over action blocking")
print("  ✓ Invalid position handling")
print("  ✓ Flood fill for empty cells")
print("  ✓ Static function behavior")
print()
print("The controller is ready for use with views!")
