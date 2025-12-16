# Lesson 5: Basic Decisions

## The Navigation Bridge

First Officer Kai stands at the main navigation console, star charts flickering across multiple screens. Each chart shows branching paths—different routes to the same destination, each with its own risks and rewards.

"Space travel is all about choices," Kai says. "Do we take the shorter route through the asteroid field, or the longer safe passage? Do we investigate that distress signal, or continue to our destination? Every decision changes what happens next."

Kai pulls up a simple navigation program. "Your programs need to make decisions too. Based on what the user chooses, your code takes different paths. This is conditional logic—the foundation of interactive programs."

## True and False: Booleans

Before we can make decisions, we need to understand how Lua represents truth.

Lua has a special type called **boolean** with exactly two values:

```lua
local engines_online = true
local shields_damaged = false

print(engines_online)   -- true
print(shields_damaged)  -- false
```

These aren't strings—they're a distinct type:

```lua
print(type(true))   -- boolean
print(type(false))  -- boolean
print(type("true")) -- string (this is text, not a boolean!)
```

Booleans answer yes/no questions:
- Is the door locked? `true` or `false`
- Has the user logged in? `true` or `false`
- Is the cargo bay empty? `true` or `false`

## The If Statement

The `if` statement executes code only when something is true:

```lua
local shields_active = true

if shields_active then
    print("Shields are protecting the ship")
end
```

Output:
```
Shields are protecting the ship
```

If the condition is `false`, the code is skipped:

```lua
local shields_active = false

if shields_active then
    print("Shields are protecting the ship")  -- This won't print
end

print("Navigation check complete")  -- This always prints
```

Output:
```
Navigation check complete
```

### Structure of If

```lua
if condition then
    -- code runs only when condition is true
end
```

- `if` — starts the decision
- `condition` — something that's true or false
- `then` — marks the start of conditional code
- `end` — marks the end of the if block

## Comparing Strings

The most common way to make decisions is by comparing values. For strings, use `==` to check if two strings match:

```lua
local command = "launch"

if command == "launch" then
    print("Initiating launch sequence!")
end
```

Output:
```
Initiating launch sequence!
```

### Getting Choices from the User

Combined with `io.read()`, you can respond to user input:

```lua
io.write("Enter command: ")
local command = io.read()

if command == "status" then
    print("All systems operational")
end
```

Sample run:
```
Enter command: status
All systems operational
```

### Case Sensitivity

String comparison is **case-sensitive**—uppercase and lowercase matter:

```lua
local password = "Alpha7"

if password == "alpha7" then
    print("Access granted")  -- Won't print!
end

if password == "Alpha7" then
    print("Access granted")  -- This prints
end
```

To compare regardless of case, convert both to the same case:

```lua
io.write("Enter password: ")
local input = io.read()

if string.lower(input) == "alpha7" then
    print("Access granted")
end
```

Now "Alpha7", "ALPHA7", and "alpha7" all work.

## If-Else: Two Paths

What if you want to do something different when the condition is false? Use `else`:

```lua
io.write("Enter destination (mars/venus): ")
local destination = io.read()

if destination == "mars" then
    print("Setting course for Mars")
    print("Estimated travel time: 7 months")
else
    print("Unknown destination")
end
```

Sample runs:
```
Enter destination (mars/venus): mars
Setting course for Mars
Estimated travel time: 7 months
```

```
Enter destination (mars/venus): jupiter
Unknown destination
```

### Structure of If-Else

```lua
if condition then
    -- runs when condition is true
else
    -- runs when condition is false
end
```

Only ONE of the two blocks ever runs—never both, never neither.

## Building a Choice System

Let's create an interactive decision point:

```lua
print("=== STARSHIP LUA ===")
print()
print("You detect a distress signal from a nearby moon.")
print()
print("Do you:")
print("  1. Investigate the signal")
print("  2. Continue to your destination")
print()

io.write("Enter your choice (1 or 2): ")
local choice = io.read()

if choice == "1" then
    print()
    print("You alter course toward the moon...")
    print("As you approach, you see a damaged freighter.")
    print("The crew signals their thanks!")
else
    print()
    print("You mark the coordinates and continue on your way.")
    print("Perhaps another ship will respond...")
end
```

Sample run:
```
=== STARSHIP LUA ===

You detect a distress signal from a nearby moon.

Do you:
  1. Investigate the signal
  2. Continue to your destination

Enter your choice (1 or 2): 1

You alter course toward the moon...
As you approach, you see a damaged freighter.
The crew signals their thanks!
```

## Checking for Not Equal

Use `~=` to check if strings are different:

```lua
io.write("Enter access code: ")
local code = io.read()

if code ~= "ALPHA" then
    print("Invalid code - access denied")
else
    print("Access granted")
end
```

Note: Lua uses `~=` for "not equal," unlike many languages that use `!=`.

## Nested Decisions

You can put if statements inside other if statements:

```lua
print("Security Checkpoint")
print()

io.write("Enter your name: ")
local name = io.read()

if name == "Kai" then
    io.write("Enter your clearance code: ")
    local code = io.read()

    if code == "BRIDGE" then
        print("Welcome to the bridge, First Officer Kai")
    else
        print("Incorrect code")
    end
else
    print("Bridge access restricted to senior officers")
end
```

The inner `if` only runs when the outer `if` is true.

## Boolean Variables in Decisions

Boolean variables work directly in if statements:

```lua
local emergency = true
local docked = false

if emergency then
    print("EMERGENCY PROTOCOLS ACTIVE")
end

if docked then
    print("Ship is safely docked")  -- Won't print
end
```

