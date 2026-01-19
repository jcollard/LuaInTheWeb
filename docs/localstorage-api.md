# LocalStorage API

The `localstorage` API provides persistent key-value storage that survives page reloads and browser restarts. It wraps the browser's localStorage, making it accessible from Lua code.

## Quick Start

Load the library with `require()`:

```lua
local localstorage = require('localstorage')

-- Set a prefix to namespace your keys (recommended)
localstorage.set_prefix("my_game_")

-- Save a value
localstorage.set_item("player_name", "Hero")

-- Load a value
local name = localstorage.get_item("player_name")
print(name)  -- prints "Hero"

-- Check remaining space
print(localstorage.get_remaining_space())  -- bytes remaining
```

## API Reference

### `localstorage.set_prefix(prefix)`

Sets a prefix for all storage keys. Call this once at startup to namespace your keys by project. All subsequent `get_item`, `set_item`, `remove_item`, and `clear` calls will use this prefix.

**Parameters:**
- `prefix` (string): The prefix to prepend to all keys

**Example:**
```lua
local localstorage = require('localstorage')
localstorage.set_prefix("my_game_")

-- Now all keys are automatically prefixed
localstorage.set_item("score", "100")  -- stored as "my_game_score"
localstorage.get_item("score")          -- reads from "my_game_score"
```

### `localstorage.get_item(key)`

Retrieves a value from localStorage.

**Parameters:**
- `key` (string): The key to retrieve

**Returns:**
- `string|nil`: The stored value, or `nil` if the key doesn't exist

**Example:**
```lua
local score = localstorage.get_item("high_score")
if score then
    print("High score: " .. score)
else
    print("No high score saved yet")
end
```

### `localstorage.set_item(key, value)`

Saves a value to localStorage. Values are automatically converted to strings.

**Parameters:**
- `key` (string): The key to store the value under
- `value` (any): The value to store (converted to string via `tostring()`)

**Returns:**
- `success` (boolean): `true` if saved successfully
- `error` (string|nil): Error message if save failed

**Example:**
```lua
-- Simple save
localstorage.set_item("username", "Player1")

-- Save with error handling
local success, err = localstorage.set_item("data", large_string)
if not success then
    print("Save failed: " .. err)
end
```

### `localstorage.remove_item(key)`

Removes an item from localStorage. Safe to call even if the key doesn't exist.

**Parameters:**
- `key` (string): The key to remove

**Example:**
```lua
localstorage.remove_item("temporary_data")
```

### `localstorage.clear()`

Removes items from storage that match the current prefix. If a prefix is set via `set_prefix()`, only keys with that prefix will be removed. If no prefix is set, ALL data on the domain will be cleared.

**Example:**
```lua
local localstorage = require('localstorage')
localstorage.set_prefix("my_game_")
localstorage.set_item("score", "100")    -- stored as "my_game_score"
localstorage.set_item("level", "5")      -- stored as "my_game_level"

localstorage.clear()  -- Only removes "my_game_*" keys
```

### `localstorage.clear_all()`

Removes ALL data from storage, regardless of prefix.

> ⚠️ **Warning:** This clears all data stored by any script on the domain, not just your data! Use `clear()` instead if you only want to remove your prefixed keys.

**Example:**
```lua
localstorage.clear_all()  -- Clears everything
```

### `localstorage.get_remaining_space()`

Returns an estimate of remaining storage space in bytes.

**Returns:**
- `number`: Estimated remaining space in bytes

**Example:**
```lua
local remaining = localstorage.get_remaining_space()
local remaining_kb = math.floor(remaining / 1024)
print("Storage remaining: " .. remaining_kb .. " KB")
```

## Storage Limits

### Capacity
- **Typical limit:** 5 MB per domain
- **Shared across:** All pages and scripts on the same domain
- **Encoding:** UTF-16 (each character uses 2 bytes)

### Calculating Data Size
```lua
-- Estimate storage needed for a string
local data = "Hello, World!"
local bytes_needed = #data * 2  -- UTF-16 encoding
print("This string needs approximately " .. bytes_needed .. " bytes")
```

### Handling Full Storage
```lua
local function safe_save(key, value)
    local success, err = localstorage.set_item(key, value)
    if not success then
        if err == "Storage quota exceeded" then
            print("Storage is full! Consider clearing old data.")
            -- Maybe clear old/unneeded data
            localstorage.remove_item("old_data")
            -- Try again
            success, err = localstorage.set_item(key, value)
        end
    end
    return success, err
end
```

## Best Practices

### 1. Use Key Prefixes

Since localStorage is shared across all scripts on a domain, use unique prefixes to avoid conflicts:

```lua
local PREFIX = "mygame_"

local function save(key, value)
    return localstorage.set_item(PREFIX .. key, value)
end

local function load(key)
    return localstorage.get_item(PREFIX .. key)
end

-- Usage
save("score", 1000)       -- Stored as "mygame_score"
local score = load("score")
```

### 2. Handle Errors Gracefully

Always check for errors when saving data:

```lua
local function save_game_state(state)
    local data = serialize(state)  -- Your serialization function
    local success, err = localstorage.set_item("save_data", data)

    if not success then
        -- Show user-friendly message
        show_message("Could not save game: " .. err)
        return false
    end

    show_message("Game saved!")
    return true
end
```

