# Lesson 8: Advanced Decisions

## The Autopilot Logic Center

First Officer Kai meets you again in the ship's logic center. The screens now display more complex flowcharts—multiple branching paths, compound conditions, and cascading decision trees.

"In Lesson 5, you learned to make decisions with `if` and `else` based on string comparisons," Kai says. "But real ship systems need more power. What if shields are low AND fuel is critical? What if we need to check five different status levels, not just two? Today you'll learn to compare numbers, chain multiple conditions, and combine checks with logical operators."

Kai pulls up a diagnostic panel. "Let's expand your toolkit."

## Numeric Comparisons

In Lesson 5, you used `==` and `~=` to compare strings. But numbers need more options—is this value greater than a threshold? Less than a limit? Here are all the comparison operators:

| Operator | Meaning | Example |
|----------|---------|---------|
| `==` | Equal to | `x == 5` |
| `~=` | Not equal to | `x ~= 5` |
| `<` | Less than | `x < 5` |
| `>` | Greater than | `x > 5` |
| `<=` | Less than or equal | `x <= 5` |
| `>=` | Greater than or equal | `x >= 5` |

**Important:** Lua uses `~=` for "not equal," unlike many languages that use `!=`.

```lua
local shields = 85

if shields >= 90 then
    print("Shields optimal")
end

if shields >= 50 then
    print("Shields operational")
end
```

Output:
```
Shields operational
```

## Quick Recap: If-Else

You learned `if` and `else` in Lesson 5. Here's a quick reminder with numeric comparison:

```lua
local shields = 85

if shields >= 50 then
    print("Shields operational")
else
    print("Warning: Shields critical")
end
```

Now let's learn something new: handling more than two options.

## If-Elseif-Else: Multiple Paths

For more than two options, use `elseif`:

```lua
local fuel_percent = 45

if fuel_percent >= 80 then
    print("Fuel: Excellent")
elseif fuel_percent >= 50 then
    print("Fuel: Good")
elseif fuel_percent >= 25 then
    print("Fuel: Low")
else
    print("Fuel: CRITICAL")
end
```

Output:
```
Fuel: Low
```

Lua checks each condition in order and executes the first one that's true:
1. Is `fuel_percent >= 80`? No (45 < 80), continue.
2. Is `fuel_percent >= 50`? No (45 < 50), continue.
3. Is `fuel_percent >= 25`? Yes (45 >= 25)! Execute this block.

Only one block runs—the first whose condition is true.

## Logical Operators

Combine conditions using logical operators:

### `and` — Both Must Be True

```lua
local fuel = 60
local shields = 80

if fuel > 50 and shields > 50 then
    print("Systems ready for departure")
end
```

### `or` — At Least One Must Be True

```lua
local is_captain = false
local is_first_officer = true

if is_captain or is_first_officer then
    print("Bridge access granted")
end
```

### `not` — Reverses True/False

```lua
local docked = false

if not docked then
    print("Ship is in transit")
end
```

### Combining Operators

```lua
local fuel = 75
local shields = 90
local engines_online = true

if fuel > 50 and shields > 50 and engines_online then
    print("All systems go!")
end
```

Use parentheses for clarity in complex conditions:

```lua
if (fuel < 20 or shields < 20) and not docked then
    print("ALERT: Return to station immediately!")
end
```

## Nested If Statements

You can put if statements inside other if statements:

```lua
local has_clearance = true
local security_level = 3

if has_clearance then
    if security_level >= 5 then
        print("Full access granted")
    else
        print("Limited access granted")
    end
else
    print("Access denied")
end
```

Often, nested conditions can be simplified with `and`:

```lua
-- Equivalent to the nested version
if has_clearance and security_level >= 5 then
    print("Full access granted")
elseif has_clearance then
    print("Limited access granted")
else
    print("Access denied")
end
```

## Truthiness in Lua

In Lua, only two values are considered "falsy" (evaluate to false):
- `false`
- `nil`

Everything else is "truthy" (evaluates to true), including:
- `0` (zero)
- `""` (empty string)
- Empty tables

