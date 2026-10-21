#!/usr/bin/env bash
set -euo pipefail

: "${CAPTURE_URL:?Set CAPTURE_URL to the preview URL.}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR for final-desktop.png and final-mobile.png.}"

session="capture-${VALIDATION_ID:-$$}-$RANDOM"
mkdir -p "$CAPTURE_DIR"

cleanup() {
  /usr/bin/time -p playwright-cli -s="$session" close >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[capture] url=$CAPTURE_URL output=$CAPTURE_DIR"
for attempt in 1 2 3; do
  if /usr/bin/time -p curl --fail --silent --show-error --location --max-time 20 \
    --output /dev/null "$CAPTURE_URL"; then
    break
  fi
  if [[ "$attempt" == 3 ]]; then
    echo "[capture] preview is unreachable" >&2
    exit 75
  fi
  /usr/bin/time -p sleep 2
done

if ! /usr/bin/time -p playwright-cli -s="$session" open "$CAPTURE_URL" >/dev/null; then
  echo "[capture] browser could not open the preview" >&2
  exit 75
fi

wait_ready() {
  for _ in $(seq 1 60); do
    if [[ "$(/usr/bin/time -p playwright-cli -s="$session" --raw eval \
      "() => document.readyState === 'complete' && document.fonts.status === 'loaded' && !!document.querySelector('.app .workbench')" \
      2>/dev/null)" == "true" ]]; then
      return 0
    fi
    /usr/bin/time -p sleep 0.5
  done
  return 1
}

capture() {
  local width="$1" height="$2" file="$3"
  /usr/bin/time -p playwright-cli -s="$session" resize "$width" "$height" >/dev/null
  if ! wait_ready; then
    echo "[capture] Atelier did not render at ${width}x${height}" >&2
    exit 1
  fi
  /usr/bin/time -p sleep 0.75
  if ! /usr/bin/time -p playwright-cli -s="$session" screenshot \
    --filename "$CAPTURE_DIR/$file"; then
    echo "[capture] could not save $file" >&2
    exit 75
  fi
}

capture 1440 900 final-desktop.png
capture 390 844 final-mobile.png

if [[ ! -s "$CAPTURE_DIR/final-desktop.png" || ! -s "$CAPTURE_DIR/final-mobile.png" ]]; then
  echo "[capture] screenshot output is missing" >&2
  exit 1
fi

echo "[capture] wrote final-desktop.png and final-mobile.png"
