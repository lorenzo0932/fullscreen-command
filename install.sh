#!/usr/bin/env bash
set -euo pipefail

UUID="fullscreen-command@lorenzo0932"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing $UUID to $DEST"
mkdir -p "$DEST"
cp -r "$SRC/extension/." "$DEST/"
cp -r "$SRC/schemas" "$DEST/"
glib-compile-schemas "$DEST/schemas"

if gnome-extensions enable "$UUID" 2>/dev/null; then
    echo "Extension enabled."
else
    echo "Note: the extension is not loaded yet (GNOME Shell needs to discover it first)."
fi

echo "Log out and back in (or restart GNOME Shell: Alt+F2, 'r' — X11 only) to activate the extension."
