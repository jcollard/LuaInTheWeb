# Guide writing style

How to write the student guides in `lua-learning-website/public/projects/` (for example
`space_game_project/guide.html` and its `bonus/` challenges). The `/copy-edit` command checks guides
against this file.

Who's reading: one student, aged 10 to 14, learning Lua by building a game. They might be reading
alone at home with nobody to ask.

## Voice

- Talk to one student as "you". Don't write as a first-person teacher ("I"); the guides speak
  directly, in plain friendly sentences.
- Never address a group: no "everyone", "students", "learners", or "class".
- Sound like a friendly teacher sitting next to the student, not like a textbook or a product page.
- Use "we" only for something you're doing together right now ("We'll write new versions of both in
  the next steps"), and not more than once in a while.
- Describe what the student already knows as something they've done ("the reverse loop you wrote for
  meteors"), not as a test they might fail ("You should already know...").
- Be supportive by being specific. "Your meteors now break apart when you hit them" is better than
  "Great job!".
- Treat mistakes as normal. Say what a common mistake looks like and how to fix it, without blame: "If
  you get an error about a nil value, check the spelling of the variable name."
- Never call a step easy. Avoid "simply", "just", "easy", "obviously", "of course", and "clearly". If
  it turns out to be hard for them, those words make them feel slow.
- Be honest about difficulty: "This next part is tricky. Take it slowly."

## Clarity

- Aim for a 5th to 7th grade reading level. Most sentences should be under 20 words.
- Introduce one new idea at a time. Explain a new term in plain words the first time it appears, then
  keep using the same word for it.
- Explain math in plain words before using it: what `math.floor`, `%`, or `math.sin` does to a number.
- Say exactly where code goes: which section (GAME STATE, USER INPUT, UPDATE, DRAW) and what it comes
  after. Use the "Where:" line for this in the main guide.
- When code is typed now and replaced in a later step, say so, so the student doesn't wonder why
  they're typing it.
- After every part, the "Check Your Work" list says what the student should see when they run the game.
- Explain why, briefly, after they see something work. Doing comes first, then the explanation.
- No idioms or slang that might confuse a non-native speaker ("a piece of cake", "under the hood").

## Tasks, hints, and solutions

- "TYPE THIS CODE" steps are for code the student can't be expected to work out (a new API call,
  asset loading). "CHALLENGE" steps are for applying what they've learned.
- The task text must contain everything needed to finish the task. Hints help the student think; they
  must not be the only place a required detail appears. In particular:
  - Name every variable and constant a later task or hint refers to (`MIN_SPAWN_INTERVAL`, not "a
    constant for the fastest spawn interval").
  - Give every number the solution depends on (speeds, sizes, times).
  - Say where the code goes when it isn't obvious.
- Hints go from a nudge to nearly the answer. The last hint should make the task solution feel like a
  small step.
- Every snippet must match the reference solution exactly, except where a later task replaces it (say
  so in the later task).

## Bonus challenges

- Students do bonus challenges in any order and keep building on the same `game.lua`, so their game
  usually isn't the plain Part 7 code.
- New HUD lines: say "one line below your last HUD line", not a fixed `y`. Don't make a snippet rewrite
  the whole controls text, which erases what other challenges added.
- When another challenge changes the code a task depends on, add a short "If you did Bonus N" note.
  The known ones are Bonus 5 (per-meteor `w`, `h`, `speed`, `image`), Bonus 10 (`state` replaces
  `game_over`), Bonus 8 (`spawn_laser` gets `vx`; a speed boost), and Bonus 7 (`dt` moves to the top of
  `update()`).
- Refer to other challenges by number and name ("Bonus 2: Fire Cooldown"), never as "the cooldown one".
- Things the main guide never teaches need a New Concepts entry before they're used, for example
  `math.random(n)` with one argument, or `math.random(10, 20) / 10` for a decimal.

## Avoid sounding like AI

- No stock openers or closers: "Let's dive in", "In this guide, we will explore", "Happy coding!",
  "And that's it!".
- No filler: "It's important to note", "It's worth mentioning", "Keep in mind that".
- Don't stack things in threes by habit, and avoid the "not just X, but Y" pattern.
- Don't use em-dashes. Use a period, a comma, or a colon instead. In concept lists, write
  "`math.floor(x)` rounds down to a whole number", not "`math.floor(x)` — rounds down".
- Don't end sections with a summary that repeats what they just did.
- Keep bold and headings for things a student needs to find again. No emoji.
- Praise stays to one concrete sentence about what their game now does. Don't compare them to
  professionals.
- Vary sentence length. Short sentences are fine. So is the occasional long one, when the idea needs it.
- Use at most a couple of exclamation marks per page, and only when something exciting happens on
  screen.

## Code in guides

- Code in a guide must match the reference solution exactly (the "Stuck?" listing in `guide.html`, or
  `solution.lua` for a bonus challenge).
- Use names a kid would choose and understand (`ship_speed`, `invincible_timer`).
- Comments in student code are short and only explain the why.
- Copy-editing never changes code blocks. `/copy-edit` checks this with a fingerprint of every `<pre>`
  block. It may add inline `<code>` to prose, for example to name a variable in task text.
