-- ============================================================
-- Escape Demo
-- A complete escape room using only the concepts from the
-- six tutorial lessons: print, the shell library, io.read,
-- if/elseif/else, functions, and boolean variables.
--
-- How to play:
--   Explore three rooms, find a hidden key, unlock the desk,
--   read the passcode, then enter it on the keypad at the
--   front door to escape.
-- ============================================================

local shell = require("shell")

local has_key = false
local desk_open = false

function study()
  shell.clear()

  shell.foreground(shell.YELLOW)
  print("=== THE STUDY ===")
  shell.reset()

  print()
  print("A cramped study lined with bookshelves.")
  print("A wooden desk sits against the far wall.")
  if desk_open then
    shell.foreground(shell.GREEN)
    print("The desk drawer is open. A slip of paper")
    print("inside reads:  PASSCODE = 5432")
    shell.reset()
  end
  print()
  print("What do you do?")
  if not desk_open then
    print("  1. Try to open the desk")
  else
    print("  1. Read the slip of paper again")
  end
  print("  2. Go to the bedroom")
  print("  3. Go to the foyer")
  print()

  local choice = io.read()

  if choice == "1" then
    if desk_open then
      shell.foreground(shell.GREEN)
      print("The paper says:  PASSCODE = 5432")
      shell.reset()
      print("Press Enter to continue.")
      io.read()
      study()
    elseif has_key then
      desk_open = true
      shell.foreground(shell.GREEN)
      print("The brass key turns with a click.")
      print("The drawer slides open. Inside is a slip")
      print("of paper that reads:  PASSCODE = 5432")
      shell.reset()
      print("Press Enter to continue.")
      io.read()
      study()
    else
      print("The desk drawer is locked. You'll need a key.")
      print("Press Enter to continue.")
      io.read()
      study()
    end
  elseif choice == "2" then
    bedroom()
  elseif choice == "3" then
    foyer()
  else
    print("Invalid choice! Press Enter to continue.")
    io.read()
    study()
  end
end

function bedroom()
  shell.clear()

  shell.foreground(shell.MAGENTA)
  print("=== THE BEDROOM ===")
  shell.reset()

  print()
  print("A small bedroom with an unmade bed.")
  print("A faded rug covers the floor by the bed.")
  print()
  print("What do you do?")
  if not has_key then
    print("  1. Look under the rug")
  else
    print("  1. Check under the rug again")
  end
  print("  2. Go to the study")
  print("  3. Go to the foyer")
  print()

  local choice = io.read()

  if choice == "1" then
    if has_key then
      print("Nothing else is under the rug.")
      print("Press Enter to continue.")
      io.read()
      bedroom()
    else
      has_key = true
      shell.foreground(shell.GREEN)
      print("You lift the rug and find a small brass key!")
      shell.reset()
      print("Press Enter to continue.")
      io.read()
      bedroom()
    end
  elseif choice == "2" then
    study()
  elseif choice == "3" then
    foyer()
  else
    print("Invalid choice! Press Enter to continue.")
    io.read()
    bedroom()
  end
end

function foyer()
  shell.clear()

  shell.foreground(shell.CYAN)
  print("=== THE FOYER ===")
  shell.reset()

  print()
  print("A tiled entryway with a heavy front door.")
  print("A keypad glows beside the doorframe.")
  print()
  print("What do you do?")
  print("  1. Type a code on the keypad")
  print("  2. Go to the study")
  print("  3. Go to the bedroom")
  print()

  local choice = io.read()

  if choice == "1" then
    print()
    print("Enter the 4-digit code:")
    local code = io.read()
    if code == "5432" then
      escape_scene()
    else
      print("The keypad beeps angrily. Wrong code!")
      print("Press Enter to continue.")
      io.read()
      foyer()
    end
  elseif choice == "2" then
    study()
  elseif choice == "3" then
    bedroom()
  else
    print("Invalid choice! Press Enter to continue.")
    io.read()
    foyer()
  end
end

function escape_scene()
  shell.clear()
  shell.foreground(shell.GREEN)
  print("=================================")
  print("         YOU ESCAPED!")
  print("=================================")
  shell.reset()
  print()
  print("The keypad chirps green. The front door")
  print("swings open and sunlight pours in.")
  print()
  print("You step outside. Free at last!")
end

study()
