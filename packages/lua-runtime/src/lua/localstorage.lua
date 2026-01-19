---@meta localstorage
--- localstorage.lua - Persistent key-value storage library
--- Load with: local localstorage = require('localstorage')
---
--- This library provides persistent storage that survives page reloads
--- and browser restarts using the browser's localStorage API.

---@class localstorage
local localstorage = {}

--- Get a value from storage.
--- Retrieves the string value associated with the key, or nil if not found.
---@param key string The key to retrieve
---@return string|nil value The stored value, or nil if not found
---@usage local name = localstorage.get_item("player_name")
function localstorage.get_item(key)
  if key == nil then
    return nil
  end
  return __localstorage_getItem(tostring(key))
end

--- Save a value to storage.
--- Values are automatically converted to strings. Returns success status
--- and an optional error message if the operation failed.
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
  local result = __localstorage_setItem(tostring(key), str_value)
  -- Result is a table with [1]=success, [2]=error
  return result[1], result[2]
end

--- Remove an item from storage.
--- Deletes the key and its associated value from storage.
---@param key string The key to remove
---@return nil
---@usage localstorage.remove_item("temporary_data")
function localstorage.remove_item(key)
  if key ~= nil then
    __localstorage_removeItem(tostring(key))
  end
end

--- Clear all items from storage.
--- Warning: This removes ALL data stored on the domain, not just your data!
---@return nil
---@usage localstorage.clear()
function localstorage.clear()
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
