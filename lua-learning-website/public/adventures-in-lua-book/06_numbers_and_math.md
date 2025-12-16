# Lesson 6: Numbers and Math

## The Navigation Console

Navigator Stella calls you over to the astrogation station. Screens display coordinates, distances, fuel calculations, and trajectory projections—all numbers being constantly computed and updated.

"Space travel is applied mathematics," Stella says. "Every course correction, every fuel estimate, every docking approach—all of it is math. The ship's computer handles most of it automatically, but you need to understand how these calculations work."

She pulls up a simple distance calculation. "Let's start with the basics."

## Arithmetic Operators

Lua provides all the standard mathematical operations:

### Addition (`+`)

```lua
local distance = 1500 + 750
print(distance)  -- 2250

local fuel = 4000
fuel = fuel + 500  -- Refuel
print(fuel)  -- 4500
```

### Subtraction (`-`)

```lua
local remaining = 4500 - 800
print(remaining)  -- 3700

local fuel = 4500
fuel = fuel - 150  -- Travel consumes fuel
print(fuel)  -- 4350
```

### Multiplication (`*`)

```lua
local total_hours = 24 * 7  -- Hours in a week
print(total_hours)  -- 168

-- Cargo capacity calculation
local crates = 50
local weight_per_crate = 25
local total_weight = crates * weight_per_crate
print(total_weight)  -- 1250
```

### Division (`/`)

```lua
local average = 1000 / 4
print(average)  -- 250.0

-- Division always produces a decimal result in Lua
local result = 10 / 3
print(result)  -- 3.3333333333333
```

### Integer Division (`//`)

When you need whole numbers only (no decimal):

```lua
local whole = 10 // 3
print(whole)  -- 3

-- Distributing supplies evenly
local supplies = 100
local crew = 12
local each_gets = supplies // crew
print(each_gets)  -- 8
```

### Modulo (`%`) - The Remainder

The modulo operator gives the remainder after division:

```lua
local remainder = 100 % 12
print(remainder)  -- 4 (because 100 = 12*8 + 4)

-- Leftover supplies after distribution
local supplies = 100
local crew = 12
local leftover = supplies % crew
print(leftover)  -- 4
```

Modulo is useful for many things:

```lua
-- Is a number even or odd?
local value = 15
if value % 2 == 0 then
    print("Even")
else
    print("Odd")
end
-- Output: Odd

-- Cycle through positions (0, 1, 2, 0, 1, 2, ...)
local position = 7 % 3
print(position)  -- 1
```

### Exponentiation (`^`)

Raise a number to a power:

```lua
local squared = 5 ^ 2
print(squared)  -- 25

local cubed = 2 ^ 3
print(cubed)  -- 8

-- Square root is the 0.5 power
local sqrt = 16 ^ 0.5
print(sqrt)  -- 4.0
```

### Negation (`-`)

Make a number negative (or positive if already negative):

```lua
local velocity = 500
local reverse = -velocity
print(reverse)  -- -500

-- Double negation returns to original
local back = -reverse
print(back)  -- 500
```

## Order of Operations

Lua follows the standard mathematical order (PEMDAS):

1. **P**arentheses
2. **E**xponents
3. **M**ultiplication and **D**ivision (left to right)
4. **A**ddition and **S**ubtraction (left to right)

```lua
-- Without parentheses
local result = 2 + 3 * 4
print(result)  -- 14 (not 20, because * before +)

-- With parentheses
result = (2 + 3) * 4
print(result)  -- 20

-- Complex expression
result = 10 + 2 ^ 3 * 2
-- = 10 + 8 * 2  (exponent first)
-- = 10 + 16     (then multiplication)
-- = 26          (finally addition)
print(result)  -- 26
```

When in doubt, use parentheses to make your intent clear. Future you (and other programmers) will thank you.

## Getting Numeric Input

In Lesson 2, you learned that `io.read()` always returns text (a string). But what if you need to do math with user input?

```lua
print("Enter a number:")
local input = io.read()
local result = input + 10  -- ERROR! Can't add string and number
```

The solution is `tonumber()`, which converts text to a number:

```lua
print("Enter a number:")
local input = io.read()
local number = tonumber(input)
local result = number + 10
print(result)
```

You can combine these into one line:

```lua
print("Enter the distance:")
local distance = tonumber(io.read())
print("Double that distance: " .. (distance * 2))
```

### Handling Invalid Input

