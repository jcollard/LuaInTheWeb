-- write_file.lua
-- Demonstrates how to write content to a file using io.open

print("=== Writing to a File ===")
print()

-- Open a file for writing ("w" mode)
-- This creates the file if it doesn't exist, or overwrites it if it does
local file = io.open("greeting.txt", "w")

if file then
  -- Write some content to the file
  file:write("Hello from Lua!\n")
  file:write("This is line 2.\n")
  file:write("This is line 3.\n")

  -- Always close the file when done
  file:close()

  print("Successfully wrote to greeting.txt")
  print()
  print("Tip: Use 'cat greeting.txt' in the shell to see the file contents!")
else
  print("Error: Could not open file for writing")
end
