#!/usr/bin/env python3
"""Turn an HTML guide into readable text for the style check and the readers.

Works on full pages (guide.html) and on bonus challenge sources
(scripts/space-game-bonus/challenges/NN_slug/content.html, where the title and
subtitle from meta.json are added at the top).

Code blocks become ``` fences, inline <code> becomes `backticks`, and hints are
labelled so readers know they're hidden until the student asks for them.

Usage: guide_text.py path/to/guide.html [--part N]    print the extracted text
"""
import html
import json
import re
import sys
from pathlib import Path

CODE_BLOCK = re.compile(r'<pre[^>]*>\s*<code[^>]*>(.*?)</code>\s*</pre>', re.S)
ANY_CODE = re.compile(r'<code[^>]*>(.*?)</code>', re.S)


def _tags_off(s):
    """Remove tags but keep entities escaped, so a later pass can't mistake
    an unescaped `<=` ... `>` in code for a tag."""
    return re.sub(r'<[^>]+>', '', s)


def _inline(fragment):
    """Text of a fragment that has no code blocks in it (still HTML-escaped)."""
    s = re.sub(r'<code[^>]*>(.*?)</code>', lambda m: '`' + _tags_off(m.group(1)) + '`', fragment, flags=re.S)
    return _tags_off(s)


def _strip(s):
    """Remove tags, then unescape entities. Only call this once, at the end."""
    return html.unescape(_tags_off(s))


def part_ids(path):
    """The part numbers of a tabbed guide (id="part-N"), or [] if it has none."""
    return re.findall(r'<div class="part[^"]*" id="part-(\d+)"', Path(path).read_text(encoding='utf-8'))


def extract(path, part=None):
    path = Path(path)
    src = path.read_text(encoding='utf-8')
    src = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', src, flags=re.S | re.I)
    src = re.sub(r'<!--.*?-->', '', src, flags=re.S)
    if '<main' in src:
        src = src[src.index('<main'):]
    if part is not None:
        start = re.search(rf'<div class="part[^"]*" id="part-{part}"', src)
        if not start:
            sys.exit(f'{path} has no part {part} (parts: {", ".join(part_ids(path)) or "none"})')
        nxt = re.search(r'<div class="part[^"]*" id="part-\d+"', src[start.end():])
        end = start.end() + nxt.start() if nxt else src.find('</main>')
        src = src[start.start():end]

    header = ''
    meta = path.parent / 'meta.json'
    if path.name == 'content.html' and meta.exists():
        m = json.loads(meta.read_text(encoding='utf-8'))
        header = f"# Bonus {m['num']}: {m['title']}\n\n{_strip(m['subtitle'])}\n\n"

    # Full-program listings behind "Stuck?" buttons are only code; leave them out.
    s0 = re.sub(r'<div class="stuck-code"[^>]*>\s*<pre[^>]*>.*?</pre>\s*</div>',
                '\n(The complete program is shown here, hidden until clicked.)\n', src, flags=re.S)
    src = s0

    # Protect code blocks from the tag stripping below.
    blocks = []

    def keep(m):
        blocks.append(html.unescape(m.group(1)).strip('\n'))
        return f'\n\x00{len(blocks) - 1}\x00\n'
    s = CODE_BLOCK.sub(keep, src)

    # Label hidden help so readers know a student sees it only on request.
    hint_no = {'n': 0}

    def hint(m):
        hint_no['n'] += 1
        return f'\n(Hint, hidden until clicked) {m.group(1)}\n'
    s = re.sub(r'<div class="hints-container">', lambda m: hint_no.update(n=0) or '', s)
    s = re.sub(r'<div class="hint"[^>]*>(.*?)</div>(?=\s*(?:<div class="hint"|</div>|\n))', hint, s, flags=re.S)
    s = re.sub(r'<div class="solution"[^>]*>', '\n(Task solution, hidden until all hints are shown)\n', s)
    s = re.sub(r'<button[^>]*>.*?</button>', '', s, flags=re.S)

    s = re.sub(r'<h1[^>]*>(.*?)</h1>', lambda m: '\n# ' + _inline(m.group(1)) + '\n', s, flags=re.S)
    s = re.sub(r'<h2[^>]*>(.*?)</h2>', lambda m: '\n## ' + _inline(m.group(1)) + '\n', s, flags=re.S)
    s = re.sub(r'<div class="step-header"[^>]*>(.*?)</div>', lambda m: '\n### ' + _inline(m.group(1)) + '\n', s, flags=re.S)
    s = re.sub(r'<li[^>]*>', '\n- ', s)
    s = re.sub(r'</?(p|div|ul|ol|br|section|header|nav|main)[^>]*>', '\n', s)
    s = re.sub(r'<code[^>]*>(.*?)</code>', lambda m: '`' + _tags_off(m.group(1)) + '`', s, flags=re.S)
    s = _strip(s)
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r' *\n *', '\n', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    s = re.sub(r'\x00(\d+)\x00', lambda m: '```lua\n' + blocks[int(m.group(1))] + '\n```', s)
    return header + s.strip() + '\n'


def code_spans(path):
    """Every <code> body in the raw file, in order (block and inline)."""
    return [m.group(1) for m in ANY_CODE.finditer(Path(path).read_text(encoding='utf-8'))]


def parse_args(argv):
    """Return (path, part) from [path] or [path, --part, N]."""
    if len(argv) == 1:
        return argv[0], None
    if len(argv) == 3 and argv[1] == '--part':
        return argv[0], argv[2]
    print(__doc__)
    sys.exit(2)


if __name__ == '__main__':
    p, part = parse_args(sys.argv[1:])
    sys.stdout.write(extract(p, part))
