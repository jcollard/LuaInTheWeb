-- write_chaining.lua
-- Demonstrates write chaining for efficient file writing

print("=== Write Chaining Demo ===")
print()

-- file:write() returns the file handle, allowing chaining
local file = io.open("chained.txt", "w")

if file then
  -- Chain multiple writes together!
  file:write("First ")
      :write("Second ")
      :write("Third\n")
      :write("Line 2: ")
      :write("A")
      :write("B")
      :write("C")
      :write("\n")

  file:close()
  print("Wrote to chained.txt using write chaining")
end

-- Read back and display
print()
print("File contents:")
for line in io.lines("chained.txt") do
  print("  " .. line)
end

print()
print("--- Practical Example: Building a CSV file ---")

file = io.open("data.csv", "w")
if file then
  -- Write header
  file:write("Name,Age,City\n")

  -- Write data rows using chaining
  file:write("Alice"):write(","):write("25"):write(","):write("NYC\n")
  file:write("Bob"):write(","):write("30"):write(","):write("LA\n")
  file:write("Carol"):write(","):write("28"):write(","):write("Chicago\n")

  file:close()
  print("Created data.csv")
end

print()
print("CSV contents:")
for line in io.lines("data.csv") do
  print("  " .. line)
end