### 3. Store Complex Data as JSON

For tables and complex data, serialize to a string format:

```lua
-- Simple JSON-like serialization for flat tables
local function serialize(tbl)
    local parts = {}
    for k, v in pairs(tbl) do
        table.insert(parts, k .. "=" .. tostring(v))
    end
    return table.concat(parts, ";")
end

local function deserialize(str)
    local tbl = {}
    for pair in str:gmatch("[^;]+") do
        local k, v = pair:match("([^=]+)=(.+)")
        if k and v then
            -- Try to convert to number
            tbl[k] = tonumber(v) or v
        end
    end
    return tbl
end

-- Usage
local player = { name = "Hero", level = 5, gold = 100 }
localstorage.set_item("player", serialize(player))

local loaded = localstorage.get_item("player")
if loaded then
    player = deserialize(loaded)
end
```

### 4. Provide Clear Data Management

Give users control over their saved data:

```lua
local function clear_my_game_data()
    local keys = {
        "mygame_score",
        "mygame_level",
        "mygame_settings",
        "mygame_achievements"
    }

    for _, key in ipairs(keys) do
        localstorage.remove_item(key)
    end

    print("Game data cleared!")
end
```

### 5. Validate Loaded Data

Always validate data loaded from storage:

```lua
local function load_high_score()
    local saved = localstorage.get_item("high_score")

    if not saved then
        return 0  -- Default value
    end

    local score = tonumber(saved)
    if not score or score < 0 then
        return 0  -- Invalid data, use default
    end

    return score
end
```

### 6. Check Space Before Large Saves

```lua
local function can_save(data)
    local bytes_needed = #data * 2  -- UTF-16
    local bytes_available = localstorage.get_remaining_space()

    return bytes_needed < bytes_available
end

local function save_with_check(key, data)
    if not can_save(data) then
        return false, "Not enough storage space"
    end
    return localstorage.set_item(key, data)
end
```

## Common Use Cases

### Save Game Progress

```lua
local function save_progress()
    localstorage.set_item("level", tostring(current_level))
    localstorage.set_item("score", tostring(score))
    localstorage.set_item("checkpoint", checkpoint_id)
end

local function load_progress()
    current_level = tonumber(localstorage.get_item("level")) or 1
    score = tonumber(localstorage.get_item("score")) or 0
    checkpoint_id = localstorage.get_item("checkpoint") or "start"
end
```

### Save User Preferences

```lua
local settings = {
    music_volume = 0.8,
    sfx_volume = 1.0,
    difficulty = "normal"
}

local function save_settings()
    for key, value in pairs(settings) do
        localstorage.set_item("settings_" .. key, tostring(value))
    end
end

local function load_settings()
    for key, default in pairs(settings) do
        local saved = localstorage.get_item("settings_" .. key)
        if saved then
            if type(default) == "number" then
                settings[key] = tonumber(saved) or default
            else
                settings[key] = saved
            end
        end
    end
end
```

### High Score Leaderboard

```lua
local MAX_SCORES = 10

local function add_high_score(name, score)
    -- Load existing scores
    local scores = {}
    for i = 1, MAX_SCORES do
        local saved_name = localstorage.get_item("hs_name_" .. i)
        local saved_score = localstorage.get_item("hs_score_" .. i)
        if saved_name and saved_score then
            table.insert(scores, {
                name = saved_name,
                score = tonumber(saved_score) or 0
            })
        end
    end

    -- Add new score
    table.insert(scores, { name = name, score = score })

    -- Sort by score (descending)
    table.sort(scores, function(a, b) return a.score > b.score end)

    -- Keep only top scores
    while #scores > MAX_SCORES do
        table.remove(scores)
    end

    -- Save back
    for i, entry in ipairs(scores) do
        localstorage.set_item("hs_name_" .. i, entry.name)
        localstorage.set_item("hs_score_" .. i, tostring(entry.score))
    end
end
```

## Troubleshooting

### "Storage quota exceeded" Error

The browser's localStorage is full (typically 5 MB limit).

**Solutions:**
1. Clear unnecessary data: `localstorage.remove_item("old_key")`
2. Reduce data size by storing less or compressing data
3. Check `localstorage.get_remaining_space()` before saving

### Data Not Persisting

1. **Check for errors:** Always check the return value of `set_item()`
2. **Browser settings:** Private/incognito mode may not persist data
3. **Storage disabled:** Some browsers allow users to disable localStorage

### Data Corrupted After Reload

1. Validate data when loading (check for nil, use defaults)
2. Use consistent serialization/deserialization
3. Handle version changes in your data format

## Limitations

1. **Strings only:** All values are converted to strings
2. **Synchronous:** Operations block until complete (usually fast)
3. **Domain-scoped:** Data is accessible to all scripts on the same domain
4. **Size limit:** Typically 5 MB per domain
5. **No expiration:** Data persists until explicitly removed

## See Also

- [Canvas API Documentation](./canvas-api.md) - For game development
- [Example: Save Demo](../lua-learning-website/public/examples/storage/save_demo.lua) - Working example
