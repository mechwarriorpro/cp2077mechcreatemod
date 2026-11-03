#!/usr/bin/env bash
# MECHFALL // FORGE 77 — publish a STANDALONE mechfall-forge repo.
#
# This script NEVER modifies the current checkout or its branch: it exports tracked files to a
# temporary directory, initialises a fresh repo there, and pushes that to a new GitHub repo.
# In this Arena session the work lives on arena/7f91711b-cp2077mechcreatemod and is already
# pushed there; this script is for the optional separate public repo from the handover (R11).
#
# Usage:
#   ./push_to_github.sh              # create + push public repo "mechfall-forge"
#   ./push_to_github.sh --dry-run    # show what would happen
#   REPO_NAME=my-fork ./push_to_github.sh
#
# Auth: run `gh auth login` (or connect GitHub in Arena). If `gh auth status` fails, the script
# prints manual steps and exits without touching any remote. NEVER echo a token.

set -euo pipefail
REPO_NAME="${REPO_NAME:-mechfall-forge}"
VISIBILITY="${VISIBILITY:-public}"
DRY=0
[[ "${1:-}" == "--dry-run" ]] && DRY=1

echo "==> MECHFALL // FORGE 77 standalone publisher"
if [[ "$DRY" == "1" ]]; then
  echo "DRY RUN: would export tracked files and create https://github.com/<you>/${REPO_NAME} (${VISIBILITY})."
  echo "Files that would be exported:"
  git ls-files | sed 's/^/  /'
  echo "Manual steps (no credentials in this script):"
  echo "  1) gh auth login    (or connect the GitHub app in Arena)"
  echo "  2) https://github.com/new?name=${REPO_NAME}&visibility=${VISIBILITY}"
  echo "  3) git remote add origin <your-repo-url> && git push -u origin main"
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install it or use the manual steps below." >&2
  echo "  1) https://github.com/new?name=${REPO_NAME}&visibility=${VISIBILITY}" >&2
  echo "  2) git remote add origin <your-repo-url> && git push -u origin main" >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub auth unavailable. Run 'gh auth login' or reconnect GitHub in Arena." >&2
  echo "Manual: https://github.com/new?name=${REPO_NAME}&visibility=${VISIBILITY}" >&2
  echo "Then: git remote add origin <your-repo-url> && git push -u origin main" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
echo "==> Exporting tracked files to $TMP (current checkout untouched)"
git ls-files -z | tar --null -T - -cf - | (cd "$TMP" && tar -xf -)
# The bundle is gitignored; include a fresh one as a portable snapshot if requested.
if [[ "${INCLUDE_BUNDLE:-0}" == "1" ]]; then
  (cd "$TMP" && git init -q -b main . && git add -A && git -c user.email=forge@local -c user.name="MECHFALL FORGE" commit -qm "MECHFALL // FORGE 77 test build" && git bundle create mechfall-forge.bundle --all)
fi
(cd "$TMP" && git init -q -b main . && git add -A && \
  git -c user.email=forge@local -c user.name="MECHFALL FORGE" commit -qm "MECHFALL // FORGE 77 — initial test build")
echo "==> Creating ${VISIBILITY} repo ${REPO_NAME} and pushing"
(cd "$TMP" && gh repo create "$REPO_NAME" "--${VISIBILITY}" --source=. --remote=origin --push)
echo "==> Done. Prefilled page if you prefer manual creation: https://github.com/new?name=${REPO_NAME}&visibility=${VISIBILITY}"
