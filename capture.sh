#!/usr/bin/env bash
# Capture desktop and mobile screenshots of the published preview.
set -euo pipefail
cd "$(dirname "$0")"

timed() { /usr/bin/time -p "$@"; }

: "${CAPTURE_URL:?Set CAPTURE_URL to the preview URL}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to the evidence output directory}"

timed mkdir -p "$CAPTURE_DIR"
timed node "$(pwd)/scripts/capture.mjs"
timed test -s "$CAPTURE_DIR/final-desktop.png"
timed test -s "$CAPTURE_DIR/final-mobile.png"
