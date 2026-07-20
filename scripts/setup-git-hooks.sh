#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
HOOKS_DIR="$ROOT/.githooks"
GIT_HOOKS="$(git rev-parse --git-path hooks)"

mkdir -p "$GIT_HOOKS"

for hook in pre-push; do
  if [[ -f "$HOOKS_DIR/$hook" ]]; then
    ln -sf "$HOOKS_DIR/$hook" "$GIT_HOOKS/$hook"
    chmod +x "$HOOKS_DIR/$hook"
  fi
done

echo "git hooks installed (pre-push -> check:css-syntax + check:ci)"
