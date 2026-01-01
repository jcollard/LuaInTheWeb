import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaEngineFactory, type LuaEngineCallbacks } from '../src/LuaEngineFactory'
import type { LuaEngine } from 'wasmoon'

describe('LuaEngineFactory - HC Collision Detection Library', () => {
  let callbacks: LuaEngineCallbacks
  let engine: LuaEngine

  beforeEach(() => {
    callbacks = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onReadInput: vi.fn(),
    }
  })

  afterEach(() => {
    if (engine) {
      LuaEngineFactory.close(engine)
    }
  })

  describe('require() and module loading', () => {
    it('should load HC library via require("hc")', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        return type(HC)
      `)

      expect(result).toBe('table')
    })

    it('should cache HC module on subsequent requires', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC1 = require('hc')
        local HC2 = require('hc')
        return HC1 == HC2
      `)

      expect(result).toBe(true)
    })

    it('should have new() function for creating instances', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        return type(HC.new)
      `)

      expect(result).toBe('function')
    })
  })

  describe('Shape creation', () => {
    it('should create a circle shape', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local circle = HC:circle(100, 100, 50)
        return circle ~= nil
      `)

      expect(result).toBe(true)
    })

    it('should create a rectangle shape', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local rect = HC:rectangle(0, 0, 100, 50)
        return rect ~= nil
      `)

      expect(result).toBe(true)
    })

    it('should create a polygon shape from coordinates', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local poly = HC:polygon(0,0, 100,0, 50,100)
        return poly ~= nil
      `)

      expect(result).toBe(true)
    })

    it('should create a point shape', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local point = HC:point(50, 50)
        return point ~= nil
      `)

      expect(result).toBe(true)
    })
  })

  describe('Shape center()', () => {
    it('should return center of circle', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local circle = HC:circle(100, 200, 50)
        local cx, cy = circle:center()
        return cx == 100 and cy == 200
      `)

      expect(result).toBe(true)
    })

    it('should return center of rectangle', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local rect = HC:rectangle(0, 0, 100, 50)
        local cx, cy = rect:center()
        return cx == 50 and cy == 25
      `)

      expect(result).toBe(true)
    })
  })

  describe('Shape move()', () => {
    it('should move a circle shape', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local circle = HC:circle(0, 0, 50)
        circle:move(100, 100)
        local cx, cy = circle:center()
        return cx == 100 and cy == 100
      `)

      expect(result).toBe(true)
    })

    it('should move a rectangle shape', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local rect = HC:rectangle(0, 0, 100, 50)
        rect:move(50, 25)
        local cx, cy = rect:center()
        return cx == 100 and cy == 50
      `)

      expect(result).toBe(true)
    })
  })

  describe('Shape moveTo()', () => {
    it('should move shape center to specified position', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local circle = HC:circle(0, 0, 50)
        circle:moveTo(200, 300)
        local cx, cy = circle:center()
        return cx == 200 and cy == 300
      `)

      expect(result).toBe(true)
    })
  })

  describe('Shape bbox()', () => {
    it('should return bounding box of circle', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local circle = HC:circle(100, 100, 50)
        local x1, y1, x2, y2 = circle:bbox()
        return x1 == 50 and y1 == 50 and x2 == 150 and y2 == 150
      `)

      expect(result).toBe(true)
    })

    it('should return bounding box of rectangle', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local rect = HC:rectangle(10, 20, 100, 50)
        local x1, y1, x2, y2 = rect:bbox()
        return x1 == 10 and y1 == 20 and x2 == 110 and y2 == 70
      `)

      expect(result).toBe(true)
    })
  })

  describe('Shape contains()', () => {
    it('should detect point inside circle', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local circle = HC:circle(100, 100, 50)
        return circle:contains(100, 100)
      `)

      expect(result).toBe(true)
    })

    it('should detect point outside circle', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local circle = HC:circle(100, 100, 50)
        return circle:contains(200, 200)
      `)

      expect(result).toBe(false)
    })

    it('should detect point inside rectangle', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local rect = HC:rectangle(0, 0, 100, 50)
        return rect:contains(50, 25)
      `)

      expect(result).toBe(true)
    })
  })

  describe('Collision detection', () => {
    it('should detect collision between overlapping circles', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local c1 = HC:circle(100, 100, 50)
        local c2 = HC:circle(120, 100, 50)

        local collisions = HC:collisions(c1)
        local hasCollision = false
        for shape, sep in pairs(collisions) do
          if shape == c2 then
            hasCollision = true
          end
        end
        return hasCollision
      `)

      expect(result).toBe(true)
    })

    it('should not detect collision between non-overlapping circles', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local c1 = HC:circle(0, 0, 10)
        local c2 = HC:circle(100, 100, 10)

        local collisions = HC:collisions(c1)
        local count = 0
        for _ in pairs(collisions) do count = count + 1 end
        return count
      `)

      expect(result).toBe(0)
    })

    it('should return separation vector for colliding shapes', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local c1 = HC:circle(100, 100, 50)
        local c2 = HC:circle(140, 100, 50)

        local collisions = HC:collisions(c1)
        for shape, sep in pairs(collisions) do
          if sep.x ~= nil and sep.y ~= nil then
            return true
          end
        end
        return false
      `)

      expect(result).toBe(true)
    })

    it('should detect collision between circle and rectangle', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local circle = HC:circle(100, 100, 50)
        local rect = HC:rectangle(80, 80, 40, 40)

        local collisions = HC:collisions(circle)
        local hasCollision = false
        for shape in pairs(collisions) do
          if shape == rect then
            hasCollision = true
          end
        end
        return hasCollision
      `)

      expect(result).toBe(true)
    })
  })

  describe('Shape collidesWith()', () => {
    it('should return collision status and separation vector', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local c1 = HC:circle(100, 100, 50)
        local c2 = HC:circle(140, 100, 50)

        local collides, dx, dy = c1:collidesWith(c2)
        return collides == true and type(dx) == 'number' and type(dy) == 'number'
      `)

      expect(result).toBe(true)
    })

    it('should return false for non-colliding shapes', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local c1 = HC:circle(0, 0, 10)
        local c2 = HC:circle(100, 100, 10)

        local collides = c1:collidesWith(c2)
        return collides
      `)

      expect(result).toBe(false)
    })
  })

  describe('Shape rotation', () => {
    it('should rotate a shape and track rotation', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local rect = HC:rectangle(0, 0, 100, 50)
        rect:rotate(math.pi / 4)
        local rotation = rect:rotation()
        return math.abs(rotation - math.pi / 4) < 0.0001
      `)

      expect(result).toBe(true)
    })
  })

  describe('Shape scale', () => {
    it('should scale a circle shape', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local circle = HC:circle(100, 100, 50)
        circle:scale(2)
        local _, _, r = circle:outcircle()
        return r == 100
      `)

      expect(result).toBe(true)
    })
  })

  describe('HC:remove()', () => {
    it('should remove shape from collision detection', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local c1 = HC:circle(100, 100, 50)
        local c2 = HC:circle(120, 100, 50)

        -- Initially should collide
        local collisionsBefore = HC:collisions(c1)
        local countBefore = 0
        for _ in pairs(collisionsBefore) do countBefore = countBefore + 1 end

        -- Remove c2
        HC:remove(c2)

        -- Now should not collide
        local collisionsAfter = HC:collisions(c1)
        local countAfter = 0
        for _ in pairs(collisionsAfter) do countAfter = countAfter + 1 end

        return countBefore == 1 and countAfter == 0
      `)

      expect(result).toBe(true)
    })
  })

  describe('HC:shapesAt()', () => {
    it('should find shapes at a point', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local circle = HC:circle(100, 100, 50)

        local shapes = HC:shapesAt(100, 100)
        local found = false
        for shape in pairs(shapes) do
          if shape == circle then
            found = true
          end
        end
        return found
      `)

      expect(result).toBe(true)
    })

    it('should return empty table for point with no shapes', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local circle = HC:circle(100, 100, 50)

        local shapes = HC:shapesAt(500, 500)
        local count = 0
        for _ in pairs(shapes) do count = count + 1 end
        return count
      `)

      expect(result).toBe(0)
    })
  })

  describe('HC.new() separate instances', () => {
    it('should create independent HC instances', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local hc1 = HC.new()
        local hc2 = HC.new()

        local circle1 = hc1:circle(100, 100, 50)
        local circle2 = hc2:circle(100, 100, 50)

        -- Shapes in different HC instances should not detect each other
        local collisions = hc1:collisions(circle1)
        local count = 0
        for _ in pairs(collisions) do count = count + 1 end
        return count
      `)

      expect(result).toBe(0)
    })
  })

  describe('HC:neighbors()', () => {
    it('should return potential collision candidates', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local c1 = HC:circle(100, 100, 50)
        local c2 = HC:circle(120, 100, 50)

        local neighbors = HC:neighbors(c1)
        local found = false
        for shape in pairs(neighbors) do
          if shape == c2 then
            found = true
          end
        end
        return found
      `)

      expect(result).toBe(true)
    })
  })

  describe('Polygon shapes', () => {
    it('should create convex polygon', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        -- Triangle (convex)
        local tri = HC:polygon(0,0, 100,0, 50,100)
        return tri ~= nil
      `)

      expect(result).toBe(true)
    })

    it('should detect collision between polygons', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local HC = require('hc')
        local tri1 = HC:polygon(0,0, 100,0, 50,100)
        local tri2 = HC:polygon(40,40, 140,40, 90,140)

        local collides = tri1:collidesWith(tri2)
        return collides
      `)

      expect(result).toBe(true)
    })
  })
})
