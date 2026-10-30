#!/usr/bin/env python3
"""Quick, model-free style check for an HTML guide (see docs/guide-style.md).

Usage:
  lint_style.py guide.html [--part N]   report style issues (exit 1 if any)
  lint_style.py --code-hash guide.html  fingerprint the <pre> code blocks in the file

Line numbers refer to the extracted text (print it with guide_text.py), not the HTML.
"""
import hashlib
import html
import re
import sys
from pathlib import Path

from guide_text import code_spans, extract, parse_args

HERE = Path(__file__).resolve().parent
LONG_SENTENCE_WORDS = 25
MAX_EXCLAMATIONS = 3
MAX_GRADE = 8.0
WE_PER_1000_WORDS = 6

FENCE = re.compile(r"^\s*```")


def split_blocks(text):
    """Yield (line_no, line, in_code) for each line."""
    in_code = False
    for i, line in enumerate(text.splitlines(), 1):
        if FENCE.match(line):
            in_code = not in_code
            yield i, line, True
            continue
        yield i, line, in_code


def prose_of(line):
    line = re.sub(r"`[^`]*`", "code", line)  # inline code
    line = re.sub(r"^\((Hint|Task solution)[^)]*\)\s*", "", line)  # labels added by guide_text.py
    return line


def load_banned():
    rules = []
    for raw in (HERE / "banned-phrases.txt").read_text().splitlines():
        raw = raw.strip()
        if not raw or raw.startswith("#") or "|" not in raw:
            continue
        phrase, cat = (p.strip() for p in raw.split("|", 1))
        pat = re.compile(r"(?<![\w'])" + re.escape(phrase).replace(r"\ ", r"\s+") + r"(?![\w'])", re.I)
        rules.append((phrase, cat, pat))
    return rules


def syllables(word):
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    if len(w) <= 3:
        return 1
    w = re.sub(r"(?:[^laeiouy]es|ed|[^laeiouy]e)$", "", w)
    w = re.sub(r"^y", "", w)
    return max(1, len(re.findall(r"[aeiouy]{1,2}", w)))


def check_line(no, p, rules, issues):
    for _, cat, pat in rules:
        for m in pat.finditer(p):
            issues.append((no, cat, f'"{m.group(0)}"'))
    if "—" in p:
        issues.append((no, "em-dash", f"{p.count(chr(0x2014))} em-dash(es)"))
    if re.search(r"\s–\s|\s--\s", p):
        issues.append((no, "em-dash", "dash used as an em-dash"))


def sentence_stats(prose_lines, issues):
    words_total = sentences_total = syl_total = we_count = 0
    for no, p in prose_lines:
        for s in re.split(r"(?<=[.!?])\s+", p):
            words = re.findall(r"[A-Za-z][A-Za-z'-]*", s)
            if not words:
                continue
            sentences_total += 1
            words_total += len(words)
            syl_total += sum(syllables(w) for w in words)
            we_count += sum(1 for w in words if w.lower() in ("we", "we'll", "we're", "let's", "us", "our"))
            if len(words) > LONG_SENTENCE_WORDS:
                issues.append((no, "long-sentence", f"{len(words)} words: \"{s.strip()[:70]}...\""))
    return words_total, sentences_total, syl_total, we_count


def lint(path, part=None):
    text = extract(path, part)
    rules = load_banned()
    issues, prose_lines, exclam = [], [], []

    for no, line, in_code in split_blocks(text):
        if in_code:
            continue
        p = prose_of(line)
        if not p.strip():
            continue
        check_line(no, p, rules, issues)
        exclam += [no] * p.count("!")
        if not p.lstrip().startswith("#"):
            prose_lines.append((no, re.sub(r"^\s*([-*+]|\d+\.)\s+", "", p)))

    words_total, sentences_total, syl_total, we_count = sentence_stats(prose_lines, issues)
    if len(exclam) > MAX_EXCLAMATIONS:
        lines = ", ".join(map(str, sorted(set(exclam))))
        issues.append((exclam[0], "exclamations", f"{len(exclam)} exclamation marks (lines {lines}); max {MAX_EXCLAMATIONS}"))

    issues.sort()
    for no, cat, msg in issues:
        print(f"L{no}: [{cat}] {msg}")
    print()
    if words_total and sentences_total:
        grade = 0.39 * words_total / sentences_total + 11.8 * syl_total / words_total - 15.59
        flag = "  <-- above target" if grade > MAX_GRADE else ""
        print(f"Reading grade (Flesch-Kincaid, prose only): {grade:.1f} (target <= {MAX_GRADE:.0f}){flag}")
        print(f"Avg sentence length: {words_total / sentences_total:.1f} words over {sentences_total} sentences")
        rate = we_count * 1000 / words_total
        note = "  <-- leaning on 'we'; docs/guide-style.md wants 'you'" if rate > WE_PER_1000_WORDS else ""
        print(f"'we/let's/us/our' per 1000 words: {rate:.1f}{note}")
        if grade > MAX_GRADE:
            issues.append((0, "grade", ""))
    print(f"{len(issues)} issue(s)")
    return 1 if issues else 0


def code_hash(path):
    """Fingerprint the <pre> code blocks. Copy-editing must leave them identical.
    Inline <code> spans are only counted: edits may add some (naming a variable
    in task text), so compare the inline list by eye if the count drops."""
    blocks = code_blocks_of(path)
    inline = len(code_spans(path)) - len(blocks)
    overall = hashlib.sha256("\n\0\n".join(blocks).encode()).hexdigest()[:16]
    print(f"code blocks: {len(blocks)}  overall: {overall}  (inline code spans: {inline})")
    for i, b in enumerate(blocks, 1):
        first = html.unescape(re.sub(r"<[^>]+>", "", b)).strip().splitlines()
        first = first[0][:50] if first else "(empty)"
        print(f"  {i:>2} {hashlib.sha256(b.encode()).hexdigest()[:12]}  {first}")
    return 0


def code_blocks_of(path):
    return re.findall(r"<pre[^>]*>(.*?)</pre>", Path(path).read_text(encoding="utf-8"), re.S)


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) == 2 and args[0] == "--code-hash":
        sys.exit(code_hash(args[1]))
    if not args:
        print(__doc__)
        sys.exit(2)
    sys.exit(lint(*parse_args(args)))