```lua
local value = 0
if value then
    print("Zero is truthy in Lua!")  -- This prints
end

value = ""
if value then
    print("Empty string is truthy too!")  -- This prints
end
```

This is different from many other languages, so be careful!

## Common Patterns

### Checking for nil

```lua
local target = nil

if target ~= nil then
    print("Target: " .. target)
else
    print("No target selected")
end

-- Shorter version using truthiness
if target then
    print("Target: " .. target)
else
    print("No target selected")
end
```

### Range Validation

```lua
io.write("Enter shield power (0-100): ")
local power = tonumber(io.read())

if power == nil then
    print("Invalid: not a number")
elseif power < 0 or power > 100 then
    print("Invalid: out of range")
else
    print("Shield power set to " .. power .. "%")
end
```

### Multiple Conditions with Same Action

```lua
local status = "yellow"

if status == "red" or status == "yellow" then
    print("Alert: Elevated threat level")
end
```

## The And-Or Idiom

Lua doesn't have a ternary operator (`?:`), but you can use `and`/`or`:

```lua
local shields = 30
local status = (shields > 50) and "Active" or "Weak"
print("Shield status: " .. status)  -- Shield status: Weak
```

How it works:
- If condition is true: `true and "Active"` returns `"Active"`
- If condition is false: `false and "Active"` returns `false`, then `false or "Weak"` returns `"Weak"`

**Caution:** This doesn't work if the "true" value itself is `false` or `nil`.

## Practical Example: Alert System

```lua
-- Ship Alert System

local function check_systems(fuel, shields, hull, life_support)
    local alert_level = "green"
    local message = "All systems nominal"

    -- Check each system, escalating alert level as needed
    if fuel < 20 or shields < 30 or hull < 50 or life_support < 80 then
        alert_level = "red"
        if fuel < 20 then
            message = "CRITICAL: Fuel depleted"
        elseif shields < 30 then
            message = "CRITICAL: Shields failing"
        elseif hull < 50 then
            message = "CRITICAL: Hull damage"
        else
            message = "CRITICAL: Life support compromised"
        end
    elseif fuel < 50 or shields < 60 then
        alert_level = "yellow"
        if fuel < 50 and shields < 60 then
            message = "Warning: Fuel low, shields weakened"
        elseif fuel < 50 then
            message = "Warning: Fuel low"
        else
            message = "Warning: Shields weakened"
        end
    end

    return alert_level, message
end

-- Test the system
local level, msg = check_systems(45, 55, 100, 100)
print("Alert Level: " .. string.upper(level))
print("Status: " .. msg)
```

Output:
```
Alert Level: YELLOW
Status: Warning: Fuel low, shields weakened
```

## Quick Reference

### If Structures

```lua
-- Simple if
if condition then
    -- code
end

-- If-else
if condition then
    -- code if true
else
    -- code if false
end

-- If-elseif-else
if condition1 then
    -- code
elseif condition2 then
    -- code
else
    -- code
end
```

### Operators

| Comparison | Meaning |
|------------|---------|
| `==` | Equal |
| `~=` | Not equal |
| `<` | Less than |
| `>` | Greater than |
| `<=` | Less or equal |
| `>=` | Greater or equal |

| Logical | Meaning |
|---------|---------|
| `and` | Both true |
| `or` | At least one true |
| `not` | Opposite |

## What You've Learned

- `if` statements execute code conditionally
- Use `else` for an alternative path
- Use `elseif` for multiple conditions
- Comparison operators: `==`, `~=`, `<`, `>`, `<=`, `>=`
- Logical operators: `and`, `or`, `not`
- Only `false` and `nil` are falsy in Lua
- The and-or idiom can replace simple ternary operations

---

First Officer Kai closes the diagnostic display. "Conditional logic is what separates a script from a program. With conditionals, your code can adapt, respond, and make intelligent decisions. But sometimes you need to make the same decision many times—that's where loops come in."

---

**Next:** [Lesson 9: Loops](../09_loops/lesson.md)

---

## Challenges

