## Summary

<!-- What changed and why -->

## Ship checklist

Before requesting review or merging, confirm:

- [ ] `npm run check:ci` passes locally (mirrors GitHub CI)
- [ ] GitHub **validate** check is green on this PR
- [ ] Generated artifacts rebuilt when logic changed (`overview-snapshot.json`, etc.)
- [ ] Related tests updated when slate/overview copy or structure changed
- [ ] No em dashes in user-facing copy (`npm run check:no-em-dashes`)

**Do not merge until CI is green.** A failing PR blocks production deploy on the next merge to `main`.

## Testing

<!-- Commands run, screenshots if UI -->
