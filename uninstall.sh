#!/usr/bin/env bash
set -euo pipefail

UUID="fullscreen-command@lorenzo0932"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"

gnome-extensions disable "$UUID" 2>/dev/null || true
rm -rf "$DEST"
echo "Removed $UUID."
echo "Log out and back in to complete the removal."
