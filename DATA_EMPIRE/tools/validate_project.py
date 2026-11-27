#!/usr/bin/env python3
"""DATA EMPIRE — static project validator (no Godot needed).

Checks that can run anywhere (CI, a machine without Godot):
  * every res:// path referenced by .tscn / .gd / project.godot exists;
  * every ExtResource("id") used in a .tscn is declared in that file;
  * .tscn headers declare format=3 (Godot 4) and load_steps is consistent;
  * every JSON file under data/ parses;
  * GDScript files are indented with tabs only (mixed indentation = parse error);
  * no class_name collisions (we use preload() instead of global classes).

Usage:  python tools/validate_project.py      (exit code 0 = OK)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RES_PATH = re.compile(r'res://[A-Za-z0-9_./-]+')
EXT_DECL = re.compile(r'^\[ext_resource [^\]]*id="([^"]+)"', re.M)
EXT_USE = re.compile(r'ExtResource\("([^"]+)"\)')
SUB_DECL = re.compile(r'^\[sub_resource ', re.M)


def res_to_path(res: str) -> Path:
    return ROOT / res[len("res://"):]


def main() -> int:
    errors: list[str] = []
    checked = 0

    files = [p for p in ROOT.rglob("*") if p.is_file() and ".godot" not in p.parts and ".git" not in p.parts]
    for path in files:
        rel = path.relative_to(ROOT)
        if path.suffix in {".tscn", ".gd", ".godot", ".tres"}:
            text = path.read_text(encoding="utf-8")
            for found in RES_PATH.finditer(text):
                res = found.group(0)
                checked += 1
                # Skip directories and glob patterns written in comments (res://tests/test_*.gd).
                if res.endswith("/") or text[found.end():found.end() + 1] == "*":
                    continue
                if not res_to_path(res).exists():
                    errors.append(f"{rel}: missing resource {res}")

        if path.suffix == ".tscn":
            text = path.read_text(encoding="utf-8")
            header = text.splitlines()[0] if text else ""
            if "format=3" not in header:
                errors.append(f"{rel}: header is not Godot 4 (format=3)")
            declared = set(EXT_DECL.findall(text))
            for used in set(EXT_USE.findall(text)):
                if used not in declared:
                    errors.append(f"{rel}: ExtResource('{used}') used but not declared")
            match = re.search(r'load_steps=(\d+)', header)
            expected = len(declared) + len(SUB_DECL.findall(text)) + 1
            if match and int(match.group(1)) != expected:
                errors.append(f"{rel}: load_steps={match.group(1)} but expected {expected}")

        if path.suffix == ".gd":
            for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                indent = line[: len(line) - len(line.lstrip())]
                if " " in indent and line.strip() and not line.lstrip().startswith("#"):
                    errors.append(f"{rel}:{number}: space indentation (GDScript files use tabs)")
            if re.search(r'^class_name\s', path.read_text(encoding="utf-8"), re.M):
                errors.append(f"{rel}: class_name used; project convention is preload() constants")

        if path.suffix == ".json":
            try:
                json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                errors.append(f"{rel}: invalid JSON ({exc})")

    if errors:
        print("Validation FAILED:")
        for error in errors:
            print("  - " + error)
        return 1
    print(f"Validation OK ({len(files)} files scanned, {checked} res:// references checked)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
