# ASCII World RPG - Extension Guide

This document outlines how to extend ASCII World with new features.
The current MVP includes basic exploration, combat, and progression.

## Current Features (MVP)

- **Two Locations**: Oakvale Village (safe) and Darkwood Forest (encounters)
- **Turn-based Combat**: Attack, Defend, Item, Flee
- **Progression**: XP-based leveling with stat increases
- **Equipment**: Weapon and armor slots
- **NPCs**: Shop and healer in village
- **Monsters**: Slime, Goblin, Wolf, Troll

---

## Extension Ideas

### 1. Magic System

Add MP (Magic Points) and spells to combat.

**Files to modify:**
- `config.lua`: Add spell definitions and costs
- `player.lua`: Add `mp` and `max_mp` to player state
- `combat.lua`: Add "Magic" option to battle menu
- `ui.lua`: Update status displays to show MP

**Implementation:**
```lua
-- In config.lua
config.spells = {
  fire = { name = "Fire", damage = 25, mp_cost = 8 },
  ice = { name = "Ice", damage = 20, mp_cost = 6, effect = "slow" },
  heal = { name = "Heal", restore = 40, mp_cost = 12 },
  thunder = { name = "Thunder", damage = 35, mp_cost = 15 },
}

-- In combat.lua battle menu
-- Add option 5: "Magic" -> submenu of available spells
```

### 2. More Locations

Add new areas with unique monsters and challenges.

**Suggested locations:**
- **Ironhold Town**: Larger town with better shop, quest givers
- **Crystal Cave**: Underground dungeon with stronger monsters
- **Shadow Castle**: Final dungeon with boss fight
- **Mountain Pass**: Bridge between regions

**Files to modify:**
- `maps.lua`: Add new map definitions
- `monsters.lua`: Add area-specific monster pools

**Map template:**
```lua
maps.data.crystal_cave = {
  name = "Crystal Cave",
  grid = {
    "####################",
    "#......##..........#",
    "#.####.##.########.#",
    -- ... (20x12)
  },
  exits = {
    { x = 10, y = 1, to = "darkwood", spawn_x = 10, spawn_y = 10 }
  },
  encounter_rate = 0.25,
  monster_pool = { "bat", "spider", "golem" },
}
```

### 3. Boss Fights

Add special boss monsters with unique abilities.

**Implementation:**
```lua
-- In monsters.lua
monsters.bosses = {
  dragon = {
    name = "Shadow Dragon",
    max_hp = 300,
    str = 40,
    def = 25,
    xp = 500,
    gold = 300,
    abilities = { "fire_breath", "tail_sweep", "roar" },
    is_boss = true,
  },
}

-- In combat.lua
-- Check monster.is_boss to enable special attack patterns
```

### 4. Quest System

Add trackable objectives with rewards.

**New file: `quests.lua`**
```lua
local quests = {}

quests.data = {
  slay_goblins = {
    name = "Goblin Trouble",
    description = "Defeat 5 goblins in Darkwood Forest",
    giver = "village_elder",
    type = "kill",
    target = "goblin",
    required = 5,
    progress = 0,
    reward_gold = 100,
    reward_xp = 200,
  },
}

function quests.update_progress(quest_id, amount)
  -- Track kill counts, item collection, etc.
end

function quests.check_complete(quest_id)
  local q = quests.data[quest_id]
  return q.progress >= q.required
end

return quests
```

### 5. Status Effects

Add buffs, debuffs, and damage-over-time effects.

**Effects to implement:**
- **Poison**: Damage each turn
- **Burn**: Damage + reduced defense
- **Stun**: Skip turn
- **Defend**: Reduced damage (already implemented!)
- **Berserk**: Increased attack, cannot defend

**Implementation:**
```lua
-- In combat.lua
function combat.apply_effects(target)
  if target.effects.poison then
    local damage = math.floor(target.max_hp * 0.05)
    target.hp = target.hp - damage
    ui.print("Poison deals " .. damage .. " damage!", config.colors.danger)
    target.effects.poison = target.effects.poison - 1
    if target.effects.poison <= 0 then
      target.effects.poison = nil
    end
  end
end
```

### 6. Party System

Allow multiple party members with turn-based combat order.

**Changes needed:**
- `player.lua`: Support multiple characters in party table
- `combat.lua`: Turn order based on speed stat
- `ui.lua`: Party status display

**Example:**
```lua
-- Party structure
party = {
  { name = "Hero", class = "warrior", ... },
  { name = "Mira", class = "mage", ... },
  { name = "Rex", class = "rogue", ... },
}

-- Turn order calculation
function combat.get_turn_order(party, monsters)
  local all = {}
  for _, p in ipairs(party) do table.insert(all, p) end
  for _, m in ipairs(monsters) do table.insert(all, m) end
  table.sort(all, function(a, b) return a.spd > b.spd end)
  return all
end
```

### 7. Saving and Loading

**Note:** The current environment doesn't support file I/O.
For persistence, consider:
- Displaying a "save code" (encoded game state) player can copy
- Using browser localStorage if available

**Save code approach:**
```lua
function game.generate_save_code()
  -- Encode player level, gold, equipment, location
  -- Example: "L5G150WISCIA" = Level 5, 150 gold, Wood+Iron, Cave, pos A
  local code = string.format("L%dG%d...", player.level, player.gold)
  return code
end
```

---

## Adding New Monsters

1. Add template to `monsters.lua`:
```lua
monsters.templates.skeleton = {
  name = "Skeleton",
  max_hp = 55,
  str = 16,
  def = 8,
  xp = 65,
  gold = 25,
}
```

2. Add to area's monster_pool in `maps.lua`:
```lua
maps.data.crystal_cave.monster_pool = { "bat", "skeleton", "spider" }
```

## Adding New Items

1. Add to appropriate table in `items.lua`:
```lua
items.weapons.silver_sword = {
  name = "Silver Sword",
  str = 12,
  price = 200,
}
```

2. Add to shop inventory:
```lua
function items.get_shop_inventory(shop_type)
  if shop_type == "ironhold" then
    return {
      { type = "weapon", id = "silver_sword" },
      -- ...
    }
  end
end
```

---

## Color Scheme Reference

Current colors (from `config.lua`):
- **Player**: shell.GREEN
- **Monster**: shell.RED
- **NPC**: shell.CYAN
- **Gold/Treasure**: shell.YELLOW
- **Walls**: shell.WHITE
- **Danger/Damage**: shell.RED
- **Healing**: shell.GREEN
- **Info**: shell.CYAN
- **Muted text**: (128, 128, 128)

---

## Tips for Extension

1. **Test incrementally**: Add one feature at a time
2. **Keep modules focused**: Each file should have one responsibility
3. **Use config.lua**: Centralize constants for easy balancing
4. **Balance carefully**: XP and gold rewards affect progression speed
5. **Add variety**: Different monsters and items keep gameplay fresh

Happy coding!
