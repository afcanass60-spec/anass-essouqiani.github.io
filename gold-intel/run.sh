#!/usr/bin/env bash
# Lancement macOS / Linux : ./run.sh
cd "$(dirname "$0")"
[ -d .venv ] || { python3 -m venv .venv && .venv/bin/pip install -r requirements.txt; }
exec .venv/bin/python -m app.main
