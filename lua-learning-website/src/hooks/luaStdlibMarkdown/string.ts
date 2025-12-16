/**
 * Markdown documentation for Lua string library.
 */

export function generateStringDocumentation(): string {
  return `# String Library

Functions for string manipulation. Access via the \`string\` table or as methods on strings.

\`\`\`lua
-- These are equivalent:
string.upper("hello")
("hello"):upper()
\`\`\`

## Case Conversion

### string.upper(s)

Converts string to uppercase.

\`\`\`lua
print(string.upper("hello"))  -- "HELLO"
print(("hello"):upper())      -- "HELLO"
\`\`\`

### string.lower(s)

Converts string to lowercase.

\`\`\`lua
print(string.lower("HELLO"))  -- "hello"
\`\`\`

## Substrings

### string.sub(s, i, [j])

Extracts a substring from position \`i\` to \`j\` (inclusive). Negative indices count from the end.

\`\`\`lua
local s = "Hello, World!"
print(string.sub(s, 1, 5))    -- "Hello"
print(string.sub(s, 8))       -- "World!"
print(string.sub(s, -6))      -- "World!"
print(string.sub(s, -6, -2))  -- "World"
\`\`\`

## Length and Characters

### string.len(s)

Returns the length of the string. Equivalent to \`#s\`.

\`\`\`lua
print(string.len("hello"))  -- 5
print(#"hello")             -- 5
\`\`\`

### string.byte(s, [i], [j])

Returns the numeric byte values of characters.

\`\`\`lua
print(string.byte("ABC"))        -- 65
print(string.byte("ABC", 2))     -- 66
print(string.byte("ABC", 1, 3))  -- 65 66 67
\`\`\`

### string.char(...)

Creates a string from byte values.

\`\`\`lua
print(string.char(65, 66, 67))  -- "ABC"
\`\`\`

## Search and Replace

### string.find(s, pattern, [init], [plain])

Finds the first match of a pattern. Returns start and end positions.

\`\`\`lua
local s = "Hello, World!"
local start, finish = string.find(s, "World")
print(start, finish)  -- 8, 12

-- With captures
local s = "name=Alice"
local start, finish, value = string.find(s, "name=(%w+)")
print(value)  -- "Alice"
\`\`\`

### string.match(s, pattern, [init])

Returns the captures from a pattern match.

\`\`\`lua
local s = "The answer is 42"
print(string.match(s, "%d+"))  -- "42"

local date = "2024-01-15"
local year, month, day = string.match(date, "(%d+)-(%d+)-(%d+)")
print(year, month, day)  -- 2024, 01, 15
\`\`\`

### string.gmatch(s, pattern)

Returns an iterator for all matches of a pattern.

\`\`\`lua
local s = "apple,banana,cherry"
for fruit in string.gmatch(s, "[^,]+") do
  print(fruit)
end
-- Output:
-- apple
-- banana
-- cherry
\`\`\`

### string.gsub(s, pattern, repl, [n])

Replaces matches of a pattern. Returns new string and count of replacements.

\`\`\`lua
local s = "hello world"
print(string.gsub(s, "world", "Lua"))  -- "hello Lua", 1

-- Replace all digits
print(string.gsub("a1b2c3", "%d", "X"))  -- "aXbXcX", 3

-- Using a function
local result = string.gsub("hello", ".", function(c)
  return string.upper(c)
end)
print(result)  -- "HELLO"
\`\`\`

## Formatting

### string.format(format, ...)

Returns a formatted string (like C's printf).

\`\`\`lua
print(string.format("Hello, %s!", "World"))     -- "Hello, World!"
print(string.format("Pi: %.2f", 3.14159))       -- "Pi: 3.14"
print(string.format("Hex: %x", 255))            -- "Hex: ff"
print(string.format("Padded: %05d", 42))        -- "Padded: 00042"
\`\`\`

**Format specifiers:**
| Specifier | Description |
|-----------|-------------|
| \`%s\` | String |
| \`%d\` | Integer |
| \`%f\` | Float |
| \`%x\` | Hexadecimal (lowercase) |
| \`%X\` | Hexadecimal (uppercase) |
| \`%%\` | Literal % |

## Other Functions

### string.rep(s, n, [sep])

Repeats a string \`n\` times with optional separator.

\`\`\`lua
print(string.rep("ab", 3))       -- "ababab"
print(string.rep("x", 5, "-"))   -- "x-x-x-x-x"
\`\`\`

### string.reverse(s)

Reverses a string.

\`\`\`lua
print(string.reverse("hello"))  -- "olleh"
\`\`\`

## Pattern Syntax

Lua patterns are similar to regular expressions:

| Pattern | Matches |
|---------|---------|
| \`.\` | Any character |
| \`%a\` | Letters |
| \`%d\` | Digits |
| \`%w\` | Alphanumeric |
| \`%s\` | Whitespace |
| \`%p\` | Punctuation |
| \`%l\` | Lowercase |
| \`%u\` | Uppercase |
| \`[abc]\` | Character class |
| \`[^abc]\` | Negated class |
| \`*\` | 0 or more (greedy) |
| \`+\` | 1 or more (greedy) |
| \`-\` | 0 or more (non-greedy) |
| \`?\` | 0 or 1 |
| \`^...\` | Anchors to start |
| \`...$\` | Anchors to end |
| \`(...)\` | Capture group |
`
}