What if the user types something that isn't a number? `tonumber()` returns `nil`:

```lua
print("Enter a number:")
local input = tonumber(io.read())

if input == nil then
    print("That's not a valid number!")
else
    print("You entered: " .. input)
end
```

### Interactive Calculator Example

Here's a simple program that gets numbers from the user:

```lua
print("=== Fuel Calculator ===")

print("Enter current fuel:")
local current = tonumber(io.read())

print("Enter fuel to add:")
local adding = tonumber(io.read())

local total = current + adding
print("Total fuel: " .. total)
```

Running this:
```
=== Fuel Calculator ===
Enter current fuel:
3500
Enter fuel to add:
1200
Total fuel: 4700
```

## Updating Variables

A common pattern is modifying a variable based on its current value:

```lua
local fuel = 1000
fuel = fuel - 100  -- Consume fuel
print(fuel)  -- 900

fuel = fuel + 500  -- Refuel
print(fuel)  -- 1400
```

Note: Unlike some languages, Lua doesn't have shorthand operators like `+=` or `-=`. You must write the full expression.

```lua
-- These DON'T work in Lua:
-- fuel += 100
-- distance -= 50

-- You must write:
fuel = fuel + 100
distance = distance - 50
```

## The Math Library

Lua includes a built-in `math` library with advanced functions:

### Common Functions

```lua
-- Absolute value
print(math.abs(-150))     -- 150

-- Rounding
print(math.floor(3.7))    -- 3 (round down)
print(math.ceil(3.2))     -- 4 (round up)

-- Minimum and maximum
print(math.min(5, 3, 9, 1))  -- 1
print(math.max(5, 3, 9, 1))  -- 9

-- Square root
print(math.sqrt(144))     -- 12.0

-- Power (alternative to ^)
print(math.pow(2, 10))    -- 1024.0
```

### Constants

```lua
print(math.pi)    -- 3.1415926535898
print(math.huge)  -- inf (infinity)
```

### Random Numbers

```lua
-- Random decimal between 0 and 1
print(math.random())

-- Random integer from 1 to 10
print(math.random(10))

-- Random integer from 5 to 20
print(math.random(5, 20))
```

For truly random results each time you run your program, seed the generator:

```lua
math.randomseed(os.time())  -- Use current time as seed
print(math.random(1, 100))  -- Now different each run
```

## Practical Examples

### Fuel Efficiency Calculation

```lua
local distance_traveled = 2500  -- kilometers
local fuel_used = 450           -- liters

local efficiency = distance_traveled / fuel_used
print("Fuel efficiency: " .. efficiency .. " km per liter")
-- Output: Fuel efficiency: 5.5555555555556 km per liter
```

### Trip Duration

```lua
local distance = 12000   -- kilometers
local speed = 500        -- kilometers per hour

local hours = distance / speed
print("Trip duration: " .. hours .. " hours")
-- Output: Trip duration: 24.0 hours
```

### Distance Between Coordinates

```lua
-- 3D distance formula
local x1, y1, z1 = 0, 0, 0
local x2, y2, z2 = 100, 200, 50

local distance = math.sqrt((x2 - x1)^2 + (y2 - y1)^2 + (z2 - z1)^2)
print("Distance: " .. distance .. " units")
-- Output: Distance: 229.12878474779 units
```

### Percentage Calculations

```lua
local fuel_remaining = 3200
local fuel_capacity = 5000

local percentage = (fuel_remaining / fuel_capacity) * 100
print("Fuel at " .. percentage .. "%")
-- Output: Fuel at 64%
```

### Time Unit Conversion

```lua
local total_seconds = 45296

local hours = total_seconds // 3600
local remaining = total_seconds % 3600
local minutes = remaining // 60
local seconds = remaining % 60

print(hours .. "h " .. minutes .. "m " .. seconds .. "s")
-- Output: 12h 34m 56s
```

## Block Comments

When experimenting with different calculations, you may want to disable multiple lines at once. Lua has **block comments**:

```lua
--[[
print("This won't run")
print("Neither will this")
]]
print("But this will!")
```

Everything between `--[[` and `]]` is ignored. This is useful for testing different formulas:

```lua
-- Testing different fuel consumption rates
--[[
local consumption = distance * 0.08   -- High consumption
local consumption = distance * 0.05   -- Low consumption
]]
local consumption = distance * 0.065  -- Current setting
```

## Quick Reference

