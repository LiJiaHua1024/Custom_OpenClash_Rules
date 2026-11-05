#!/usr/bin/env bash
set -euo pipefail

# The Actions token cannot push workflow changes. Apply a three-way patch
# without importing upstream commits that may themselves modify workflows.
upstream=${1:?upstream revision required}
state=.upstream-sync/last-upstream-commit
base=$(tr -d '\r\n' < "$state")
git rev-parse --verify "${base}^{commit}" >/dev/null
git rev-parse --verify "${upstream}^{commit}" >/dev/null
if ! git merge-base --is-ancestor "$base" "$upstream"; then
  echo 'The upstream history was rewritten; manual reconciliation is required.' >&2
  exit 1
fi
if [ "$base" = "$upstream" ]; then
  echo 'No upstream changes.'
  exit 0
fi

temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT
git diff --binary --full-index --no-renames "$base" "$upstream" -- . \
  ':(exclude,glob,top).github/workflows/**' > "$temp_dir/update.patch"
if [ -s "$temp_dir/update.patch" ]; then
  git apply --3way --index "$temp_dir/update.patch"
fi

if ! git diff --quiet "$base" "$upstream" -- .github/workflows; then
  # Retain the upstream versions for review without activating them.
  rm -rf .upstream-sync/workflows
  mkdir -p .upstream-sync/workflows
  if git cat-file -e "$upstream:.github/workflows" 2>/dev/null; then
    mkdir -p "$temp_dir/archive"
    git archive "$upstream" .github/workflows | tar -x -C "$temp_dir/archive"
    cp -a "$temp_dir/archive/.github/workflows/." .upstream-sync/workflows/
  fi
  git add -A -- .upstream-sync/workflows
  echo '::warning::Upstream workflow files changed; their versions were saved under .upstream-sync/workflows for review, not activated.'
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    echo 'Upstream workflow files changed. Review the snapshot under `.upstream-sync/workflows`; active workflows were not changed.' >> "$GITHUB_STEP_SUMMARY"
  fi
fi

printf '%s\n' "$upstream" > "$state"
git add -- "$state"
if ! git diff --cached --quiet -- .github/workflows; then
  echo 'Refusing to publish changes to active workflows with the Actions token.' >&2
  exit 1
fi
