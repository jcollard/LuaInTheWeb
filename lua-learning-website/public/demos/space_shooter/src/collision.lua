-- collision.lua
-- Collision detection utilities

local canvas = require("canvas")

---@class Collision
local Collision = {}

---Check if two axis-aligned bounding boxes overlap
---@param x1 number X coordinate of first box's top-left corner
---@param y1 number Y coordinate of first box's top-left corner
---@param w1 number Width of first box
---@param h1 number Height of first box
---@param x2 number X coordinate of second box's top-left corner
---@param y2 number Y coordinate of second box's top-left corner
---@param w2 number Width of second box
---@param h2 number Height of second box
---@return boolean colliding True if boxes overlap
function Collision.check_aabb(x1, y1, w1, h1, x2, y2, w2, h2)
    return x1 < x2 + w2 and x1 + w1 > x2 and
           y1 < y2 + h2 and y1 + h1 > y2
end

return Collision
