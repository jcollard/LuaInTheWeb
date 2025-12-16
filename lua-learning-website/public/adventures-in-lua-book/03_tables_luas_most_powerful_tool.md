# Lesson 3: Tables — Lua's Most Powerful Tool

## The Cargo Bay Database

Dr. Patel meets you in the ship's data center, surrounded by displays showing lists, inventories, and complex data structures.

"You've learned to store single values in variables," she says. "But what happens when you need to track fifty cargo items? Or twelve crew members? Or sensor readings from a hundred different sources?"

She pulls up a cargo manifest. "You could create fifty different variables. Or you could use a **table**—Lua's way of organizing multiple values into a single structure."

Tables are the foundation of nearly everything in Lua. Master them, and you master the language.

## What Is a Table?

A table is a collection of values stored under one name. You create an empty table with curly braces:

```lua
local cargo = {}
```

This creates a table called `cargo` that starts empty. Now you can add values to it.

## Tables as Lists (Arrays)

The simplest use of a table is as a list of items:

```lua
local crew = {"Coder", "Rex", "Stella", "Amara", "Patel", "Chen"}
```

This creates a table with six items. To access them, use square brackets with a number:

```lua
print(crew[1])  -- Coder
print(crew[2])  -- Rex
print(crew[6])  -- Chen
```

**Important:** Lua counts from 1, not 0. The first item is at position 1.

### Adding and Changing Items

You can add items or change existing ones:

```lua
local supplies = {"food", "water", "fuel"}

supplies[4] = "oxygen"          -- Add a fourth item
supplies[1] = "protein packs"   -- Change the first item

print(supplies[1])  -- protein packs
print(supplies[4])  -- oxygen
```

### Getting the Length

Use the `#` operator to get the number of items in a list:

```lua
local crew = {"Coder", "Rex", "Stella", "Amara"}
print(#crew)  -- 4
```

### Building Lists Dynamically

You can start empty and add items:

```lua
local readings = {}

readings[1] = 98.6
readings[2] = 97.2
readings[3] = 99.1

print(#readings)     -- 3
print(readings[2])   -- 97.2
```

Or use `table.insert()` to add to the end:

```lua
local queue = {}

table.insert(queue, "Request Alpha")
table.insert(queue, "Request Beta")
table.insert(queue, "Request Gamma")

print(queue[1])  -- Request Alpha
print(#queue)    -- 3
```

## Tables as Dictionaries (Key-Value Pairs)

Tables can also map names (keys) to values, like a dictionary or lookup:

```lua
local ship = {
    name = "Starship Lua",
    crew_count = 12,
    fuel = 4750,
    shields_active = true
}
```

Access values using dot notation:

```lua
print(ship.name)          -- Starship Lua
print(ship.crew_count)    -- 12
print(ship.shields_active) -- true
```

Or bracket notation with strings:

```lua
print(ship["name"])       -- Starship Lua
print(ship["fuel"])       -- 4750
```

Both work. Dot notation is cleaner for simple names. Bracket notation works when the key has spaces or special characters, or when the key is stored in a variable:

```lua
local field = "fuel"
print(ship[field])  -- 4750
```

### Adding and Modifying Keys

```lua
local ship = {}

ship.name = "Starship Lua"
ship.fuel = 4750
ship["top speed"] = 9500  -- Key with a space requires brackets

print(ship.name)           -- Starship Lua
print(ship["top speed"])   -- 9500
```

### Removing Keys

Set a key to `nil` to remove it:

```lua
local ship = {name = "Lua", fuel = 4750, cargo = "supplies"}

ship.cargo = nil  -- Remove the cargo key

print(ship.cargo)  -- nil
```

## Mixing Lists and Dictionaries

A single table can have both numbered positions and named keys:

```lua
local mission = {
    -- Named keys
    type = "Exploration",
    priority = "High",

    -- Numbered list of objectives
    [1] = "Scan anomaly",
    [2] = "Collect samples",
    [3] = "Report findings"
}

print(mission.type)    -- Exploration
print(mission[1])      -- Scan anomaly
```

Or more commonly:

```lua
local mission = {
    type = "Exploration",
    priority = "High",
    objectives = {"Scan anomaly", "Collect samples", "Report findings"}
}

print(mission.objectives[1])  -- Scan anomaly
print(mission.objectives[2])  -- Collect samples
```

## Tables Hold Tables

Tables can contain other tables, creating complex data structures:

