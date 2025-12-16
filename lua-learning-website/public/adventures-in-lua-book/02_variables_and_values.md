# Lesson 2: Variables and Values

## The Ship's Data Systems

Captain Coder brings you to the operations deck, where screens display constantly updating numbers: oxygen levels, fuel reserves, crew positions, cargo weights.

"Every one of those numbers comes from somewhere," they say. "The ship tracks thousands of data points. When you write code, you need to track data too—and that means giving it names."

They gesture at a display showing `fuel_remaining: 4750`. "The computer stores that number and refers to it by name. When systems need the fuel level, they ask for `fuel_remaining`. That's a variable."

## What Is a Variable?

When your program needs to remember something—a number, some text, any piece of data—you give it a label and store it. That labeled piece of data is a **variable**.

In Lua, you create a variable using the `local` keyword:

```lua
local fuel_remaining = 4750
```

Now `fuel_remaining` refers to the value `4750`. Anywhere in your code, you can use that name to access or modify the value.

```lua
local fuel_remaining = 4750
print(fuel_remaining)  -- Outputs: 4750
```

The `local` keyword tells Lua "this variable belongs to my program." Always use `local` when creating variables—it's standard practice in Lua and prevents problems as your programs grow.

## Creating Variables

The `=` symbol is called the **assignment operator**. It takes the value on the right and stores it under the name on the left:

```lua
local crew_count = 12
local ship_name = "Starship Lua"
local shields_active = true
```

You now have three variables:
- `crew_count` holds the number `12`
- `ship_name` holds the text `"Starship Lua"`
- `shields_active` holds the boolean `true`

## Using Variables

Once you've created a variable, use its name to retrieve the value:

```lua
local captain = "Coder"
print(captain)      -- Outputs: Coder
print("captain")    -- Outputs: captain (the literal word)
```

Without quotes, Lua looks up the variable. With quotes, Lua treats it as literal text.

Variables work anywhere you could use a value directly:

```lua
local oxygen_level = 98
print("Oxygen at " .. oxygen_level .. "%")
-- Outputs: Oxygen at 98%
```

The `..` operator joins (concatenates) strings together. We'll cover this in depth later.

## Getting Input from the User

So far, we've assigned values directly in the code. But real programs often need data from users. The `io.read()` function pauses your program and waits for the user to type something:

```lua
print("Enter your name:")
local crew_name = io.read()
print("Welcome aboard, " .. crew_name .. "!")
```

When this runs:
1. The program prints "Enter your name:"
2. It waits for the user to type something and press Enter
3. Whatever they typed gets stored in `crew_name`
4. The program continues, printing the welcome message

Here's a complete example:

```lua
print("=== Crew Registration ===")

print("Enter your name:")
local name = io.read()

print("Enter your role:")
local role = io.read()

print()
print("Registration complete!")
print("Name: " .. name)
print("Role: " .. role)
```

Running this program:
```
=== Crew Registration ===
Enter your name:
Alex Chen
Enter your role:
Engineer

Registration complete!
Name: Alex Chen
Role: Engineer
```

**Important:** `io.read()` always returns text (a string), even if the user types numbers. We'll learn how to handle numeric input in a later lesson.

## Changing Values

Variables can change—that's why they're called variables. After creating a variable with `local`, you can assign new values to update it:

```lua
local distance_to_station = 5000
print(distance_to_station)  -- 5000

distance_to_station = 4500
print(distance_to_station)  -- 4500

distance_to_station = distance_to_station - 100
print(distance_to_station)  -- 4400
```

Notice that you only use `local` when first creating the variable. After that, you update it by name without `local`.

That last line reads: "Take the current value of `distance_to_station`, subtract 100, and store the result back in `distance_to_station`."

The ship's actual navigation system works exactly this way—constantly updating position data as you travel.

## Variable Names

Lua has rules about what makes a valid variable name:

**Rules:**
- Must start with a letter or underscore (`_`)
- Can contain letters, numbers, and underscores
- Cannot be a reserved word (`if`, `then`, `end`, `function`, `local`, etc.)
- Case-sensitive (`Fuel` and `fuel` are different variables)

