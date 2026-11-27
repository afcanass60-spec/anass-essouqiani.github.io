#!/usr/bin/env bash
# DATA EMPIRE — run the headless test suite (Linux/macOS/CI). GODOT=path/to/godot ./tools/run_tests.sh
set -u
GODOT="${GODOT:-godot}"
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"

"$GODOT" --headless --path "$PROJECT" --editor --quit >/dev/null 2>&1
OUTPUT="$("$GODOT" --headless --path "$PROJECT" -s res://tests/run_tests.gd 2>&1)"
CODE=$?
echo "$OUTPUT"
if echo "$OUTPUT" | grep -Eq "SCRIPT ERROR|Parse Error|Failed to load script"; then
  echo "Script errors detected" >&2
  exit 1
fi
exit $CODE
