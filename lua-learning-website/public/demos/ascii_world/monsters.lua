-- ascii_world/monsters.lua
-- Monster definitions and spawning

local monsters = {}

-- Monster templates
monsters.templates = {
  slime = {
    id = "slime",
    name = "Green Slime",
    max_hp = 20,
    str = 6,
    def = 2,
    xp = 15,
    gold = 5,
    description = "A wobbling blob of green goo.",
  },
  goblin = {
    id = "goblin",
    name = "Goblin",
    max_hp = 35,
    str = 10,
    def = 4,
    xp = 30,
    gold = 12,
    description = "A small but vicious creature.",
  },
  wolf = {
    id = "wolf",
    name = "Dire Wolf",
    max_hp = 50,
    str = 14,
    def = 6,
    xp = 50,
    gold = 18,
    description = "A fierce predator of the forest.",
  },
  troll = {
    id = "troll",
    name = "Forest Troll",
    max_hp = 80,
    str = 20,
    def = 10,
    xp = 100,
    gold = 40,
    description = "A hulking brute with thick hide.",
  },
}

-- Create a monster instance from template
function monsters.create(monster_id)
  local template = monsters.templates[monster_id]
  if not template then
    return nil
  end

  -- Create a copy with current HP
  return {
    id = template.id,
    name = template.name,
    hp = template.max_hp,
    max_hp = template.max_hp,
    str = template.str,
    def = template.def,
    xp = template.xp,
    gold = template.gold,
    description = template.description,
  }
end

-- Get monster template (read-only reference)
function monsters.get_template(monster_id)
  return monsters.templates[monster_id]
end

-- Check if monster is alive
function monsters.is_alive(monster)
  return monster and monster.hp > 0
end

-- Monster takes damage
function monsters.take_damage(monster, amount)
  -- Apply defense
  amount = math.max(1, amount - math.floor(monster.def / 2))
  monster.hp = math.max(0, monster.hp - amount)
  return amount
end

-- Calculate monster attack damage
function monsters.calculate_attack(monster)
  local base = monster.str
  -- Add some variance (+/- 20%)
  local variance = math.floor(base * 0.2)
  return base + math.random(-variance, variance)
end

-- Get a random monster for an area (scaled by player level)
function monsters.spawn_for_area(monster_pool, player_level)
  if not monster_pool or #monster_pool == 0 then
    return nil
  end

  -- Pick random monster from pool
  local monster_id = monster_pool[math.random(#monster_pool)]
  local monster = monsters.create(monster_id)

  if monster and player_level > 1 then
    -- Scale monster slightly based on player level
    local scale = 1 + (player_level - 1) * 0.1
    monster.max_hp = math.floor(monster.max_hp * scale)
    monster.hp = monster.max_hp
    monster.str = math.floor(monster.str * scale)
    monster.xp = math.floor(monster.xp * scale)
    monster.gold = math.floor(monster.gold * scale)
  end

  return monster
end

return monsters
