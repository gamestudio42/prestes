## 1. Simulation

- [x] 1.1 `underFireTicks` and `lastShooter` on the unit, set in `fire` for the target and squad mates within 6 m; timers in the tick loop
- [x] 1.2 `reactToFire` before `seekCover`: face the shooter, crouch, take a slot in reach (balanced and defensive, idle or holding); aggressive turns only; orders and stance locks kept
- [x] 1.3 Suppress hand-over to the nearest visible member of the target's squad within 15 m, shared by the section; clears when none
- [x] 1.4 Tests: first-shot crouch, cover in reach, shot from behind, orders and locks kept, aggressive holds, suppress hand-over and end; determinism golden recorded if it moves

## 2. Close

- [x] 2.1 E2E budgets adjusted if station timings move; `pnpm verify`
- [x] 2.2 Hand check in Chrome on the final station and an open-field ambush in the sandbox; record in `docs/status.md`
