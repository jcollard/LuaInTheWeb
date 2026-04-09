-- ascii_world/items.lua
-- Item and equipment definitions

local items = {}

-- Weapons (increase STR/attack)
items.weapons = {
  wooden_sword = {
    id = "wooden_sword",
    name = "Wooden Sword",
    type = "weapon",
    str = 3,
    price = 25,
    description = "A basic training sword.",
  },
  rusty_dagger = {
    id = "rusty_dagger",
    name = "Rusty Dagger",
    type = "weapon",
    str = 2,
    price = 10,
    description = "A worn but functional dagger.",
  },
  iron_sword = {
    id = "iron_sword",
    name = "Iron Sword",
    type = "weapon",
    str = 8,
    price = 80,
    description = "A sturdy iron blade.",
  },
  battle_axe = {
    id = "battle_axe",
    name = "Battle Axe",
    type = "weapon",
    str = 12,
    price = 120,
    description = "A heavy two-handed axe.",
  },
  steel_blade = {
    id = "steel_blade",
    name = "Steel Blade",
    type = "weapon",
    str = 15,
    price = 200,
    description = "A finely crafted steel sword.",
  },
  war_hammer = {
    id = "war_hammer",
    name = "War Hammer",
    type = "weapon",
    str = 18,
    price = 280,
    description = "Crushes armor with ease.",
  },
  hero_sword = {
    id = "hero_sword",
    name = "Hero's Sword",
    type = "weapon",
    str = 25,
    price = 500,
    description = "A legendary blade of heroes.",
  },
  dragon_slayer = {
    id = "dragon_slayer",
    name = "Dragon Slayer",
    type = "weapon",
    str = 35,
    price = 1000,
    description = "Forged to slay dragons.",
  },
}

-- Armor (increase DEF)
items.armors = {
  tattered_robe = {
    id = "tattered_robe",
    name = "Tattered Robe",
    type = "armor",
    def = 1,
    price = 8,
    description = "Better than nothing.",
  },
  cloth_armor = {
    id = "cloth_armor",
    name = "Cloth Armor",
    type = "armor",
    def = 2,
    price = 20,
    description = "Simple cloth garments.",
  },
  leather_armor = {
    id = "leather_armor",
    name = "Leather Armor",
    type = "armor",
    def = 5,
    price = 60,
    description = "Toughened leather protection.",
  },
  studded_leather = {
    id = "studded_leather",
    name = "Studded Leather",
    type = "armor",
    def = 7,
    price = 100,
    description = "Leather reinforced with studs.",
  },
  chain_mail = {
    id = "chain_mail",
    name = "Chain Mail",
    type = "armor",
    def = 10,
    price = 150,
    description = "Interlocking metal rings.",
  },
  scale_mail = {
    id = "scale_mail",
    name = "Scale Mail",
    type = "armor",
    def = 14,
    price = 250,
    description = "Overlapping metal scales.",
  },
  plate_armor = {
    id = "plate_armor",
    name = "Plate Armor",
    type = "armor",
    def = 18,
    price = 400,
    description = "Heavy steel plates.",
  },
  dragon_scale = {
    id = "dragon_scale",
    name = "Dragon Scale",
    type = "armor",
    def = 28,
    price = 1200,
    description = "Armor from dragon scales.",
  },
}

-- Consumables
items.consumables = {
  herb = {
    id = "herb",
    name = "Herb",
    type = "consumable",
    heal = 10,
    price = 5,
    description = "A healing herb. Restores 10 HP.",
  },
  potion = {
    id = "potion",
    name = "Potion",
    type = "consumable",
    heal = 30,
    price = 15,
    description = "Restores 30 HP.",
  },
  hi_potion = {
    id = "hi_potion",
    name = "Hi-Potion",
    type = "consumable",
    heal = 80,
    price = 40,
    description = "Restores 80 HP.",
  },
  super_potion = {
    id = "super_potion",
    name = "Super Potion",
    type = "consumable",
    heal = 150,
    price = 75,
    description = "Restores 150 HP.",
  },
  max_potion = {
    id = "max_potion",
    name = "Max Potion",
    type = "consumable",
    heal = 9999,
    price = 100,
    description = "Fully restores HP.",
  },
  elixir = {
    id = "elixir",
    name = "Elixir",
    type = "consumable",
    heal = 9999,
    price = 250,
    description = "A rare healing elixir.",
  },
}

-- Create a copy of an item (for inventory)
function items.create(item_id)
  -- Search all categories
  local item = items.weapons[item_id]
    or items.armors[item_id]
    or items.consumables[item_id]

  if item then
    -- Return a copy
    local copy = {}
    for k, v in pairs(item) do
      copy[k] = v
    end
    return copy
  end
  return nil
end

-- Get item by ID (reference, not copy)
function items.get(item_id)
  return items.weapons[item_id]
    or items.armors[item_id]
    or items.consumables[item_id]
end

-- Get shop inventory for a shop type
function items.get_shop_inventory(shop_type)
  if shop_type == "weapon" then
    return {
      items.weapons.rusty_dagger,
      items.weapons.wooden_sword,
      items.weapons.iron_sword,
      items.weapons.battle_axe,
      items.weapons.steel_blade,
      items.weapons.war_hammer,
      items.weapons.hero_sword,
      items.weapons.dragon_slayer,
    }
  elseif shop_type == "armor" then
    return {
      items.armors.tattered_robe,
      items.armors.cloth_armor,
      items.armors.leather_armor,
      items.armors.studded_leather,
      items.armors.chain_mail,
      items.armors.scale_mail,
      items.armors.plate_armor,
      items.armors.dragon_scale,
    }
  elseif shop_type == "potion" then
    return {
      items.consumables.herb,
      items.consumables.potion,
      items.consumables.hi_potion,
      items.consumables.super_potion,
      items.consumables.max_potion,
      items.consumables.elixir,
    }
  elseif shop_type == "village" then
    -- Legacy mixed shop
    return {
      items.weapons.wooden_sword,
      items.weapons.iron_sword,
      items.armors.cloth_armor,
      items.armors.leather_armor,
      items.consumables.potion,
      items.consumables.hi_potion,
    }
  elseif shop_type == "town" then
    -- Legacy mixed shop
    return {
      items.weapons.iron_sword,
      items.weapons.steel_blade,
      items.weapons.hero_sword,
      items.armors.leather_armor,
      items.armors.chain_mail,
      items.armors.plate_armor,
      items.consumables.potion,
      items.consumables.hi_potion,
      items.consumables.max_potion,
    }
  end
  return {}
end

return items
