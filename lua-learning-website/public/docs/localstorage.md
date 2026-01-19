# LocalStorage Library

The localstorage library provides persistent key-value storage that survives page reloads and browser restarts. It wraps the browser's localStorage API.

## Using the Library

Load the library with `require()`:

```lua
local localstorage = require('localstorage')

-- Save a value
localstorage.set_item("player_name", "Hero")

-- Load a value
local name = localstorage.get_item("player_name")
print(name)  -- prints "Hero"
```

## Storage Limits

| Limit | Value |
|-------|-------|
| Total capacity | ~5 MB per domain |
| Encoding | UTF-16 (2 bytes per character) |
| Persistence | Until explicitly cleared |

## Functions

### localstorage.get_item(key)

Retrieves a value from storage.

**Parameters:**
- `key` (string): The key to retrieve

**Returns:**
- (string|nil): The stored value, or `nil` if not found

```lua
local score = localstorage.get_item("high_score")
if score then
    print("High score: " .. score)
else
    print("No saved score")
end
```

### localstorage.set_item(key, value)

Saves a value to storage. Values are automatically converted to strings.

**Parameters:**
- `key` (string): The key to store under
- `value` (any): The value to store (converted to string)

**Returns:**
- `success` (boolean): `true` if saved successfully
- `error` (string|nil): Error message if save failed

```lua
-- Simple save
localstorage.set_item("username", "Player1")

-- Save with error handling
local success, err = localstorage.set_item("data", my_data)
if not success then
    print("Save failed: " .. err)
end
```

### localstorage.remove_item(key)

Removes an item from storage.

**Parameters:**
- `key` (string): The key to remove

```lua
localstorage.remove_item("temporary_data")
```

### localstorage.clear()

Removes ALL data from storage.

> **Warning:** This clears all data on the domain, not just your data!

```lua
localstorage.clear()
```

### localstorage.get_remaining_space()

Returns estimated remaining storage space in bytes.

**Returns:**
- (number): Remaining space in bytes

```lua
local remaining = localstorage.get_remaining_space()
local kb = math.floor(remaining / 1024)
print("Storage remaining: " .. kb .. " KB")
```

## Best Practices

### Use Key Prefixes

Avoid conflicts with other scripts by using unique prefixes:

```lua
local PREFIX = "mygame_"

local function save(key, value)
    return localstorage.set_item(PREFIX .. key, value)
end

local function load(key)
    return localstorage.get_item(PREFIX .. key)
end

-- Usage
save("score", 1000)  -- Stored as "mygame_score"
```

### Handle Errors

Always check for errors when saving:

```lua
local success, err = localstorage.set_item("key", value)
if not success then
    print("Could not save: " .. err)
end
```

### Convert Numbers

Values are stored as strings, so convert numbers when loading:

```lua
-- Saving
localstorage.set_item("score", tostring(100))

-- Loading
local score = tonumber(localstorage.get_item("score")) or 0
```

## Example: Save Game Progress

```lua
local localstorage = require('localstorage')

local function save_game()
    localstorage.set_item("level", tostring(current_level))
    localstorage.set_item("score", tostring(score))
    localstorage.set_item("lives", tostring(lives))
    print("Game saved!")
end

local function load_game()
    current_level = tonumber(localstorage.get_item("level")) or 1
    score = tonumber(localstorage.get_item("score")) or 0
    lives = tonumber(localstorage.get_item("lives")) or 3
    print("Game loaded!")
end

-- Save on game over
save_game()

-- Load on startup
load_game()
```

## Example: High Score Table

```lua
local localstorage = require('localstorage')

local function save_high_score(name, score)
    local current_high = tonumber(localstorage.get_item("high_score")) or 0

    if score > current_high then
        localstorage.set_item("high_score", tostring(score))
        localstorage.set_item("high_score_name", name)
        print("New high score!")
        return true
    end
    return false
end

local function get_high_score()
    local score = tonumber(localstorage.get_item("high_score")) or 0
    local name = localstorage.get_item("high_score_name") or "---"
    return name, score
end

-- Usage
save_high_score("Player1", 1000)
local name, score = get_high_score()
print(name .. ": " .. score)
```

## Example: User Settings

```lua
local localstorage = require('localstorage')

local settings = {
    music = true,
    sound = true,
    difficulty = "normal"
}

local function save_settings()
    localstorage.set_item("settings_music", tostring(settings.music))
    localstorage.set_item("settings_sound", tostring(settings.sound))
    localstorage.set_item("settings_difficulty", settings.difficulty)
end

local function load_settings()
    local music = localstorage.get_item("settings_music")
    local sound = localstorage.get_item("settings_sound")
    local diff = localstorage.get_item("settings_difficulty")

    if music then settings.music = (music == "true") end
    if sound then settings.sound = (sound == "true") end
    if diff then settings.difficulty = diff end
end

-- Load settings on startup
load_settings()
```

## Troubleshooting

### "Storage quota exceeded"

The browser's storage is full (~5 MB limit).

**Solutions:**
- Remove old data: `localstorage.remove_item("old_key")`
- Check space: `localstorage.get_remaining_space()`
- Store less data

### Data Not Saving

1. Check the return value of `set_item()`
2. Private/incognito mode may not persist data
3. Some browsers allow disabling localStorage

### Data Appears Corrupted

1. Always validate loaded data
2. Use default values when data is nil
3. Convert strings to numbers with `tonumber()`
