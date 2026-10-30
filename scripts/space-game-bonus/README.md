# Space game bonus challenges: sources and tools

The pages in `lua-learning-website/public/projects/space_game_project/bonus/` are **generated**.
Edit the sources here, then rebuild. Don't edit the generated HTML by hand.

## Layout

| Path | What it is |
|---|---|
| `challenges/NN_slug/meta.json` | Number, title, tier, subtitle, index summary, prerequisites, new asset files |
| `challenges/NN_slug/content.html` | Page body: concepts, tasks, hints, snippet solutions, check-your-work, going further |
| `challenges/NN_slug/solution.lua` | Full reference `game.lua` (Part 7 + this challenge, plus any prerequisites) |
| `base.lua` | Finished Part 7 code, extracted from `guide.html`. Every challenge starts here |
| `base.css`, `base.js` | Styling and behavior copied from `guide.html` (hints, solutions, copy-blocking, highlighting) |
| `AUTHORING.md` | How to write a new challenge (format, API notes, available assets) |

## Commands

```bash
python3 scripts/space-game-bonus/build.py            # regenerate bonus/*.html (incl. 00_start_here.html)
python3 scripts/space-game-bonus/test_all.py         # run every solution through the harness (3 seeds) and
                                                      # check snippet lines appear in the solution
node scripts/space-game-bonus/check_pages.mjs        # render pages in a sandboxed iframe, click every hint/solution,
                                                      # report JS errors, save screenshots to tmp/bonus-shots/
python3 scripts/space-game-bonus/update_manifest.py  # list every space_game_project file in projects/manifest.json
```

`harness.lua` is a headless test runner. It mocks the canvas API, feeds random keyboard/mouse/gamepad
input, and fails on Lua errors, unknown canvas functions, missing or unloaded assets, NaN draw values,
and unbalanced `save`/`restore`. It can't check what the game looks like.

```bash
lua scripts/space-game-bonus/harness.lua path/to/game.lua lua-learning-website/public/projects/space_game_project 20000 1
```

Some `test_all.py` snippet warnings are expected: a few tasks show an early version of a line that a
later task replaces.