```lua
local crew_member = {
    name = "Stella",
    role = "Navigator",
    stats = {
        experience = 15,
        accuracy = 98.5,
        missions = 47
    }
}

print(crew_member.name)              -- Stella
print(crew_member.stats.experience)  -- 15
print(crew_member.stats.accuracy)    -- 98.5
```

This is how you build sophisticated data representations—exactly what real ship systems use.

## Common Table Operations

### table.insert and table.remove

```lua
local queue = {"Alpha", "Beta", "Gamma"}

table.insert(queue, "Delta")       -- Add to end: {"Alpha", "Beta", "Gamma", "Delta"}
table.insert(queue, 2, "New")      -- Insert at position 2: {"Alpha", "New", "Beta", "Gamma", "Delta"}

local removed = table.remove(queue, 1)  -- Remove first item
print(removed)  -- Alpha
-- queue is now {"New", "Beta", "Gamma", "Delta"}
```

### Checking if a Key Exists

```lua
local ship = {name = "Lua", fuel = 4750}

if ship.shields then
    print("Shields exist")
else
    print("No shields key")  -- This prints
end
```

### A Note About Dictionary Length

The `#` operator only counts sequential numbered keys (list items). It doesn't count named keys in dictionaries. We'll learn how to count dictionary keys when we cover loops in Lesson 9.

## Tables Are References

When you assign a table to another variable, both variables point to the **same table**:

```lua
local original = {value = 100}
local copy = original

copy.value = 999

print(original.value)  -- 999 (original changed too!)
```

This is different from numbers and strings, which copy their values. With tables, you're sharing the same data.

To make an independent copy, you must copy each element individually—we'll learn how to do this with loops in Lesson 9.

## Quick Reference

| Operation | Syntax | Example |
|-----------|--------|---------|
| Create empty table | `{}` | `local t = {}` |
| Create list | `{a, b, c}` | `local crew = {"Amara", "Rex"}` |
| Create dictionary | `{key = value}` | `local ship = {fuel = 100}` |
| Access by index | `t[n]` | `crew[1]` |
| Access by key | `t.key` or `t["key"]` | `ship.fuel` |
| Get list length | `#t` | `#crew` |
| Add to list | `table.insert(t, val)` | `table.insert(crew, "Kai")` |
| Remove from list | `table.remove(t, i)` | `table.remove(crew, 1)` |
| Delete key | `t.key = nil` | `ship.cargo = nil` |

## What You've Learned

- Tables are Lua's universal data structure
- Use lists (arrays) with numbered indices starting at 1
- Use dictionaries with named keys for structured data
- Tables can contain other tables for complex structures
- The `#` operator gives list length (numbered items only)
- `table.insert` and `table.remove` manage list items
- Tables are passed by reference, not copied

---

Dr. Patel closes the cargo display. "Every complex system on this ship—navigation, inventory, crew management, sensor data—is built on tables. They're not just a data structure; they're how Lua thinks. Get comfortable with them."

---

**Next:** [Lesson 4: Functions](../04_functions/lesson.md)

---

## Challenges

### Challenge 1: Crew Roster
*Practice creating and accessing lists.*

Create a table containing the names of at least 5 crew members. Then:
1. Print the first crew member
2. Print the last crew member (use `#` to find the length)
3. Print how many crew members there are

---

### Challenge 2: Ship Status
*Practice dictionaries with named keys.*

Create a table called `ship_status` with these properties:
- `name`: Your ship's name
- `fuel_percent`: A number from 0-100
- `hull_integrity`: A number from 0-100
- `shields_online`: true or false

Print a status report showing all values.

---

### Challenge 3: Cargo Inventory
*Practice mixed tables and table operations.*

Create a cargo inventory system:
1. Start with an empty `cargo` table
2. Add three items using `table.insert`
3. Print the number of items using `#`
4. Remove the first item using `table.remove`
5. Print the new first item (`cargo[1]`) and the new count

---

### Challenge 4: Crew Database
*Practice nested tables.*

Create a table with three crew members, each having their own table with `name`, `role`, and `experience` (years):

```lua
local crew = {
    {name = "Coder", role = "Captain", experience = 30},
    -- Add 2 more crew members
}
```

Then print the first crew member's name and role using: `crew[1].name` and `crew[1].role`

Print the third crew member's name as well.

---

### Challenge 5: Reference Puzzle
*Understand table references.*