**Valid:**
```lua
local fuel_level = 100
local engineTemp = 350
local _internal_id = "A7X"
local sensor3_reading = 42
```

**Invalid:**
```lua
local 3rd_sensor = 10      -- Can't start with a number
local fuel-level = 100     -- Hyphens not allowed
local end = "done"         -- Reserved word
```

### Naming Conventions

Most Lua programmers use **snake_case** (words separated by underscores):

```lua
local current_speed = 250
local hull_integrity = 100
local is_docked = false
```

Some prefer **camelCase** (capitalize each word after the first):

```lua
local currentSpeed = 250
local hullIntegrity = 100
local isDocked = false
```

Either is fine. Pick one and stick with it.

### Descriptive Names

Good names describe what the variable represents:

```lua
-- Unclear
local x = 4750
local y = 12
local z = true

-- Clear
local fuel_remaining = 4750
local crew_count = 12
local engines_online = true
```

In a program with hundreds of variables, descriptive names save hours of confusion.

## The Value `nil`

Lua has a special value called `nil` that means "nothing" or "no value." If you reference a variable that doesn't exist, you get `nil`:

```lua
print(nonexistent_variable)  -- Outputs: nil
```

You can also set a variable to `nil` explicitly to clear it:

```lua
local current_target = "Station Alpha"
print(current_target)  -- Station Alpha

current_target = nil
print(current_target)  -- nil
```

Be careful with `nil`. Many operations fail or produce unexpected results when given `nil`:

```lua
print("Target: " .. current_target)  -- Error if current_target is nil
```

## Multiple Assignment

Lua lets you assign several variables in one statement:

```lua
local x, y, z = 10, 20, 30
print(x)  -- 10
print(y)  -- 20
print(z)  -- 30
```

This is useful for swapping values without a temporary variable:

```lua
local primary_target = "Alpha"
local secondary_target = "Beta"

-- Swap them
primary_target, secondary_target = secondary_target, primary_target

print(primary_target)    -- Beta
print(secondary_target)  -- Alpha
```

In most languages, swapping requires three lines and an extra variable. Lua does it in one.

## Quick Reference

| Operation | Example |
|-----------|---------|
| Create a variable | `local fuel = 4750` |
| Read a variable | `print(fuel)` |
| Update a variable | `fuel = fuel - 100` |
| Get user input | `local name = io.read()` |
| Multiple assignment | `local x, y = 10, 20` |
| Swap values | `a, b = b, a` |
| No value | `nil` |

## What You've Learned

- Variables store data under names you choose
- Use `local` when creating variables—it's standard Lua practice
- The `=` operator assigns values to variables
- Variables can be updated as your program runs
- `io.read()` gets input from the user and returns it as text
- Names should be descriptive and follow Lua's naming rules
- `nil` represents the absence of a value
- Multiple assignment can set several variables at once

---

Captain Coder points at a flickering sensor readout. "Right now, that display is wrong because someone hardcoded a value instead of using a variable. When the sensor updated, the display didn't. Variables keep your program in sync with changing data." They turn to you. "Set up some data tracking of your own. Name things properly."

---

**Next:** [Lesson 3: Tables](../03_tables/lesson.md)

---

## Challenges

### Challenge 1: Ship Status Tracker
*Practice creating and updating variables.*

Write a program that:
1. Creates a local variable `ship_name` set to your ship's name
2. Creates a local variable `destination` set to "Unknown"
3. Prints both variables
4. Updates `destination` to "Mars Station"
5. Prints the destination again to show it changed

Expected output (if your ship is "Nova"):
```
Ship: Nova
Destination: Unknown
Destination: Mars Station
```

---

### Challenge 2: Cargo Manifest
*Practice multiple variables with descriptive names.*

The cargo bay contains three items. Create local variables to track them and print a summary:

```
=== Cargo Manifest ===
Medical supplies: 50 units
Food rations: 200 units
Fuel cells: 30 units
```

Requirements:
- Use `local` for all variables
- Use descriptive variable names
- Each cargo type should have its own variable
- Print the formatted output shown above

---

### Challenge 3: Crew Transfer
*Practice variable swapping.*

