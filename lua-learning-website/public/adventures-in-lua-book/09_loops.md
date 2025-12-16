# Lesson 9: Loops

## The Engine Room

Chief Engineer Rex leads you deep into the ship's engine room, where massive cylinders pump in synchronized rhythm, power regulators cycle through their sequences, and diagnostic systems run continuous checks.

"Everything in here repeats," Rex says over the mechanical hum. "Pumps cycle. Systems check. Sensors poll. That's the nature of machinery—and of programs that run machinery. When you need to do something over and over, you use a loop."

He pulls up a control panel. "Lua gives you three types: `while`, `repeat`, and `for`. Each has its purpose."

## The While Loop

A `while` loop repeats as long as a condition remains true:

```lua
local countdown = 5

while countdown > 0 do
    print("T-minus " .. countdown)
    countdown = countdown - 1
end

print("Launch!")
```

Output:
```
T-minus 5
T-minus 4
T-minus 3
T-minus 2
T-minus 1
Launch!
```

Structure:
- `while` — starts the loop
- `countdown > 0` — condition checked *before* each iteration
- `do` — marks the beginning of the loop body
- `end` — marks the end of the loop body

**Important:** The condition is checked before each iteration. If it's false initially, the body never runs:

```lua
local fuel = 0

while fuel > 100 do
    print("This never prints")
end
```

### Infinite Loops

If the condition never becomes false, the loop runs forever:

```lua
while true do
    print("This runs forever...")
end
```

Use `break` to escape (covered below).

## The Repeat-Until Loop

`repeat-until` checks the condition *after* each iteration:

```lua
local pressure = 0

repeat
    pressure = pressure + 20
    print("Pressure: " .. pressure)
until pressure >= 100

print("Target pressure reached")
```

Output:
```
Pressure: 20
Pressure: 40
Pressure: 60
Pressure: 80
Pressure: 100
Target pressure reached
```

Key difference: The body always runs **at least once**, even if the condition starts true:

```lua
local ready = true

repeat
    print("Running startup check...")
until ready  -- Condition is already true, but body ran first

print("Check complete")
```

Output:
```
Running startup check...
Check complete
```

### When to Use Which

- Use `while` when you might not need to run at all
- Use `repeat` when you need at least one iteration

```lua
-- Getting valid input (repeat is natural here)
local input
repeat
    io.write("Enter a positive number: ")
    input = tonumber(io.read())
until input and input > 0

print("You entered: " .. input)
```

## The For Loop

The `for` loop is designed for counting—the most common loop type.

### Numeric For Loop

```lua
for i = 1, 5 do
    print("Cycle " .. i .. " complete")
end
```

Output:
```
Cycle 1 complete
Cycle 2 complete
Cycle 3 complete
Cycle 4 complete
Cycle 5 complete
```

Structure: `for variable = start, stop do`

The loop variable automatically increments from `start` to `stop`.

### Custom Step Value

Add a third number to specify the step:

```lua
-- Check every other sensor (even numbers)
for sensor = 2, 10, 2 do
    print("Checking sensor " .. sensor)
end
```

Output:
```
Checking sensor 2
Checking sensor 4
Checking sensor 6
Checking sensor 8
Checking sensor 10
```

### Counting Backwards

Use a negative step:

```lua
print("Initiating docking sequence...")
for count = 5, 1, -1 do
    print(count .. "...")
end
print("Docking complete!")
```

Output:
```
Initiating docking sequence...
5...
4...
3...
2...
1...
Docking complete!
```

### Loop Variable Scope

The loop variable is local to the loop:

```lua
for i = 1, 3 do
    print("Inside: " .. i)
end

-- print(i)  -- ERROR: i doesn't exist here
```

## Break: Escaping Early

The `break` statement exits a loop immediately:

```lua
-- Search for critical alert in sensor readings
local sensors = {45, 62, 78, 15, 89, 92}

for i = 1, #sensors do
    local reading = sensors[i]
    print("Sensor " .. i .. ": " .. reading)

    if reading < 20 then
        print("CRITICAL: Sensor " .. i .. " below threshold!")
        break  -- Exit immediately, don't check remaining sensors
    end
end

print("Scan complete")
```

Output:
```
Sensor 1: 45
Sensor 2: 62
Sensor 3: 78
Sensor 4: 15
CRITICAL: Sensor 4 below threshold!
Scan complete
```

### Breaking from While/Repeat

