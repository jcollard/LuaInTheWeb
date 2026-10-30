---
description: Copy-edit a student guide for voice and style. Runs a local style check, then 4 outside-model readers through OpenRouter (AI-sounding text, kid readability, guide voice, supportiveness), merges their findings, and applies the edits you approve without touching code.
argument-hint: "<guide.html [part N] | bonus NN>"
---

# Copy-edit pass

Arguments: `$ARGUMENTS`

Adapted from html-escape-room's `copy-edit-pass` skill. Tools live in `scripts/copy-edit/`. The style
rules are in [docs/guide-style.md](../../docs/guide-style.md). You're the final editor: the readers
advise, and you decide.

Copy-editing changes guide text, so do it in a worktree like any other change.

## 0. Pick the target

| Argument | File to edit | Extra flag |
|---|---|---|
| `bonus NN` | `scripts/space-game-bonus/challenges/NN_*/content.html` (plus title/subtitle in `meta.json`) | none |
| a guide path, e.g. `space_game_project` | `lua-learning-website/public/projects/<project>/guide.html` | `--part N` for one tab |

Bonus pages in `public/.../bonus/` are generated. **Never edit them directly.** Edit the source in
`scripts/space-game-bonus/challenges/`, then rebuild (step 6).

Tabbed guides are long (the space game guide is about 6,000 words), so copy-edit one part at a time
with `--part N`. If no part is given, ask which one, or go through them in order.

Read the target and `docs/guide-style.md` before starting. To see the text exactly as the readers
see it:

```bash
python3 scripts/copy-edit/guide_text.py <file> [--part N]
```

## 1. Run the local style check

```bash
python3 scripts/copy-edit/lint_style.py <file> [--part N]
```

This catches banned phrases (`scripts/copy-edit/banned-phrases.txt`), em-dashes, long sentences,
words that talk to a group, "we" overuse, and reading level, with no model calls. Line numbers refer
to the extracted text, not the HTML. Fix these first, since they're cheap and the readers don't need
to repeat them. Use judgement: "just like the meteor timer" (meaning "the same way as") is fine, and
"Note:" labels are part of the layout.

## 2. Record a fingerprint of the code

```bash
python3 scripts/copy-edit/lint_style.py --code-hash <file>
```

This hashes every `<pre>` code block in the whole file. Save the output. Copy-editing must never
change code blocks, and you'll check it again at the end. Inline `<code>` spans are only counted:
an edit may add one (for example to name a variable in task text), but must not change or drop an
existing one by accident.

## 3. Run the readers

```bash
python3 scripts/copy-edit/run_readers.py <file> [--part N]
```

Needs network access to `openrouter.ai`. The script reads `OPEN_ROUTER_KEY` (or `OPENROUTER_API_KEY`)
from the environment, or from `.env` at the repo root. If it's missing, tell the user.

Each reader in `scripts/copy-edit/readers.json` is a different model family with its own rubric in
`scripts/copy-edit/rubrics/`. They run in parallel. Results go to
`reports/copy-edit/<guide>/<timestamp>/` (git-ignored): one JSON file per reader, `guide.txt` (the
text they saw), and `summary.md`. The script marks quotes that don't appear in the text.

If a reader fails, rerun only that one into the same folder:

```bash
python3 scripts/copy-edit/run_readers.py <file> [--part N] --only <reader-id> --into reports/copy-edit/<guide>/<timestamp>
```

Thinking models can spend their whole token budget on hidden reasoning and return an empty reply
(`finish_reason: length`). A reader can set its own `max_tokens` and `reasoning` (for example
`{"effort": "low"}`) in `readers.json`.

## 4. Merge the findings

Read every reader's findings, then:
- **Drop** findings whose quote wasn't found, unless the passage they mean is obvious.
- **Drop** anything that would change code, technical meaning, step order, or what "Check Your Work"
  says the student should see. Also drop anything that removes information a student needs, such as a
  variable name, a number, or where code goes. Those were often added after a student review.
- **Check each suggested rewrite against `docs/guide-style.md`.** Readers sometimes suggest
  replacements that sound just as much like AI, so rewrite those yourself.
- **Merge** overlapping findings. When two or more readers flag the same passage, give it high priority.
- When readers disagree, follow `docs/guide-style.md`. If it doesn't settle the question, ask the user.

## 5. Present and apply

Show the user a short list grouped by priority. For each item, show before → after and which readers
flagged it. Ask them to choose apply all, pick some, or skip.

Write the edits as a proposals file, `reports/copy-edit/<guide>/<timestamp>/proposals.json`, so they
can be checked and applied mechanically:

```json
{"target": "lua-learning-website/public/projects/space_game_project/guide.html",
 "edits": [{"id": 1, "priority": "high", "readers": ["kid-reader", "lint"],
            "before": "exact raw HTML, unique in the file", "after": "replacement HTML",
            "why": "short reason"}]}
```

For a bonus challenge use `"bonus": "NN_slug"` instead of `"target"`, and `"file": "meta.json"` on
edits to the title or subtitle. `before`/`after` are raw HTML: readers quote `backticks` where the HTML
has `<code>`, and "—" where it has `&mdash;`. Put variable and function names in `<code>`. Keep the
HTML structure and classes unchanged.

Check the proposals before showing them, then apply the approved ones:

```bash
python3 scripts/copy-edit/apply_edits.py <proposals.json>                     # check only
python3 scripts/copy-edit/apply_edits.py <proposals.json> --apply [--ids 1,4,7]
```

It refuses to apply if a `before` isn't found exactly once, edits overlap, a code block changes, or a
JSON file breaks. It warns if an inline code span disappears.

## 6. Verify

- Run `--code-hash` again. The code blocks must match step 2. If they don't, find and undo the code
  change. If the inline count went down, check which span went missing.
- Run the local style check again. It should be clean, or close to it.
- For a bonus challenge, rebuild and check the pages:
  ```bash
  python3 scripts/space-game-bonus/build.py
  python3 scripts/space-game-bonus/test_all.py
  node scripts/space-game-bonus/check_pages.mjs
  ```
- Write `reports/copy-edit/<guide>/<timestamp>/applied.md` listing what changed and what was skipped,
  with reasons.

Tell the user what changed, and whether any reader had a pattern of complaints worth adding to
`docs/guide-style.md` or `scripts/copy-edit/banned-phrases.txt`.
