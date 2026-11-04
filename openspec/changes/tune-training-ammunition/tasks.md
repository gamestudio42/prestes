## 1. Ammunition

- [x] 1.1 Add `TRAINING_AMMUNITION` (5 + 45) to `packages/shared/src/weapons.ts` and export it; use it for player soldiers and the instructor in the training engine at construction and in `resetTrainingUnit`; unit-test the training load, the station refill, and that the sandbox and the training enemy keep 5 + 15
- [x] 1.2 Fire suppress at the weapon's normal interval while the target is pinned; unit-test both intervals

## 2. Close

- [x] 2.1 Update the determinism golden with `--update` if it changes and record why; run `pnpm verify`
- [ ] 2.2 Play station 7 by hand in Chrome and record the result in `docs/status.md`
