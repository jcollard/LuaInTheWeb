# Lesson 4: Functions

## The Engineering Workshop

Chief Engineer Zara welcomes you to her domain—a workshop filled with modular components, repair drones, and diagnostic equipment. Every system on the ship is built from smaller, reusable parts.

"See that repair drone?" Zara points to a small robot assembling a circuit board. "It doesn't rebuild every component from scratch each time. It has procedures—sequences of steps it can repeat whenever needed. That's exactly what functions are in programming."

She pulls up a schematic. "A function is a named block of code you can run whenever you want. Write it once, use it anywhere. Let me show you."

## Defining Functions

A function packages code into a reusable unit:

```lua
local function greet_crew()
    print("=== STARSHIP LUA ===")
    print("Welcome aboard, crew member!")
    print("====================")
end
```

This creates a function named `greet_crew`. The code inside won't run until you **call** the function:

```lua
greet_crew()
```

Output:
```
=== STARSHIP LUA ===
Welcome aboard, crew member!
====================
```

### Function Structure

```lua
local function name()
    -- code to execute
end
```

- `local function` — declares a local function (always use `local`)
- `name` — the function's identifier (follows variable naming rules)
- `()` — parentheses (required, even when empty)
- `end` — marks the end of the function body

### Calling Functions Multiple Times

Once defined, a function can be called as many times as needed:

```lua
local function sound_alert()
    print("*** ALERT ***")
end

sound_alert()
sound_alert()
sound_alert()
```

Output:
```
*** ALERT ***
*** ALERT ***
*** ALERT ***
```

Write once, use anywhere. That's the power of functions.

## Functions with Parameters

Functions become truly useful when they can work with different data. **Parameters** let you pass values into a function:

```lua
local function greet(name)
    print("Welcome aboard, " .. name .. "!")
end

greet("Chen")
greet("Stella")
greet("Rex")
```

Output:
```
Welcome aboard, Chen!
Welcome aboard, Stella!
Welcome aboard, Rex!
```

The parameter `name` acts like a variable inside the function, but its value comes from the call.

### Multiple Parameters

Functions can accept multiple parameters, separated by commas:

```lua
local function log_entry(timestamp, message)
    print("[" .. timestamp .. "] " .. message)
end

log_entry("14:30", "Engines online")
log_entry("14:35", "Navigation calibrated")
log_entry("14:42", "Ready for departure")
```

Output:
```
[14:30] Engines online
[14:35] Navigation calibrated
[14:42] Ready for departure
```

### Parameter Order Matters

When calling a function, arguments are matched to parameters by position:

```lua
local function report_position(ship, sector, status)
    print(ship .. " in " .. sector .. ": " .. status)
end

report_position("Lua", "Sector 7-G", "operational")
-- Output: Lua in Sector 7-G: operational

-- Wrong order produces wrong output!
report_position("Sector 7-G", "Lua", "operational")
-- Output: Sector 7-G in Lua: operational
```

## Return Values

Functions can send values back using `return`:

```lua
local function calculate_fuel_cost(distance)
    local cost = distance * 0.5
    return cost
end

local trip_cost = calculate_fuel_cost(1000)
print("Fuel needed: " .. trip_cost .. " units")
-- Output: Fuel needed: 500.0 units
```

The `return` statement:
1. Sends a value back to where the function was called
2. Immediately exits the function

### Using Return Values Directly

You can use returned values directly in expressions:

```lua
local function double(value)
    return value * 2
end

print(double(5))          -- 10
print(double(double(3)))  -- 12 (double 3 = 6, double 6 = 12)

local result = double(10) + double(20)
print(result)  -- 60
```

### Returning Multiple Values

Lua functions can return more than one value:

```lua
local function get_coordinates()
    local x = 150
    local y = 200
    local z = 50
    return x, y, z
end

local px, py, pz = get_coordinates()
print("Position: " .. px .. ", " .. py .. ", " .. pz)
-- Output: Position: 150, 200, 50
```

### Functions Without Return

If a function has no `return`, it returns `nil`:

```lua
local function say_hello()
    print("Hello!")
end

local result = say_hello()  -- Prints "Hello!"
print(result)               -- nil
```

## Functions That Create Tables

One powerful use of functions is creating configured tables—like a factory producing standardized parts:

