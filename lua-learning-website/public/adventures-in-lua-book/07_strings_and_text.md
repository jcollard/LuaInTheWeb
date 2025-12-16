# Lesson 7: Strings and Text

## The Communications Array

Comms Officer Amara sits at a console covered with scrolling text—incoming transmissions, outgoing messages, status reports, and encrypted communications from across the sector.

"Everything in communications is text," Amara says. "Coordinates, names, orders, warnings—all strings of characters that need to be processed, formatted, combined, and analyzed. If you want to work with ship systems, you need to master strings."

She pulls up a transmission log. "Let's start with the fundamentals."

## String Basics

A **string** is a sequence of characters—letters, numbers, symbols, spaces. In Lua, strings are created with quotes:

```lua
local message = "Incoming transmission"
local sender = 'Station Alpha'
local code = "A-7X-2"
```

Double quotes and single quotes work identically. Choose one style for consistency.

### Multi-line Strings

For text spanning multiple lines, use double brackets:

```lua
local report = [[This is a multi-line
transmission that spans
several lines of text.]]

print(report)
```

Output:
```
This is a multi-line
transmission that spans
several lines of text.
```

### Special Characters

Use backslash escapes for special characters:

```lua
print("Alert: \"Enemy detected\"")    -- Quotes inside string
print("Line 1\nLine 2")               -- New line
print("Col A\tCol B")                 -- Tab
print("Path: C:\\logs\\data.txt")     -- Backslash itself
```

Output:
```
Alert: "Enemy detected"
Line 1
Line 2
Col A	Col B
Path: C:\logs\data.txt
```

## String Concatenation

Join strings together with the `..` operator:

```lua
local first = "Starship"
local second = "Lua"
local full_name = first .. " " .. second
print(full_name)  -- Starship Lua
```

Numbers convert automatically when concatenating:

```lua
local crew = 12
local message = "Crew count: " .. crew
print(message)  -- Crew count: 12
```

### Building Messages

```lua
local ship = "Lua"
local sector = "7-G"
local status = "operational"

local report = "Ship " .. ship .. " in sector " .. sector .. " is " .. status
print(report)
-- Output: Ship Lua in sector 7-G is operational
```

## String Length

Get the number of characters with the `#` operator:

```lua
local message = "Hello"
print(#message)  -- 5

local code = "A-7X-2"
print(#code)     -- 6
```

Or use `string.len()`:

```lua
print(string.len("Hello"))  -- 5
```

## The String Library

Lua provides powerful string manipulation functions:

### Case Conversion

```lua
local text = "Alert Status"

print(string.upper(text))  -- ALERT STATUS
print(string.lower(text))  -- alert status
```

### Substrings

Extract parts of a string with `string.sub(str, start, end)`:

```lua
local code = "ALPHA-7X"

print(string.sub(code, 1, 5))   -- ALPHA (chars 1-5)
print(string.sub(code, 7))      -- 7X (char 7 to end)
print(string.sub(code, -2))     -- 7X (last 2 chars)
```

Negative indices count from the end.

### Finding Text

Check if a string contains another string:

```lua
local message = "Warning: fuel low"

-- string.find returns start position, or nil if not found
local pos = string.find(message, "fuel")
print(pos)  -- 10

pos = string.find(message, "shields")
print(pos)  -- nil
```

### Replacing Text

Replace occurrences of a pattern:

```lua
local message = "Ship Alpha reporting. Alpha standing by."

local new_message = string.gsub(message, "Alpha", "Beta")
print(new_message)
-- Output: Ship Beta reporting. Beta standing by.

-- With count (replace only first occurrence)
new_message = string.gsub(message, "Alpha", "Beta", 1)
print(new_message)
-- Output: Ship Beta reporting. Alpha standing by.
```

### Repeating Strings

```lua
local separator = string.rep("-", 20)
print(separator)  -- --------------------

local alert = string.rep("! ", 3)
print(alert)      -- ! ! !
```

### Reversing Strings