Predict the output, then verify by running:

```lua
local a = {value = 10}
local b = a
b.value = 20
print(a.value)
print(b.value)
```

Explain why both print the same number.

---

# Challenge: Sensor Diagnostics

**XP Reward:** 75
**Estimated Time:** 20 minutes

## The Situation

Dr. Patel in the ship's data center has a problem. The sensor array is returning data in various formats, and she needs a diagnostic program that can analyze different data types from the ship's systems.

"I need you to build a type analyzer," Dr. Patel explains, adjusting her console. "Something that examines different sensor values and reports their types. Then we can calibrate the array properly."

## Objectives

Create a Lua script called `sensor_diagnostics.lua` that:

1. Creates variables of each basic type (number, string, boolean, nil)
2. Uses `type()` to examine and report each variable's type
3. Demonstrates type conversion between strings and numbers
4. Shows Lua's truthiness rules by testing different values

## Requirements

- Create at least one variable of each basic type
- Use `type()` to check and print each type
- Convert a string to a number and a number to a string
- Test at least 4 values for truthiness (including `0` and `""`)

## Expected Output

Your output should look similar to this:

```
=== SENSOR DATA ANALYSIS ===
ship_name is type: string
fuel_level is type: number
shields_online is type: boolean
docking_target is type: nil

=== TYPE CONVERSION TEST ===
Original sensor_reading: "2847" (string)
Converted to number: 2847 (number)
Math works: 2847 + 100 = 2947

Original distance: 15000 (number)
Converted to string: "15000" (string)

=== TRUTHINESS ANALYSIS ===
Testing: true -> truthy
Testing: false -> falsy
Testing: nil -> falsy
Testing: 0 -> truthy (sensors treat 0 as valid data!)
Testing: "" -> truthy (empty string is still a string!)
Testing: "active" -> truthy
```

## Starter Template

```lua
-- Sensor Diagnostics Script
-- Diagnostic tool for ship sensor calibration

-- Create variables of different types
local ship_name = ???       -- a string
local fuel_level = ???      -- a number
local shields_online = ???  -- a boolean
local docking_target = ???  -- nil (no target selected)

-- Examine types
print("=== SENSOR DATA ANALYSIS ===")
-- Use type() to check each variable

-- Type conversion demonstration
print("\n=== TYPE CONVERSION TEST ===")
local sensor_reading = "2847"
-- Convert to number and show it works

local distance = 15000
-- Convert to string and show it works

-- Truthiness test
print("\n=== TRUTHINESS ANALYSIS ===")
-- Test different values and report if truthy or falsy
```

## Hints

<details>
<summary>Hint 1: Using type()</summary>

To print a variable's type:

```lua
print("ship_name is type: " .. type(ship_name))
```

</details>

<details>
<summary>Hint 2: Testing Truthiness</summary>

You can use `if` to test truthiness:

```lua
if value then
    print("truthy")
else
    print("falsy")
end
```

Or use the `and`/`or` idiom:

```lua
local result = value and "truthy" or "falsy"
print("Testing: " .. tostring(value) .. " -> " .. result)
```

</details>

<details>
<summary>Hint 3: Conversion Functions</summary>

```lua
-- String to number
local num = tonumber("2847")

-- Number to string
local str = tostring(15000)
```

</details>

## Bonus Challenges

*For extra practice (no additional XP)*

### Bonus 1: Invalid Conversion
Try to convert a non-numeric string like `"offline"` to a number. What happens? Print the result and its type.

### Bonus 2: Type Reporter
Create a function that takes a value and prints a message based on its type:
- Numbers: "Numerical sensor reading detected"
- Strings: "Text data received"
- Booleans: "Binary status flag"
- Nil: "No data available"

### Bonus 3: Edge Cases
Test these edge cases and report their types:
- An empty string `""`
- The number zero `0`
- A very large number `999999999999`
- A string containing a number `"42"`

## When You're Done

Run your script:
```bash
lua sensor_diagnostics.lua
```

Your diagnostic report should clearly show the types of all variables, demonstrate successful conversions, and reveal Lua's truthiness rules.

---

*Dr. Patel reviews your diagnostic output on her screen. "Excellent work. Now we understand how each data type flows through the system. The sensor array calibration can proceed." She marks your file with a small scientific notation. "Type analysis: Certified."*

---

**Next Lesson:** [Numbers and Math](../04_basic_math/lesson.md)