```lua
local function create_crew_member(name, role)
    local member = {
        name = name,
        role = role,
        shift = "day",
        active = true
    }
    return member
end

local chen = create_crew_member("Chen", "Navigator")
local rex = create_crew_member("Rex", "Engineer")

print(chen.name .. " - " .. chen.role)  -- Chen - Navigator
print(rex.name .. " - " .. rex.role)    -- Rex - Engineer
```

Each call creates a new, independent table with the same structure but different data.

### Building Complex Objects

```lua
local function create_ship(name, class, crew_capacity)
    local ship = {
        name = name,
        class = class,
        crew_capacity = crew_capacity,
        fuel = 5000,
        shields = 100,
        cargo = {}
    }
    return ship
end

local starship = create_ship("Lua", "Explorer", 50)
print(starship.name .. " can hold " .. starship.crew_capacity .. " crew")
-- Output: Lua can hold 50 crew

local shuttle = create_ship("Pod Alpha", "Shuttle", 4)
print(shuttle.name .. " can hold " .. shuttle.crew_capacity .. " crew")
-- Output: Pod Alpha can hold 4 crew
```

## Functions for User Interaction

Functions are perfect for standardizing how you get input from users. Remember `io.read()` from Lesson 2? Let's wrap it in helpful functions:

```lua
local function ask(prompt)
    io.write(prompt)
    local answer = io.read()
    return answer
end

local name = ask("Enter your name: ")
local rank = ask("Enter your rank: ")
print("Welcome, " .. rank .. " " .. name)
```

Sample run:
```
Enter your name: Patel
Enter your rank: Lieutenant
Welcome, Lieutenant Patel
```

### Prompting for Multiple Fields

```lua
local function register_crew()
    local member = {}

    io.write("Name: ")
    member.name = io.read()

    io.write("Role: ")
    member.role = io.read()

    io.write("Years of experience: ")
    member.experience = io.read()

    return member
end

print("=== Crew Registration ===")
local new_recruit = register_crew()
print()
print("Registered: " .. new_recruit.name)
print("Role: " .. new_recruit.role)
print("Experience: " .. new_recruit.experience .. " years")
```

Sample run:
```
=== Crew Registration ===
Name: Amara
Role: Communications
Years of experience: 8

Registered: Amara
Role: Communications
Experience: 8 years
```

## Scope: Where Variables Live

Variables declared inside a function are **local to that function**:

```lua
local function test()
    local secret = "hidden"
    print("Inside: " .. secret)
end

test()  -- Prints: Inside: hidden
-- print(secret)  -- ERROR: secret doesn't exist here
```

This is called **scope**. The variable `secret` only exists inside `test()`.

### Parameters Are Local Too

Function parameters are also local to the function:

```lua
local function announce(message)
    print("Announcement: " .. message)
end

announce("All hands on deck")
-- print(message)  -- ERROR: message doesn't exist outside
```

### Accessing Outer Variables

Functions can read variables from the surrounding code:

```lua
local ship_name = "Starship Lua"

local function announce(message)
    print("[" .. ship_name .. "] " .. message)
end

announce("Departure in 5 minutes")
-- Output: [Starship Lua] Departure in 5 minutes
```

But be careful—modifying outer variables from inside functions can make code hard to follow. Prefer passing data through parameters and returning results.

## Organizing with Functions

Functions help structure your programs. Compare these two versions:

### Without Functions (Hard to Follow)

```lua
print("=== MISSION BRIEFING ===")
print("Ship: Starship Lua")
print("========================")
print()
print("Objective 1: Survey planet")
io.write("Enter planet name: ")
local planet = io.read()
print("Surveying: " .. planet)
print()
print("=== MISSION BRIEFING ===")
print("Ship: Starship Lua")
print("========================")
print()
print("Objective 2: Collect samples")
io.write("Enter sample count: ")
local samples = io.read()
print("Collecting " .. samples .. " samples")
```

### With Functions (Clear and Reusable)

```lua
local function print_header()
    print("=== MISSION BRIEFING ===")
    print("Ship: Starship Lua")
    print("========================")
    print()
end

local function get_input(prompt)
    io.write(prompt)
    return io.read()
end

print_header()
print("Objective 1: Survey planet")
local planet = get_input("Enter planet name: ")
print("Surveying: " .. planet)
print()

print_header()
print("Objective 2: Collect samples")
local samples = get_input("Enter sample count: ")
print("Collecting " .. samples .. " samples")
```

Functions make code:
- **Shorter** — no repeated code
- **Clearer** — named functions explain intent
- **Maintainable** — change one place, affects all uses

