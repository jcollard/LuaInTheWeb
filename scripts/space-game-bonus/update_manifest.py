#!/usr/bin/env python3
"""List every space_game_project file in projects/manifest.json."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.abspath(os.path.join(HERE, '..', '..', 'lua-learning-website', 'public', 'projects'))
PROJ = 'space_game_project'
MP = os.path.join(BASE, 'manifest.json')

m = json.load(open(MP))
found = []
for root, _, files in os.walk(os.path.join(BASE, PROJ)):
    for f in files:
        found.append(os.path.relpath(os.path.join(root, f), BASE).replace(os.sep, '/'))
first = {'game.lua': 0, 'guide.html': 1}
space = sorted(found, key=lambda p: (first.get(p.split('/', 1)[1], 2), p))
others = [f for f in m['files'] if not f.startswith(PROJ + '/')]
m['files'] = space + others
open(MP, 'w').write(json.dumps(m, indent=2) + '\n')
print(len(space), 'space_game_project files listed')