```lua
-- Command processor
while true do
    io.write("Command (or 'exit'): ")
    local cmd = io.read()

    if cmd == "exit" then
        break
    end

    print("Processing: " .. cmd)
end

print("System shutdown")
```

## Looping Through Tables

Combine `for` loops with tables using `ipairs` or `pairs`:

### Iterating Arrays with ipairs

```lua
local crew = {"Coder", "Rex", "Stella", "Amara", "Patel", "Chen"}

for index, name in ipairs(crew) do
    print(index .. ". " .. name)
end
```

Output:
```
1. Coder
2. Rex
3. Stella
4. Amara
5. Patel
6. Chen
```

### Iterating All Keys with pairs

```lua
local ship = {
    name = "Lua",
    fuel = 4750,
    crew = 12,
    status = "active"
}

for key, value in pairs(ship) do
    print(key .. ": " .. tostring(value))
end
```

Output (order may vary):
```
name: Lua
fuel: 4750
crew: 12
status: active
```

## Nested Loops

Loops can contain other loops:

```lua
-- Display cargo grid
print("Cargo Bay Status:")
for row = 1, 3 do
    for col = 1, 4 do
        io.write("[X] ")
    end
    print()  -- New line after each row
end
```

Output:
```
Cargo Bay Status:
[X] [X] [X] [X]
[X] [X] [X] [X]
[X] [X] [X] [X]
```

### Coordinate Grid

```lua
print("Scanning sector grid:")
for y = 1, 3 do
    for x = 1, 3 do
        io.write(string.format("(%d,%d) ", x, y))
    end
    print()
end
```

Output:
```
Scanning sector grid:
(1,1) (2,1) (3,1)
(1,2) (2,2) (3,2)
(1,3) (2,3) (3,3)
```

### Breaking from Nested Loops

`break` only exits the innermost loop:

```lua
for deck = 1, 3 do
    print("Deck " .. deck .. ":")
    for room = 1, 5 do
        if room == 3 then
            print("  Obstruction at room 3 - skipping rest of deck")
            break  -- Only exits inner loop
        end
        print("  Room " .. room .. " clear")
    end
end
```

## Common Loop Patterns

### Accumulator (Sum)

```lua
local readings = {42, 38, 45, 41, 39}
local total = 0

for i = 1, #readings do
    total = total + readings[i]
end

local average = total / #readings
print("Average temperature: " .. average)
```

### Counter

```lua
local log = {"INFO", "ERROR", "INFO", "WARNING", "ERROR", "ERROR", "INFO"}
local error_count = 0

for _, entry in ipairs(log) do
    if entry == "ERROR" then
        error_count = error_count + 1
    end
end

print("Errors found: " .. error_count)
```

### Finding Values

```lua
local fuel_readings = {4500, 4200, 4800, 3900, 4100}

local min_fuel = fuel_readings[1]
local max_fuel = fuel_readings[1]

for i = 2, #fuel_readings do
    if fuel_readings[i] < min_fuel then
        min_fuel = fuel_readings[i]
    end
    if fuel_readings[i] > max_fuel then
        max_fuel = fuel_readings[i]
    end
end

print("Fuel range: " .. min_fuel .. " to " .. max_fuel)
```

### Processing Until Condition

```lua
local battery = 100

while battery > 20 do
    print("Battery: " .. battery .. "%")
    battery = battery - 15  -- Simulating power drain
end

print("Warning: Battery low at " .. battery .. "%")
```

---

Common mistakes that cause infinite loops:

```lua
-- WRONG: Forgetting to update the variable
local i = 1
while i <= 5 do
    print(i)
    -- Missing: i = i + 1
end

-- WRONG: Updating in the wrong direction
local i = 1
while i <= 5 do
    print(i)
    i = i - 1  -- Goes away from 5, not toward it!
end

-- WRONG: Condition can never be met
local i = 1
while i ~= 10 do
    print(i)
    i = i + 2  -- 1, 3, 5, 7, 9, 11... skips 10!
end
```

## Quick Reference

### Loop Types

```lua
-- While (checks before)
while condition do
    -- body
end

-- Repeat-Until (checks after, runs at least once)
repeat
    -- body
until condition

-- Numeric For
for var = start, stop, step do
    -- body
end

-- Generic For (tables)
for index, value in ipairs(array) do
    -- body
end

for key, value in pairs(table) do
    -- body
end
```

### Control

