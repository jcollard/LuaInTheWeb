# Authoring a Space Shooter bonus challenge

Paths below are relative to the worktree root:
`/home/ser/git/jcollard/AdventuresInLua/LuaInTheWeb/.claude/worktrees/space-game-bonus`

## Context

`lua-learning-website/public/projects/space_game_project/guide.html` is an 8-part tutorial (Parts 0–7)
where students (beginners, learning Lua) build a space shooter in `game.lua`. The finished Part 7 code is
`scripts/space-game-bonus/base.lua` — READ IT FIRST. It defines the exact variable/function names students have:
`ship_x/ship_y/ship_w/ship_h/ship_speed`, `lasers` (tables `{x, y}`), `laser_w/laser_h/laser_speed`,
`meteors` (tables `{x, y}`), `meteor_w/meteor_h/meteor_speed`, `spawn_timer/spawn_interval`, `score`,
`game_over`, `stars`, `generate_star`, `init_stars`, `check_collision(a_x, a_y, a_w, a_h, b_x, b_y, b_w, b_h)`,
`spawn_meteor()`, `spawn_laser(x, y)`, `reset_game()`, `user_input()`, `update()`, `draw()`, `game()`.

Also skim `guide.html` (e.g. Parts 4–5) to see the teaching voice: short sentences, concrete, friendly,
explains WHY. Concepts students already know: variables, if, functions, tables as records, lists with
`table.insert`/`table.remove`, `ipairs` forward loops, reverse `for i = #t, 1, -1` loops for removal,
nested loops with `break`, timers (`timer = timer + dt`), `math.random`, `math.max/min`, AABB collision,
`canvas.is_key_down` vs `canvas.is_key_pressed`, `canvas.get_text_width` for centering, `set_color` with
alpha (0–255), `fill_rect`, `draw_image(name, x, y, w, h)`, `draw_text`, `set_font_size`.

