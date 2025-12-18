-- error_handling.lua
-- Demonstrates proper error handling for file operations

print("=== File I/O Error Handling ===")
print()

-- io.open returns nil and an error message if it fails
print("--- Attempting to open a non-existent file ---")

local file, err = io.open("does_not_exist.txt", "r")

if file then
  print("File opened successfully")
  file:close()
else
  print("Failed to open file!")
  print("Error message: " .. err)
end

print()
print("--- The Right Way: Always check for errors ---")

-- Good pattern for opening files
local function read_file_safely(filename)
  local f, error_msg = io.open(filename, "r")

  if not f then
    return nil, "Could not open " .. filename .. ": " .. error_msg
  end

  local content = f:read("a")
  f:close()

  return content, nil
end

-- Test with a file that doesn't exist
local content, err = read_file_safely("missing.txt")
if err then
  print("Error: " .. err)
else
  print("Content: " .. content)
end

-- Now create a file and read it
print()
print("--- Creating and reading a file ---")

local file = io.open("test.txt", "w")
if file then
  file:write("This file exists!\n")
  file:close()
end

content, err = read_file_safely("test.txt")
if err then
  print("Error: " .. err)
else
  print("Success! Content: " .. content)
end

print()
print("Tip: Always check if io.open() returned nil before using the file!")
