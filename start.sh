#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$project_dir"

port="${PORT:-3000}"
built_dir="$project_dir/dist/client"
web_dir="${OPENCODE_WEB_DIR:-${RUNNER_TEMP:-/tmp}/omgithub-web}"

echo "[start] project=$project_dir port=$port"
/usr/bin/time -p mkdir -p "$web_dir"
/usr/bin/time -p npm ci --no-audit --no-fund
/usr/bin/time -p npm run build

if [[ ! -f "$built_dir/index.html" ]]; then
  echo "[start] build did not produce $built_dir/index.html" >&2
  exit 1
fi

/usr/bin/time -p /usr/bin/printf '{"project":"%s","directory":"%s"}' \
  "$project_dir" "$built_dir" > "$web_dir/deployment-output.json"

echo "[start] deployment output: $built_dir"
echo "[start] serving Atelier on 0.0.0.0:$port"
exec /usr/bin/time -p env NODE_ENV=production PORT="$port" \
  "$project_dir/node_modules/.bin/tsx" "$project_dir/server/index.ts"