| Operator | Name | Example | Result |
|----------|------|---------|--------|
| `+` | Addition | `5 + 3` | `8` |
| `-` | Subtraction | `5 - 3` | `2` |
| `*` | Multiplication | `5 * 3` | `15` |
| `/` | Division | `5 / 2` | `2.5` |
| `//` | Integer Division | `5 // 2` | `2` |
| `%` | Modulo | `5 % 2` | `1` |
| `^` | Exponent | `5 ^ 2` | `25` |
| `-` | Negation | `-5` | `-5` |

| Function | Description | Example |
|----------|-------------|---------|
| `tonumber(s)` | Convert string to number | `tonumber("42")` → `42` |
| `math.abs(x)` | Absolute value | `math.abs(-5)` → `5` |
| `math.floor(x)` | Round down | `math.floor(3.9)` → `3` |
| `math.ceil(x)` | Round up | `math.ceil(3.1)` → `4` |
| `math.min(...)` | Smallest value | `math.min(3, 1, 4)` → `1` |
| `math.max(...)` | Largest value | `math.max(3, 1, 4)` → `4` |
| `math.sqrt(x)` | Square root | `math.sqrt(16)` → `4` |
| `math.random(a, b)` | Random integer | `math.random(1, 10)` |

## What You've Learned

- Lua supports standard arithmetic: `+`, `-`, `*`, `/`, `//`, `%`, `^`
- `tonumber()` converts text input to numbers for math operations
- Order of operations follows PEMDAS
- Use parentheses to clarify complex expressions
- The `math` library provides advanced functions
- Seed `math.random` for different results each run
- Block comments (`--[[` and `]]`) disable multiple lines

---

Navigator Stella finishes the trajectory calculation. "Math is the language of navigation. Every jump point, every orbital insertion, every fuel estimate—all math. Now you can read that language."

---

**Next:** [Lesson 7: Strings and Text](../07_strings_and_text/lesson.md)

---

## Challenges

### Challenge 1: Fuel Calculator
*Practice basic arithmetic.*

Write a program that:
1. Starts with `fuel_capacity = 5000` liters
2. Subtracts 1200 liters (used during travel)
3. Adds 800 liters (partial refuel)
4. Calculates what percentage of capacity remains
5. Prints the final amount and percentage

---

### Challenge 2: Supply Distribution
*Practice integer division and modulo.*

The ship receives 500 ration packs to distribute among 12 crew members. Write a program that calculates:
- How many packs each crew member receives (evenly)
- How many packs are left over for the emergency reserve
- Print both results

---

### Challenge 3: Distance Calculator
*Practice the distance formula.*

Two ships need to rendezvous. Ship A is at coordinates (150, 200, 50). Ship B is at coordinates (400, 100, 200). Write a program that:
1. Stores each ship's coordinates in variables
2. Calculates the 3D distance between them using `math.sqrt`
3. Prints the distance (hint: use `math.floor` to round it to a whole number)

Formula: `distance = sqrt((x2-x1)^2 + (y2-y1)^2 + (z2-z1)^2)`

Expected output: `Distance between ships: 291 units`

---

### Challenge 4: Time Converter
*Practice modulo for unit conversion.*

Write a program that converts a mission duration from total seconds to hours, minutes, and seconds.

Test with `total_seconds = 9045`

Expected output format: `2h 30m 45s`

Hint: Use `//` for division and `%` for remainders.

---

### Challenge 5: Random Patrol Route
*Practice the math library.*

Write a program that generates a random patrol route with 3 waypoints. Each waypoint should have:
- X coordinate: random between 0 and 1000
- Y coordinate: random between 0 and 1000
- Z coordinate: random between -100 and 100

Don't forget to seed the random number generator. Print all three waypoints.

---

# Challenge: Navigation Calculator

**XP Reward:** 75
**Estimated Time:** 20 minutes

## The Situation

Navigator Stella has a stack of calculations that need to be automated. The manual computation is slowing down route planning, and she needs a program to handle the math.

"I need a calculation program," Stella explains, pulling up star charts on her console. "Fuel efficiency, time conversion, distance calculations—all the standard navigation math. Can you build it?"

She slides you a list of problems that need solving.

## Objectives

Create a Lua script called `nav_calculator.lua` that performs the following calculations:

