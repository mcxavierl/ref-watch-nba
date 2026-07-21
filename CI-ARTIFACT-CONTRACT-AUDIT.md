# CI and artifact contract audit

Generated: 2026-07-21T17:16:59.707Z

## Pre-merge checklist (mirrors GitHub validate)

Run locally before opening or merging a PR:

```bash
npm run check:ci
```

Or step-by-step:

1. **Refactor safety** (`npm run check:refactor-safety`) - CI step: Refactor safety checks
2. **Client import boundary** (`npm run check:client-imports`) - CI step: Client import boundary check
3. **Merge conflict markers** (`npm run check:no-conflict-markers`) - CI step: Merge conflict marker check
4. **Typecheck** (`npm run typecheck`) - CI step: Typecheck
5. **Enterprise API route contracts** (`npm run check:enterprise-api-routes`) - CI step: Enterprise API route contracts
6. **Generated artifact freshness** (`npm run check:artifact-freshness`) - CI step: Generated artifact freshness
7. **Validation artifact freshness** (`npm run check:validation-freshness`) - CI step: Validation artifact freshness
8. **Coupled test gate** (`npm run check:coupled-tests`) - CI step: Coupled test change gate
9. **Volume regression** (`npm run check:volume`) - CI step: Volume regression gate
10. **Deploy data artifacts** (`npm run check:deploy`) - CI step: Generate deploy data artifacts
11. **CSS syntax** (`npm run check:css-syntax`) - CI step: CSS syntax check
12. **Next.js build** (`npm run build:next`) - CI step: Next.js production build
13. **Post-build typecheck** (`npm run typecheck`) - CI step: Post-build typecheck
14. **Design ship** (`npm run audit:design-ship`) - CI step: Design ship audit
15. **Design token parity** (`npm run audit:design-tokens`) - CI step: Design token parity audit
16. **Clinical card consistency** (`npm run audit:card-consistency`) - CI step: Clinical card consistency audit
17. **Metric semantics** (`npm run audit:metric-semantics`) - CI step: Metric semantics audit
18. **Em dash copy** (`npm run check:no-em-dashes`) - CI step: Em dash copy audit
19. **Terminal integrity** (`npm run audit:terminal-integrity`) - CI step: Terminal integrity audit
20. **Insight-first** (`npm run audit:insight-first`) - CI step: Insight-first audit
21. **Overlay portals** (`npm run audit:overlay-portals`) - CI step: Overlay portal audit
22. **Integrity monitor** (`npm run audit:integrity-monitor`) - CI step: Integrity monitor audit
23. **Homepage product surface** (`npm run audit:homepage-product`) - CI step: Homepage product audit
24. **Ship hygiene** (`npm run audit:ship-hygiene`) - CI step: Ship hygiene audit
25. **Unit tests** (`npm run test`) - CI step: Unit tests
26. **Honesty audit** (`npm run honesty-audit`) - CI step: Honesty audit

When overview snapshot sources change, also run:

```bash
npx tsx scripts/build-overview-snapshot.ts && git add data/overview-snapshot.json
```

## Workflow matrix

| Workflow | Push to git | Permissions | Checkout token | Concurrency | Follow-up on data change |
| --- | --- | --- | --- | --- | --- |
| CI | no | default | no | ci-${{ github.ref }} | npx tsx scripts/build-overview-snapshot.ts && git add data/overview-snapshot.json |
| Deploy to Cloudflare | no | default | no | cloudflare-deploy | npx tsx scripts/build-overview-snapshot.ts && git add data/overview-snapshot.json |
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
