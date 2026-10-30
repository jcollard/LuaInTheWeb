#!/usr/bin/env python3
"""Build space_game_project/bonus/*.html from challenge sources.

Each challenge lives in challenges/NN_slug/ with:
  meta.json     {num, slug, title, tier, subtitle, summary, prereqs: [num...], new_files: [..]}
  content.html  body fragment (concepts, steps, check-work, stretch)
  solution.lua  full reference solution (starts from finished Part 7)
"""
import html
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'lua-learning-website', 'public', 'projects', 'space_game_project', 'bonus')

CSS = open(os.path.join(HERE, 'base.css'), encoding='utf-8').read()
JS = open(os.path.join(HERE, 'base.js'), encoding='utf-8').read()

EXTRA_CSS = """
/* ============================================================
   BONUS PAGES
   ============================================================ */
.tier {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 4px;
    font-size: 0.8em;
    font-weight: 700;
    letter-spacing: 1px;
    margin-right: 8px;
    vertical-align: middle;
}
.tier-1 { background: #2e7d32; color: #e8ffe8; }
.tier-2 { background: #1565c0; color: #e8f0ff; }
.tier-3 { background: #8e24aa; color: #fbe8ff; }

.before-start {
    background: #10182e;
    border: 1px solid #24305a;
    border-radius: 8px;
    padding: 14px 20px;
    margin-bottom: 24px;
    color: #b0b8e0;
    font-size: 0.95em;
}
.before-start strong { color: #e0e6ff; }
.before-start ul { padding-left: 22px; margin-top: 6px; }
.before-start li { margin-bottom: 4px; }

.stretch {
    background: #1a1028;
    border: 1px solid #3a2060;
    border-radius: 8px;
    padding: 16px 22px;
    margin-top: 24px;
}
.stretch h2 { font-size: 1.05em; color: #ce93d8; margin-bottom: 8px; }
.stretch ul { padding-left: 24px; }
.stretch li { margin-bottom: 6px; color: #c0b0d8; }

.reference h2 { font-size: 1.1em; color: #a0a8e0; margin-bottom: 10px; }
.reference {
    margin-top: 32px;
    padding: 18px 24px;
    background: #10101a;
    border-radius: 8px;
}
.warning {
    background: #2a1a08;
    border-left: 4px solid #ff9800;
    padding: 10px 16px;
    border-radius: 0 6px 6px 0;
    color: #ffcc80;
    margin-bottom: 12px;
    font-size: 0.95em;
}
.warning strong { color: #ffe0b2; }

.challenge-list { list-style: none; padding: 0; }
.challenge-list li {
    background: #121640;
    border: 1px solid #1e2460;
    border-radius: 8px;
    padding: 12px 18px;
    margin-bottom: 10px;
}
.challenge-list .file { font-family: 'Consolas', 'Monaco', 'Courier New', monospace; color: #82aaff; font-size: 0.9em; }
.challenge-list .title { font-weight: 700; color: #fff; }
.challenge-list .summary { color: #a0a8d0; font-size: 0.95em; margin-top: 4px; }
.challenge-list .req { color: #8088b8; font-size: 0.85em; margin-top: 4px; font-style: italic; }
.tier-heading { margin: 28px 0 12px; font-size: 1.25em; color: #e0e6ff; }
"""

TIER_LABEL = {1: '★ TWEAK', 2: '★★ ENTITIES', 3: '★★★ STRUCTURE'}
TIER_NAME = {
    1: '★ Tweaks — small changes that reuse what you already know',
    2: '★★ Entities — give each object its own data',
    3: '★★★ Structure — bigger changes to how the game is organized',
}


def page(title, body):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(title)}</title>
<style>{CSS}{EXTRA_CSS}</style>
</head>
<body>

<header>
    <div class="header-title">SPACE SHOOTER &mdash; BONUS CHALLENGES</div>
    <div style="height: 10px"></div>
</header>

<main>
<div class="part active">
{body}
</div>
</main>

<!-- Toast notification for blocked copy -->
<div id="toast">Type it out! You'll remember it better.</div>

<script>{JS}</script>

