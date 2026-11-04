## 1. Simulation

- [ ] 1.1 `ORDER_PACE` and `POSTURE_PACE` in shared; movement multiplies by both; pursuit fatigue doubled
- [ ] 1.2 Recon sweep in `updateFacing` (per-soldier phase) and the recon sight bonus
- [ ] 1.3 Defensive posture crouches movers and halted soldiers unless the stance is locked
- [ ] 1.4 Tests: pace per order and posture, sweep sees a flank enemy, defensive crouch, stance lock; new determinism golden recorded

## 2. View

- [ ] 2.1 Front mark: a small arrowhead on the ring pointing where the soldier faces; no cone drawn; proxies unchanged
- [ ] 2.2 Run clip in Blender; clip choice for pursuit and fast movers; cadence follows the pace
- [ ] 2.3 View tests for the front mark and the run choice

## 3. Close

- [ ] 3.1 E2E tick budgets adjusted where pace changed; `pnpm verify`
- [ ] 3.2 Hand check in Chrome; record in `docs/status.md`
