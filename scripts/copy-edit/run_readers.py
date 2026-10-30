#!/usr/bin/env python3
"""Send an HTML guide to several OpenRouter models, each with its own rubric, in parallel.

Usage: run_readers.py path/to/guide.html [--part N] [--only reader-id,...] [--into DIR]

The guide is turned into text by guide_text.py first (code fenced, hints labelled).
Needs OPEN_ROUTER_KEY in the environment or in .env at the repo root.
Writes reports/copy-edit/<guide>/<timestamp>/{<reader>.json, guide.txt, summary.md}.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

from guide_text import extract

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
STYLE = REPO / "docs" / "guide-style.md"
API = "https://openrouter.ai/api/v1/chat/completions"

OUTPUT_RULES = """
## How to answer

- Never comment on or change anything inside code blocks (``` fences) or inline `code`.
- Don't change technical meaning, step order, or what "Check Your Work" says the student should see.
- Lines starting "(Hint, hidden until clicked)" or "(Task solution, ...)" are help the student only sees when they ask for it. Review their wording too.
- "quote" must be copied **exactly** from the guide (a short span, one sentence or less), so it can be found with search.
- "suggestion" is your rewrite of just that span. It must follow the style guide. Use "" to mean "delete it".
- Up to 25 findings, most important first. Skip nitpicks if you have bigger problems to report.
- Reply with JSON only, no prose around it:

{"overall": "2-3 sentences on the guide from your focus", "findings": [{"quote": "...", "issue": "...", "suggestion": "...", "severity": "high|medium|low"}]}
"""


def load_key():
    names = ("OPEN_ROUTER_KEY", "OPENROUTER_API_KEY")
    key = next((os.environ[n] for n in names if os.environ.get(n)), None)
    env = REPO / ".env"
    if not key and env.exists():
        for line in env.read_text().splitlines():
            name, _, value = line.strip().partition("=")
            if name in names and value:
                key = value.strip().strip('"').strip("'")
    if not key:
        sys.exit("No OpenRouter key. Set OPEN_ROUTER_KEY, or copy .env.example to .env and add it there.")
    return key


FIELD_LINE = re.compile(r'^(\s*"(?:quote|issue|suggestion|overall|severity)"\s*:\s*")(.*)("\s*,?\s*)$')


def repair_quotes(text):
    """Escape bare quotes inside one-line string values, e.g. "quote": "draw `"life"` icons".
    Models often copy quoted guide text without escaping it."""
    out = []
    for line in text.splitlines():
        m = FIELD_LINE.match(line)
        if m:
            inner = re.sub(r'(?<!\\)"', r'\\"', m.group(2))
            line = m.group(1) + inner + m.group(3)
        out.append(line)
    return "\n".join(out)


def parse_json(text):
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        text = text[start:end + 1]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return json.loads(repair_quotes(text))


def norm(s):
    s = s.replace("’", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", s).strip().lower()


def call(key, model, system, user, cfg):
    body = {
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": cfg.get("temperature", 0.3),
        "max_tokens": cfg["max_tokens"],
        "usage": {"include": True},
        # Ask for strict JSON; some models otherwise leave quotes in code unescaped.
        "response_format": {"type": "json_object"},
    }
    if cfg.get("reasoning"):
        body["reasoning"] = cfg["reasoning"]
    req = urllib.request.Request(
        API,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "X-Title": "LuaInTheWeb copy-edit",
        },
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())


def run_reader(reader, key, lesson_text, style, cfg, out_dir):
    rubric = (HERE / reader["rubric"]).read_text()
    system = (
        "You are one of several reviewers copy-editing a Lua programming guide for students aged 10-14 who are learning to code games in the browser. "
        "You have ONE focus, described below. Ignore problems outside your focus.\n\n"
        f"{rubric}\n\n# The course style guide\n\n{style}\n{OUTPUT_RULES}"
    )
    user = f"Here is the guide:\n\n<guide>\n{lesson_text}\n</guide>"
    result = {"id": reader["id"], "model": reader["model"]}
    t0 = time.time()
    for attempt in (1, 2):
        try:
            # A reader can set its own max_tokens (thinking models use some of it up).
            opts = {**cfg, "max_tokens": reader.get("max_tokens", cfg.get("max_tokens", 6000)),
                    "reasoning": reader.get("reasoning")}
            resp = call(key, reader["model"], system, user, opts)
            content = resp["choices"][0]["message"]["content"]
            result["raw"] = content
            if not content:
                finish = resp["choices"][0].get("finish_reason")
                raise ValueError(f"empty reply (finish_reason: {finish})")
            result["usage"] = resp.get("usage")
            data = parse_json(content)
            break
        except (urllib.error.HTTPError, urllib.error.URLError, KeyError, ValueError, TimeoutError) as e:
            detail = e.read().decode()[:500] if isinstance(e, urllib.error.HTTPError) else str(e)
            result["error"] = f"attempt {attempt}: {type(e).__name__}: {detail}"
            data = None
    result["seconds"] = round(time.time() - t0, 1)
    if data is not None:
        result.pop("error", None)
        lesson_norm = norm(lesson_text)
        findings = data.get("findings", [])
        for f in findings:
            f["quote_found"] = bool(f.get("quote")) and norm(f["quote"]) in lesson_norm
        result["overall"] = data.get("overall", "")
        result["findings"] = findings
    (out_dir / f"{reader['id']}.json").write_text(json.dumps(result, indent=2, ensure_ascii=False))
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("guide", help="an HTML guide, or a bonus challenge's content.html")
    ap.add_argument("--part", help="only this part of a tabbed guide (id=\"part-N\")")
    ap.add_argument("--only", help="comma-separated reader ids")
    ap.add_argument("--into", help="an earlier results folder to add these readers to (for reruns)")
    args = ap.parse_args()

    lesson_path = Path(args.guide).resolve()
    lesson_text = extract(lesson_path, args.part)
    style = STYLE.read_text()
    # e.g. space_game_project-guide-part3, or 03_lives for a bonus challenge source
    if lesson_path.name == "content.html":
        slug = lesson_path.parent.name
    else:
        slug = f"{lesson_path.parent.name}-{lesson_path.stem}" + (f"-part{args.part}" if args.part else "")
    cfg = json.loads((HERE / "readers.json").read_text())
    readers = cfg["readers"]
    if args.only:
        wanted = set(args.only.split(","))
        readers = [r for r in readers if r["id"] in wanted]
    key = load_key()

    if args.into:
        out_dir = Path(args.into).resolve()
        if not out_dir.is_dir():
            sys.exit(f"{out_dir} doesn't exist")
    else:
        out_dir = REPO / "reports" / "copy-edit" / slug / datetime.now().strftime("%Y-%m-%d-%H%M%S")
        out_dir.mkdir(parents=True, exist_ok=True)
    # The exact text the readers saw, so quotes can be traced back.
    (out_dir / "guide.txt").write_text(lesson_text)

    with ThreadPoolExecutor(max_workers=len(readers)) as ex:
        new = list(ex.map(lambda r: run_reader(r, key, lesson_text, style, cfg, out_dir), readers))

    # The summary covers every reader in the folder, so a rerun with --into
    # replaces the failed readers and keeps the rest.
    order = [r["id"] for r in cfg["readers"]]
    results = [json.loads(f.read_text()) for f in out_dir.glob("*.json")]
    results.sort(key=lambda r: order.index(r["id"]) if r["id"] in order else len(order))

    lines = [f"# Copy-edit readers: {slug}", ""]
    lines += ["| Reader | Model | Findings | Quotes found | Cost | Time |", "|---|---|---|---|---|---|"]
    for r in results:
        if "error" in r:
            lines.append(f"| {r['id']} | {r['model']} | ERROR | | | {r['seconds']}s |")
            continue
        n = len(r["findings"])
        found = sum(f["quote_found"] for f in r["findings"])
        cost = (r.get("usage") or {}).get("cost")
        cost_s = f"${cost:.4f}" if isinstance(cost, (int, float)) else "?"
        lines.append(f"| {r['id']} | {r['model']} | {n} | {found}/{n} | {cost_s} | {r['seconds']}s |")
    for r in results:
        lines += ["", f"## {r['id']} ({r['model']})", ""]
        if "error" in r:
            lines.append(f"Error: {r['error']}")
            continue
        lines += [r["overall"], ""]
        for f in r["findings"]:
            mark = "" if f["quote_found"] else " (QUOTE NOT FOUND)"
            lines.append(f"- **{f.get('severity', '?')}**{mark}: \"{f.get('quote', '')}\"")
            lines.append(f"  - Issue: {f.get('issue', '')}")
            lines.append(f"  - Suggest: \"{f.get('suggestion', '')}\"")
    (out_dir / "summary.md").write_text("\n".join(lines) + "\n")

    print("\n".join(lines[:4 + len(results)]))
    print(f"\nFull results: {out_dir}")
    if any("error" in r for r in new):
        for r in new:
            if "error" in r:
                print(f"{r['id']}: {r['error']}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
