-- read_file.lua
-- Demonstrates how to read content from a file using io.open

print("=== Reading from a File ===")
print()

-- First, let's create a file to read
local file = io.open("sample.txt", "w")
if file then
  file:write("Line 1: Hello!\n")
  file:write("Line 2: Welcome to file I/O.\n")
  file:write("Line 3: Lua makes it easy!\n")
  file:close()
  print("Created sample.txt for demonstration")
  print()
end

-- Now open the file for reading ("r" mode)
file = io.open("sample.txt", "r")

if file then
  print("--- Reading entire file with 'a' format ---")
  local content = file:read("a")  -- "a" reads all content
  print(content)

  file:close()
else
  print("Error: Could not open file for reading")
end

-- Reading line by line
print("--- Reading line by line with 'l' format ---")
file = io.open("sample.txt", "r")

if file then
  local line_num = 1
  while true do
    local line = file:read("l")  -- "l" reads one line (without newline)
    if not line then break end
    print("Read line " .. line_num .. ": " .. line)
    line_num = line_num + 1
  end
  file:close()
end

print()
print("--- Reading specific number of characters ---")
file = io.open("sample.txt", "r")

if file then
  local chars = file:read(10)  -- Read first 10 characters
  print("First 10 characters: '" .. chars .. "'")
  file:close()
end
