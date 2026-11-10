#!/usr/bin/env bash
# Inicia API e Web do DeskReport em paralelo para desenvolvimento local
set -euo pipefail
cd "$(dirname "$0")"

trap 'kill 0' EXIT

run() {
  local name=$1 color=$2 dir=$3
  shift 3
  (cd "$dir" && "$@" 2>&1 | sed -u "s/^/\x1b[${color}m[${name}]\x1b[0m /") &
}

run deskreport-api 31 api pnpm start:dev
run deskreport-web 37 web pnpm dev

wait
