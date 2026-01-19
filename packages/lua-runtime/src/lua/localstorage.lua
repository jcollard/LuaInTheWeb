---@meta localstorage
--- localstorage.lua - Persistent key-value storage library
--- Load with: local localstorage = require('localstorage')
---
--- This library provides persistent storage that survives page reloads
--- and browser restarts using the browser's localStorage API.

---@class localstorage
local localstorage = {}

-- Internal prefix for namespacing keys
local _prefix = ""

--- Set a prefix for all storage keys.
--- Call this once at startup to namespace your keys by project.
--- All subsequent get_item, set_item, remove_item, and clear calls will use this prefix.
---@param prefix string The prefix to prepend to all keys
---@usage localstorage.set_prefix("my_game_")
function localstorage.set_prefix(prefix)
  _prefix = prefix or ""
end

--- Get a value from storage.
--- Retrieves the string value associated with the key, or nil if not found.
--- If a prefix is set via set_prefix(), it will be automatically prepended to the key.
---@param key string The key to retrieve
---@return string|nil value The stored value, or nil if not found
---@usage local name = localstorage.get_item("player_name")
function localstorage.get_item(key)
  if key == nil then
    return nil
  end
  return __localstorage_getItem(_prefix .. tostring(key))
end

--- Save a value to storage.
--- Values are automatically converted to strings. Returns success status
--- and an optional error message if the operation failed.
--- If a prefix is set via set_prefix(), it will be automatically prepended to the key.
---@param key string The key to store under
---@param value any The value to store (converted to string)
---@return boolean success True if saved successfully
---@return string|nil error Error message if save failed (e.g., "Storage quota exceeded")
---@usage local success, err = localstorage.set_item("score", 1000)
---@usage if not success then print("Save failed: " .. err) end
function localstorage.set_item(key, value)
  if key == nil then
    return false, "Key cannot be nil"
  end
  local str_value = value == nil and "" or tostring(value)
  local result = __localstorage_setItem(_prefix .. tostring(key), str_value)
  -- Result is a table with [1]=success, [2]=error
  return result[1], result[2]
end

--- Remove an item from storage.
--- Deletes the key and its associated value from storage.
--- If a prefix is set via set_prefix(), it will be automatically prepended to the key.
---@param key string The key to remove
---@return nil
---@usage localstorage.remove_item("temporary_data")
function localstorage.remove_item(key)
  if key ~= nil then
    __localstorage_removeItem(_prefix .. tostring(key))
  end
end

--- Clear items from storage that match the current prefix.
--- If a prefix is set via set_prefix(), only keys with that prefix will be removed.
--- If no prefix is set, ALL data on the domain will be cleared (same as clear_all).
---@return nil
---@usage localstorage.clear()  -- Clears only keys matching the current prefix
function localstorage.clear()
  if _prefix == "" then
    __localstorage_clear()
  else
    __localstorage_clearWithPrefix(_prefix)
  end
end

--- Clear ALL items from storage.
--- Warning: This removes ALL data stored on the domain, not just your data!
--- Use clear() instead if you only want to remove your prefixed keys.
---@return nil
---@usage localstorage.clear_all()
function localstorage.clear_all()
  __localstorage_clear()
end

--- Get the remaining storage space.
--- Returns an estimate of remaining bytes available (~5MB total per domain).
---@return number bytes Estimated remaining space in bytes
---@usage local remaining = localstorage.get_remaining_space()
---@usage print("Remaining: " .. math.floor(remaining / 1024) .. " KB")
function localstorage.get_remaining_space()
  return __localstorage_getRemainingSpace()
end

return localstorage