You don't need `== true`:

```lua
-- These are equivalent:
if emergency == true then
if emergency then

-- The second form is preferred
```

## Practical Example: Simple Menu

```lua
local function show_menu()
    print("=== NAVIGATION MENU ===")
    print("A - Set destination")
    print("B - Check fuel")
    print("C - View map")
    print("=======================")
end

local function get_choice()
    io.write("Select option: ")
    return io.read()
end

show_menu()
print()
local choice = get_choice()

if choice == "A" then
    print("Enter destination coordinates...")
else
    if choice == "B" then
        print("Fuel level: 87%")
    else
        if choice == "C" then
            print("Displaying star chart...")
        else
            print("Invalid option")
        end
    end
end
```

This works, but deeply nested if-else chains get hard to read. In Lesson 8, you'll learn `elseif` which handles multiple options more elegantly.

## Practical Example: Choose Your Own Adventure

Here's a more complete interactive story:

```lua
local function ask(prompt)
    io.write(prompt)
    return io.read()
end

local function show_title()
    print("========================================")
    print("   THE DERELICT STATION")
    print("   A Choose Your Own Adventure")
    print("========================================")
    print()
end

-- Start the adventure
show_title()

print("Your ship docks with an abandoned space station.")
print("The airlock opens into darkness.")
print()

local action = ask("Do you enter (yes/no)? ")

if action == "yes" then
    print()
    print("You step into the station. Emergency lights flicker.")
    print("You see two corridors: left leads to the bridge,")
    print("right leads to engineering.")
    print()

    local direction = ask("Go left or right? ")

    if direction == "left" then
        print()
        print("You reach the bridge. Old star charts glow on screens.")
        print("You download the charts - valuable navigation data!")
        print()
        print("*** MISSION COMPLETE: Charts acquired ***")
    else
        print()
        print("You reach engineering. A functioning reactor hums.")
        print("You find spare fuel cells - exactly what you needed!")
        print()
        print("*** MISSION COMPLETE: Fuel acquired ***")
    end
else
    print()
    print("You decide the risk isn't worth it.")
    print("Your ship undocks and continues on its way.")
    print()
    print("*** MISSION ABORTED ***")
end
```

Sample run:
```
========================================
   THE DERELICT STATION
   A Choose Your Own Adventure
========================================

Your ship docks with an abandoned space station.
The airlock opens into darkness.

Do you enter (yes/no)? yes

You step into the station. Emergency lights flicker.
You see two corridors: left leads to the bridge,
right leads to engineering.

Go left or right? left

You reach the bridge. Old star charts glow on screens.
You download the charts - valuable navigation data!

*** MISSION COMPLETE: Charts acquired ***
```

## Quick Reference

### Boolean Values

```lua
local flag = true   -- yes, on, active
local flag = false  -- no, off, inactive
```

### If Statement

```lua
if condition then
    -- code
end
```

### If-Else Statement

```lua
if condition then
    -- when true
else
    -- when false
end
```

### String Comparison

| Operator | Meaning | Example |
|----------|---------|---------|
| `==` | Equals | `name == "Kai"` |
| `~=` | Not equals | `code ~= "ALPHA"` |

## What You've Learned

- Booleans (`true` and `false`) represent truth values
- `if` statements execute code only when a condition is true
- `else` provides an alternative path when the condition is false
- `==` compares strings for equality
- `~=` checks if strings are different
- String comparison is case-sensitive
- Nested if statements allow multi-step decisions
- Interactive programs use if statements to respond to user choices

---

First Officer Kai saves the navigation chart. "Every interesting program makes decisions. Based on user input, sensor data, or internal state, your code chooses different paths. That's what makes programs interactive—they respond to their environment."

---

**Next:** [Lesson 6: Numbers and Math](../06_numbers_and_math/lesson.md)

---

## Challenges

### Challenge 1: Door Access
*Practice basic if-else.*

Write a program that:
1. Asks the user for a door code
2. The correct code is "1234"
3. Prints "Door opened" if correct
4. Prints "Access denied" if incorrect

---

### Challenge 2: Crew Identification
*Practice string comparison.*

Write a program that:
1. Asks for a crew member's name
2. If the name is "Captain" (any capitalization), print "Welcome to the bridge, Captain!"
3. Otherwise, print "Hello, [name]"

Hint: Use `string.lower()` for case-insensitive comparison.

---

### Challenge 3: Simple Quiz
*Practice multiple if statements.*

Write a space trivia quiz with 2 questions:
1. "What is the closest star to Earth?" (Answer: "Sun")
2. "What planet is known as the Red Planet?" (Answer: "Mars")

For each question:
- If correct, print "Correct!"
- If wrong, print "Wrong - the answer was [answer]"

At the end, print "Quiz complete!" (We'll learn to count scores in a later lesson.)

---

### Challenge 4: Airlock Protocol
*Practice nested decisions.*

Write an airlock control program:
1. Ask "Is the outer door closed? (yes/no)"
2. If yes, ask "Confirm pressurization? (yes/no)"
   - If yes, print "Airlock pressurized - inner door unlocked"
   - If no, print "Pressurization cancelled"
3. If outer door not closed, print "ERROR: Close outer door first"

---

### Challenge 5: Choose Your Own Adventure
*Practice combining everything.*

Create your own mini adventure story with:
- A title screen (using a function)
- At least 3 decision points (using if/else)
- At least 2 different endings
- Use functions for repeated elements (like asking for input)

Theme suggestion: Your ship receives coordinates to a mysterious asteroid. Do you investigate? Once there, do you land or scan from orbit? What do you find?
