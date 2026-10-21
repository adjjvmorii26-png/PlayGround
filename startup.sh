#!/usr/bin/env bash
# Once-per-worker prerequisites.
# Verify the runtime tools used by start.sh / capture.sh are available.
set -euo pipefail

command -v python3 >/dev/null 2>&1 || { echo "startup.sh: python3 is required" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "startup.sh: node is required" >&2; exit 1; }
[ -d "${PROJECT_DIR:?}" ] || { echo "startup.sh: PROJECT_DIR not set" >&2; exit 1; }

echo "startup.sh: prerequisites ready (python3, node, PROJECT_DIR=${PROJECT_DIR})"