Two crew members are switching stations. Write a program that:
1. Creates local variables `station_a` and `station_b` with initial crew names
2. Prints who is at each station
3. Swaps them using Lua's multiple assignment
4. Prints the new assignments

Example output:
```
Before swap:
Station A: Chen
Station B: Stella

After swap:
Station A: Stella
Station B: Chen
```

---

### Challenge 4: System Status Board
*Practice creating and displaying multiple variables.*

Write a program that tracks three ship systems:
- `life_support` (a percentage)
- `shields` (a percentage)
- `engines` (on/off as a boolean)

Print a status report showing all three values.

Requirements:
- Use `local` for all variables
- Include descriptive comments explaining each variable
- Format the output clearly (e.g., "Life Support: 98%")

---

# Challenge: Equipment Loadout

**XP Reward:** 75
**Estimated Time:** 20 minutes

## The Situation

Quartermaster Chen runs the equipment bay on the *Starship Lua*. Every crew member receives a starter kit, and Chen needs you to create a tracking program for your issued gear.

"I need you to log your equipment assignment," Chen says, tapping a datapad. "Name, health status, credit balance, and whether you've received your EVA certification. Store it properly so the ship's systems can track it."

## Objectives

Create a Lua script called `loadout.lua` that:

1. Creates variables for your name, health, credits, and EVA certification status
2. Prints out a formatted equipment status display
3. Simulates using credits to purchase an item (reduce credits)
4. Prints the updated status

## Requirements

- Use meaningful variable names
- Include at least one string, one number, and one boolean variable
- Print a clear, formatted status display
- Modify at least one variable and show the change

## Expected Output

Your output should look similar to this (with your own character name):

```
=== EQUIPMENT STATUS ===
Crew Member: Chen
Health: 100%
Credits: 500
EVA Certified: true
========================

Purchasing emergency medkit for 75 credits...

=== UPDATED STATUS ===
Crew Member: Chen
Health: 100%
Credits: 425
EVA Certified: true
Has Medkit: true
======================
```

## Starter Template

Here's a skeleton to get you started:

```lua
-- Equipment Loadout Script
-- Your name here, Date

-- Initial status
local crew_name = "???"
local health = ???
local credits = ???
local eva_certified = ???

-- Display initial status
print("=== EQUIPMENT STATUS ===")
-- Add your print statements here

-- Simulate a purchase
-- Hint: Subtract from credits, add a new variable

-- Display updated status
print("=== UPDATED STATUS ===")
-- Add your print statements here
```

## Hints

<details>
<summary>Hint 1: Boolean Values</summary>

Boolean values are `true` or `false` (no quotes):

```lua
eva_certified = true
has_medkit = false
```

When you print them, they display as `true` or `false`.

</details>

<details>
<summary>Hint 2: Combining Strings</summary>

To print a label with a variable value, use Lua's concatenation operator `..`:

```lua
print("Health: " .. health .. "%")
```

The `..` joins strings together. Numbers are automatically converted.

</details>

<details>
<summary>Hint 3: Modifying Variables</summary>

To reduce credits by 75:

```lua
credits = credits - 75
```

To add a new item, just create a new variable:

```lua
has_medkit = true
```

</details>

## Bonus Challenges

*For extra practice (no additional XP)*

### Bonus 1: Multiple Items
Add more equipment to your loadout (a scanner, tools, ration packs) and track them all.

### Bonus 2: Health Change
Simulate taking damage during a mission: reduce health by some amount and show the change.

### Bonus 3: Value Swap
Create two equipment slots and use Lua's multiple assignment to swap their contents. Print before and after.

```lua
slot_1 = "Scanner"
slot_2 = "Toolkit"
-- Swap them
-- Print the result
```

## When You're Done

Run your script:
```bash
lua loadout.lua
```

You should see your initial equipment status, then your updated status after the simulated purchase.

---

*Quartermaster Chen reviews your program on his datapad. "Good tracking system. Keep it updated as you acquire gear—you never know when you'll need to check your inventory during a mission." He stamps your file with a small gear-shaped seal. "Equipment assignment: Approved."*

---

**Next Lesson:** [Tables](../03_tables/lesson.md)
