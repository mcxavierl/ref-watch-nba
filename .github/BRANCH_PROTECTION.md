# Branch protection (recommended)

Fast merges are fine only when CI is green. These repo settings prevent the failure pattern where PRs merge with a red **validate** check and production deploy stalls.

## Required GitHub settings

In **Settings → Branches → Branch protection rules** for `main`:

1. **Require a pull request before merging**
2. **Require status checks to pass before merging**
   - Required check: `validate` (from `.github/workflows/ci.yml`)
3. **Require branches to be up to date before merging** (optional but recommended)
4. **Do not allow bypassing the above settings** (or restrict bypass to admins only)

Deploy (`.github/workflows/deploy.yml`) already re-runs the same validate steps before Cloudflare deploy. If validate fails on a merged PR, **production will not update** until a later green merge.

## Local guardrails

```bash
npm run check:ci          # full pre-push / pre-merge gate (mirrors CI)
npm run check:css-syntax  # fast CSS parse (~1s); also runs first in pre-push hook
npm run setup:hooks       # install pre-push hook (css-syntax, then check:ci)
SKIP_SHIP_CHECK=1 git push   # emergency bypass only
```

Validate jobs in CI and deploy use a **20-minute** timeout (includes `build:next`).

## Agent / cloud workflow

1. Run `npm run check:ci` before every push
2. Open PR and wait for green **validate**
3. Merge only after CI passes
4. Never use `git commit --no-verify` unless the hook itself is broken