We are adding a `bonus/` folder: one self-contained HTML page per challenge. You write the SOURCES; a
generator (`scripts/space-game-bonus/build.py`) wraps them in the page template (title, tier badge, "Before you
start" box with prerequisites/new files/backup tip, and the "Reference Solution" section with a warning
that copy/paste won't work). Do NOT write `<html>`, headers, the before-start box, or the reference section.

## Files to create per challenge

`scripts/space-game-bonus/challenges/NN_slug/`:

1. `meta.json` — `{num, slug, title, tier, subtitle, summary, prereqs: [nums], new_files: ["images/x.png", ...]}`
   - `subtitle`: one sentence shown under the title. `summary`: 1–2 sentences for the index page.
   - `new_files`: project asset files this challenge uses that are not in the base game (paths relative
     to `space_game_project/`).
2. `content.html` — body fragment. Follow the exemplar EXACTLY in structure and classes:
   `scripts/space-game-bonus/challenges/01_difficulty_ramp/content.html`.
   - `.concepts` box ("New Concepts") with the new API/ideas.
   - Optional `step step-copy` blocks (badge `TYPE THIS CODE`) ONLY for boilerplate the student can't
     reasonably derive (e.g. asset-loading lines, an unfamiliar API call). Keep these rare.
   - 3–6 `step step-challenge` tasks, titled `Task N: ...`. Each: `.step-task` (what to achieve, not
     line-by-line instructions; no "Where:" line unless it's genuinely non-obvious), optional
     `.step-note`, 2–3 progressive `.hint` (first = nudge, last = nearly the answer), `btn-hint` with
     correct `data-total` and label `Show Hint (1/N)`, and a `.solution` snippet with `btn-solution`.
   - `.check-work` list of observable behaviors when running the game.
   - `.stretch` "Going Further" list of 2–3 open-ended ideas.
   - Inside `<code class="lua">` blocks, HTML-escape `<`, `>`, `&` (`&lt;` `&gt;` `&amp;`). Code blocks must
     start right after `<code class="lua">` with no leading newline.
   - Snippets must match the solution file exactly (same names, numbers).
3. `solution.lua` — the COMPLETE `game.lua` = `base.lua` + this challenge only (unless prereqs: then
   base + prereq challenge(s) + this one, and build on the prereq's solution file). Change the header
   comment to `-- Space Shooter — Bonus N: Title` + a one-line description. Keep the base's style
   and section headers (`-- ====` blocks). Prefer minimal, readable changes a beginner could write.
   Comment new sections briefly. No `goto`, no metatables/OOP, no closures-as-objects, no string
   patterns unless the challenge is about them.

## Canvas API notes (this runtime)

- Lua 5.4 (wasmoon). `local canvas = require("canvas")`.
- Assets: `canvas.assets.add_path("images")` is already in base. For other folders add
  `canvas.assets.add_path("sounds")` / `("fonts")`. Load BEFORE `canvas.start()`:
  `canvas.assets.load_image(name, file)`, `load_sound(name, file)`, `load_font(name, file)`.
- `canvas.play_sound(name, volume?)` (volume 0–1). `canvas.mute()`, `canvas.unmute()`, `canvas.is_muted()`.
- `canvas.set_font_family(name)` uses a loaded font; `canvas.set_font_family("monospace")` for default-ish.
- Transforms: `canvas.save()`, `canvas.translate(x, y)`, `canvas.rotate(radians)`, `canvas.scale(sx, sy)`,
  `canvas.restore()` — always balance save/restore within a frame.
- `canvas.set_global_alpha(0..1)`; `canvas.set_color(r, g, b, a?)` with a in 0–255.
- `canvas.fill_circle(x, y, r)`, `canvas.draw_circle`, `canvas.draw_rect`, `canvas.draw_line(x1,y1,x2,y2)`,
  `canvas.set_line_width(w)`.
- `canvas.get_time()` seconds since start; `canvas.get_delta()` frame dt.
- Keys: `canvas.keys.LEFT/RIGHT/UP/DOWN/SPACE/ENTER/ESCAPE/P/M/A..Z/DIGIT_1...` (letters are `canvas.keys.P`).
- Mouse: `canvas.get_mouse_x()`, `get_mouse_y()`, `is_mouse_down(0)`, `is_mouse_pressed(0)` (0 = left).
- Gamepad (1-based index): `canvas.get_gamepad_count()`, `is_gamepad_connected(1)`,
  `get_gamepad_axis(1, canvas.axes.LEFT_STICK_X)` (-1..1), `get_gamepad_button(1, canvas.buttons.SOUTH)`
  (0..1), `is_gamepad_button_pressed(1, canvas.buttons.SOUTH)`. SOUTH = Xbox A / PS Cross. Also START.
- Persistent storage: `local localstorage = require("localstorage")`, `localstorage.set_prefix("space_")`,
  `localstorage.get_item(key)` → string or nil, `localstorage.set_item(key, value)` (value converted to string).

## Assets available (already copied into the project)

images/ (WxH px): blue_ship.png 99x75, laser.png 9x54, meteor.png 101x84 (base game), life.png 33x26
(small blue ship icon for lives HUD), meteor_small.png 28x28, meteor_med.png 43x43, meteor_grey.png 101x84,
powerup_triple.png 34x33 (blue star), powerup_shield.png 34x33 (green shield), powerup_speed.png 34x33
(yellow bolt), shield.png 133x108 (bubble around ship), enemy.png 93x84 (red enemy ship, nose points DOWN),
enemy_laser.png 9x54 (red laser), boss.png 103x84 (black enemy ship, points DOWN; draw it bigger).
sounds/: laser.ogg, enemy_laser.ogg, hit.ogg, powerup.ogg, hurt.ogg, game_over.ogg.
fonts/: kenvector_future.ttf (sci-fi display font).

## Testing (REQUIRED)

Run each solution through the headless harness (mock canvas, random input incl. SPACE/ENTER/P/M/arrows,
mouse, one gamepad; fails on errors, unknown API, unloaded/missing assets, NaN draw args, unbalanced
save/restore):

    lua scripts/space-game-bonus/harness.lua scripts/space-game-bonus/challenges/NN_slug/solution.lua lua-learning-website/public/projects/space_game_project 20000 1
    lua scripts/space-game-bonus/harness.lua scripts/space-game-bonus/challenges/NN_slug/solution.lua lua-learning-website/public/projects/space_game_project 20000 2

Also reason through the logic yourself (the harness only catches crashes). Then run
`python3 scripts/space-game-bonus/build.py` to confirm the page builds. Don't use `cd`; use paths relative to the
worktree root (your working directory). Don't edit anything outside `scripts/space-game-bonus/challenges/<yours>/`.
