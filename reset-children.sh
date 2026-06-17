#!/usr/bin/env bash
#
# reset-children.sh
# -----------------
# Restore the child repos to their pinned baseline (children.lock) between demo
# takes, so every run of the loyalty-points prompt starts from an identical state.
#
# What it does, per child repo:
#   1. checkout the recorded branch (force, discarding any AI-created branch state)
#   2. reset --hard to the pinned commit  (throws away the AI's edits + commits)
#   3. clean -fd                          (deletes NEW files the AI created:
#                                          migrations, components, .graphql docs)
#
# What it deliberately does NOT do:
#   - It does NOT pass `git clean -x`, so gitignored files (node_modules, build
#     caches, generated codegen output) are PRESERVED. You don't have to reinstall
#     deps between takes. Pass --deep if you want a scorched-earth clean (slow:
#     you'll need to reinstall node_modules afterwards).
#
# Usage:
#   ./reset-children.sh           # safe reset (keeps node_modules)
#   ./reset-children.sh --deep    # also remove gitignored files (nukes node_modules)

set -euo pipefail
cd "$(dirname "$0")"

LOCK="children.lock"
[ -f "$LOCK" ] || { echo "ERROR: $LOCK not found — run from the workspace root."; exit 1; }

clean_flags="-fd"
if [ "${1:-}" = "--deep" ]; then
  clean_flags="-fdx"
  echo "!! --deep: gitignored files (node_modules, caches) WILL be removed."
fi

while read -r name sha branch _rest; do
  # skip comments and blank lines
  [ -z "${name:-}" ] && continue
  case "$name" in \#*) continue;; esac

  if [ ! -d "$name/.git" ]; then
    echo "✗ $name: not a git checkout — skipping"
    continue
  fi

  echo "→ $name: checkout $branch, reset to ${sha:0:10}, clean"
  git -C "$name" checkout -f "$branch" >/dev/null 2>&1 || true
  git -C "$name" reset --hard "$sha"   >/dev/null
  git -C "$name" clean $clean_flags    >/dev/null
  echo "✓ $name restored"
done < "$LOCK"

echo
echo "All child repos restored to baseline. Ready for the next take."