### Challenge 1: System Status Checker
*Practice basic if/else.*

Write a program that checks a `shield_level` variable:
- 80 or above: "Shields: Optimal"
- 50-79: "Shields: Operational"
- 20-49: "Shields: Damaged"
- Below 20: "Shields: CRITICAL"

---

### Challenge 2: Launch Authorization
*Practice combining conditions.*

A ship can launch only if ALL conditions are met:
- `fuel >= 50`
- `crew_aboard == true`
- `systems_check == "passed"`
- `docking_clamps == false` (not engaged)

Write a program that checks these conditions and prints "Launch authorized" or "Launch denied" with reasons.

---

### Challenge 3: Priority Dispatcher
*Practice elseif chains.*

Incoming messages have priority levels 1-5. Write a program that:
- Priority 1: "EMERGENCY - All stations alert"
- Priority 2: "URGENT - Bridge notification"
- Priority 3: "HIGH - Department heads"
- Priority 4: "NORMAL - Standard routing"
- Priority 5: "LOW - Queue for batch processing"

---

### Challenge 4: Access Control System
*Practice nested conditions and validation.*

Write an access control system that:
1. Checks if user has a valid ID (not nil)
2. If valid, checks clearance level (1-5)
3. Areas require different clearance:
   - Engineering: level 2+
   - Bridge: level 3+
   - Armory: level 4+
   - Command Center: level 5

Print appropriate access messages.

---

### Challenge 5: Alert Level Calculator
*Practice complex logic.*

Write a function that determines overall alert level based on:
- If ANY system is below 20%: RED
- If ANY system is below 50% but none below 20%: YELLOW
- Otherwise: GREEN

Test with: `fuel = 45`, `shields = 60`, `hull = 80`

---

# Challenge: Supply Requisition Console

**XP Reward:** 100
**Estimated Time:** 25 minutes

## The Situation

Quartermaster Chen has built a basic supply requisition terminal, but the program that runs it needs work. Crew members use it to request items from ship stores.

"I need a console that shows the inventory, takes orders, and dispenses the right supplies," Chen explains, gesturing at the terminal. "It should show what each item does before they take it. We need proper inventory management."

He hands you the current supply manifest:

| Code | Item | Cost | Description |
|------|------|------|-------------|
| 1 | Emergency Medkit | 25 credits | Restores 50 health |
| 2 | Power Cell | 30 credits | Powers equipment for 8 hours |
| 3 | Oxygen Tank | 45 credits | 4 hours of EVA oxygen |
| 4 | Repair Kit | 40 credits | Fixes minor equipment damage |
| 5 | Ration Pack | 15 credits | Standard meal for one day |
| 6 | Mystery Crate | 50 credits | Random salvage item! |

## Objectives

Create a Lua script called `supply_console.lua` that:

1. Displays a welcome message and menu of supplies
2. Asks the user which item they want (by number)
3. Displays the item's details (name, cost, description)
4. Asks for confirmation before "dispensing"
5. Uses a **table-based approach** for storing supply data (not just if-elseif)

## Requirements

- Store supply data in a table structure
- Handle invalid input (numbers outside 1-6, non-numbers)
- Display formatted output with costs and descriptions
- Ask for confirmation (yes/no) before completing requisition

## Expected Interaction

```
================================
   SUPPLY REQUISITION CONSOLE
================================

Available Supplies:
  1. Emergency Medkit  - 25 credits
  2. Power Cell        - 30 credits
  3. Oxygen Tank       - 45 credits
  4. Repair Kit        - 40 credits
  5. Ration Pack       - 15 credits
  6. Mystery Crate     - 50 credits

Enter item number (1-6): 3

--- Oxygen Tank ---
Cost:        45 credits
Description: 4 hours of EVA oxygen

Confirm requisition? (yes/no): yes

*DISPENSING*
You received: Oxygen Tank!
Requisition complete.

================================
   Thank you for using Supply Console
================================
```

### Invalid Input Example:
```
Enter item number (1-6): 9

That item doesn't exist! Please choose 1-6.
```

