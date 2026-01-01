---@meta hc
--- hc.lua - HC Collision Detection Library
--- Load with: local HC = require('hc')
---
--- A collision detection library for 2D games.
--- Source: https://github.com/vrld/HC
---
--- Provides collision detection between arbitrary shapes:
--- - Circles, rectangles, and polygons (convex and concave)
--- - Uses spatial hashing for efficient broad-phase collision detection
--- - Uses GJK algorithm for precise narrow-phase collision detection
---
--- @module hc

--[[
MIT License

Copyright (c) 2010-2012 Matthias Richter

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

Except as contained in this notice, the name(s) of the above copyright holders
shall not be used in advertising or otherwise to promote the sale, use or
other dealings in this Software without prior written authorization.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
]]--

-- Lua 5.1/5.4 compatibility: unpack moved to table.unpack in 5.2+
-- Make unpack globally available for all submodules
if not unpack then
  unpack = table.unpack
end

--------------------------------------------------------------------------------
-- HC.vector-light: Lightweight 2D vector operations
--------------------------------------------------------------------------------
package.preload['HC.vector-light'] = function()
  local sqrt, cos, sin = math.sqrt, math.cos, math.sin

  local function str(x,y)
    return "("..tonumber(x)..","..tonumber(y)..")"
  end

  local function mul(s, x,y)
    return s*x, s*y
  end

  local function div(s, x,y)
    return x/s, y/s
  end

  local function add(x1,y1, x2,y2)
    return x1+x2, y1+y2
  end

  local function sub(x1,y1, x2,y2)
    return x1-x2, y1-y2
  end

  local function permul(x1,y1, x2,y2)
    return x1*x2, y1*y2
  end

  local function dot(x1,y1, x2,y2)
    return x1*x2 + y1*y2
  end

  local function det(x1,y1, x2,y2)
    return x1*y2 - y1*x2
  end

  local function eq(x1,y1, x2,y2)
    return x1 == x2 and y1 == y2
  end

  local function lt(x1,y1, x2,y2)
    return x1 < x2 or (x1 == x2 and y1 < y2)
  end

  local function le(x1,y1, x2,y2)
    return x1 <= x2 and y1 <= y2
  end

  local function len2(x,y)
    return x*x + y*y
  end

  local function len(x,y)
    return sqrt(x*x + y*y)
  end

  local function dist(x1,y1, x2,y2)
    return len(x1-x2, y1-y2)
  end

  local function normalize(x,y)
    local l = len(x,y)
    return x/l, y/l
  end

  local function rotate(phi, x,y)
    local c, s = cos(phi), sin(phi)
    return c*x - s*y, s*x + c*y
  end

  local function perpendicular(x,y)
    return -y, x
  end

  local function project(x,y, u,v)
    local s = (x*u + y*v) / (u*u + v*v)
    return s*u, s*v
  end

  local function mirror(x,y, u,v)
    local s = 2 * (x*u + y*v) / (u*u + v*v)
    return s*u - x, s*v - y
  end

  return {
    str = str,
    mul    = mul,
    div    = div,
    add    = add,
    sub    = sub,
    permul = permul,
    dot    = dot,
    det    = det,
    cross  = det,
    eq = eq,
    lt = lt,
    le = le,
    len2          = len2,
    len           = len,
    dist          = dist,
    normalize     = normalize,
    rotate        = rotate,
    perpendicular = perpendicular,
    project       = project,
    mirror        = mirror,
  }
end

--------------------------------------------------------------------------------
-- HC.class: Simple class system with inheritance
--------------------------------------------------------------------------------
package.preload['HC.class'] = function()
  local function __NULL__() end

  local function inherit(class, interface, ...)
    if not interface then return end
    assert(type(interface) == "table", "Can only inherit from other classes.")

    for name, func in pairs(interface) do
      if not class[name] then
        class[name] = func
      end
    end
    for super in pairs(interface.__is_a or {}) do
      class.__is_a[super] = true
    end

    return inherit(class, ...)
  end

  local function new(args)
    local super = {}
    local name = '<unnamed class>'
    local constructor = args or __NULL__
    if type(args) == "table" then
      super = (args.inherits or {}).__is_a and {args.inherits} or args.inherits or {}
      name = args.name or name
      constructor = args[1] or __NULL__
    end
    assert(type(constructor) == "function", 'constructor has to be nil or a function')

    local class = {}
    class.__index = class
    class.__tostring = function() return ("<instance of %s>"):format(tostring(class)) end
    class.construct = constructor or __NULL__
    class.inherit = inherit
    class.__is_a = {[class] = true}
    class.is_a = function(self, other) return not not self.__is_a[other] end

    inherit(class, unpack(super))

    local meta = {
      __call = function(self, ...)
        local obj = {}
        setmetatable(obj, self)
        self.construct(obj, ...)
        return obj
      end,
      __tostring = function() return name end
    }
    return setmetatable(class, meta)
  end

  -- Set up class commons interface
  if common_class ~= false and not common then
    common = {}
    function common.class(name, prototype, parent)
      local init = prototype.init or (parent or {}).init
      return new{name = name, inherits = {prototype, parent}, init}
    end
    function common.instance(class, ...)
      return class(...)
    end
  end

  return setmetatable({new = new, inherit = inherit},
    {__call = function(_,...) return new(...) end})
end