| Statement | Effect |
|-----------|--------|
| `break` | Exit the innermost loop immediately |

## What You've Learned

- `while` loops check condition before each iteration
- `repeat-until` loops check after (always run at least once)
- `for` loops are ideal for counting with known ranges
- `ipairs` iterates arrays; `pairs` iterates all table keys
- `break` exits a loop early
- Nested loops enable 2D patterns and complex iterations
- Always ensure your loop can eventually terminate!

---

Chief Engineer Rex shuts down the diagnostic display. "Repetition is the heartbeat of any system. Engines cycle, sensors poll, processors iterate. Now your programs can do the same—running until the job is done, however long that takes."

**Next:** [Lesson 10: Input and Output](../10_input_and_output/lesson.md)

---

## Challenges

### Challenge 1: System Diagnostic
*Practice basic for loops.*

Write a program that simulates checking 10 ship systems. For each system:
- Print "Checking system [number]..."
- Print "System [number]: OK"

---

### Challenge 2: Countdown Timer
*Practice while loops with user input.*

Write a countdown program that:
1. Asks user for a starting number
2. Counts down to 0, printing each number
3. Prints "Sequence complete!" at the end

---

### Challenge 3: Sensor Monitor
*Practice repeat-until with validation.*

Write a monitoring program that:
1. Asks for sensor readings until user enters -1
2. Tracks the highest reading seen
3. Prints the maximum reading when done

---

### Challenge 4: Crew Roster Processor
*Practice looping through tables.*

Given a crew table:
```lua
local crew = {
    {name = "Coder", role = "Captain", years = 30},
    {name = "Rex", role = "Engineer", years = 15},
    {name = "Stella", role = "Navigator", years = 12},
    {name = "Amara", role = "Comms", years = 8}
}
```

Write a program that:
1. Prints each crew member's info
2. Calculates total years of experience
3. Finds the most experienced crew member

---

### Challenge 5: Grid Scanner
*Practice nested loops.*

Write a program that displays a 5x5 grid where:
- Most cells show "."
- Position (3,3) shows "X" (center)
- Position (1,1) shows "S" (start)
- Position (5,5) shows "E" (end)

Expected output:
```
S . . . .
. . . . .
. . X . .
. . . . .
. . . . E
```

---

# Challenge: Flight Simulator

**XP Reward:** 100
**Estimated Time:** 35 minutes

## The Situation

Before any crew member can take the helm of the *Starship Lua*, they must pass the flight simulator challenge. In the training bay, ARIA runs this test for all aspiring pilots.

"The test is straightforward," ARIA explains. "I will select a target coordinate between 1 and 100. You will navigate to it by entering coordinates. I will tell you if you are too far forward, too far back, or on target. You have unlimited attempts, but skilled pilots find the target efficiently."

The challenge tests your ability to use loops, conditions, and user input together.

## Objectives

Create a Lua script called `flight_sim.lua` that:

1. Generates a random target coordinate between 1 and 100
2. Asks the pilot to enter their navigation coordinate
3. Tells them if they're too high, too low, or on target
4. Counts how many attempts it takes
5. Loops until they find the target
6. Displays a pilot rating based on their number of attempts

## Rating System

| Attempts | Rating |
|----------|--------|
| 1-5 | Ace Pilot! |
| 6-7 | Expert Navigator (Optimal approach) |
| 8-10 | Good piloting! |
| 11-15 | Acceptable, keep practicing |
| 16+ | You'll improve with more training |

## Expected Interaction

```
=================================
   STARSHIP LUA FLIGHT SIMULATOR
=================================

ARIA: Target coordinate locked between 1 and 100.
Navigate to the target.

Enter coordinate: 50
Too far forward! Adjust course.

Enter coordinate: 25
Too far back! Adjust course.

Enter coordinate: 37
Too far back! Adjust course.

Enter coordinate: 43
Too far forward! Adjust course.

Enter coordinate: 40
Too far back! Adjust course.

Enter coordinate: 41
Too far back! Adjust course.

Enter coordinate: 42

*** TARGET ACQUIRED ***

The coordinate was 42.
You reached it in 7 attempts.

Rating: Expert Navigator (Optimal approach)

ARIA: Simulation complete. Well done, pilot.
```

## Starter Template