### Cancelled Requisition:
```
Confirm requisition? (yes/no): no

Requisition cancelled. Return when you need supplies.
```

## Starter Template

```lua
-- Supply Requisition Console
-- Starship Lua Quartermaster Station

-- Define supplies using a table
local supplies = {
    [1] = {
        name = "Emergency Medkit",
        cost = 25,
        description = "Restores 50 health"
    },
    [2] = {
        name = "Power Cell",
        cost = 30,
        description = "Powers equipment for 8 hours"
    },
    -- Add the rest...
}

-- Display header
print("================================")
print("   SUPPLY REQUISITION CONSOLE")
print("================================")
print()

-- Display menu
print("Available Supplies:")
-- Loop through or manually print each supply
-- Format: "  1. Emergency Medkit  - 25 credits"

print()
io.write("Enter item number (1-6): ")
local choice = tonumber(io.read())

-- Validate choice
-- Hint: Check if choice is nil or not in supplies table

-- Display item details
-- Hint: Access supplies[choice].name, .cost, .description

-- Ask for confirmation
io.write("\nConfirm requisition? (yes/no): ")
local confirm = io.read()

-- Process requisition
-- Hint: Check if confirm == "yes"

print()
print("================================")
print("   Thank you for using Supply Console")
print("================================")
```

## Hints

<details>
<summary>Hint 1: Table of Tables Structure</summary>

Each supply item is a table inside the main table:

```lua
local supplies = {
    [1] = { name = "Emergency Medkit", cost = 25, description = "Restores 50 health" },
    [2] = { name = "Power Cell", cost = 30, description = "Powers equipment for 8 hours" },
    -- etc.
}

-- Access like this:
local item = supplies[1]
print(item.name)        -- Emergency Medkit
print(item.cost)        -- 25
print(item.description) -- Restores 50 health
```

</details>

<details>
<summary>Hint 2: Checking Valid Choice</summary>

```lua
if choice == nil or supplies[choice] == nil then
    print("That item doesn't exist! Please choose 1-6.")
    -- Handle error (maybe return or set a flag)
else
    -- Valid choice, proceed
    local item = supplies[choice]
end
```

</details>

<details>
<summary>Hint 3: Displaying Menu</summary>

You can manually print each line:
```lua
print("  1. " .. supplies[1].name .. " - " .. supplies[1].cost .. " credits")
```

Or use string.format for alignment:
```lua
print(string.format("  %d. %-18s - %d credits", 1, supplies[1].name, supplies[1].cost))
```

</details>

<details>
<summary>Hint 4: Confirmation Check</summary>

```lua
if confirm == "yes" then
    print("\n*DISPENSING*")
    print("You received: " .. item.name .. "!")
    print("Requisition complete.")
else
    print("\nRequisition cancelled. Return when you need supplies.")
end
```

</details>

## Bonus Challenges

*For extra practice (no additional XP)*

### Bonus 1: Credit Balance
Start the user with 100 credits. Check if they can afford the item before confirming. Show their remaining credits after requisition.

### Bonus 2: Mystery Crate
When item 6 (Mystery Crate) is requisitioned, randomly select one of the other items and reveal what they got.

### Bonus 3: Quantity Selection
After selecting an item, ask how many they want. Calculate and display the total cost.

### Bonus 4: Receipt
After requisition, display a formatted receipt with:
- Item name
- Unit cost
- Quantity
- Total cost
- Transaction ID (random number)

## When You're Done

Run your script:
```bash
lua supply_console.lua
```

Test these scenarios:
- Request a valid item (confirm yes)
- Select an item but cancel (confirm no)
- Enter an invalid number (like 0 or 9)
- Enter non-numeric input (like "abc")

---

*Quartermaster Chen watches as you demonstrate the console. He tests each option, watching supplies dispense correctly and invalid inputs get rejected. "Perfect! Now I don't have to manually track every requisition." He pulls a Power Cell from the shelf and hands it to you. "On the house—for your excellent work."*

---

**Next Lesson:** [Loops](../08_loops/lesson.md)
