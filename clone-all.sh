#!/usr/bin/env bash
# Clone (or skip if present) the Saleor child repos into this workspace.
# Override depth with CLONE_DEPTH=0 for full history.
set -euo pipefail
cd "$(dirname "$0")"

CLONE_DEPTH="${CLONE_DEPTH:-1}"
depth_flag=()
if [ "${CLONE_DEPTH}" -gt 0 ] 2>/dev/null; then
  depth_flag=(--depth "${CLONE_DEPTH}")
fi

repos=(
  "saleor|https://github.com/saleor/saleor.git"
  "saleor-dashboard|https://github.com/saleor/saleor-dashboard.git"
  "storefront|https://github.com/saleor/storefront.git"
  "saleor-platform|https://github.com/saleor/saleor-platform.git"
)

for entry in "${repos[@]}"; do
  name="${entry%%|*}"
  url="${entry##*|}"
  if [ -d "${name}/.git" ]; then
    echo "✓ ${name} already cloned"
  else
    echo "→ cloning ${name} ..."
    git clone "${depth_flag[@]}" "${url}" "${name}"
  fi
done

echo "All Saleor repos are in place."