--------------------------------------------------------------------------------
-- HC.gjk: Gilbert-Johnson-Keerthi collision detection algorithm
--------------------------------------------------------------------------------
package.preload['HC.gjk'] = function()
  local _PACKAGE = 'HC'
  local vector  = require(_PACKAGE .. '.vector-light')
  local huge, abs = math.huge, math.abs

  local simplex, edge = {}, {}

  local function support(shape_a, shape_b, dx, dy)
    local x,y = shape_a:support(dx,dy)
    return vector.sub(x,y, shape_b:support(-dx, -dy))
  end

  local function closest_edge(n)
    edge.dist = huge

    local i = n-1
    for k = 1,n-1,2 do
      local ax,ay = simplex[i], simplex[i+1]
      local bx,by = simplex[k], simplex[k+1]
      i = k

      local ex,ey = vector.perpendicular(bx-ax, by-ay)
      local nx,ny = vector.normalize(ex,ey)
      local d = vector.dot(ax,ay, nx,ny)

      if d < edge.dist then
        edge.dist = d
        edge.nx, edge.ny = nx, ny
        edge.i = k
      end
    end
  end

  local function EPA(shape_a, shape_b)
    local cx,cy, bx,by, ax,ay = unpack(simplex, 1, 6)
    if vector.dot(ax-bx,ay-by, cx-bx,cy-by) < 0 then
      simplex[1],simplex[2] = ax,ay
      simplex[5],simplex[6] = cx,cy
    end

    local is_either_circle = shape_a._center or shape_b._center
    local last_diff_dist, n = huge, 6
    while true do
      closest_edge(n)
      local px,py = support(shape_a, shape_b, edge.nx, edge.ny)
      local d = vector.dot(px,py, edge.nx, edge.ny)

      local diff_dist = d - edge.dist
      if diff_dist < 1e-6 or (is_either_circle and abs(last_diff_dist - diff_dist) < 1e-10) then
        return -d*edge.nx, -d*edge.ny
      end
      last_diff_dist = diff_dist

      for i = n, edge.i, -1 do
        simplex[i+2] = simplex[i]
      end
      simplex[edge.i+0] = px
      simplex[edge.i+1] = py
      n = n + 2
    end
  end

  local function do_line()
    local bx,by, ax,ay = unpack(simplex, 1, 4)
    local abx,aby = bx-ax, by-ay
    local dx,dy = vector.perpendicular(abx,aby)

    if vector.dot(dx,dy, -ax,-ay) < 0 then
      dx,dy = -dx,-dy
    end
    return dx,dy
  end

  local function do_triangle()
    local cx,cy, bx,by, ax,ay = unpack(simplex, 1, 6)
    local aox,aoy = -ax,-ay
    local abx,aby = bx-ax, by-ay
    local acx,acy = cx-ax, cy-ay

    local dx,dy = vector.perpendicular(abx,aby)
    if vector.dot(dx,dy, acx,acy) > 0 then
      dx,dy = -dx,-dy
    end
    if vector.dot(dx,dy, aox,aoy) > 0 then
      simplex[1], simplex[2] = bx,by
      simplex[3], simplex[4] = ax,ay
      return 4, dx,dy
    end

    dx,dy = vector.perpendicular(acx,acy)
    if vector.dot(dx,dy, abx,aby) > 0 then
      dx,dy = -dx,-dy
    end
    if vector.dot(dx,dy, aox, aoy) > 0 then
      simplex[3], simplex[4] = ax,ay
      return 4, dx,dy
    end

    return 6
  end

  local function GJK(shape_a, shape_b)
    local ax,ay = support(shape_a, shape_b, 1,0)
    if ax == 0 and ay == 0 then
      return false
    end

    simplex[1], simplex[2] = ax, ay
    local dx,dy = -ax,-ay

    ax,ay = support(shape_a, shape_b, dx,dy)
    if vector.dot(ax,ay, dx,dy) <= 0 then
      return false
    end

    simplex[3], simplex[4] = ax,ay
    dx, dy = do_line()

    local n

    while true do
      ax,ay = support(shape_a, shape_b, dx,dy)

      if vector.dot(ax,ay, dx,dy) <= 0 then
        return false
      end

      simplex[5], simplex[6] = ax,ay
      n, dx, dy = do_triangle()

      if n == 6 then
        return true, EPA(shape_a, shape_b)
      end
    end
  end

  return GJK
end

