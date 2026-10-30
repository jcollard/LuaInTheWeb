#!/usr/bin/env python3
"""Check, and optionally apply, a copy-edit proposals file.

Usage: apply_edits.py proposals.json [--apply] [--ids 1,2,5]

Proposals format (see .claude/commands/copy-edit.md):
  {"target": "path/to/guide.html",            # repo-relative; or "bonus": "NN_slug"
   "edits": [{"id": 1, "priority": "high", "readers": ["kid-reader"],
              "file": "content.html",          # optional; relative to the target's folder
              "before": "exact HTML, unique in the file", "after": "replacement HTML",
              "why": "..."}]}

Checks that each `before` appears exactly once, that edits don't overlap, that
<pre> code blocks are unchanged, and that a JSON file stays valid. New inline
<code> spans are allowed (task text can name variables); removed ones are
reported as warnings to double-check. With --apply, writes the files only if
every check passes.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CODE = re.compile(r'<code[^>]*>(.*?)</code>', re.S)
BLOCK = re.compile(r'<pre[^>]*>(.*?)</pre>', re.S)


def target_of(prop):
    """(folder, default file name) the edits apply to."""
    if 'target' in prop:
        t = REPO / prop['target']
        return t.parent, t.name
    return REPO / 'scripts' / 'space-game-bonus' / 'challenges' / prop['bonus'], 'content.html'


def locate(text, edits, fname):
    """Find each edit's span; report missing, repeated, or overlapping ones."""
    problems, spans = [], []
    for e in edits:
        n = text.count(e['before'])
        if n != 1:
            problems.append(f"edit {e['id']}: 'before' found {n} times in {fname}: {e['before'][:80]!r}")
            continue
        i = text.index(e['before'])
        spans.append((i, i + len(e['before']), e))
    spans.sort(key=lambda s: s[0])
    for a, b in zip(spans, spans[1:]):
        if b[0] < a[1]:
            problems.append(f"edits {a[2]['id']} and {b[2]['id']} overlap")
    return spans, problems


def check_result(fname, before, after):
    problems = []
    if fname.endswith('.json'):
        try:
            json.loads(after)
        except json.JSONDecodeError as err:
            problems.append(f"{fname} is not valid JSON after edits: {err}")
    if BLOCK.findall(after) != BLOCK.findall(before):
        problems.append(f"{fname}: code blocks (<pre>) changed")
    removed = Counter(CODE.findall(before)) - Counter(CODE.findall(after))
    if removed:
        print(f"{fname}: WARNING inline code removed (check it's intended): {list(removed.elements())}")
    return problems


def run(prop, ids=None, apply=False):
    folder, default = target_of(prop)
    edits = [e for e in prop['edits'] if ids is None or e['id'] in ids]
    by_file = {}
    for e in edits:
        by_file.setdefault(e.get('file', default), []).append(e)
    problems, new_texts = [], {}
    for fname, es in by_file.items():
        path = folder / fname
        text = path.read_text(encoding='utf-8')
        spans, found = locate(text, es, fname)
        problems += found
        out = text
        for start, end, e in reversed(spans):
            out = out[:start] + e['after'] + out[end:]
        problems += check_result(fname, text, out)
        new_texts[path] = out
    for p in problems:
        print(p)
    name = prop.get('target') or prop.get('bonus')
    print(f"{name}: {len(edits)} edits checked, {'OK' if not problems else 'PROBLEMS'}")
    if apply and not problems:
        for path, out in new_texts.items():
            path.write_text(out, encoding='utf-8')
        print('applied')
    return not problems


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    ids = None
    if '--ids' in args:
        ids = {int(x) for x in args[args.index('--ids') + 1].split(',')}
    prop = json.loads(Path(args[0]).read_text())
    sys.exit(0 if run(prop, ids, '--apply' in args) else 1)


if __name__ == '__main__':
    main()
