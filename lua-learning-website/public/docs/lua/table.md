# Table Library

Functions for table manipulation.

## Adding and Removing

### table.insert(list, [pos], value)

Inserts a value into an array. If `pos` is omitted, appends to end.

```lua
local t = {"a", "b", "c"}
table.insert(t, "d")      -- {"a", "b", "c", "d"}
table.insert(t, 2, "x")   -- {"a", "x", "b", "c", "d"}
```

### table.remove(list, [pos])

Removes and returns an element. If `pos` is omitted, removes last element.

```lua
local t = {"a", "b", "c", "d"}
local removed = table.remove(t)     -- "d", t = {"a", "b", "c"}
local removed = table.remove(t, 1)  -- "a", t = {"b", "c"}
```

## Sorting

### table.sort(list, [comp])

Sorts an array in place. Optional comparison function.

```lua
local numbers = {3, 1, 4, 1, 5, 9, 2, 6}
table.sort(numbers)
print(table.concat(numbers, ", "))  -- "1, 1, 2, 3, 4, 5, 6, 9"

-- Custom comparison (descending)
table.sort(numbers, function(a, b) return a > b end)
print(table.concat(numbers, ", "))  -- "9, 6, 5, 4, 3, 2, 1, 1"

-- Sort strings by length
local words = {"apple", "pie", "banana", "a"}
table.sort(words, function(a, b) return #a < #b end)
-- {"a", "pie", "apple", "banana"}
```

## Concatenation

### table.concat(list, [sep], [i], [j])

Concatenates array elements into a string.

```lua
local fruits = {"apple", "banana", "cherry"}
print(table.concat(fruits))         -- "applebananacherry"
print(table.concat(fruits, ", "))   -- "apple, banana, cherry"
print(table.concat(fruits, "-", 2)) -- "banana-cherry"
```

## Unpacking

### table.unpack(list, [i], [j])

Returns elements from an array as multiple values.

```lua
local t = {10, 20, 30}
print(table.unpack(t))      -- 10, 20, 30

local a, b, c = table.unpack(t)
print(a, b, c)              -- 10, 20, 30

-- Partial unpack
print(table.unpack(t, 2))   -- 20, 30
print(table.unpack(t, 1, 2)) -- 10, 20
```

### table.pack(...)

Packs values into a table with `n` field for count.

```lua
local t = table.pack(1, 2, nil, 4)
print(t.n)  -- 4
print(t[1], t[2], t[3], t[4])  -- 1, 2, nil, 4
```

## Moving Elements

### table.move(a1, f, e, t, [a2])

Moves elements from one position to another.

```lua
local t = {1, 2, 3, 4, 5}
table.move(t, 1, 3, 2)  -- Move elements 1-3 to position 2
-- t = {1, 1, 2, 3, 5}
```

## Common Patterns

### Checking if table is empty

```lua
local function isEmpty(t)
  return next(t) == nil
end

print(isEmpty({}))       -- true
print(isEmpty({1}))      -- false
print(isEmpty({a = 1}))  -- false
```

### Copying a table

```lua
local function shallowCopy(t)
  local copy = {}
  for k, v in pairs(t) do
    copy[k] = v
  end
  return copy
end
```

### Finding a value

```lua
local function indexOf(t, value)
  for i, v in ipairs(t) do
    if v == value then return i end
  end
  return nil
end

local fruits = {"apple", "banana", "cherry"}
print(indexOf(fruits, "banana"))  -- 2
```
