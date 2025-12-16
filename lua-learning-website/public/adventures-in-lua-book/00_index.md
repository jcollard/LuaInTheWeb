# Adventures In Lua

Welcome aboard the *Starship Lua*! This guide will teach you Lua programming through practical ship operations.

---

## Lessons

### [Lesson 1: Your First Program](01_your_first_program.md)

**Topics covered:**
- The `print` function displays output to the screen
- Strings are text data wrapped in quotes
- Double (`"`) and single (`'`) quotes both work
- Escape sequences handle special characters
- Comments (`--`) are notes Lua ignores
- Error messages help you find and fix problems

*Includes challenges*

---

### [Lesson 2: Variables and Values](02_variables_and_values.md)

**Topics covered:**
- Variables store data under names you choose
- Use `local` when creating variables—it's standard Lua practice
- The `=` operator assigns values to variables
- Variables can be updated as your program runs
- `io.read()` gets input from the user and returns it as text
- Names should be descriptive and follow Lua's naming rules
- `nil` represents the absence of a value
- Multiple assignment can set several variables at once

*Includes challenges*

---

### [Lesson 3: Tables — Lua's Most Powerful Tool](03_tables_luas_most_powerful_tool.md)

**Topics covered:**
- Tables are Lua's universal data structure
- Use lists (arrays) with numbered indices starting at 1
- Use dictionaries with named keys for structured data
- Tables can contain other tables for complex structures
- The `#` operator gives list length (numbered items only)
- `table.insert` and `table.remove` manage list items
- Tables are passed by reference, not copied

*Includes challenges*

---

### [Lesson 4: Functions](04_functions.md)

**Topics covered:**
- Functions are reusable blocks of code
- `local function name()` defines a function
- Parameters let functions receive data
- `return` sends values back to the caller
- Functions can return multiple values
- Functions can create and return tables
- Variables inside functions are local (scoped)
- Functions help organize and simplify code

---

### [Lesson 5: Basic Decisions](05_basic_decisions.md)

**Topics covered:**
- Booleans (`true` and `false`) represent truth values
- `if` statements execute code only when a condition is true
- `else` provides an alternative path when the condition is false
- `==` compares strings for equality
- `~=` checks if strings are different
- String comparison is case-sensitive
- Nested if statements allow multi-step decisions
- Interactive programs use if statements to respond to user choices

---

### [Lesson 6: Numbers and Math](06_numbers_and_math.md)

**Topics covered:**
- Lua supports standard arithmetic: `+`, `-`, `*`, `/`, `//`, `%`, `^`
- `tonumber()` converts text input to numbers for math operations
- Order of operations follows PEMDAS
- Use parentheses to clarify complex expressions
- The `math` library provides advanced functions
- Seed `math.random` for different results each run
- Block comments (`--[[` and `]]`) disable multiple lines

*Includes challenges*

---

### [Lesson 7: Strings and Text](07_strings_and_text.md)

**Topics covered:**
- Strings are sequences of characters in quotes
- Use `..` to concatenate strings
- The string library provides `upper`, `lower`, `sub`, `find`, `gsub`, and more
- `string.format` gives precise control over output
- `tonumber` and `tostring` convert between types
- Strings compare alphabetically and are case-sensitive

*Includes challenges*

---

### [Lesson 8: Advanced Decisions](08_advanced_decisions.md)

**Topics covered:**
- `if` statements execute code conditionally
- Use `else` for an alternative path
- Use `elseif` for multiple conditions
- Comparison operators: `==`, `~=`, `<`, `>`, `<=`, `>=`
- Logical operators: `and`, `or`, `not`
- Only `false` and `nil` are falsy in Lua
- The and-or idiom can replace simple ternary operations

*Includes challenges*

---

### [Lesson 9: Loops](09_loops.md)

**Topics covered:**
- `while` loops check condition before each iteration
- `repeat-until` loops check after (always run at least once)
- `for` loops are ideal for counting with known ranges
- `ipairs` iterates arrays; `pairs` iterates all table keys
- `break` exits a loop early
- Nested loops enable 2D patterns and complex iterations
- Always ensure your loop can eventually terminate!

*Includes challenges*

---

### [Lesson 10: Input and Output](10_input_and_output.md)

**Topics covered:**
- `io.write()` outputs without a newline (unlike `print()`)
- Use `io.write` with `io.read` for professional same-line prompts
- `io.read("*n")` reads numbers directly (alternative to `tonumber()`)
- Always validate user input before using it
- Validation patterns help create robust, user-friendly programs

*Includes challenges*

---

## Quick Reference

| # | Lesson | Challenges |
|---|--------|------------|
| 1 | [Lesson 1: Your First Program](01_your_first_program.md) | Yes |
| 2 | [Lesson 2: Variables and Values](02_variables_and_values.md) | Yes |
| 3 | [Lesson 3: Tables — Lua's Most Powerful Tool](03_tables_luas_most_powerful_tool.md) | Yes |
| 4 | [Lesson 4: Functions](04_functions.md) | — |
| 5 | [Lesson 5: Basic Decisions](05_basic_decisions.md) | — |
| 6 | [Lesson 6: Numbers and Math](06_numbers_and_math.md) | Yes |
| 7 | [Lesson 7: Strings and Text](07_strings_and_text.md) | Yes |
| 8 | [Lesson 8: Advanced Decisions](08_advanced_decisions.md) | Yes |
| 9 | [Lesson 9: Loops](09_loops.md) | Yes |
| 10 | [Lesson 10: Input and Output](10_input_and_output.md) | Yes |