--------------------------------------------------------------------------------
-- HC.polygon: Polygon geometry and operations
--------------------------------------------------------------------------------
package.preload['HC.polygon'] = function()
  local _PACKAGE = 'HC'
  local common_local = common
  if not (type(common) == 'table' and common.class and common.instance) then
    assert(common_class ~= false, 'No class commons specification available.')
    require(_PACKAGE .. '.class')
    common_local, common = common, common_local
  end
  local vector = require(_PACKAGE .. '.vector-light')

  local function toVertexList(vertices, x,y, ...)
    if not (x and y) then return vertices end
    vertices[#vertices + 1] = {x = x, y = y}
    return toVertexList(vertices, ...)
  end

  local function areCollinear(p, q, r, eps)
    return math.abs(vector.det(q.x-p.x, q.y-p.y,  r.x-p.x,r.y-p.y)) <= (eps or 1e-32)
  end

  local function removeCollinear(vertices)
    local ret = {}
    local i,k = #vertices - 1, #vertices
    for l=1,#vertices do
      if not areCollinear(vertices[i], vertices[k], vertices[l]) then
        ret[#ret+1] = vertices[k]
      end
      i,k = k,l
    end
    return ret
  end

  local function getIndexOfleftmost(vertices)
    local idx = 1
    for i = 2,#vertices do
      if vertices[i].x < vertices[idx].x then
        idx = i
      end
    end
    return idx
  end

  local function ccw(p, q, r)
    return vector.det(q.x-p.x, q.y-p.y,  r.x-p.x, r.y-p.y) >= 0
  end

  local function onSameSide(a,b, c,d)
    local px, py = d.x-c.x, d.y-c.y
    local l = vector.det(px,py,  a.x-c.x, a.y-c.y)
    local m = vector.det(px,py,  b.x-c.x, b.y-c.y)
    return l*m >= 0
  end

  local function pointInTriangle(p, a,b,c)
    return onSameSide(p,a, b,c) and onSameSide(p,b, a,c) and onSameSide(p,c, a,b)
  end

  local function anyPointInTriangle(vertices, p,q,r)
    for v in pairs(vertices) do
      if v ~= p and v ~= q and v ~= r and pointInTriangle(v, p,q,r) then
        return true
      end
    end
    return false
  end

  local function isEar(p,q,r, vertices)
    return ccw(p,q,r) and not anyPointInTriangle(vertices, p,q,r)
  end

  local function segmentsInterset(a,b, p,q)
    return not (onSameSide(a,b, p,q) or onSameSide(p,q, a,b))
  end

  local function getSharedEdge(p,q)
    local pindex = setmetatable({}, {__index = function(t,k)
      local s = {}
      t[k] = s
      return s
    end})

    for i = 1,#p do
      pindex[p[i].x][p[i].y] = i
    end

    local i,k = #q,1
    for k = 1,#q do
      local v,w = q[i], q[k]
      if pindex[v.x][v.y] and pindex[w.x][w.y] then
        return pindex[w.x][w.y], k
      end
      i = k
    end
  end

  local Polygon = {}
  function Polygon:init(...)
    local vertices = removeCollinear( toVertexList({}, ...) )
    assert(#vertices >= 3, "Need at least 3 non collinear points to build polygon (got "..#vertices..")")

    local r = getIndexOfleftmost(vertices)
    local q = r > 1 and r - 1 or #vertices
    local s = r < #vertices and r + 1 or 1
    if not ccw(vertices[q], vertices[r], vertices[s]) then
      local tmp = {}
      for i=#vertices,1,-1 do
        tmp[#tmp + 1] = vertices[i]
      end
      vertices = tmp
    end

    local q,p = vertices[#vertices]
    for i = 1,#vertices-2 do
      p, q = q, vertices[i]
      for k = i+1,#vertices-1 do
        local a,b = vertices[k], vertices[k+1]
        assert(not segmentsInterset(p,q, a,b), 'Polygon may not intersect itself')
      end
    end

    self.vertices = vertices
    setmetatable(self.vertices, {__newindex = function() error("Thou shall not change a polygon's vertices!") end})

    local p,q = vertices[#vertices], vertices[1]
    local det = vector.det(p.x,p.y, q.x,q.y)
    self.area = det
    for i = 2,#vertices do
      p,q = q,vertices[i]
      self.area = self.area + vector.det(p.x,p.y, q.x,q.y)
    end
    self.area = self.area / 2

    p,q = vertices[#vertices], vertices[1]
    self.centroid = {x = (p.x+q.x)*det, y = (p.y+q.y)*det}
    for i = 2,#vertices do
      p,q = q,vertices[i]
      det = vector.det(p.x,p.y, q.x,q.y)
      self.centroid.x = self.centroid.x + (p.x+q.x) * det
      self.centroid.y = self.centroid.y + (p.y+q.y) * det
    end
    self.centroid.x = self.centroid.x / (6 * self.area)
    self.centroid.y = self.centroid.y / (6 * self.area)

    self._radius = 0
    for i = 1,#vertices do
      self._radius = math.max(self._radius,
        vector.dist(vertices[i].x,vertices[i].y, self.centroid.x,self.centroid.y))
    end
  end
  local newPolygon

  function Polygon:unpack()
    local v = {}
    for i = 1,#self.vertices do
      v[2*i-1] = self.vertices[i].x
      v[2*i]   = self.vertices[i].y
    end
    return unpack(v)
  end

  function Polygon:clone()
    return Polygon( self:unpack() )
  end

  function Polygon:bbox()
    local ulx,uly = self.vertices[1].x, self.vertices[1].y
    local lrx,lry = ulx,uly
    for i=2,#self.vertices do
      local p = self.vertices[i]
      if ulx > p.x then ulx = p.x end
      if uly > p.y then uly = p.y end
      if lrx < p.x then lrx = p.x end
      if lry < p.y then lry = p.y end
    end
    return ulx,uly, lrx,lry
  end

  function Polygon:isConvex()
    local function isConvex()
      local v = self.vertices
      if #v == 3 then return true end

      if not ccw(v[#v], v[1], v[2]) then
        return false
      end
      for i = 2,#v-1 do
        if not ccw(v[i-1], v[i], v[i+1]) then
          return false
        end
      end
      if not ccw(v[#v-1], v[#v], v[1]) then
        return false
      end
      return true
    end

    local status = isConvex()
    self.isConvex = function() return status end
    return status
  end

  function Polygon:move(dx, dy)
    if not dy then
      dx, dy = dx:unpack()
    end
    for i,v in ipairs(self.vertices) do
      v.x = v.x + dx
      v.y = v.y + dy
    end
    self.centroid.x = self.centroid.x + dx
    self.centroid.y = self.centroid.y + dy
  end

  function Polygon:rotate(angle, cx, cy)
    if not (cx and cy) then
      cx,cy = self.centroid.x, self.centroid.y
    end
    for i,v in ipairs(self.vertices) do
      v.x,v.y = vector.add(cx,cy, vector.rotate(angle, v.x-cx, v.y-cy))
    end
    local v = self.centroid
    v.x,v.y = vector.add(cx,cy, vector.rotate(angle, v.x-cx, v.y-cy))
  end

  function Polygon:scale(s, cx,cy)
    if not (cx and cy) then
      cx,cy = self.centroid.x, self.centroid.y
    end
    for i,v in ipairs(self.vertices) do
      v.x,v.y = vector.add(cx,cy, vector.mul(s, v.x-cx, v.y-cy))
    end
    self._radius = self._radius * s
  end

  function Polygon:triangulate()
    if #self.vertices == 3 then return {self:clone()} end

    local vertices = self.vertices

    local next_idx, prev_idx = {}, {}
    for i = 1,#vertices do
      next_idx[i], prev_idx[i] = i+1,i-1
    end
    next_idx[#next_idx], prev_idx[1] = 1, #prev_idx

    local concave = {}
    for i, v in ipairs(vertices) do
      if not ccw(vertices[prev_idx[i]], v, vertices[next_idx[i]]) then
        concave[v] = true
      end
    end

    local triangles = {}
    local n_vert, current, skipped, next, prev = #vertices, 1, 0
    while n_vert > 3 do
      next, prev = next_idx[current], prev_idx[current]
      local p,q,r = vertices[prev], vertices[current], vertices[next]
      if isEar(p,q,r, concave) then
        if not areCollinear(p, q, r) then
          triangles[#triangles+1] = newPolygon(p.x,p.y, q.x,q.y, r.x,r.y)
          next_idx[prev], prev_idx[next] = next, prev
          concave[q] = nil
          n_vert, skipped = n_vert - 1, 0
        end
      else
        skipped = skipped + 1
        assert(skipped <= n_vert, "Cannot triangulate polygon")
      end
      current = next
    end

    next, prev = next_idx[current], prev_idx[current]
    local p,q,r = vertices[prev], vertices[current], vertices[next]
    triangles[#triangles+1] = newPolygon(p.x,p.y, q.x,q.y, r.x,r.y)
    return triangles
  end

  function Polygon:mergedWith(other)
    local p,q = getSharedEdge(self.vertices, other.vertices)
    assert(p and q, "Polygons do not share an edge")

    local ret = {}
    for i = 1,p-1 do
      ret[#ret+1] = self.vertices[i].x
      ret[#ret+1] = self.vertices[i].y
    end

    for i = 0,#other.vertices-2 do
      i = ((i-1 + q) % #other.vertices) + 1
      ret[#ret+1] = other.vertices[i].x
      ret[#ret+1] = other.vertices[i].y
    end

    for i = p+1,#self.vertices do
      ret[#ret+1] = self.vertices[i].x
      ret[#ret+1] = self.vertices[i].y
    end

    return newPolygon(unpack(ret))
  end

  function Polygon:splitConvex()
    if #self.vertices <= 3 or self:isConvex() then return {self:clone()} end

    local convex = self:triangulate()
    local i = 1
    repeat
      local p = convex[i]
      local k = i + 1
      while k <= #convex do
        local success, merged = pcall(function() return p:mergedWith(convex[k]) end)
        if success and merged:isConvex() then
          convex[i] = merged
          p = convex[i]
          table.remove(convex, k)
        else
          k = k + 1
        end
      end
      i = i + 1
    until i >= #convex

    return convex
  end

  function Polygon:contains(x,y)
    local function cut_ray(p,q)
      return ((p.y > y and q.y < y) or (p.y < y and q.y > y))
        and (x - p.x < (y - p.y) * (q.x - p.x) / (q.y - p.y))
    end

    local function cross_boundary(p,q)
      return (p.y == y and p.x > x and q.y < y)
        or (q.y == y and q.x > x and p.y < y)
    end

    local v = self.vertices
    local in_polygon = false
    local p,q = v[#v],v[#v]
    for i = 1, #v do
      p,q = q,v[i]
      if cut_ray(p,q) or cross_boundary(p,q) then
        in_polygon = not in_polygon
      end
    end
    return in_polygon
  end

  function Polygon:intersectionsWithRay(x,y, dx,dy)
    local nx,ny = vector.perpendicular(dx,dy)
    local wx,wy,det

    local ts = {}
    local q1,q2 = nil, self.vertices[#self.vertices]
    for i = 1, #self.vertices do
      q1,q2 = q2,self.vertices[i]
      wx,wy = q2.x - q1.x, q2.y - q1.y
      det = vector.det(dx,dy, wx,wy)

      if det ~= 0 then
        local rx,ry = q2.x - x, q2.y - y
        local l = vector.det(rx,ry, wx,wy) / det
        local m = vector.det(dx,dy, rx,ry) / det
        if m >= 0 and m <= 1 then
          ts[#ts+1] = l
        end
      else
        local dist = vector.dot(q1.x-x,q1.y-y, nx,ny)
        if dist == 0 then
          local l = vector.dot(dx,dy, q1.x-x,q1.y-y)
          local m = vector.dot(dx,dy, q2.x-x,q2.y-y)
          if l >= m then
            ts[#ts+1] = l
          else
            ts[#ts+1] = m
          end
        end
      end
    end

    return ts
  end

  function Polygon:intersectsRay(x,y, dx,dy)
    local tmin = math.huge
    for _, t in ipairs(self:intersectionsWithRay(x,y,dx,dy)) do
      tmin = math.min(tmin, t)
    end
    return tmin ~= math.huge, tmin
  end

  Polygon = common_local.class('Polygon', Polygon)
  newPolygon = function(...) return common_local.instance(Polygon, ...) end
  return Polygon
end

--------------------------------------------------------------------------------
-- HC.spatialhash: Spatial hashing for efficient collision detection
--------------------------------------------------------------------------------
package.preload['HC.spatialhash'] = function()
  local floor = math.floor
  local min, max = math.min, math.max

  local _PACKAGE = 'HC'
  local common_local = common
  if not (type(common) == 'table' and common.class and common.instance) then
    assert(common_class ~= false, 'No class commons specification available.')
    require(_PACKAGE .. '.class')
    common_local, common = common, common_local
  end
  local vector  = require(_PACKAGE .. '.vector-light')

  local Spatialhash = {}
  function Spatialhash:init(cell_size)
    self.cell_size = cell_size or 100
    self.cells = {}
  end

  function Spatialhash:cellCoords(x,y)
    return floor(x / self.cell_size), floor(y / self.cell_size)
  end

  function Spatialhash:cell(i,k)
    local row = rawget(self.cells, i)
    if not row then
      row = {}
      rawset(self.cells, i, row)
    end

    local cell = rawget(row, k)
    if not cell then
      cell = {}
      rawset(row, k, cell)
    end

    return cell
  end

  function Spatialhash:cellAt(x,y)
    return self:cell(self:cellCoords(x,y))
  end

  function Spatialhash:shapes()
    local set = {}
    for i,row in pairs(self.cells) do
      for k,cell in pairs(row) do
        for obj in pairs(cell) do
          rawset(set, obj, obj)
        end
      end
    end
    return set
  end

  function Spatialhash:inSameCells(x1,y1, x2,y2)
    local set = {}
    x1, y1 = self:cellCoords(x1, y1)
    x2, y2 = self:cellCoords(x2, y2)
    for i = x1,x2 do
      for k = y1,y2 do
        for obj in pairs(self:cell(i,k)) do
          rawset(set, obj, obj)
        end
      end
    end
    return set
  end

  function Spatialhash:register(obj, x1, y1, x2, y2)
    x1, y1 = self:cellCoords(x1, y1)
    x2, y2 = self:cellCoords(x2, y2)
    for i = x1,x2 do
      for k = y1,y2 do
        rawset(self:cell(i,k), obj, obj)
      end
    end
  end

  function Spatialhash:remove(obj, x1, y1, x2,y2)
    if not (x1 and y1 and x2 and y2) then
      for _,row in pairs(self.cells) do
        for _,cell in pairs(row) do
          rawset(cell, obj, nil)
        end
      end
      return
    end

    x1,y1 = self:cellCoords(x1,y1)
    x2,y2 = self:cellCoords(x2,y2)
    for i = x1,x2 do
      for k = y1,y2 do
        rawset(self:cell(i,k), obj, nil)
      end
    end
  end

  function Spatialhash:update(obj, old_x1,old_y1, old_x2,old_y2, new_x1,new_y1, new_x2,new_y2)
    old_x1, old_y1 = self:cellCoords(old_x1, old_y1)
    old_x2, old_y2 = self:cellCoords(old_x2, old_y2)

    new_x1, new_y1 = self:cellCoords(new_x1, new_y1)
    new_x2, new_y2 = self:cellCoords(new_x2, new_y2)

    if old_x1 == new_x1 and old_y1 == new_y1 and
       old_x2 == new_x2 and old_y2 == new_y2 then
      return
    end

    for i = old_x1,old_x2 do
      for k = old_y1,old_y2 do
        rawset(self:cell(i,k), obj, nil)
      end
    end
    for i = new_x1,new_x2 do
      for k = new_y1,new_y2 do
        rawset(self:cell(i,k), obj, obj)
      end
    end
  end

  function Spatialhash:intersectionsWithSegment(x1, y1, x2, y2)
    local odx, ody = x2 - x1, y2 - y1
    local len, cur = vector.len(odx, ody), 0
    local dx, dy = vector.normalize(odx, ody)
    local step = self.cell_size / 2
    local visited = {}
    local points = {}
    local mt = math.huge

    while (cur + step < len) do
      local cx, cy = x1 + dx * cur,  y1 + dy * cur
      local shapes = self:cellAt(cx, cy)
      cur = cur + step

      for _, shape in pairs(shapes) do
        if (not visited[shape]) then
          local ints = shape:intersectionsWithRay(x1, y1, dx, dy)

          for _, t in ipairs(ints) do
            if (t >= 0 and t <= len) then
              local px, py = vector.add(x1, y1, vector.mul(t, dx, dy))
              table.insert(points, {shape, t, px, py})
            end
          end

          visited[shape] = true
        end
      end
    end

    table.sort(points, function(a, b)
      return a[2] < b[2]
    end)

    return points
  end

  -- Note: draw() function removed as it depends on LOVE graphics

  return common_local.class('Spatialhash', Spatialhash)
end

--------------------------------------------------------------------------------
-- HC.shapes: Shape classes (circle, polygon, point)
--------------------------------------------------------------------------------
package.preload['HC.shapes'] = function()
  local math_min, math_sqrt, math_huge = math.min, math.sqrt, math.huge

  local _PACKAGE = 'HC'
  local common_local = common
  if not (type(common) == 'table' and common.class and common.instance) then
    assert(common_class ~= false, 'No class commons specification available.')
    require(_PACKAGE .. '.class')
  end
  local vector  = require(_PACKAGE .. '.vector-light')
  local Polygon = require(_PACKAGE .. '.polygon')
  local GJK     = require(_PACKAGE .. '.gjk')

  if common_local ~= common then
    common_local, common = common, common_local
  end

  local Shape = {}
  function Shape:init(t)
    self._type = t
    self._rotation = 0
  end

  function Shape:moveTo(x,y)
    local cx,cy = self:center()
    self:move(x - cx, y - cy)
  end

  function Shape:rotation()
    return self._rotation
  end

  function Shape:rotate(angle)
    self._rotation = self._rotation + angle
  end

  function Shape:setRotation(angle, x,y)
    return self:rotate(angle - self._rotation, x,y)
  end

  local ConvexPolygonShape = {}
  function ConvexPolygonShape:init(polygon)
    Shape.init(self, 'polygon')
    assert(polygon:isConvex(), "Polygon is not convex.")
    self._polygon = polygon
  end

  local ConcavePolygonShape = {}
  function ConcavePolygonShape:init(poly)
    Shape.init(self, 'compound')
    self._polygon = poly
    self._shapes = poly:splitConvex()
    for i,s in ipairs(self._shapes) do
      self._shapes[i] = common_local.instance(ConvexPolygonShape, s)
    end
  end

  local CircleShape = {}
  function CircleShape:init(cx,cy, radius)
    Shape.init(self, 'circle')
    self._center = {x = cx, y = cy}
    self._radius = radius
  end

  local PointShape = {}
  function PointShape:init(x,y)
    Shape.init(self, 'point')
    self._pos = {x = x, y = y}
  end

  function ConvexPolygonShape:support(dx,dy)
    local v = self._polygon.vertices
    local max, vmax = -math_huge
    for i = 1,#v do
      local d = vector.dot(v[i].x,v[i].y, dx,dy)
      if d > max then
        max, vmax = d, v[i]
      end
    end
    return vmax.x, vmax.y
  end

  function CircleShape:support(dx,dy)
    return vector.add(self._center.x, self._center.y,
      vector.mul(self._radius, vector.normalize(dx,dy)))
  end

  function ConvexPolygonShape:collidesWith(other)
    if self == other then return false end
    if other._type ~= 'polygon' then
      local collide, sx,sy = other:collidesWith(self)
      return collide, sx and -sx, sy and -sy
    end
    return GJK(self, other)
  end

  function ConcavePolygonShape:collidesWith(other)
    if self == other then return false end
    if other._type == 'point' then
      return other:collidesWith(self)
    end

    local collide,dx,dy = false,0,0
    for _,s in ipairs(self._shapes) do
      local status, sx,sy = s:collidesWith(other)
      collide = collide or status
      if status then
        if math.abs(dx) < math.abs(sx) then
          dx = sx
        end
        if math.abs(dy) < math.abs(sy) then
          dy = sy
        end
      end
    end
    return collide, dx, dy
  end

  function CircleShape:collidesWith(other)
    if self == other then return false end
    if other._type == 'circle' then
      local px,py = self._center.x-other._center.x, self._center.y-other._center.y
      local d = vector.len2(px,py)
      local radii = self._radius + other._radius
      if d < radii*radii then
        if d == 0 then return true, 0,radii end
        return true, vector.mul(radii - math_sqrt(d), vector.normalize(px,py))
      end
      return false
    elseif other._type == 'polygon' then
      return GJK(self, other)
    end

    local collide, sx,sy = other:collidesWith(self)
    return collide, sx and -sx, sy and -sy
  end

  function PointShape:collidesWith(other)
    if self == other then return false end
    if other._type == 'point' then
      return (self._pos == other._pos), 0,0
    end
    return other:contains(self._pos.x, self._pos.y), 0,0
  end

  function ConvexPolygonShape:contains(x,y)
    return self._polygon:contains(x,y)
  end

  function ConcavePolygonShape:contains(x,y)
    return self._polygon:contains(x,y)
  end

  function CircleShape:contains(x,y)
    return vector.len2(x-self._center.x, y-self._center.y) < self._radius * self._radius
  end

  function PointShape:contains(x,y)
    return x == self._pos.x and y == self._pos.y
  end

  function ConcavePolygonShape:intersectsRay(x,y, dx,dy)
    return self._polygon:intersectsRay(x,y, dx,dy)
  end

  function ConvexPolygonShape:intersectsRay(x,y, dx,dy)
    return self._polygon:intersectsRay(x,y, dx,dy)
  end

  function ConcavePolygonShape:intersectionsWithRay(x,y, dx,dy)
    return self._polygon:intersectionsWithRay(x,y, dx,dy)
  end

  function ConvexPolygonShape:intersectionsWithRay(x,y, dx,dy)
    return self._polygon:intersectionsWithRay(x,y, dx,dy)
  end

  function CircleShape:intersectionsWithRay(x,y, dx,dy)
    local pcx,pcy = x-self._center.x, y-self._center.y

    local a = vector.len2(dx,dy)
    local b = 2 * vector.dot(dx,dy, pcx,pcy)
    local c = vector.len2(pcx,pcy) - self._radius * self._radius
    local discr = b*b - 4*a*c

    if discr < 0 then return {} end

    discr = math_sqrt(discr)
    local ts, t1, t2 = {}, discr-b, -discr-b
    if t1 >= 0 then ts[#ts+1] = t1/(2*a) end
    if t2 >= 0 then ts[#ts+1] = t2/(2*a) end
    return ts
  end

  function CircleShape:intersectsRay(x,y, dx,dy)
    local tmin = math_huge
    for _, t in ipairs(self:intersectionsWithRay(x,y,dx,dy)) do
      tmin = math_min(t, tmin)
    end
    return tmin ~= math_huge, tmin
  end

  function PointShape:intersectsRay(x,y, dx,dy)
    local px,py = self._pos.x-x, self._pos.y-y
    local t = px/dx
    return (t == py/dy), t
  end

  function PointShape:intersectionsWithRay(x,y, dx,dy)
    local intersects, t = self:intersectsRay(x,y, dx,dy)
    return intersects and {t} or {}
  end

  function ConvexPolygonShape:center()
    return self._polygon.centroid.x, self._polygon.centroid.y
  end

  function ConcavePolygonShape:center()
    return self._polygon.centroid.x, self._polygon.centroid.y
  end

  function CircleShape:center()
    return self._center.x, self._center.y
  end

  function PointShape:center()
    return self._pos.x, self._pos.y
  end

  function ConvexPolygonShape:outcircle()
    local cx,cy = self:center()
    return cx,cy, self._polygon._radius
  end

  function ConcavePolygonShape:outcircle()
    local cx,cy = self:center()
    return cx,cy, self._polygon._radius
  end

  function CircleShape:outcircle()
    local cx,cy = self:center()
    return cx,cy, self._radius
  end

  function PointShape:outcircle()
    return self._pos.x, self._pos.y, 0
  end

  function ConvexPolygonShape:bbox()
    return self._polygon:bbox()
  end

  function ConcavePolygonShape:bbox()
    return self._polygon:bbox()
  end

  function CircleShape:bbox()
    local cx,cy = self:center()
    local r = self._radius
    return cx-r,cy-r, cx+r,cy+r
  end

  function PointShape:bbox()
    local x,y = self:center()
    return x,y,x,y
  end

  function ConvexPolygonShape:move(x,y)
    self._polygon:move(x,y)
  end

  function ConcavePolygonShape:move(x,y)
    self._polygon:move(x,y)
    for _,p in ipairs(self._shapes) do
      p:move(x,y)
    end
  end

  function CircleShape:move(x,y)
    self._center.x = self._center.x + x
    self._center.y = self._center.y + y
  end

  function PointShape:move(x,y)
    self._pos.x = self._pos.x + x
    self._pos.y = self._pos.y + y
  end

  function ConcavePolygonShape:rotate(angle,cx,cy)
    Shape.rotate(self, angle)
    if not (cx and cy) then
      cx,cy = self:center()
    end
    self._polygon:rotate(angle,cx,cy)
    for _,p in ipairs(self._shapes) do
      p:rotate(angle, cx,cy)
    end
  end

  function ConvexPolygonShape:rotate(angle, cx,cy)
    Shape.rotate(self, angle)
    self._polygon:rotate(angle, cx, cy)
  end

  function CircleShape:rotate(angle, cx,cy)
    Shape.rotate(self, angle)
    if not (cx and cy) then return end
    self._center.x,self._center.y = vector.add(cx,cy, vector.rotate(angle, self._center.x-cx, self._center.y-cy))
  end

  function PointShape:rotate(angle, cx,cy)
    Shape.rotate(self, angle)
    if not (cx and cy) then return end
    self._pos.x,self._pos.y = vector.add(cx,cy, vector.rotate(angle, self._pos.x-cx, self._pos.y-cy))
  end

  function ConcavePolygonShape:scale(s)
    assert(type(s) == "number" and s > 0, "Invalid argument. Scale must be greater than 0")
    local cx,cy = self:center()
    self._polygon:scale(s, cx,cy)
    for _, p in ipairs(self._shapes) do
      local dx,dy = vector.sub(cx,cy, p:center())
      p:scale(s)
      p:moveTo(cx-dx*s, cy-dy*s)
    end
  end

  function ConvexPolygonShape:scale(s)
    assert(type(s) == "number" and s > 0, "Invalid argument. Scale must be greater than 0")
    self._polygon:scale(s, self:center())
  end

  function CircleShape:scale(s)
    assert(type(s) == "number" and s > 0, "Invalid argument. Scale must be greater than 0")
    self._radius = self._radius * s
  end

  function PointShape:scale()
    -- nothing
  end

  -- Note: draw() functions removed as they depend on LOVE graphics

  Shape = common_local.class('Shape', Shape)
  ConvexPolygonShape  = common_local.class('ConvexPolygonShape',  ConvexPolygonShape,  Shape)
  ConcavePolygonShape = common_local.class('ConcavePolygonShape', ConcavePolygonShape, Shape)
  CircleShape         = common_local.class('CircleShape',         CircleShape,         Shape)
  PointShape          = common_local.class('PointShape',          PointShape,          Shape)

  local function newPolygonShape(polygon, ...)
    if type(polygon) == "number" then
      polygon = common_local.instance(Polygon, polygon, ...)
    else
      polygon = polygon:clone()
    end

    if polygon:isConvex() then
      return common_local.instance(ConvexPolygonShape, polygon)
    end

    return common_local.instance(ConcavePolygonShape, polygon)
  end

  local function newCircleShape(...)
    return common_local.instance(CircleShape, ...)
  end

  local function newPointShape(...)
    return common_local.instance(PointShape, ...)
  end

  return {
    ConcavePolygonShape = ConcavePolygonShape,
    ConvexPolygonShape  = ConvexPolygonShape,
    CircleShape         = CircleShape,
    PointShape          = PointShape,
    newPolygonShape     = newPolygonShape,
    newCircleShape      = newCircleShape,
    newPointShape       = newPointShape,
  }
end

--------------------------------------------------------------------------------
-- Main HC module
--------------------------------------------------------------------------------
local _NAME = 'HC'
local common_local = common
if not (type(common) == 'table' and common.class and common.instance) then
  assert(common_class ~= false, 'No class commons specification available.')
  require(_NAME .. '.class')
end
local Shapes      = require(_NAME .. '.shapes')
local Spatialhash = require(_NAME .. '.spatialhash')

if common_local ~= common then
  common_local, common = common, common_local
end

local newPolygonShape = Shapes.newPolygonShape
local newCircleShape  = Shapes.newCircleShape
local newPointShape   = Shapes.newPointShape

---@class HC
---@field new fun(cell_size?: number): HC Create a new HC instance with optional spatial hash cell size
---@field resetHash fun(cell_size?: number): HC Reset the spatial hash with optional new cell size
---@field register fun(shape: Shape): Shape Register a shape with the collision system
---@field remove fun(shape: Shape): HC Remove a shape from the collision system
---@field polygon fun(...): Shape Create and register a polygon shape from coordinates
---@field rectangle fun(x: number, y: number, w: number, h: number): Shape Create and register a rectangle shape
---@field circle fun(x: number, y: number, r: number): Shape Create and register a circle shape
---@field point fun(x: number, y: number): Shape Create and register a point shape
---@field neighbors fun(shape: Shape): table Get shapes that might collide with the given shape
---@field collisions fun(shape: Shape): table Get all shapes colliding with the given shape
---@field shapesAt fun(x: number, y: number): table Get all shapes containing the point
local HC = {}

--- Initialize the HC collision system
---@param cell_size? number Size of spatial hash cells (default: 100)
function HC:init(cell_size)
  self:resetHash(cell_size)
end

--- Get the spatial hash used by this instance
---@return table The spatial hash object
function HC:hash() return self._hash end

--- Reset the spatial hash, optionally with a new cell size
---@param cell_size? number Size of spatial hash cells (default: 100)
---@return HC self Returns self for chaining
function HC:resetHash(cell_size)
  self._hash = common_local.instance(Spatialhash, cell_size or 100)
  return self
end

--- Register a shape with the collision detection system
--- Automatically tracks shape movement, rotation, and scaling
---@param shape Shape The shape to register
---@return Shape shape Returns the registered shape
function HC:register(shape)
  self._hash:register(shape, shape:bbox())

  for _, f in ipairs({'move', 'rotate', 'scale'}) do
    local old_function = shape[f]
    shape[f] = function(this, ...)
      local x1,y1,x2,y2 = this:bbox()
      old_function(this, ...)
      self._hash:update(this, x1,y1,x2,y2, this:bbox())
      return this
    end
  end

  return shape
end

--- Remove a shape from the collision detection system
---@param shape Shape The shape to remove
---@return HC self Returns self for chaining
function HC:remove(shape)
  self._hash:remove(shape, shape:bbox())
  for _, f in ipairs({'move', 'rotate', 'scale'}) do
    shape[f] = function()
      error(f.."() called on a removed shape")
    end
  end
  return self
end

--- Create and register a polygon shape from vertex coordinates
---@param ... number Vertex coordinates as x1,y1, x2,y2, ...
---@return Shape shape The created polygon shape
function HC:polygon(...)
  return self:register(newPolygonShape(...))
end

--- Create and register a rectangle shape
---@param x number Left edge x coordinate
---@param y number Top edge y coordinate
---@param w number Width
---@param h number Height
---@return Shape shape The created rectangle shape
function HC:rectangle(x,y,w,h)
  return self:polygon(x,y, x+w,y, x+w,y+h, x,y+h)
end

--- Create and register a circle shape
---@param x number Center x coordinate
---@param y number Center y coordinate
---@param r number Radius
---@return Shape shape The created circle shape
function HC:circle(x,y,r)
  return self:register(newCircleShape(x,y,r))
end

--- Create and register a point shape
---@param x number X coordinate
---@param y number Y coordinate
---@return Shape shape The created point shape
function HC:point(x,y)
  return self:register(newPointShape(x,y))
end

--- Get all shapes that might collide with the given shape (broad phase)
--- Uses spatial hashing for efficient neighbor lookup
---@param shape Shape The shape to check
---@return table neighbors Table of potential collision candidates
function HC:neighbors(shape)
  local neighbors = self._hash:inSameCells(shape:bbox())
  rawset(neighbors, shape, nil)
  return neighbors
end

--- Get all shapes colliding with the given shape
--- Returns collision data including separation vectors
---@param shape Shape The shape to check collisions for
---@return table collisions Table mapping colliding shapes to {x=dx, y=dy} separation vectors
function HC:collisions(shape)
  local candidates = self:neighbors(shape)
  for other in pairs(candidates) do
    local collides, dx, dy = shape:collidesWith(other)
    if collides then
      rawset(candidates, other, {dx,dy, x=dx, y=dy})
    else
      rawset(candidates, other, nil)
    end
  end
  return candidates
end

--- Cast a ray and find all intersections with registered shapes
---@param x number Ray origin x coordinate
---@param y number Ray origin y coordinate
---@param dx number Ray direction x component
---@param dy number Ray direction y component
---@param range number Maximum ray distance
---@return table intersections Table of intersection data
function HC:raycast(x, y, dx, dy, range)
  local dxr, dyr = dx * range, dy * range
  local bbox = { x + dxr , y + dyr, x, y }
  local candidates = self._hash:inSameCells(unpack(bbox))

  for col in pairs(candidates) do
    local rparams = col:intersectionsWithRay(x, y, dx, dy)
    if #rparams > 0 then
      for i, rparam in pairs(rparams) do
        if rparam < 0 or rparam > range then
          rawset(rparams, i, nil)
        else
          local hitx, hity = x + (rparam * dx), y + (rparam * dy)
          rawset(rparams, i, { x = hitx, y = hity })
        end
      end
      rawset(candidates, col, rparams)
    else
      rawset(candidates, col, nil)
    end
  end
  return candidates
end

--- Get all shapes containing a specific point
---@param x number X coordinate
---@param y number Y coordinate
---@return table shapes Table of shapes containing the point
function HC:shapesAt(x, y)
  local candidates = {}
  for c in pairs(self._hash:cellAt(x, y)) do
    if c:contains(x, y) then
      rawset(candidates, c, c)
    end
  end
  return candidates
end

-- Create the class and default instance
HC = common_local.class('HC', HC)
local instance = common_local.instance(HC)

-- Return module with both class methods and instance methods
-- Note: wrapper functions accept (self, ...) to support colon syntax: HC:circle(x, y, r)
return setmetatable({
  --- Create a new HC collision detection instance
  ---@param cell_size? number Size of spatial hash cells (default: 100)
  ---@return HC A new HC instance
  new       = function(_, ...) return common_local.instance(HC, ...) end,

  --- Reset the default instance's spatial hash
  ---@param cell_size? number Size of spatial hash cells (default: 100)
  ---@return HC The default instance
  resetHash = function(_, ...) return instance:resetHash(...) end,

  --- Register a shape with the default instance
  ---@param shape Shape The shape to register
  ---@return Shape The registered shape
  register  = function(_, ...) return instance:register(...) end,

  --- Remove a shape from the default instance
  ---@param shape Shape The shape to remove
  ---@return HC The default instance
  remove    = function(_, ...) return instance:remove(...) end,

  --- Create and register a polygon with the default instance
  ---@param ... number Vertex coordinates as x1,y1, x2,y2, ...
  ---@return Shape The created polygon shape
  polygon   = function(_, ...) return instance:polygon(...) end,

  --- Create and register a rectangle with the default instance
  ---@param x number Left edge x coordinate
  ---@param y number Top edge y coordinate
  ---@param w number Width
  ---@param h number Height
  ---@return Shape The created rectangle shape
  rectangle = function(_, ...) return instance:rectangle(...) end,

  --- Create and register a circle with the default instance
  ---@param x number Center x coordinate
  ---@param y number Center y coordinate
  ---@param r number Radius
  ---@return Shape The created circle shape
  circle    = function(_, ...) return instance:circle(...) end,

  --- Create and register a point with the default instance
  ---@param x number X coordinate
  ---@param y number Y coordinate
  ---@return Shape The created point shape
  point     = function(_, ...) return instance:point(...) end,

  --- Get neighbors of a shape using the default instance
  ---@param shape Shape The shape to check
  ---@return table Potential collision candidates
  neighbors  = function(_, ...) return instance:neighbors(...) end,

  --- Get collisions for a shape using the default instance
  ---@param shape Shape The shape to check
  ---@return table Colliding shapes with separation vectors
  collisions = function(_, ...) return instance:collisions(...) end,

  --- Get shapes at a point using the default instance
  ---@param x number X coordinate
  ---@param y number Y coordinate
  ---@return table Shapes containing the point
  shapesAt   = function(_, ...) return instance:shapesAt(...) end,

  --- Get the spatial hash of the default instance
  ---@return table The spatial hash
  hash       = function() return instance:hash() end,
}, {__call = function(_, ...) return common_local.instance(HC, ...) end})
