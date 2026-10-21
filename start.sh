#!/usr/bin/env bash
# Start the static game server in the foreground on PORT (default 3000).
# Source lives in space-ship-repair/; built output is copied into dist/
# inside PROJECT_DIR. Writes deployment-output.json for the controller.
set -euo pipefail
cd "$(dirname "$0")"

PROJECT_DIR="$(pwd)"
PORT="${PORT:-3000}"
export PORT

STATIC_DIR="$PROJECT_DIR/dist"
mkdir -p "$STATIC_DIR"
cp -f space-ship-repair/index.html "$STATIC_DIR/index.html"

if [ -n "${OPENCODE_WEB_DIR:-}" ]; then
  mkdir -p "$OPENCODE_WEB_DIR"
  printf '{"project":"%s","directory":"%s"}' "$PROJECT_DIR" "$STATIC_DIR" > "$OPENCODE_WEB_DIR/deployment-output.json"
fi

echo "start.sh: serving $STATIC_DIR on port $PORT" >&2
exec /usr/bin/time -p python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$STATIC_DIR"