## Practical Example: Ship Registry

Let's combine everything into a complete example:

```lua
-- Function to create a ship record
local function create_ship(name, ship_class, captain)
    local ship = {
        name = name,
        class = ship_class,
        captain = captain,
        fuel = 5000,
        status = "docked"
    }
    return ship
end

-- Function to display ship info
local function display_ship(ship)
    print("Ship: " .. ship.name)
    print("Class: " .. ship.class)
    print("Captain: " .. ship.captain)
    print("Fuel: " .. ship.fuel .. " units")
    print("Status: " .. ship.status)
end

-- Function to get text input
local function ask(prompt)
    io.write(prompt)
    return io.read()
end

-- Main program
print("=== SHIP REGISTRY ===")
print()

local ship_name = ask("Enter ship name: ")
local ship_class = ask("Enter ship class: ")
local captain_name = ask("Enter captain name: ")

local new_ship = create_ship(ship_name, ship_class, captain_name)

print()
print("=== REGISTRATION COMPLETE ===")
display_ship(new_ship)
```

Sample run:
```
=== SHIP REGISTRY ===

Enter ship name: Nova
Enter ship class: Frigate
Enter captain name: Vega

=== REGISTRATION COMPLETE ===
Ship: Nova
Class: Frigate
Captain: Vega
Fuel: 5000 units
Status: docked
```

## Quick Reference

### Defining Functions

```lua
-- No parameters, no return
local function name()
    -- code
end

-- With parameters
local function name(param1, param2)
    -- code using param1, param2
end

-- With return value
local function name(param)
    return result
end

-- Multiple return values
local function name()
    return value1, value2, value3
end
```

### Calling Functions

```lua
name()                    -- No arguments
name(value)               -- One argument
name(val1, val2)          -- Multiple arguments
local x = name()          -- Capture return value
local a, b = name()       -- Capture multiple returns
```

## What You've Learned

- Functions are reusable blocks of code
- `local function name()` defines a function
- Parameters let functions receive data
- `return` sends values back to the caller
- Functions can return multiple values
- Functions can create and return tables
- Variables inside functions are local (scoped)
- Functions help organize and simplify code

---

Chief Engineer Zara closes her schematic. "Everything complex is built from simpler parts. Functions let you create those parts, name them, and assemble them into larger systems. Now your programs can have the same modular design as a starship."

---

**Next:** [Lesson 5: Basic Decisions](../05_basic_decisions/lesson.md)

---

## Challenges

### Challenge 1: Greeting Generator
*Practice basic function definition.*

Write a function called `mission_greeting` that prints:
```
================================
Welcome to your mission briefing
================================
```

Call it twice to test that it works repeatedly.

---

### Challenge 2: Status Reporter
*Practice parameters and return values.*

Write a function `format_status` that:
- Takes two parameters: `system_name` and `status`
- Returns a formatted string: "[system_name]: status"
- Example: `format_status("Engines", "Online")` returns `"[Engines]: Online"`

Test by calling it with different systems and printing the results.

---

### Challenge 3: Crew Card Creator
*Practice creating tables with functions.*

Write a function `create_crew_card` that:
- Takes parameters: `name`, `rank`, `department`
- Returns a table with those fields plus `clearance = 1`

Create two crew members and print their names and departments.

---

### Challenge 4: Data Entry System
*Practice functions with user input.*

Write three functions:
1. `ask_text(prompt)` — displays prompt, returns text input
2. `display_separator()` — prints a line of 30 dashes
3. `create_mission_log(mission, location, notes)` — returns a table with those fields

Use these functions to:
1. Print a separator
2. Ask the user for mission name, location, and notes
3. Create a mission log table
4. Print a separator
5. Display the mission log contents

---

### Challenge 5: Ship Factory
*Practice combining multiple concepts.*

Write a program with these functions:
1. `get_input(prompt)` — prompts and returns user input
2. `create_ship(name, class)` — creates a ship table with name, class, fuel=5000, crew={}
3. `add_crew_member(ship, member_name)` — adds a name to the ship's crew table
4. `ship_report(ship)` — prints ship name, class, fuel, and crew count

Use these functions to:
1. Ask for a ship name and class
2. Create the ship
3. Ask for and add 3 crew member names
4. Display the ship report

Hint: To add to a table, use `table.insert(ship.crew, member_name)` or `ship.crew[#ship.crew + 1] = member_name`
