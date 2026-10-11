#!/usr/bin/env bash
# One-command launcher: creates a virtualenv on first run, then starts StickPad.
cd "$(dirname "$0")"
[ -d .venv ] || { python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt; }
echo "StickPad → http://localhost:${PORT:-5000}"
exec .venv/bin/python app.py
