#!/usr/bin/env bash
# Build a self-contained Linux AppImage:  ./scripts/build_appimage.sh
# Needs: python3 with venv, internet on the first run (PyInstaller + appimagetool are downloaded).
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="$(cat VERSION)"
ARCH="${ARCH:-$(uname -m)}"
OUT="StickPad-${VERSION}-${ARCH}.AppImage"

[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install -q -r requirements.txt pyinstaller

rm -rf build dist AppDir "$OUT"
.venv/bin/pyinstaller --noconfirm --clean --name stickpad --onedir \
  --add-data static:static --add-data TUTORIAL.md:. --add-data TUTORIAL.es.md:. \
  --add-data CHANGELOG.md:. --add-data VERSION:. \
  --hidden-import seed --exclude-module tkinter --exclude-module unittest \
  desktop.py

mkdir -p AppDir/usr/bin
cp -r dist/stickpad AppDir/usr/bin/stickpad
cp packaging/stickpad.png AppDir/stickpad.png
cp packaging/stickpad.png AppDir/.DirIcon
cp packaging/stickpad.desktop AppDir/stickpad.desktop
cat > AppDir/AppRun <<'RUN'
#!/bin/sh
HERE="$(dirname "$(readlink -f "$0")")"
exec "$HERE/usr/bin/stickpad/stickpad" "$@"
RUN
chmod +x AppDir/AppRun

TOOL="build/tools/appimagetool-${ARCH}.AppImage"
if [ ! -x "$TOOL" ]; then
  mkdir -p build/tools
  curl -fsSL -o "$TOOL" "https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-${ARCH}.AppImage"
  chmod +x "$TOOL"
fi
ARCH="$ARCH" "$TOOL" --appimage-extract-and-run AppDir "$OUT"
echo "Built $OUT ($(du -h "$OUT" | cut -f1))"
