#!/usr/bin/env bash
# Capture desktop + mobile screenshots of the running preview.
# Requires CAPTURE_URL and CAPTURE_DIR. Leaves the app running.
set -euo pipefail
cd "$(dirname "$0")"

: "${CAPTURE_URL:?CAPTURE_URL is required}"
: "${CAPTURE_DIR:?CAPTURE_DIR is required}"

RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"
mkdir -p "$CAPTURE_DIR"

# default-capture.mjs resolves DISPLAY from its runtime display file on linux.
export DISPLAY="${DISPLAY:-:0}"

# Click the game's init button so screenshots show the running 3D scene,
# not the start screen. Override with CAPTURE_START_SELECTOR if needed.
export CAPTURE_START_SELECTOR="${CAPTURE_START_SELECTOR:-#btn-start}"

echo "capture.sh: URL=$CAPTURE_URL dir=$CAPTURE_DIR" >&2
/usr/bin/time -p node "${RUNTIME_DIR}/scripts/default-capture.mjs"