```lua
local code = "ALPHA"
print(string.reverse(code))  -- AHPLA
```

## String Formatting

For precise output control, use `string.format`:

```lua
local ship = "Lua"
local fuel = 87.5
local crew = 12

print(string.format("Ship: %s", ship))
print(string.format("Fuel: %.1f%%", fuel))
print(string.format("Crew: %d members", crew))
```

Output:
```
Ship: Lua
Fuel: 87.5%
Crew: 12 members
```

### Format Specifiers

| Specifier | Type | Example |
|-----------|------|---------|
| `%s` | String | `%s` → `"Lua"` |
| `%d` | Integer | `%d` → `42` |
| `%f` | Float | `%f` → `3.140000` |
| `%.2f` | Float (2 decimals) | `%.2f` → `3.14` |
| `%05d` | Zero-padded (5 digits) | `%05d` → `00042` |
| `%%` | Literal % | `%%` → `%` |

### Padding and Alignment

```lua
-- Right-align in 10 characters
print(string.format("[%10s]", "test"))    -- [      test]

-- Left-align in 10 characters
print(string.format("[%-10s]", "test"))   -- [test      ]

-- Zero-pad numbers
print(string.format("%05d", 42))          -- 00042
```

## Converting Types

### String to Number

```lua
local text = "42"
local number = tonumber(text)
print(number + 8)  -- 50

-- Returns nil if conversion fails
local result = tonumber("hello")
print(result)  -- nil
```

### Number to String

```lua
local value = 42
local text = tostring(value)
print("Value: " .. text)  -- Value: 42
```

## Comparing Strings

Strings compare alphabetically:

```lua
print("alpha" < "beta")     -- true (a before b)
print("Alpha" < "alpha")    -- true (uppercase before lowercase)
print("ship" == "ship")     -- true
print("ship" == "Ship")     -- false (case matters)
```

For case-insensitive comparison:

```lua
local str1 = "ALPHA"
local str2 = "alpha"

if string.lower(str1) == string.lower(str2) then
    print("Match (ignoring case)")
end
```

## Practical Examples

### Transmission Header

```lua
local function format_header(sender, priority)
    local line = string.rep("=", 30)
    local header = string.format(
        "%s\nFROM: %-15s\nPRIORITY: %s\n%s",
        line, sender, priority, line
    )
    return header
end

print(format_header("Station Alpha", "HIGH"))
```

Output:
```
==============================
FROM: Station Alpha
PRIORITY: HIGH
==============================
```

### Coordinate Parser (Advanced Preview)

The following examples use **patterns**—a powerful but advanced feature. Don't worry if the pattern syntax looks confusing; patterns are covered in depth in advanced lessons. For now, just see what's possible:

```lua
local coord_string = "X:150,Y:200,Z:50"

-- Extract values using string.match (patterns taught in advanced lessons)
local x = string.match(coord_string, "X:(%d+)")
local y = string.match(coord_string, "Y:(%d+)")
local z = string.match(coord_string, "Z:(%d+)")

print("X:", x, "Y:", y, "Z:", z)
-- Output: X: 150 Y: 200 Z: 50
```

### Status Code Parser (Advanced Preview)

```lua
local code = "ERR-404-NOTFOUND"

-- Split on dashes using string.gmatch (patterns taught in advanced lessons)
local parts = {}
for part in string.gmatch(code, "[^-]+") do
    table.insert(parts, part)
end

print("Type:", parts[1])    -- ERR
print("Code:", parts[2])    -- 404
print("Message:", parts[3]) -- NOTFOUND
```

These examples show the power of string patterns. For now, focus on the simpler string functions above—you'll master patterns later.

## Quick Reference

