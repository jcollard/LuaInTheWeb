/**
 * Markdown documentation for Lua basics (global functions).
 */

export function generateBasicsDocumentation(): string {
  return `# Lua Basics

Core global functions available in Lua.

## Output

### print(...)

Prints values to the terminal, separated by tabs.

\`\`\`lua
print("Hello, World!")
print("Name:", "Alice", "Age:", 25)
-- Output:
-- Hello, World!
-- Name:	Alice	Age:	25
\`\`\`

## Type Checking

### type(v)

Returns the type of a value as a string.

\`\`\`lua
print(type("hello"))    -- "string"
print(type(42))         -- "number"
print(type(true))       -- "boolean"
print(type(nil))        -- "nil"
print(type({}))         -- "table"
print(type(print))      -- "function"
\`\`\`

## Type Conversion

### tonumber(value, [base])

Converts a value to a number. Returns \`nil\` if conversion fails.

\`\`\`lua
print(tonumber("42"))       -- 42
print(tonumber("3.14"))     -- 3.14
print(tonumber("FF", 16))   -- 255 (hexadecimal)
print(tonumber("hello"))    -- nil
\`\`\`

### tostring(v)

Converts any value to a string.

\`\`\`lua
print(tostring(42))         -- "42"
print(tostring(true))       -- "true"
print(tostring(nil))        -- "nil"
\`\`\`

## Iteration

### pairs(t)

Returns an iterator for all key-value pairs in a table.

\`\`\`lua
local person = {name = "Alice", age = 25, city = "Paris"}
for key, value in pairs(person) do
  print(key, value)
end
-- Output (order may vary):
-- name	Alice
-- age	25
-- city	Paris
\`\`\`

### ipairs(t)

Returns an iterator for array elements (integer keys starting at 1).

\`\`\`lua
local fruits = {"apple", "banana", "cherry"}
for index, fruit in ipairs(fruits) do
  print(index, fruit)
end
-- Output:
-- 1	apple
-- 2	banana
-- 3	cherry
\`\`\`

### next(table, [index])

Returns the next key-value pair in a table.

\`\`\`lua
local t = {a = 1, b = 2}
local key, value = next(t)
print(key, value)  -- First pair (order varies)
\`\`\`

## Error Handling

### error(message, [level])

Raises an error with the given message.

\`\`\`lua
function divide(a, b)
  if b == 0 then
    error("Division by zero!")
  end
  return a / b
end
\`\`\`

### pcall(f, ...)

Calls a function in protected mode. Returns success status and results.

\`\`\`lua
local success, result = pcall(function()
  return 10 / 2
end)
print(success, result)  -- true, 5

local success, err = pcall(function()
  error("Something went wrong")
end)
print(success, err)  -- false, "Something went wrong"
\`\`\`

### assert(v, [message])

Raises an error if the value is false or nil.

\`\`\`lua
local file = assert(io.open("data.txt"), "Could not open file")
\`\`\`

## Miscellaneous

### select(index, ...)

Returns arguments after the given index, or count if index is "#".

\`\`\`lua
print(select(2, "a", "b", "c", "d"))  -- b c d
print(select("#", "a", "b", "c"))     -- 3
\`\`\`

### rawequal(v1, v2)

Compares two values without invoking metamethods.

### rawget(table, index)

Gets a table value without invoking metamethods.

### rawset(table, index, value)

Sets a table value without invoking metamethods.

### rawlen(v)

Returns the length of a string or table without invoking metamethods.

### setmetatable(table, metatable)

Sets the metatable for a table.

\`\`\`lua
local t = {}
setmetatable(t, {
  __index = function(_, key)
    return "default"
  end
})
print(t.anything)  -- "default"
\`\`\`

### getmetatable(object)

Returns the metatable of an object.
`
}
