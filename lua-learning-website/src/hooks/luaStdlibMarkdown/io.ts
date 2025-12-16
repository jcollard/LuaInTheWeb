/**
 * Markdown documentation for Lua io library.
 */

export function generateIODocumentation(): string {
  return `# IO Library

Input/output functions for file handling.

> **Note:** In the web environment, file operations work with the virtual filesystem.

## Standard Streams

\`\`\`lua
io.stdin   -- Standard input
io.stdout  -- Standard output
io.stderr  -- Standard error
\`\`\`

## Simple I/O

### io.write(...)

Writes to the current output file (default: stdout).

\`\`\`lua
io.write("Hello, ")
io.write("World!")
io.write("\\n")
-- Output: Hello, World!
\`\`\`

### io.read([format])

Reads from the current input file.

\`\`\`lua
-- Read formats:
io.read("l")   -- Read a line (default)
io.read("L")   -- Read a line with newline
io.read("n")   -- Read a number
io.read("a")   -- Read entire file
io.read(10)    -- Read 10 bytes
\`\`\`

### io.flush()

Flushes the output buffer.

## File Operations

### io.open(filename, [mode])

Opens a file and returns a file handle.

\`\`\`lua
local file = io.open("data.txt", "r")
if file then
  local content = file:read("a")
  print(content)
  file:close()
end
\`\`\`

**File modes:**
| Mode | Description |
|------|-------------|
| \`"r"\` | Read (default) |
| \`"w"\` | Write (truncate) |
| \`"a"\` | Append |
| \`"r+"\` | Read and write |
| \`"w+"\` | Read and write (truncate) |
| \`"a+"\` | Read and append |

### io.close([file])

Closes a file.

### io.type(obj)

Returns "file", "closed file", or nil.

\`\`\`lua
local f = io.open("test.txt", "w")
print(io.type(f))  -- "file"
f:close()
print(io.type(f))  -- "closed file"
\`\`\`

## File Handle Methods

When you open a file with \`io.open\`, you get a file handle with these methods:

### file:read([format])

Reads from the file.

\`\`\`lua
local file = io.open("data.txt", "r")
local line = file:read("l")
file:close()
\`\`\`

### file:write(...)

Writes to the file.

\`\`\`lua
local file = io.open("output.txt", "w")
file:write("Line 1\\n")
file:write("Line 2\\n")
file:close()
\`\`\`

### file:lines([format])

Returns an iterator over lines.

\`\`\`lua
for line in io.lines("data.txt") do
  print(line)
end

-- Or with a file handle:
local file = io.open("data.txt", "r")
for line in file:lines() do
  print(line)
end
file:close()
\`\`\`

### file:seek([whence], [offset])

Sets/gets file position.

\`\`\`lua
local file = io.open("data.txt", "r")
file:seek("set", 0)   -- Go to beginning
file:seek("cur", 10)  -- Move 10 bytes forward
file:seek("end", -5)  -- Go 5 bytes from end
local pos = file:seek()  -- Get current position
file:close()
\`\`\`

### file:flush()

Flushes the write buffer.

### file:close()

Closes the file.

## Common Patterns

### Reading an entire file

\`\`\`lua
local function readFile(filename)
  local file = io.open(filename, "r")
  if not file then return nil end
  local content = file:read("a")
  file:close()
  return content
end

local content = readFile("data.txt")
\`\`\`

### Writing to a file

\`\`\`lua
local function writeFile(filename, content)
  local file = io.open(filename, "w")
  if not file then return false end
  file:write(content)
  file:close()
  return true
end

writeFile("output.txt", "Hello, World!")
\`\`\`

### Processing line by line

\`\`\`lua
local function processLines(filename, fn)
  for line in io.lines(filename) do
    fn(line)
  end
end

processLines("data.txt", function(line)
  print(">> " .. line)
end)
\`\`\`

### Appending to a file

\`\`\`lua
local function appendToFile(filename, content)
  local file = io.open(filename, "a")
  if not file then return false end
  file:write(content)
  file:close()
  return true
end

appendToFile("log.txt", "New entry\\n")
\`\`\`
`
}