| Function | Description | Example |
|----------|-------------|---------|
| `#str` | String length | `#"hello"` → `5` |
| `str1 .. str2` | Concatenation | `"a" .. "b"` → `"ab"` |
| `string.upper(s)` | Uppercase | `"hi"` → `"HI"` |
| `string.lower(s)` | Lowercase | `"HI"` → `"hi"` |
| `string.sub(s, i, j)` | Substring | `"hello", 2, 4` → `"ell"` |
| `string.find(s, pattern)` | Find position | Returns number or nil |
| `string.gsub(s, old, new)` | Replace | `"aa", "a", "b"` → `"bb"` |
| `string.rep(s, n)` | Repeat | `"-", 5` → `"-----"` |
| `string.format(fmt, ...)` | Format | `"%s: %d", "x", 5` → `"x: 5"` |
| `tonumber(s)` | To number | `"42"` → `42` |
| `tostring(n)` | To string | `42` → `"42"` |

## What You've Learned

- Strings are sequences of characters in quotes
- Use `..` to concatenate strings
- The string library provides `upper`, `lower`, `sub`, `find`, `gsub`, and more
- `string.format` gives precise control over output
- `tonumber` and `tostring` convert between types
- Strings compare alphabetically and are case-sensitive

---

Comms Officer Amara closes the transmission log. "Text is how ships communicate, how logs are kept, how orders are transmitted. Every system that deals with human-readable data works with strings. Now you can process that data too."

---

**Next:** [Lesson 8: Advanced Decisions](../08_advanced_decisions/lesson.md)

---

## Challenges

### Challenge 1: Call Sign Generator
*Practice concatenation and formatting.*

Write a program that creates a ship call sign from:
- Prefix: "SS" (for Starship)
- Name: A variable containing the ship name
- Number: A 4-digit registration number (zero-padded)

Output format: `SS-LUNA-0042`

---

### Challenge 2: Message Formatter
*Practice string formatting.*

Write a program that formats a distress signal with:
- Ship name (string)
- Coordinates X, Y, Z (numbers with 1 decimal place)
- Crew count (integer)

Expected output:
```
=== DISTRESS SIGNAL ===
Ship: [name]
Location: (X.X, Y.Y, Z.Z)
Crew aboard: [count]
========================
```

---

### Challenge 3: Code Validator
*Practice string operations.*

Ship codes follow the format: 3 uppercase letters, dash, 3 digits (e.g., "ABC-123").

Write a program that checks if a code is valid by verifying:
- Length is exactly 7 characters
- Character at position 4 is a dash
- Print "Valid" or "Invalid"

---

### Challenge 4: Log Parser
*Practice substrings and finding.*

Given a log entry like:
```
"[2847-03-15 14:30:22] ALERT: Hull breach detected in sector 7"
```

Extract and print:
- The date (2847-03-15)
- The time (14:30:22)
- The message type (ALERT)

Hint: Use `string.sub` and `string.find`

---

### Challenge 5: Message Encoder
*Practice string manipulation.*

Write a simple "encryption" program that:
1. Takes a message string
2. Converts it to uppercase
3. Reverses it
4. Adds "ENCODED: " prefix

Test with "Secret Mission" → "ENCODED: NOISSIM TERCES"

---

# Challenge: Crew Registration System

**XP Reward:** 75
**Estimated Time:** 25 minutes

## The Situation

The *Starship Lua* is docking at Waypoint Station for crew rotation. The station's dockmaster needs an interactive registration program to process arriving crew members.

"The old paper system is a disaster," the dockmaster sighs, gesturing at a stack of forms. "I need a program that can interview new arrivals and create a proper registration record. Something interactive that collects their information and formats it officially."

## Objectives

Create a Lua script called `crew_registration.lua` that:

1. Welcomes the crew member to Waypoint Station
2. Asks for their name
3. Asks which ship they're from
4. Asks their role (Pilot/Engineer/Science/Medical/Other)
5. Asks how many days they'll be stationed (must be a number)
6. Calculates and displays a docking fee (5 credits per day)
7. Prints a formatted registration certificate summarizing all information

## Requirements

- Use `io.write` for prompts that expect input on the same line
- Validate the number of days (must be a positive number)
- Calculate the docking fee correctly
- Display a nicely formatted final registration
- Use `string.format` for at least one output line

