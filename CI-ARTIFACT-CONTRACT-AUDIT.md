# CI and artifact contract audit

Generated: 2026-07-18T19:44:22.102Z

## Pre-merge checklist (mirrors GitHub validate)

Run locally before opening or merging a PR:

```bash
npm run check:ci
```

Or step-by-step:

1. **Refactor safety** (`npm run check:refactor-safety`) - CI step: Refactor safety checks
2. **Client import boundary** (`npm run check:client-imports`) - CI step: Client import boundary check
3. **Typecheck** (`npm run typecheck`) - CI step: Typecheck
4. **Generated artifact freshness** (`npm run check:artifact-freshness`) - CI step: Generated artifact freshness
5. **Validation artifact freshness** (`npm run check:validation-freshness`) - CI step: Validation artifact freshness
6. **Coupled test gate** (`npm run check:coupled-tests`) - CI step: Coupled test change gate
7. **Volume regression** (`npm run check:volume`) - CI step: Volume regression gate
8. **Deploy data artifacts** (`npm run check:deploy`) - CI step: Generate deploy data artifacts
9. **CSS syntax** (`npm run check:css-syntax`) - CI step: CSS syntax check
10. **Next.js build** (`npm run build:next`) - CI step: Next.js production build
11. **Unit tests** (`npm run test`) - CI step: Unit tests
12. **Honesty audit** (`npm run honesty-audit`) - CI step: Honesty audit

When overview snapshot sources change, also run:

```bash
npx tsx scripts/build-overview-snapshot.ts && git add data/overview-snapshot.json
```

## Workflow matrix

| Workflow | Push to git | Permissions | Checkout token | Concurrency | Follow-up on data change |
| --- | --- | --- | --- | --- | --- |
| CI | no | default | no | ci-${{ github.ref }} | npm run check:artifact-freshness (rebuild snapshot if stale) |
| Deploy to Cloudflare | no | default | no | cloudflare-deploy | npm run check:artifact-freshness (rebuild snapshot if stale) |
| Nightly slate refresh | yes | write | yes | none | npm run nightly-slate && git add data/overview-snapshot.json data/overview-insights.json |
| Refresh sports data | yes | write | yes | refresh-sports-data | npx tsx scripts/build-overview-snapshot.ts && git add data/overview-snapshot.json |
| Volume regression | no | default | no | volume-regression | none |

## Summary

| Result | Count |
| --- | ---: |
| Pass | 14 |
| Fail | 0 |
| Total checks | 14 |

No CI or artifact contract violations flagged.

Re-run: `npm run audit:ci-artifact-contract`