1. **Sensor Coverage**: Calculate the area of a triangular sensor sweep (base = 15 km, height = 8 km)
2. **Time Conversion**: Convert 45296 seconds into hours, minutes, and seconds
3. **Fuel Discount**: Calculate 15% off a fuel cost of 2500 credits
4. **Supply Distribution**: Divide 1000 ration packs among 12 crew members (show each person's share and leftover)
5. **Random Coordinates**: Generate random patrol waypoint coordinates (X: 0-1000, Y: 0-1000, Z: -100 to 100)

## Requirements

- Show your work with clear output labels
- Use appropriate operators for each calculation
- Use the math library where helpful
- Display results in a readable format

## Expected Output

Your output should look similar to this:

```
=== NAVIGATION CALCULATOR ===

Sensor Sweep Calculation:
Base: 15 km, Height: 8 km
Coverage Area: 60 square km

Time Conversion:
45296 seconds =
  12h 34m 56s

Fuel Discount Calculation:
Original cost: 2500 credits
Discount: 15%
Sale price: 2125 credits
You save: 375 credits

Supply Distribution:
Total rations: 1000
Crew members: 12
Each receives: 83 packs
Reserve: 4 packs

Random Patrol Waypoint:
X: [random 0-1000]
Y: [random 0-1000]
Z: [random -100 to 100]
```

## Starter Template

```lua
-- Navigation Calculator
-- Starship Lua Astrogation Support

-- Seed random number generator
math.randomseed(os.time())

print("=== NAVIGATION CALCULATOR ===\n")

-- 1. Sensor Sweep Area (area = base * height / 2)
print("Sensor Sweep Calculation:")
local base = 15
local height = 8
-- Calculate and print the area

-- 2. Time Conversion
print("\nTime Conversion:")
local total_seconds = 45296
-- Convert to hours, minutes, seconds
-- Hint: Use // and %

-- 3. Fuel Discount
print("\nFuel Discount Calculation:")
local original_cost = 2500
local discount_percent = 15
-- Calculate sale price and savings

-- 4. Supply Distribution
print("\nSupply Distribution:")
local total_rations = 1000
local crew_count = 12
-- Calculate share and remainder

-- 5. Random Patrol Waypoint
print("\nRandom Patrol Waypoint:")
-- Generate random coordinates
```

## Hints

<details>
<summary>Hint 1: Triangle Area Formula</summary>

Area of a triangle = (base * height) / 2

```lua
area = (base * height) / 2
```

</details>

<details>
<summary>Hint 2: Time Conversion</summary>

To break down 45296 seconds:
- Hours = total // 3600
- Remaining after hours = total % 3600
- Minutes = remaining // 60
- Seconds = remaining % 60

```lua
local hours = total_seconds // 3600
local remaining = total_seconds % 3600
local minutes = remaining // 60
local seconds = remaining % 60
```

</details>

<details>
<summary>Hint 3: Percentage Calculation</summary>

To calculate 15% of a number:
```lua
discount_amount = original_cost * (discount_percent / 100)
sale_price = original_cost - discount_amount
```

</details>

<details>
<summary>Hint 4: Integer Division for Distribution</summary>

```lua
each_share = total_rations // crew_count
leftover = total_rations % crew_count
```

</details>

## Bonus Challenges

*For extra practice (no additional XP)*

### Bonus 1: Distance Calculator
Two ships are at coordinates (150, 200, 50) and (400, 100, 200). Calculate the 3D distance between them using `math.sqrt` and the distance formula.

### Bonus 2: Fuel Efficiency
Calculate fuel efficiency: if the ship traveled 12000 km using 450 liters of fuel, what's the km per liter ratio?

### Bonus 3: Orbit Time
Calculate orbital period: if a station orbits at 500 km altitude around a planet, and it takes 90 minutes per orbit, how many orbits in a 24-hour day?

### Bonus 4: Compound Interest
Calculate the value of 1000 credits invested for 5 years at 8% annual interest.
Formula: final = principal * (1 + rate)^years

## When You're Done

Run your script:
```bash
lua nav_calculator.lua
```

The calculator should display all five calculations with clear labels and correct results. The random coordinates will be different each time you run it.

---

*Navigator Stella reviews your calculator output, checking each result against her manual calculations. "This is exactly what I needed. No more hours hunched over datapads doing arithmetic." She enters your program into the ship's navigation system. "Calculation suite: Approved for duty."*

---

**Next Lesson:** [Strings and Text](../05_strings_and_text/lesson.md)
