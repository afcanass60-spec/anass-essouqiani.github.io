#!/usr/bin/env python3
"""Lightweight structural checker for the MQL5 sources.

It does NOT replace the MetaEditor compiler (always compile with F7 in
MetaEditor -- see docs/INSTALL_MT5.md).  It catches the mechanical mistakes
that can be detected without MT5: unbalanced brackets, missing include files,
project functions (XQ_*) called but never defined, globals (g_*) used but not
declared, methods called on project classes that do not exist.

    python tools/mql5_lint.py mql5
"""
from __future__ import annotations

import re
import sys
from pathlib import Path


def strip(src: str) -> str:
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if src.startswith("//", i):
            j = src.find("\n", i)
            i = n if j < 0 else j
        elif src.startswith("/*", i):
            j = src.find("*/", i + 2)
            i = n if j < 0 else j + 2
        elif c == '"':
            j = i + 1
            while j < n and src[j] != '"':
                j += 2 if src[j] == "\\" else 1
            out.append('""')
            i = j + 1
        elif c == "'" and i + 2 < n:
            j = i + 1
            while j < n and src[j] != "'":
                j += 2 if src[j] == "\\" else 1
            out.append("' '")
            i = j + 1
        else:
            out.append(c)
            i += 1
    return "".join(out)


def check_balance(name: str, code: str, errors: list):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    line = 1
    for ch in code:
        if ch == "\n":
            line += 1
        elif ch in "([{":
            stack.append((ch, line))
        elif ch in ")]}":
            if not stack or stack[-1][0] != pairs[ch]:
                errors.append(f"{name}:{line}: unbalanced '{ch}'")
                return
            stack.pop()
    for ch, ln in stack:
        errors.append(f"{name}:{ln}: unclosed '{ch}'")


def main(root: str) -> int:
    files = sorted(Path(root).rglob("*.mq[5h]"))
    errors, codes = [], {}
    for f in files:
        src = f.read_text(encoding="utf-8", errors="replace")
        for m in re.finditer(r'#include\s+"([^"]+)"', src):
            inc = (f.parent / m.group(1).replace("\\", "/")).resolve()
            if not inc.exists():
                errors.append(f"{f}: missing include {m.group(1)}")
        if "#property strict" in src:
            errors.append(f"{f}: '#property strict' is MQL4-only")
        code = strip(src)
        codes[f] = code
        check_balance(str(f), code, errors)
    allcode = "\n".join(codes.values())
    defined = set(re.findall(r"\b(?:void|bool|int|long|ulong|double|string|datetime|color|ENUM_\w+|XQ\w*)\s+(XQ_\w+)\s*\(",
                             allcode))
    macros = set(re.findall(r"#define\s+(XQ\w*)", allcode))
    enums = set(re.findall(r"\b(XQ_\w+)\s*=\s*\d", allcode))
    for f, code in codes.items():
        for fn in set(re.findall(r"\b(XQ_\w+)\s*\(", code)):
            if fn not in defined and fn not in macros:
                errors.append(f"{f}: function {fn}() called but not defined")
        for ident in set(re.findall(r"\b(XQ_[A-Z][A-Z0-9_]+)\b", code)):
            if ident not in macros and ident not in enums and ident not in defined:
                errors.append(f"{f}: identifier {ident} not defined")
    # globals of the EA
    main_files = [f for f in files if f.suffix == ".mq5"]
    for f in main_files:
        code = codes[f]
        declared = set(re.findall(r"^\s*[\w<>]+\s+(g_\w+)", code, re.M))
        declared |= set(re.findall(r",\s*(g_\w+)", code))
        for g in set(re.findall(r"\b(g_\w+)\b", code)):
            if g not in declared:
                errors.append(f"{f}: global {g} used but not declared")
    # methods of project classes
    classes = {}
    for code in codes.values():
        for m in re.finditer(r"class\s+(C\w+)\s*\{(.*?)\n\s*\};", code, re.S):
            body = m.group(2)
            meths = set(re.findall(r"\b(\w+)\s*\([^;{]*\)\s*(?:const\s*)?\{", body))
            meths |= set(re.findall(r"\b(\w+)\s*\([^;{]*\)\s*(?:const\s*)?:", body))
            fields = set(re.findall(r"\b(\w+)\s*(?:\[[^\]]*\])?\s*[;,]", body))
            classes[m.group(1)] = meths | fields
    for f in main_files:
        code = codes[f]
        var_class = {v: c for c, rest in re.findall(r"^(C\w+)\s+([^;]+);", code, re.M)
                     for v in re.findall(r"(g_\w+)", rest)}
        for v, cls in var_class.items():
            if cls not in classes:
                continue
            for meth in set(re.findall(rf"\b{v}\.(\w+)", code)):
                if meth not in classes[cls]:
                    errors.append(f"{f}: {v}.{meth} - no member '{meth}' in {cls}")
    for e in errors:
        print("ERROR", e)
    print(f"checked {len(files)} files: {len(errors)} problem(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "mql5"))
