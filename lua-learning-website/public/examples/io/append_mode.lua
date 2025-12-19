-- append_mode.lua
-- Demonstrates append mode ("a") for adding content to existing files

print("=== Append Mode Demo ===")
print()

-- Create a log file
local file = io.open("log.txt", "w")
if file then
  file:write("=== Application Log ===\n")
  file:write("[START] Log initialized\n")
  file:close()
  print("Created log.txt with initial content")
end

-- Read and display initial content
print()
print("Initial content:")
for line in io.lines("log.txt") do
  print("  " .. line)
end

-- Append new entries using "a" mode
-- This adds to the end of the file without erasing existing content
print()
print("Appending new log entries...")

file = io.open("log.txt", "a")
if file then
  file:write("[INFO] User logged in\n")
  file:close()
end

file = io.open("log.txt", "a")
if file then
  file:write("[INFO] File saved\n")
  file:close()
end

file = io.open("log.txt", "a")
if file then
  file:write("[END] Session complete\n")
  file:close()
end

-- Read and display final content
print()
print("Final content after appends:")
for line in io.lines("log.txt") do
  print("  " .. line)
end

print()
print("Key insight: 'w' mode overwrites, 'a' mode appends!")
