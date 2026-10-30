#!/usr/bin/env python3
"""Run every challenge solution through the harness with several seeds, and
check that each non-comment snippet line in content.html appears in solution.lua."""
import html
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PROJ = os.path.join(ROOT, 'lua-learning-website', 'public', 'projects', 'space_game_project')
SEEDS = [int(s) for s in (sys.argv[1:] or ['11', '12', '13'])]

fail = 0
for d in sorted(os.listdir(os.path.join(HERE, 'challenges'))):
    p = os.path.join(HERE, 'challenges', d)
    sol = os.path.join(p, 'solution.lua')
    if not os.path.exists(sol):
        print(f'-- {d}: no solution (ok for design-your-own)')
        continue
    for s in SEEDS:
        r = subprocess.run(['lua', os.path.join(HERE, 'harness.lua'), sol, PROJ, '30000', str(s)],
                           capture_output=True, text=True)
        line = (r.stdout + r.stderr).strip().replace('solution.lua', d)
        print(line[:160])
        if r.returncode != 0:
            fail += 1
    # snippet lines must exist in the solution
    content = open(os.path.join(p, 'content.html'), encoding='utf-8').read()
    sol_text = open(sol, encoding='utf-8').read()
    sol_lines = {l.strip() for l in sol_text.splitlines()}
    missing = []
    for block in re.findall(r'<code class="lua">(.*?)</code>', content, re.S):
        for l in html.unescape(block).splitlines():
            t = l.strip()
            if not t or t.startswith('--') or t in ('end', 'else'):
                continue
            if t not in sol_lines:
                missing.append(t)
    if missing:
        print(f'   {d}: {len(missing)} snippet lines not in solution:')
        for m in missing[:12]:
            print('      ' + m)
sys.exit(1 if fail else 0)
