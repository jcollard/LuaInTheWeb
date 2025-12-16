# Lesson 10: Input and Output

## The Console Interface

Captain Coder brings you to a station with a direct terminal interface. Unlike the automated displays throughout the ship, this console requires manual input from operators.

"You've learned to get basic input with `io.read()` and convert it to numbers with `tonumber()`," they say. "But professional console programs need more control—output formatting, read modes, and robust validation. Let's level up your I/O skills."

## Output Without Newline: io.write

You know `print()` adds a newline at the end. But sometimes you want the cursor to stay on the same line—especially for prompts.

Use `io.write()` for output without an automatic newline:

```lua
io.write("Loading")
io.write(".")
io.write(".")
io.write(".")
io.write(" Complete!\n")
```

Output:
```
Loading... Complete!
```

Note: `io.write` requires explicit `\n` for newlines.

### Cleaner Prompts

Combine `io.write` with `io.read` for prompts where input appears on the same line:

```lua
io.write("Enter your name: ")
local name = io.read()
print("Hello, " .. name)
```

Output:
```
Enter your name: Chen
Hello, Chen
```

Compare this to using `print` for the prompt:
```
Enter your name:
Chen
Hello, Chen
```

The `io.write` version looks more professional.

### print vs io.write

| `print()` | `io.write()` |
|-----------|--------------|
| Adds newline automatically | No automatic newline |
| Accepts multiple arguments | Single string (or use concatenation) |
| Converts values to strings | Values must be strings |
| Adds tabs between arguments | No automatic formatting |

```lua
-- print can take multiple arguments
print("Fuel:", 100, "Shields:", true)
-- Output: Fuel:	100	Shields:	true

-- io.write needs explicit formatting
io.write("Fuel: " .. tostring(100) .. " Shields: " .. tostring(true) .. "\n")
-- Output: Fuel: 100 Shields: true
```

## Read Modes

You've used `io.read()` to read a line. But it can do more with **mode arguments**:

```lua
local line = io.read()           -- Read one line (default)
line = io.read("*l")             -- Same as above (explicit)
local num = io.read("*n")        -- Read a number directly
local all = io.read("*a")        -- Read all remaining input
```

### Reading Numbers Directly

Instead of `tonumber(io.read())`, you can use `"*n"`:

```lua
io.write("Enter distance: ")
local distance = io.read("*n")
print("Double that: " .. (distance * 2))
```

If the user enters non-numeric text, `io.read("*n")` returns `nil`.

## Handling Invalid Input

Users don't always enter what you expect. Always validate:

```lua
io.write("Enter shield power (0-100): ")
local input = io.read()
local power = tonumber(input)

if power == nil then
    print("Error: Please enter a number")
elseif power < 0 or power > 100 then
    print("Error: Must be between 0 and 100")
else
    print("Shield power set to " .. power .. "%")
end
```

### The Validation Pattern

A common pattern for robust input:

```lua
local function get_number(prompt, min, max)
    while true do
        io.write(prompt)
        local input = io.read()
        local num = tonumber(input)

        if num == nil then
            print("Please enter a valid number.")
        elseif num < min or num > max then
            print("Must be between " .. min .. " and " .. max)
        else
            return num
        end
    end
end

-- Usage
local fuel = get_number("Enter fuel amount (0-5000): ", 0, 5000)
print("Fuel set to: " .. fuel)
```

## Building Interactive Programs

Here's a complete example combining input and output:

```lua
-- Crew Registration System

print("=== CREW REGISTRATION ===")
print()

io.write("Enter crew member name: ")
local name = io.read()

io.write("Enter role (Pilot/Engineer/Science/Medical): ")
local role = io.read()

io.write("Enter experience level (1-10): ")
local exp_input = io.read()
local experience = tonumber(exp_input)

-- Validate experience
if experience == nil or experience < 1 or experience > 10 then
    experience = 1
    print("Invalid experience. Defaulting to 1.")
end

-- Calculate clearance level based on experience
local clearance
if experience >= 8 then
    clearance = "Alpha"
elseif experience >= 5 then
    clearance = "Beta"
else
    clearance = "Standard"
end

-- Display registration
print()
print("=== REGISTRATION COMPLETE ===")
print(string.format("Name:       %s", name))
print(string.format("Role:       %s", role))
print(string.format("Experience: %d years", experience))
print(string.format("Clearance:  %s", clearance))
```

Sample run:
```
=== CREW REGISTRATION ===

Enter crew member name: Amara
Enter role (Pilot/Engineer/Science/Medical): Engineer
Enter experience level (1-10): 7

=== REGISTRATION COMPLETE ===
Name:       Amara
Role:       Engineer
Experience: 7 years
Clearance:  Beta
```

## Practical Examples

### Simple Calculator

```lua
io.write("Enter first number: ")
local a = tonumber(io.read())

io.write("Enter operation (+, -, *, /): ")
local op = io.read()

io.write("Enter second number: ")
local b = tonumber(io.read())

local result
if op == "+" then
    result = a + b
elseif op == "-" then
    result = a - b
elseif op == "*" then
    result = a * b
elseif op == "/" then
    result = a / b
else
    print("Unknown operation")
    return
end

print("Result: " .. result)
```

### Confirmation Prompt

```lua
io.write("Delete all logs? (yes/no): ")
local response = io.read()

if response == "yes" then
    print("Logs deleted.")
elseif response == "no" then
    print("Operation cancelled.")
else
    print("Invalid response. Please enter 'yes' or 'no'.")
end
```

### Menu System

```lua
print("=== SHIP DIAGNOSTICS ===")
print("1. Check fuel")
print("2. Check shields")
print("3. Check life support")
print("4. Exit")
print()

io.write("Select option: ")
local choice = io.read()

if choice == "1" then
    print("Fuel: 87%")
elseif choice == "2" then
    print("Shields: Active, 100%")
elseif choice == "3" then
    print("Life support: Nominal")
elseif choice == "4" then
    print("Goodbye.")
else
    print("Invalid selection.")
end
```

## Quick Reference

### Output Functions

| Function | Description | Example |
|----------|-------------|---------|
| `print(...)` | Output with newline | `print("Hello")` |
| `io.write(...)` | Output without newline | `io.write("Hi ")` |

### Input Functions

| Function | Description | Example |
|----------|-------------|---------|
| `io.read()` | Read a line | `local name = io.read()` |
| `io.read("*n")` | Read a number | `local num = io.read("*n")` |
| `io.read("*l")` | Read a line (explicit) | `local line = io.read("*l")` |
| `io.read("*a")` | Read all input | `local all = io.read("*a")` |

### Conversion

| Function | Description |
|----------|-------------|
| `tonumber(s)` | Convert string to number (or nil) |
| `tostring(n)` | Convert number to string |

## What You've Learned

- `io.write()` outputs without a newline (unlike `print()`)
- Use `io.write` with `io.read` for professional same-line prompts
- `io.read("*n")` reads numbers directly (alternative to `tonumber()`)
- Always validate user input before using it
- Validation patterns help create robust, user-friendly programs

---

Captain Coder powers down the console. "Now your programs can communicate with their operators. They ask questions, accept answers, and respond accordingly. But interaction isn't just about gathering data—it's about making decisions based on that data."

---

## Core Training Complete!

Congratulations! You've completed all core lessons aboard the *Starship Lua*. You now understand:

- How to write and run programs
- Variables and data storage
- Tables for organizing data
- Functions for reusable code
- Basic and advanced decision making
- Mathematical operations
- String manipulation
- Loops and repetition
- Input and output techniques

You're ready to specialize. The crew awaits your expertise:

- **Dr. Patel** can teach you advanced data structures
- **Zara** offers training in closures and advanced functions
- **Amara** has courses on pattern matching and text processing
- **Chen** can show you how to work with files

Choose your path, crew member. Your journey continues

---

## Challenges

### Challenge 1: Crew Greeter
*Practice basic input/output.*

Write a program that:
1. Asks for the user's name
2. Asks for their rank
3. Displays a greeting: "Welcome aboard, [Rank] [Name]!"

---

### Challenge 2: Fuel Calculator
*Practice numeric input and calculation.*

Write a program that:
1. Asks for current fuel level
2. Asks for distance to travel
3. Assumes fuel consumption of 0.1 units per kilometer
4. Calculates and displays whether there's enough fuel
5. If not enough, shows how much more is needed

---

### Challenge 3: Access Control
*Practice input validation.*

Write a simple access system that:
1. Asks for an access code
2. The correct code is "ALPHA-7"
3. Gives 3 attempts before lockout
4. Prints "Access Granted" or "Lockout - Contact Administrator"

---

### Challenge 4: Ship Configuration
*Practice building a menu system.*

Create an interactive menu that lets users:
1. Set ship name
2. Set maximum crew capacity
3. Set fuel capacity
4. Display current configuration
5. Exit

The program should loop until the user selects Exit.

---

### Challenge 5: Number Guesser
*Practice combining input, validation, and logic.*

Write a number guessing game:
1. Set a secret number (e.g., 42)
2. Ask the user to guess
3. Tell them if their guess is too high, too low, or correct
4. Count and display the number of attempts when they win

---

# Challenge: Airlock Security System

**XP Reward:** 100
**Estimated Time:** 30 minutes

## The Situation

The main airlock between the *Starship Lua* and docked stations requires a security check before it can be opened. The old authentication program has crashed, and personnel are stuck at the airlock.

First Officer Kai shows you the security requirements that were left by the previous programmer:

*"Access shall be granted if the individual meets ANY of these criteria:*
- *Crew clearance level 3 or higher*
- *Possession of valid visitor credentials*
- *Medical emergency status (health below 30%)*
- *Knowledge of the emergency override code"*

You've been asked to rebuild the airlock security system.

## Objectives

Create a Lua script called `airlock_security.lua` that:

1. Asks the person for their name
2. Asks for their clearance level (number)
3. Asks if they have visitor credentials (yes/no)
4. Asks for their current health percentage (number)
5. Asks if they know the emergency override code (yes/no)
6. Evaluates whether they can pass based on the rules
7. Provides appropriate feedback based on the decision

## The Rules for Access

A person may pass if ANY of these conditions are true:
- Clearance level is 3 or higher
- They have visitor credentials (answered "yes")
- Health is below 30 (medical emergency)
- They know the override code (answered "yes")

If none are true, deny access.

## Expected Interaction

### Successful Entry (High Clearance):
```
=== AIRLOCK SECURITY SYSTEM ===

Please provide identification for access verification.

Enter your name: Commander Chen
Enter your clearance level (0-5): 4
Do you have visitor credentials? (yes/no): no
Enter your current health percentage: 95
Do you know the emergency override code? (yes/no): no

Verifying credentials...

ACCESS GRANTED: Clearance level 4 verified, Commander Chen.
Senior crew may proceed freely.
[AIRLOCK CYCLING]
```

### Successful Entry (Medical Emergency):
```
=== AIRLOCK SECURITY SYSTEM ===

Please provide identification for access verification.

Enter your name: Injured Worker
Enter your clearance level (0-5): 1
Do you have visitor credentials? (yes/no): no
Enter your current health percentage: 22
Do you know the emergency override code? (yes/no): no

Verifying credentials...

ACCESS GRANTED: Medical emergency detected, Injured Worker.
Health at 22%. Proceed to medical bay immediately.
[AIRLOCK CYCLING]
```

