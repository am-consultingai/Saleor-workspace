#!/usr/bin/env bash
# create-workspace.sh — MAINTAINER tool. Not part of the teammate flow.
#
# Teammates do NOT need this: they just `git clone <overlay>` and run ./bootstrap.sh.
# This script is for a maintainer spinning up a NEW overlay repo (e.g. a fresh fork
# for another org/account) using THIS repo as the template.
#
# It reads the REAL tracked overlay files from the current checkout (via `git
# archive`) — it does not duplicate them inline, so there is nothing to drift.
#
# What it does:
#   1. Exports every tracked file of this overlay into a new directory.
#   2. Re-inits git there, commits, and (optionally) creates + pushes a GitHub remote.
#   3. Clones the child repos and runs ./bootstrap.sh to bring the stack up.
#
# Requirements: git; for the remote, the GitHub CLI `gh` authenticated.
#
# Usage:
#   scripts/create-workspace.sh [TARGET_PARENT_DIR]
#
# Config via env (all optional):
#   REPO_NAME=Saleor-workspace
#   VISIBILITY=private        (or "public")
#   CREATE_REMOTE=true        (set "false" to stay local-only)
#   GH_USER=<login>           (auto-detected from gh if unset)
#   RUN_BOOTSTRAP=true        (set "false" to skip starting the stack)
set -euo pipefail

REPO_NAME="${REPO_NAME:-Saleor-workspace}"
VISIBILITY="${VISIBILITY:-private}"
CREATE_REMOTE="${CREATE_REMOTE:-true}"
RUN_BOOTSTRAP="${RUN_BOOTSTRAP:-true}"
GH_USER="${GH_USER:-}"

log() { printf '\033[1;34m::\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# This overlay checkout is the template — locate its git root.
SRC_ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")/.." rev-parse --show-toplevel 2>/dev/null)" \
  || die "Run this from within an existing Saleor-workspace checkout (it is the template)."

PARENT="${1:-$(cd "$SRC_ROOT/.." && pwd)}"
WS_DIR="$PARENT/$REPO_NAME"

[ -e "$WS_DIR" ] && die "Target $WS_DIR already exists — choose another REPO_NAME or parent dir."

log "Exporting tracked overlay files from $SRC_ROOT -> $WS_DIR"
mkdir -p "$WS_DIR"
# git archive emits ONLY tracked files (child repos are git-ignored, so excluded).
git -C "$SRC_ROOT" archive HEAD | tar -x -C "$WS_DIR"

cd "$WS_DIR"
log "Initializing fresh git history"
git init -q
git branch -M main
git add .
git commit -qm "Initialize Saleor workspace overlay (from template)"

# ---- optional GitHub remote -------------------------------------------------
if [ "$CREATE_REMOTE" = "true" ] && command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  [ -n "$GH_USER" ] || GH_USER="$(gh api user --jq .login)"
  if gh repo view "$GH_USER/$REPO_NAME" >/dev/null 2>&1; then
    log "Remote $GH_USER/$REPO_NAME already exists — adding as origin."
    git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git"
    git push -u origin main
  else
    log "Creating remote $GH_USER/$REPO_NAME ($VISIBILITY) and pushing."
    gh repo create "$REPO_NAME" --"$VISIBILITY" --source=. --remote=origin --push
  fi
else
  log "Skipping remote (CREATE_REMOTE=$CREATE_REMOTE or gh unavailable). Local-only overlay."
fi

# ---- bring it to life -------------------------------------------------------
if [ "$RUN_BOOTSTRAP" = "true" ]; then
  log "Running ./bootstrap.sh to clone children and start the stack"
  ./bootstrap.sh
else
  log "Done. Run ./bootstrap.sh inside $WS_DIR to start the stack."
fi