## Expected Interaction

```
=====================================
  WAYPOINT STATION CREW REGISTRATION
=====================================

Please provide the following information for our records.

Enter your name: Alex Chen
Which ship are you from? Starship Lua
Your role (Pilot/Engineer/Science/Medical/Other): Engineer
How many days will you be stationed? 7

Processing your registration...

=====================================
      OFFICIAL CREW REGISTRATION
=====================================
Crew Member:     Alex Chen
Origin Ship:     Starship Lua
Role:            Engineer
Duration:        7 days
Docking Fee:     35 credits (5 credits/day)
=====================================

Thank you for registering. Welcome to Waypoint Station!
```

## Starter Template

```lua
-- Crew Registration System
-- Waypoint Station Administration

-- Welcome message
print("=====================================")
print("  WAYPOINT STATION CREW REGISTRATION")
print("=====================================")
print()
print("Please provide the following information for our records.")
print()

-- Collect crew information
io.write("Enter your name: ")
local name = ???

io.write("Which ship are you from? ")
local origin_ship = ???

io.write("Your role (Pilot/Engineer/Science/Medical/Other): ")
local role = ???

io.write("How many days will you be stationed? ")
local days = ???

-- Validate days
-- If invalid, set to 1 and inform the user

-- Calculate docking fee
local fee_per_day = 5
local total_fee = ???

print()
print("Processing your registration...")
print()

-- Display formatted registration
print("=====================================")
print("      OFFICIAL CREW REGISTRATION")
print("=====================================")
-- Print all the collected information nicely formatted
-- Use string.format for at least one line

print("=====================================")
print()
print("Thank you for registering. Welcome to Waypoint Station!")
```

## Hints

<details>
<summary>Hint 1: Same-Line Prompts</summary>

Use `io.write` instead of `print` when you want input on the same line:

```lua
io.write("Enter your name: ")
name = io.read()
```

</details>

<details>
<summary>Hint 2: Number Validation</summary>

```lua
local days = tonumber(io.read())

if days == nil or days < 1 then
    print("Invalid number. Setting to 1 day.")
    days = 1
end
```

</details>

<details>
<summary>Hint 3: Formatted Output</summary>

To align output nicely, you can use string.format with width specifiers:

```lua
print(string.format("%-15s %s", "Crew Member:", name))
```

The `%-15s` means a left-aligned string with width 15.

Or simply use concatenation with consistent labels:
```lua
print("Crew Member:     " .. name)
```

</details>

<details>
<summary>Hint 4: Fee Calculation</summary>

```lua
local fee_per_day = 5
local total_fee = days * fee_per_day
print(string.format("Docking Fee:     %d credits (%d credits/day)", total_fee, fee_per_day))
```

</details>

## Bonus Challenges

*For extra practice (no additional XP)*

### Bonus 1: Extended Stay Discount
If the crew member is staying more than 14 days, give them a 20% discount on the total fee. Show the original fee, discount, and final fee.

### Bonus 2: Role Validation
Check if the role is one of the five valid options (Pilot/Engineer/Science/Medical/Other). If not, ask them to re-enter or default to "Other".

### Bonus 3: Timestamp
Add the current date/time to the registration using `os.date()`:
```lua
print("Registered: " .. os.date("%Y-%m-%d %H:%M"))
```

### Bonus 4: Multi-Crew Mode
After completing one registration, ask "Register another crew member? (yes/no)". If yes, repeat the process. (This will be easier after you learn loops!)

## When You're Done

Run your script:
```bash
lua crew_registration.lua
```

The script should interactively collect all information, validate the days, calculate the fee, and display a professional-looking registration certificate.

---

*The dockmaster reviews your registration program, entering test data and watching the formatted output appear. "Now THIS is proper record-keeping," she says with approval. "Much better than trying to read everyone's handwriting. You've earned your station access badge, crew member."*

---

**Next Lesson:** [Input and Output](../06_input_and_output/lesson.md)