### Denied Entry:
```
=== AIRLOCK SECURITY SYSTEM ===

Please provide identification for access verification.

Enter your name: Unknown Person
Enter your clearance level (0-5): 1
Do you have visitor credentials? (yes/no): no
Enter your current health percentage: 100
Do you know the emergency override code? (yes/no): no

Verifying credentials...

ACCESS DENIED: Insufficient authorization, Unknown Person.
Please obtain proper credentials or contact ship security.
[AIRLOCK SEALED]
```

## Starter Template

```lua
-- Airlock Security System
-- Starship Lua Access Control

print("=== AIRLOCK SECURITY SYSTEM ===")
print()
print("Please provide identification for access verification.")
print()

-- Collect information
io.write("Enter your name: ")
local name = io.read()

io.write("Enter your clearance level (0-5): ")
local clearance = tonumber(io.read())

io.write("Do you have visitor credentials? (yes/no): ")
local has_credentials_input = io.read()
local has_credentials = (has_credentials_input == "yes")

io.write("Enter your current health percentage: ")
local health = tonumber(io.read())

io.write("Do you know the emergency override code? (yes/no): ")
local knows_override_input = io.read()
local knows_override = (knows_override_input == "yes")

print()
print("Verifying credentials...")
print()

-- Evaluate conditions and respond
-- Your decision logic goes here
```

## Hints

<details>
<summary>Hint 1: Converting yes/no to Boolean</summary>

```lua
local has_credentials = (has_credentials_input == "yes")
```

This creates a boolean: `true` if they typed "yes", `false` otherwise.

</details>

<details>
<summary>Hint 2: Checking Multiple Conditions</summary>

Use `or` to check if ANY condition is true:

```lua
if clearance >= 3 or has_credentials or health < 30 or knows_override then
    -- They can pass
end
```

</details>

<details>
<summary>Hint 3: Specific Messages</summary>

You can use nested ifs or elseifs to give specific feedback:

```lua
if clearance >= 3 then
    print("ACCESS GRANTED: Clearance level verified...")
elseif has_credentials then
    print("ACCESS GRANTED: Visitor credentials verified...")
elseif health < 30 then
    print("ACCESS GRANTED: Medical emergency detected...")
elseif knows_override then
    print("ACCESS GRANTED: Override code accepted...")
else
    print("ACCESS DENIED...")
end
```

</details>

<details>
<summary>Hint 4: Input Validation</summary>

What if they enter something that's not a number for clearance or health?

```lua
if clearance == nil then
    print("Invalid clearance level. Please enter a number.")
    -- Handle the error
end
```

</details>

## Bonus Challenges

*For extra practice (no additional XP)*

### Bonus 1: Input Validation
If the user enters invalid data (non-number for clearance/health, something other than yes/no), handle it gracefully with error messages.

### Bonus 2: Multiple Qualifications
If they meet multiple conditions, acknowledge all of them:
```
ACCESS GRANTED: Multiple authorizations verified:
- Clearance Level 4
- Visitor credentials on file
```

### Bonus 3: Actual Override Code
Instead of just asking yes/no for the code, ask them to type the actual code. The emergency override is "ALPHA-OMEGA-7". Check if they got it right (case-insensitive).

### Bonus 4: Security Log
Print a summary at the end showing all the criteria and whether each was met (PASS or FAIL).

## When You're Done

Run your script:
```bash
lua airlock_security.lua
```

Test multiple scenarios:
- High clearance character (should pass)
- Low clearance with credentials (should pass)
- Injured character (should pass)
- Character with override code (should pass)
- Character meeting no criteria (should be denied)

---

*The airlock control panel flashes as your security program runs. First Officer Kai tests it with various scenarios—granting access to authorized personnel and blocking those without proper credentials. "SECURITY SYSTEM RESTORED," ARIA announces. "Airlock protocols operational." You've restored order to ship access control.*

---

**Next Lesson:** [Making Decisions](../07_making_decisions/lesson.md)
