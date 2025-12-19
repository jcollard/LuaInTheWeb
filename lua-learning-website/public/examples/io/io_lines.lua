-- io_lines.lua
-- Demonstrates io.lines() for iterating over file lines

print("=== Using io.lines() Iterator ===")
print()

-- First, create a file with some data
local file = io.open("numbers.txt", "w")
if file then
  for i = 1, 5 do
    file:write("Number " .. i .. ": " .. (i * 10) .. "\n")
  end
  file:close()
  print("Created numbers.txt")
  print()
end

-- Use io.lines() to iterate over all lines
-- This is the easiest way to read a file line by line!
print("--- Reading with io.lines() ---")
local count = 0
for line in io.lines("numbers.txt") do
  count = count + 1
  print("Line " .. count .. ": " .. line)
end

print()
print("Total lines read: " .. count)
print()

-- io.lines() automatically closes the file when done
-- It's perfect for simple line-by-line processing!

print("--- Practical Example: Sum numbers from file ---")

-- Create a file with just numbers
file = io.open("values.txt", "w")
if file then
  file:write("10\n25\n30\n15\n20\n")
  file:close()
end

local sum = 0
for line in io.lines("values.txt") do
  local num = tonumber(line)
  if num then
    sum = sum + num
  end
end
print("Sum of all values: " .. sum)
