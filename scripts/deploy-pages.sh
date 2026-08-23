#!/bin/bash
#
# Publishes the static export to the gh-pages branch.
#
# Uses a git worktree rather than `git subtree`, which is absent from some git
# builds, and keeps the existing gh-pages history instead of force-pushing over
# it. Run from anywhere; it operates on the repository containing this script.
#
#   ./scripts/deploy-pages.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE="${TMPDIR:-/tmp}/kinet-gh-pages"
BRANCH="gh-pages"

cd "$REPO_ROOT"

# --- preflight -------------------------------------------------------------
if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree is dirty. Commit or stash first." >&2
  exit 1
fi

REMOTE_URL="$(git remote get-url origin)"
if ! git ls-remote --exit-code origin >/dev/null 2>&1; then
  echo "error: cannot reach $REMOTE_URL" >&2
  echo "       If you renamed the repository on GitHub, update the remote:" >&2
  echo "         git remote set-url origin https://github.com/<user>/<repo>.git" >&2
  exit 1
fi

SHA="$(git rev-parse --short HEAD)"

# --- build -----------------------------------------------------------------
echo "==> Building static export (GITHUB_PAGES=true)"
rm -rf .next out
GITHUB_PAGES=true npm run build

[ -f out/index.html ] || { echo "error: build produced no out/index.html" >&2; exit 1; }
[ -f out/.nojekyll ] || { echo "error: out/.nojekyll missing; Pages would drop _next/" >&2; exit 1; }

# --- publish ---------------------------------------------------------------
echo "==> Syncing out/ into the $BRANCH worktree"
git worktree remove --force "$WORKTREE" 2>/dev/null || true
git fetch origin "$BRANCH"
git worktree add "$WORKTREE" "$BRANCH"

# --exclude .git protects the worktree's own git pointer file.
rsync -a --delete --exclude '.git' out/ "$WORKTREE/"

cd "$WORKTREE"
git add -A
if git diff --cached --quiet; then
  echo "==> No changes to publish"
else
  git commit -m "Deploy $SHA"
  git push origin "$BRANCH"
  echo "==> Published $SHA"
fi

cd "$REPO_ROOT"
git worktree remove --force "$WORKTREE"

echo "==> Done. Give Pages a minute, then check the site."
