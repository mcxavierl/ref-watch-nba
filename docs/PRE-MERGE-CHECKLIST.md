# Pre-merge checklist

Run this before opening or merging a PR. It mirrors the GitHub **validate** job in `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`.

## One command (recommended)

Fast preflight (~30s) before push:

```bash
npm run check:preflight
```

Full CI mirror before merge:

```bash
npm run check:ci
```

Do not merge until this passes locally **and** the GitHub **validate** check is green on the PR.

## Step-by-step (same sequence as CI)

| # | Local command | GitHub validate step |
| --- | --- | --- |
| 1 | `npm run check:refactor-safety` | Refactor safety checks |
| 2 | `npm run check:client-imports` | Client import boundary check |
| 3 | `npm run check:no-conflict-markers` | Merge conflict marker check |
| 4 | `npm run typecheck` | Typecheck |
| 5 | `npm run check:artifact-freshness` | Generated artifact freshness |
| 6 | `npm run check:validation-freshness` | Validation artifact freshness |
| 7 | `npm run check:coupled-tests` | Coupled test change gate |
| 8 | `npm run check:volume` | Volume regression gate |
| 9 | `npm run check:deploy` | Generate deploy data artifacts |
| 10 | `npm run check:css-syntax` | CSS syntax check |
| 11 | `npm run build:next` | Next.js production build |
| 12 | `npm run audit:theme-matrix` | Theme matrix contrast audit |
| 13 | `npm run audit:color-drift` | Color drift audit |
| 14 | `npm run audit:design-tokens` | Design token parity audit |
| 15 | `npm run audit:card-consistency` | Clinical card consistency audit |
| 16 | `npm run audit:metric-semantics` | Metric semantics audit |
| 17 | `npm run check:no-em-dashes` | Em dash copy audit |
| 18 | `npm run audit:terminal-integrity` | Terminal integrity audit |
| 19 | `npm run audit:insight-first` | Insight-first audit |
| 20 | `npm run audit:overlay-portals` | Overlay portal audit |
| 21 | `npm run test` | Unit tests |
| 22 | `npm run honesty-audit` | Honesty audit |

## When overview snapshot sources change

If you edit files tracked in `scripts/overview-snapshot-sources.ts` (for example `src/lib/insight-editorial.ts`, `src/lib/cross-league-overview.ts`, or league stats JSON under `data/`), rebuild the committed snapshot:

```bash
npx tsx scripts/build-overview-snapshot.ts && git add data/overview-snapshot.json
```

Then re-run `npm run check:artifact-freshness`.

## When coupled logic changes

If you change files guarded by `scripts/check-coupled-test-changes.ts`, update the related test file in the same PR. Example: editing `src/lib/insight-editorial.ts` requires updating `src/lib/homepage-insight-gates.test.ts`.

## Additional local audits (also run in production build)

```bash
npm run audit:card-consistency
npm run audit:metric-semantics
npm run audit:theme-matrix
npm run audit:color-drift
npm run audit:design-tokens
npm run audit:ci-artifact-contract
npm run check:no-em-dashes
npm run audit:terminal-integrity
npm run audit:insight-first
npm run audit:overlay-portals
```

First-time setup for theme matrix screenshots (Playwright Chromium):

```bash
npx playwright install chromium
```

## Contract audit report

`npm run audit:ci-artifact-contract` writes `CI-ARTIFACT-CONTRACT-AUDIT.md` with the workflow matrix (permissions, push behavior, follow-up commands).
