# Pre-merge checklist

Run this before opening or merging a PR. It mirrors the GitHub **validate** job in `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`.

## One command (recommended)

```bash
npm run check:ci
```

Do not merge until this passes locally **and** the GitHub **validate** check is green on the PR.

## Step-by-step (same sequence as CI)

| # | Local command | GitHub validate step |
| --- | --- | --- |
| 1 | `npm run check:refactor-safety` | Refactor safety checks |
| 2 | `npm run check:client-imports` | Client import boundary check |
| 3 | `npm run typecheck` | Typecheck |
| 4 | `npm run check:artifact-freshness` | Generated artifact freshness |
| 5 | `npm run check:validation-freshness` | Validation artifact freshness |
| 6 | `npm run check:coupled-tests` | Coupled test change gate |
| 7 | `npm run check:volume` | Volume regression gate |
| 8 | `npm run check:deploy` | Generate deploy data artifacts |
| 9 | `npm run check:css-syntax` | CSS syntax check |
| 10 | `npm run build:next` | Next.js production build |
| 11 | `npm run test` | Unit tests |
| 12 | `npm run honesty-audit` | Honesty audit |

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
npm run audit:ci-artifact-contract
npm run check:no-em-dashes
```

## Contract audit report

`npm run audit:ci-artifact-contract` writes `CI-ARTIFACT-CONTRACT-AUDIT.md` with the workflow matrix (permissions, push behavior, follow-up commands).