</body>
</html>
"""


def load():
    base = os.path.join(HERE, 'challenges')
    out = []
    for d in sorted(os.listdir(base)):
        p = os.path.join(base, d)
        if not os.path.isdir(p) or not os.path.exists(os.path.join(p, 'meta.json')) \
                or not os.path.exists(os.path.join(p, 'content.html')):
            print(f'skipping incomplete {d}', file=sys.stderr)
            continue
        meta = json.load(open(os.path.join(p, 'meta.json'), encoding='utf-8'))
        meta['dir'] = p
        meta['file'] = f"{meta['num']:02d}_{meta['slug']}.html"
        out.append(meta)
    return out


def prereq_text(meta, by_num):
    if not meta.get('prereqs'):
        return 'None &mdash; start from your finished Part 7 game.'
    names = [f"<code>{by_num[n]['file']}</code> ({html.escape(by_num[n]['title'])})" for n in meta['prereqs']]
    return 'Finish ' + ', '.join(names) + ' first.'


def build_challenge(meta, by_num):
    content = open(os.path.join(meta['dir'], 'content.html'), encoding='utf-8').read()
    sol_path = os.path.join(meta['dir'], 'solution.lua')
    solution = open(sol_path, encoding='utf-8').read().rstrip('\n') if os.path.exists(sol_path) else None
    new_files = meta.get('new_files', [])
    files_li = ''
    if new_files:
        files_li = '<li><strong>New files for this challenge:</strong> ' + ', '.join(
            f'<code>{html.escape(f)}</code>' for f in new_files) + '</li>'
    tier = meta['tier']
    body = f"""    <h1><span class="tier tier-{tier}">{TIER_LABEL[tier]}</span>Bonus {meta['num']}: {html.escape(meta['title'])}</h1>
    <p class="subtitle">{meta['subtitle']}</p>

    <div class="before-start">
        <strong>Before you start</strong>
        <ul>
            <li><strong>Prerequisites:</strong> {prereq_text(meta, by_num)}</li>
            {files_li}
            <li>Make a backup copy of your <code>game.lua</code> first, so you can always go back.</li>
            <li>Bonus challenges give you less help than the main guide. Work out <em>where</em> each piece of code goes, and use the hints if you get stuck.</li>
        </ul>
    </div>

{content.rstrip()}
"""
    if solution is not None:
        body += f"""
    <div class="reference">
        <h2>Reference Solution</h2>
        <div class="warning"><strong>Read this first:</strong> this is one complete version of <code>game.lua</code> with this challenge finished, built from the Part 7 code. Your game is probably different &mdash; you may have changed numbers, names, or added other bonus features &mdash; so copying it over your file will likely <strong>not</strong> work and could erase your own work. Use it to compare ideas, then make the changes in <em>your</em> version.</div>
        <div class="stuck">
            <button class="btn-stuck">Show / hide the complete reference <code>game.lua</code></button>
            <div class="stuck-code" hidden>
                <pre class="code-block"><code class="lua">{html.escape(solution, quote=False)}</code></pre>
            </div>
        </div>
    </div>
"""
    return page(f"Bonus {meta['num']}: {meta['title']}", body)


def build_index(metas, by_num):
    parts = ["""    <h1>Bonus Challenges</h1>
    <p class="subtitle">You finished the space shooter &mdash; now make it yours.</p>

    <div class="concepts">
        <h2>How bonus challenges work</h2>
        <ul>
            <li>Every challenge starts from your <strong>finished Part 7 game</strong> in <code>game.lua</code>. Do them in any order unless a challenge lists a prerequisite.</li>
            <li>Open a challenge by opening its file in the <code>bonus/</code> folder (the file names are listed below).</li>
            <li>You get less help than in the main guide: a goal, some tasks, hints, and a <strong>Check Your Work</strong> list. Try each task on your own before opening a hint.</li>
            <li>Each challenge ends with a complete reference <code>game.lua</code>. Your game will be different from it, so use it to compare ideas, not to copy and paste.</li>
            <li>New art, sounds, and a font are already in the project's <code>images/</code>, <code>sounds/</code>, and <code>fonts/</code> folders (from Kenney's free Space Shooter pack, kenney.nl).</li>
        </ul>
    </div>
"""]
    for tier in (1, 2, 3):
        parts.append(f'    <h2 class="tier-heading">{TIER_NAME[tier]}</h2>\n    <ul class="challenge-list">')
        for m in metas:
            if m['tier'] != tier:
                continue
            req = ''
            if m.get('prereqs'):
                req = '<div class="req">Requires: ' + ', '.join(
                    f"Bonus {n} ({html.escape(by_num[n]['title'])})" for n in m['prereqs']) + '</div>'
            parts.append(f"""        <li><div><span class="title">Bonus {m['num']}: {html.escape(m['title'])}</span> &mdash; <span class="file">bonus/{m['file']}</span></div>
            <div class="summary">{m['summary']}</div>{req}</li>""")
        parts.append('    </ul>')
    return page('Space Shooter Bonus Challenges', '\n'.join(parts) + '\n')


def main():
    metas = load()
    by_num = {m['num']: m for m in metas}
    os.makedirs(OUT, exist_ok=True)
    written = []
    for m in metas:
        path = os.path.join(OUT, m['file'])
        open(path, 'w', encoding='utf-8').write(build_challenge(m, by_num))
        written.append(m['file'])
    open(os.path.join(OUT, '00_start_here.html'), 'w', encoding='utf-8').write(build_index(metas, by_num))
    written.insert(0, '00_start_here.html')
    print('\n'.join(written))


if __name__ == '__main__':
    sys.exit(main())
