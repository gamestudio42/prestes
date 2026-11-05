## 1. Measure first

- [x] 1.1 Bunching metric in `tools/battle-report.ts` and the feel test band (under 15%); record today's figure in `docs/status.md` (verify: the test fails on today's code for bunching)
- [x] 1.2 Preview timing test in `packages/shared`: three sections, each order; Attack must take under 2 ms (verify: fails today at about 364 ms)

## 2. Spacing

- [x] 2.1 Merge overlapping cover slots closer than 1.2 m (deterministic order); tests for the trench bay with parapet (verify: no two defenders within 1.2 m)
- [x] 2.2 Overflow soldiers take distinct formation places at the destination; test with 11 soldiers and 8 slots (verify: test)

## 3. Rushes

- [x] 3.1 Forward cone (45 degrees) and at least 6 m gained for rush cover; test for the cover 25 m to the side (verify: the existing rush tests and the new one pass)

## 4. Preview

- [x] 4.1 Straight approach guides for targeted orders to the section's approach point (verify: timing test under 2 ms, preview tests pass)
- [x] 4.2 Memoize the preview in `useOrders` on the pointer cell, hovered unit, selection, order, facing, spacing and rounded positions (verify: e2e preview tests pass; a still pointer does not recompute, checked with a counter in a unit test of the key)

## 5. Close

- [x] 5.1 Feel report on five seeds within all bands; determinism golden re-recorded with the reason; `pnpm verify` (verify: gate passes)
- [x] 5.2 Hand check by the user in Chrome: a 3v3 with three sections attacking; record in `docs/status.md`
