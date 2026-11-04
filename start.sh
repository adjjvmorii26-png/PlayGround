#!/usr/bin/env bash
# Build this repository's static site and serve it in the foreground.
set -euo pipefail
cd "$(dirname "$0")"

PROJECT_DIR="$(pwd)"
BUILD_DIR="$PROJECT_DIR/dist"
STAGE_DIR="$PROJECT_DIR/.dist-build"
PORT="${PORT:-3000}"
WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"

timed() { /usr/bin/time -p "$@"; }
log() { printf '[start] %s\n' "$*"; }

# Install dependencies only when the project actually carries a Node manifest.
if [[ -f "$PROJECT_DIR/package.json" ]]; then
  if [[ -f "$PROJECT_DIR/package-lock.json" ]]; then
    log "Installing dependencies with npm ci"
    timed npm ci --no-audit --no-fund
  else
    log "Installing dependencies with npm install"
    timed npm install --no-audit --no-fund
  fi
else
  log "No package.json; static build has no dependency install step"
fi

needs_build() {
  local stamp="$BUILD_DIR/.build-stamp"
  local changed

  [[ -f "$BUILD_DIR/index.html" && -f "$stamp" ]] || return 0
  [[ "$PROJECT_DIR/dashboard.html" -nt "$stamp" ]] && return 0
  [[ "$PROJECT_DIR/metrics.html" -nt "$stamp" ]] && return 0
  [[ "$PROJECT_DIR/start.sh" -nt "$stamp" ]] && return 0

  changed="$(find \
    "$PROJECT_DIR/projects" \
    "$PROJECT_DIR/ixpansion/content_output" \
    "$PROJECT_DIR/ixpansion/organism-console" \
    -newer "$stamp" -print -quit 2>/dev/null || true)"
  [[ -n "$changed" ]]
}

build_static() {
  log "Building static site into $BUILD_DIR"
  timed rm -rf "$STAGE_DIR"
  timed mkdir -p "$STAGE_DIR/ixpansion"
  timed cp "$PROJECT_DIR/dashboard.html" "$STAGE_DIR/index.html"
  timed cp "$PROJECT_DIR/dashboard.html" "$STAGE_DIR/dashboard.html"
  timed cp "$PROJECT_DIR/metrics.html" "$STAGE_DIR/metrics.html"
  timed rsync -a --delete "$PROJECT_DIR/projects/" "$STAGE_DIR/projects/"
  timed rsync -a --delete \
    "$PROJECT_DIR/ixpansion/content_output/" "$STAGE_DIR/ixpansion/content_output/"
  timed rsync -a --delete \
    --exclude '*.py' --exclude '*.py.bak' --exclude '*.py.orig' --exclude '__pycache__/' \
    "$PROJECT_DIR/ixpansion/organism-console/" "$STAGE_DIR/ixpansion/organism-console/"
  timed rm -rf "$BUILD_DIR"
  timed mv "$STAGE_DIR" "$BUILD_DIR"
  timed touch "$BUILD_DIR/.build-stamp"
}

if needs_build; then
  build_static
else
  log "Static build is up to date at $BUILD_DIR"
fi

# Publish the controller's deployment descriptor only after the build exists.
timed mkdir -p "$WEB_DIR"
timed node -e '
  const fs = require("node:fs")
  const [file, project, directory] = process.argv.slice(1)
  fs.writeFileSync(file, JSON.stringify({ project, directory }))
' "$WEB_DIR/deployment-output.json" "$PROJECT_DIR" "$BUILD_DIR"
log "Wrote deployment output: $WEB_DIR/deployment-output.json"

if [[ ! -f "$BUILD_DIR/index.html" ]]; then
  log "Static deployment is missing index.html"
  exit 1
fi

# Serve the built directory in the foreground; the controller owns the tunnel.
log "Serving $BUILD_DIR on 0.0.0.0:$PORT"
exec /usr/bin/time -p python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$BUILD_DIR"
