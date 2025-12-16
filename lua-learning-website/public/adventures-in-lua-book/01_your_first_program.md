# Lesson 1: Your First Program

## Boarding the Starship Lua

The docking bay doors seal behind you. You're aboard. After months at the Orbital Academy, you've finally been assigned to a real ship: the *Starship Lua*, a mid-range exploration vessel operating in the Outer Spiral.

Captain Coder meets you at the airlock. They're taller than you expected, with dirty blonde hair, a well-trimmed beard, and sharp green-blue eyes that seem to be evaluating you already.

"New crew member. Good." They turn and walk toward the bridge. "Follow me. Your training starts now."

You hurry after them through corridors humming with power. Screens everywhere display system readouts, navigation data, cargo manifests—all running on code.

"Everything on this ship runs on Lua," the Captain says without looking back. "Life support. Navigation. Communications. Every system depends on programs written in Lua. If you're going to serve on this ship, you need to know how to write them."

They stop at a terminal in a small auxiliary room off the main corridor.

"Your first task. Make the computer respond to you."

## Setting Up Your Environment

Before you can write Lua programs, you need the Lua interpreter installed on your computer.

### Installing Lua

**Windows:**
1. Download the Lua binaries from [lua-users.org](http://lua-users.org/wiki/LuaBinaries) or use a package manager like [Scoop](https://scoop.sh/) (`scoop install lua`)
2. Add Lua to your system PATH
3. Open Command Prompt and type `lua -v` to verify installation

**macOS:**
1. Install via Homebrew: `brew install lua`
2. Open Terminal and type `lua -v` to verify installation

**Linux:**
1. Use your package manager: `sudo apt install lua5.4` (Ubuntu/Debian) or `sudo dnf install lua` (Fedora)
2. Open a terminal and type `lua -v` to verify installation

### Choosing an Editor

Any text editor works for Lua programming. Some popular options:

- **VS Code** — Free, with excellent Lua extensions for syntax highlighting and linting
- **Sublime Text** — Lightweight and fast
- **Notepad++** (Windows) — Simple and reliable
- **ZeroBrane Studio** — A Lua-specific IDE with built-in debugging

For beginners, VS Code with the "Lua" extension by sumneko is an excellent choice.

### Creating Your First File

1. Open your editor
2. Create a new file
3. Save it with a `.lua` extension (e.g., `hello.lua`)
4. Write your code
5. Save the file

### Running Lua Programs

Open a terminal (Command Prompt on Windows, Terminal on macOS/Linux), navigate to your file's location, and run:

```
lua hello.lua
```

The Lua interpreter reads your file and executes the code. You'll see the output directly in the terminal.

Now you're ready to write your first program.

## The Print Function

In Lua, the way to make the computer display a message is with the `print` function:

```lua
print("Systems online.")
```

Let's break this down:

- `print` — A **function** that tells the computer to display text on the screen
- `(` and `)` — Parentheses that contain the data you're passing to the function
- `"Systems online."` — A **string**: a sequence of text characters

When you run this program, the ship's computer (ARIA) displays:

```
Systems online.
```

That's it. One line of code, one line of output.

## Running Your Program

To run a Lua program, you save your code in a file with a `.lua` extension and execute it from a terminal.

If your file is named `diagnostic.lua`:

```
lua diagnostic.lua
```

ARIA processes your code and displays the results.

For now, focus on writing correct code. Your IDE or text editor is your terminal interface to the ship's systems.

## Strings: Text Data

The text inside the quotation marks is called a **string**. Strings represent text data—words, sentences, messages, anything made of characters.

Lua accepts both double quotes and single quotes:

```lua
print("Double quotes work.")
print('Single quotes also work.')
```

Both produce valid output. Pick one style and use it consistently.

### What Can Strings Contain?

Almost any character:

```lua
print("Numbers in text: 42")
print("Symbols: @#$%^&*()")
print("Coordinates: Sector 7-G, Grid 12.5")
```

### Special Characters

Sometimes you need characters that would confuse Lua. Use a backslash (`\`) to "escape" them:

```lua
print("Captain says: \"All hands, report.\"")  -- Quotes inside a string
print("Line one\nLine two")                     -- \n creates a new line
print("Column A\tColumn B")                     -- \t creates a tab
```

Output:
```
Captain says: "All hands, report."
Line one
Line two
Column A	Column B
```

## Multiple Statements

Programs usually contain more than one line. Each `print` statement executes in order, top to bottom:

```lua
print("Initializing ship systems...")
print("Running diagnostic check...")
print("All systems operational.")
```

Output:
```
Initializing ship systems...
Running diagnostic check...
All systems operational.
```

When ARIA reaches the end of your program, execution stops.

## When Something Goes Wrong

If you make a mistake, ARIA reports an error. For example:

```lua
print("Incomplete transmission)
```

This string is missing its closing quote. ARIA responds:

```
lua: diagnostic.lua:1: unfinished string near '"Incomplete transmission)'
```

This tells you:
- **File:** `diagnostic.lua`
- **Line:** `1`
- **Problem:** "unfinished string" — you started text but never closed it

Errors aren't failures. They're diagnostic information. Read them, locate the problem, fix it, run again.

## Comments: Notes for Humans

Sometimes you need to leave notes in your code—explanations for yourself or other programmers. Lua ignores anything after two dashes (`--`):

```lua
-- This line is a comment. ARIA ignores it.
print("Hello!")  -- Comments can follow code on the same line
```

Comments don't affect how your program runs. They exist only for human readers.

Use comments when something isn't obvious from the code itself:

```lua
-- Display startup sequence (required by safety regulations)
print("Starship Lua: Systems Check")
print("Life support: Active")
print("Navigation: Online")
```

## Quick Reference

| Concept | Example |
|---------|---------|
| Display text | `print("text")` |
| String (double quotes) | `"Hello"` |
| String (single quotes) | `'Hello'` |
| New line in string | `\n` |
| Tab in string | `\t` |
| Quote inside string | `\"` or `\'` |
| Comment | `-- note` |
| Run a Lua file | `lua filename.lua` |

## What You've Learned

- The `print` function displays output to the screen
- Strings are text data wrapped in quotes
- Double (`"`) and single (`'`) quotes both work
- Escape sequences handle special characters
- Comments (`--`) are notes Lua ignores
- Error messages help you find and fix problems

---

Captain Coder glances at your terminal. "Good. You can make it respond. But a computer that only talks isn't useful. Tomorrow, you learn to make it remember."

---

**Next:** [Lesson 2: Variables and Values](../02_variables_and_memory/lesson.md)

---

## Challenges

### Challenge 1: System Boot Message
*Write your first ship diagnostic program.*

The ship's boot sequence needs a standard message. Write a program that displays:

```
Starship Lua - Diagnostic System
Status: Operational
```

**Objectives:**
- Create a new file called `boot.lua`
- Use `print` to display the two-line message above
- Run your program and verify the output

---

### Challenge 2: Crew Manifest Entry
*Practice multiple print statements.*

Quartermaster Chen needs a simple crew display. Write a program that outputs:

```
=== Crew Manifest ===
Captain Coder - Commanding Officer
Dr. Patel - Science Officer
Navigator Stella - Astrogation
```

**Objectives:**
- Create a file called `manifest.lua`
- Use at least 4 `print` statements
- Include the header line and three crew members
- Add a comment at the top explaining what the program does

---

### Challenge 3: Distress Signal Format
*Practice escape sequences.*

Comms Officer Amara is training you on standard message formats. Write a program that displays:

```
SIGNAL TYPE: Distress
MESSAGE: "All ships in sector, respond."
COORDINATES:
	X: 127.5
	Y: 89.2
	Z: 12.0
```

**Objectives:**
- Create a file called `signal.lua`
- Use `\"` to include quotes in the MESSAGE line
- Use `\n` for new lines OR separate print statements (your choice)
- Use `\t` for the tabbed coordinate values

---

# Challenge: First Transmission

**XP Reward:** 50
**Estimated Time:** 15 minutes

## The Situation

You've just settled into your quarters aboard the *Starship Lua*. A notification blinks on your terminal: "New crew members must register with ARIA, the ship's AI, by submitting a personal introduction program."

Captain Coder's voice comes over the intercom: "All new personnel, complete your registration before 1800 hours. ARIA needs to know who's on board."

Your first official task: write a program that introduces yourself to the ship's systems.

## Objectives

Create a Lua script called `introduction.lua` that prints the following three things, each on its own line:

1. Your name (or the name of your crew character)
2. Your home planet or station
3. Why you joined the crew of the *Starship Lua*

## Requirements

- Use the `print` function for each line
- Each piece of information must be on its own line
- Your script must run without errors

## Example Output

Your output might look something like this (but with your own details):

```
Crew Member: Alex Chen
Origin: Titan Station, Saturn Orbit
Assignment: I'm here to learn ship systems programming and explore the Outer Spiral.
```

Or perhaps:

```
Name: Jordan Reyes
Home: New Eden Colony, Kepler-442b
Mission: To master Lua and earn my pilot certification.
```

## Hints

<details>
<summary>Hint 1: Basic Structure</summary>

Your script will have three `print` statements, one after another:

```lua
print("First line here")
print("Second line here")
print("Third line here")
```

</details>

<details>
<summary>Hint 2: Special Characters</summary>

If your name or place has an apostrophe (like "O'Brien" or "Dragon's Nebula"), you can either:
- Use double quotes: `print("I'm from Dragon's Nebula")`
- Or escape the apostrophe: `print('I\'m from Dragon\'s Nebula')`

</details>

## Bonus Challenge

*For extra practice (no additional XP)*

Add a fourth line that includes your crew motto or personal mission statement. Use escape sequences to include quotation marks.

Example:
```
My motto: "Code clean, fly safe, explore always."
```

## When You're Done

Run your script:
```bash
lua introduction.lua
```

If it runs without errors and displays your three-line introduction, congratulations—ARIA has registered you as an official crew member of the *Starship Lua*.

---

*Your terminal flashes green as ARIA processes your introduction. "CREW MEMBER REGISTERED," the AI announces. "Welcome aboard. Report to the bridge for your first assignment."*

---

**Next Lesson:** [Variables and Values](../02_variables_and_memory/lesson.md)