```lua
-- Flight Simulator
-- Starship Lua Pilot Certification

-- Initialize random seed
math.randomseed(os.time())

-- Generate target coordinate
local target = math.random(1, 100)
local attempts = 0
local on_target = false

print("=================================")
print("   STARSHIP LUA FLIGHT SIMULATOR")
print("=================================")
print()
print("ARIA: Target coordinate locked between 1 and 100.")
print("Navigate to the target.")
print()

-- Main simulation loop
while not on_target do
    io.write("Enter coordinate: ")
    local coord = tonumber(io.read())

    -- Validate input
    if coord == nil then
        print("Please enter a valid number!")
    else
        -- Increment attempt counter
        attempts = ???

        -- Check coordinate against target
        if coord < target then
            -- Too low
        elseif coord > target then
            -- Too high
        else
            -- On target!
            on_target = ???
        end
    end
end

-- Display results
print()
print("*** TARGET ACQUIRED ***")
print()
print("The coordinate was " .. target .. ".")
print("You reached it in " .. attempts .. " attempt" .. (attempts == 1 and "" or "s") .. ".")
print()

-- Determine rating based on attempts
-- Your rating logic here

print()
print("ARIA: Simulation complete. Well done, pilot.")
```

## Hints

<details>
<summary>Hint 1: Incrementing Attempts</summary>

```lua
attempts = attempts + 1
```

Only increment when they enter a valid number!

</details>

<details>
<summary>Hint 2: Comparing Coordinate to Target</summary>

```lua
if coord < target then
    print("Too far back! Adjust course.")
elseif coord > target then
    print("Too far forward! Adjust course.")
else
    print("On target!")
    on_target = true
end
```

</details>

<details>
<summary>Hint 3: Rating Logic</summary>

Use if-elseif for the rating:

```lua
if attempts <= 5 then
    print("Rating: Ace Pilot!")
elseif attempts <= 7 then
    print("Rating: Expert Navigator (Optimal approach)")
-- continue for other ranges
end
```

</details>

<details>
<summary>Hint 4: Plural Handling</summary>

The template uses a ternary-like pattern for "attempt" vs "attempts":

```lua
(attempts == 1 and "" or "s")
```

If attempts is 1, add nothing. Otherwise, add "s".

</details>

## Bonus Challenges

*For extra practice (no additional XP)*

### Bonus 1: Range Validation
Check if the coordinate is between 1 and 100. If not, tell them and don't count it as an attempt.

### Bonus 2: Abort Option
Allow the pilot to type "abort" to end the simulation. Reveal the target and end gracefully.

### Bonus 3: Multiple Simulations
After completing the simulation, ask if they want to try again. Keep track of their best performance across attempts.

### Bonus 4: Navigation History
Keep track of all coordinates entered in a table. At the end, display the pilot's navigation path to the target.

### Bonus 5: Proximity Feedback
Instead of just "too high/too low", give proximity feedback:
- Within 5: "Very close! Almost there."
- Within 15: "Getting warmer..."
- More than 15: "Way off course."

## When You're Done

Run your script:
```bash
lua flight_sim.lua
```

Test these scenarios:
- Get it right on the first guess (lucky!)
- Use binary search strategy (should take ~7 attempts)
- Enter invalid input (letters, out of range)
- Run multiple times to verify random target changes

## The Optimal Strategy

For the curious: the optimal strategy is **binary search**:
1. Enter 50 (middle of 1-100)
2. If too high, enter 25 (middle of 1-49)
3. If too low, enter 75 (middle of 51-100)
4. Continue halving the range...

With binary search, you can always find any target in 1-100 within 7 attempts. That's why 6-7 attempts earns the "Optimal approach" rating!

---

*ARIA's holographic display flickers as you enter your final coordinate. When the target is acquired, the simulation chamber fills with green light. "SIMULATION COMPLETE," ARIA announces. "PILOT CERTIFICATION: APPROVED."*

*A small silver wings pin materializes on your uniform—the mark of a certified *Starship Lua* pilot. You're ready for real flight operations.*

---

## You Have Completed Core Training!

Congratulations! You've mastered the fundamentals of Lua programming aboard the *Starship Lua*. You now have the skills to:

- Write and run Lua programs
- Store and manipulate data with variables and tables
- Perform calculations and work with text
- Get input from users and display output
- Make decisions with conditional logic
- Repeat operations with loops

You're ready for any programming challenge the galaxy throws at you. Advanced training modules covering functions, file operations, and more complex data structures are coming soon.

Safe travels, crew member!
