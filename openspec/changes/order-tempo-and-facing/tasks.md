## 1. Clock

- [ ] 1.1 Client steps one tick per 100 ms at 1x, with a fractional accumulator for 0.5x; buttons 0.5x, 1x, 2x, 4x
- [ ] 1.2 Tests: steps per second at each speed; e2e for the buttons

## 2. Simulation

- [ ] 2.1 `GAIT_SPEED`, `orderGait` and posture factors in shared; movement uses them with the soldier's fitness
- [ ] 2.2 Fatigue by gait; winded soldiers capped at walk with hysteresis
- [ ] 2.3 Speed easing (3 m/s²) and stopping on the slot
- [ ] 2.4 Recon sweep in `updateFacing` (per-soldier phase) and the recon sight bonus
- [ ] 2.5 Defensive posture crouches movers and halted soldiers unless the stance is locked
- [ ] 2.6 Tests: gait per order and posture, bound rush runs, fatigue and winded walk, easing, sweep sees a flank enemy, defensive crouch, stance lock; new determinism golden recorded

## 3. Art and view

- [ ] 3.1 Run clip in Blender; walk re-timed to 1.5 m/s; `pnpm art`; review renders
- [ ] 3.2 Clip choice by speed, cadence from ground speed (0.75..1.25), 0.3 s cross-fades
- [ ] 3.3 Rig yaw turns at up to 270°/s
- [ ] 3.4 Front mark on the ring; no cone drawn; proxies unchanged
- [ ] 3.5 View tests: clip by speed, time scale, turning rate, front mark

## 4. Close

- [ ] 4.1 Bootcamp time limits re-measured; e2e tick budgets adjusted; `pnpm verify`
- [ ] 4.2 Hand check in Chrome (pace not too slow, legs smooth); record in `docs/status.md`
