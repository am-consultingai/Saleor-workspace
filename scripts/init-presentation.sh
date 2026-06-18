#!/usr/bin/env bash
#
# init-presentation.sh — turn THIS cloned template into a new presentation.
#
# Run it from inside a fresh clone of the template. It will:
#   1. Rename this local folder to <name> (the -n parameter).
#   2. Detach the local repo from the template remote (removes 'origin').
#   3. Create a new public GitHub repo named <name>, commit, and push.
#   4. Enable GitHub Pages (GitHub Actions source) so the deck deploys live.
#
# Your existing template clone elsewhere is unaffected; the upstream template
# repo is never modified.
#
# Usage (from inside the cloned folder):
#   ./scripts/init-presentation.sh -n <name>
#
# Options:
#   -n <name>   New folder + repo name (required). Allowed: letters digits . _ -
#   -h          Show this help.
#
# Environment overrides (optional):
#   GH_OWNER    account/org to create the new repo under
#               (default: your authenticated gh login)
#
set -euo pipefail

say()  { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
err()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; }

usage() {
  cat <<'EOF'
init-presentation.sh — turn this cloned template into a new presentation.

Usage (from inside the cloned folder):
  ./scripts/init-presentation.sh -n <name>

  -n <name>   New folder + repo name (required: letters, digits, . _ -)
  -h          Show this help.

Env: GH_OWNER overrides the account/org for the new repo.
EOF
}

NAME=""
while getopts ":n:h" opt; do
  case "$opt" in
    n) NAME="$OPTARG" ;;
    h) usage; exit 0 ;;
    \?) err "Unknown option: -$OPTARG"; usage; exit 1 ;;
    :)  err "Option -$OPTARG requires an argument"; exit 1 ;;
  esac
done

# ---- validation ------------------------------------------------------------
[ -n "$NAME" ] || { err "Missing required -n <name>"; usage; exit 1; }
[[ "$NAME" =~ ^[A-Za-z0-9._-]+$ ]] || { err "Invalid name '$NAME' (use letters, digits, . _ -)"; exit 1; }

for tool in git gh npm; do
  command -v "$tool" >/dev/null 2>&1 || { err "'$tool' is not installed or not on PATH"; exit 1; }
done
gh auth status >/dev/null 2>&1 || { err "GitHub CLI not authenticated. Run: gh auth login"; exit 1; }

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$PROJECT_ROOT" ] || { err "Not inside a git repository. Clone the template first, then run this from inside it."; exit 1; }
[ -d "$PROJECT_ROOT/src/deck-kit" ] || { err "This doesn't look like a template clone (no src/deck-kit/). Run from inside a cloned template."; exit 1; }

PARENT="$(dirname "$PROJECT_ROOT")"
OLD="$(basename "$PROJECT_ROOT")"
OWNER="${GH_OWNER:-$(gh api user --jq .login)}"

# ---- 1. rename the local folder --------------------------------------------
if [ "$OLD" != "$NAME" ]; then
  TARGET="$PARENT/$NAME"
  [ -e "$TARGET" ] && { err "'$TARGET' already exists"; exit 1; }
  cd "$PARENT"
  mv "$OLD" "$NAME"
  cd "$TARGET"
  ok "Renamed local folder: $OLD → $NAME"
else
  cd "$PROJECT_ROOT"
  ok "Folder already named '$NAME'"
fi

# ---- 2. detach from the template remote ------------------------------------
if git remote get-url origin >/dev/null 2>&1; then
  git remote remove origin
  ok "Detached from template remote (removed 'origin')"
fi
git branch -M main   # deploy workflow triggers on push to main

# ---- 3. personalize + commit -----------------------------------------------
npm pkg set name="$NAME" >/dev/null
TITLE="$(printf '%s' "$NAME" | tr '_-' '  ')"
sed -i "s|<title>.*</title>|<title>${TITLE} — AM Consulting</title>|" index.html
git add -A
git commit -q -m "Initialize presentation: $NAME (from template)"
ok "Personalized package name + browser title, committed"

# ---- 4. create remote repo, enable Pages, push -----------------------------
say "Creating public GitHub repo $OWNER/$NAME"
gh repo create "$OWNER/$NAME" --public --source=. --remote=origin \
  --description "AM Consulting presentation: $NAME"

enable_pages() {
  gh api --silent -X POST "repos/$OWNER/$NAME/pages" -f build_type=workflow 2>/dev/null \
    || gh api --silent -X PUT "repos/$OWNER/$NAME/pages" -f build_type=workflow 2>/dev/null
}

say "Enabling GitHub Pages (GitHub Actions source)"
PAGES_OK=0
enable_pages && PAGES_OK=1 || true

say "Pushing to origin/main"
git push -u origin main -q

# If Pages couldn't be enabled before the repo had content, enable now and
# re-run the deploy workflow so the first publish succeeds.
if [ "$PAGES_OK" -ne 1 ]; then
  sleep 2
  if enable_pages; then
    PAGES_OK=1
    RUN_ID="$(gh run list --workflow deploy.yml -L 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)"
    if [ -n "${RUN_ID:-}" ]; then gh run rerun "$RUN_ID" >/dev/null 2>&1 || true
    else gh workflow run deploy.yml >/dev/null 2>&1 || true; fi
  fi
fi

# ---- done -------------------------------------------------------------------
echo
ok "Presentation '$NAME' is initialized."
echo "   Folder : $PARENT/$NAME"
echo "   Repo   : https://github.com/$OWNER/$NAME"
if [ "$PAGES_OK" -eq 1 ]; then
  echo "   Live   : https://$OWNER.github.io/$NAME/   (first deploy ~1–2 min)"
else
  err  "Pages not auto-enabled. Enable manually:"
  echo "            gh api -X POST repos/$OWNER/$NAME/pages -f build_type=workflow"
fi
echo
echo "   Next:  npm install && npm run dev   →   edit src/presentation/slides.tsx"
