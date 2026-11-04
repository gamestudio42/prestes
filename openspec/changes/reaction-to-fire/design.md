## Context

`fire` emits a shot event per round; it does not record anything on the
target. `reactToSuppression` acts only on *suppressed* or *pinned* soldiers.
`seekCover` acts only on soldiers with an order (or the defensive posture).
`updateFacing` turns idle soldiers toward the nearest threat within awareness
range, slowly. A suppress order clears in `orders.ts` when its target is gone.

## Decisions

### Marking fire

In `fire`, after each shot, the target and every living squad mate within
6 m of him get `underFireTicks = 30` (3 s) and `lastShooter = shooter id`.
Timers count down in the tick loop. No random draw is added, so the order of
the random stream is unchanged.

### Reaction (`reactToFire`, before `seekCover`)

For each soldier with `underFireTicks > 0`, alive, not routed, panicked or
pinned (those have their own reactions):

1. No target and the shooter alive: face the shooter (set the facing, not
   the aim, so a player's ordered aim survives).
2. Stance: standing and not locked, and the current order is not one that
   keeps him moving: crouch.
3. Cover (balanced or defensive posture, idle or holding, no slot, not
   moving): plan with `planCoverSlots` for him alone with the shooter as the
   threat, limited to 6 m and to slots not closer to the shooter; take the
   best one, path to it. A cooldown of 60 ticks stops him from hopping.

### Suppress hand-over

When a suppressing soldier's target is no longer valid, pick the nearest
member of the target's squad, alive, not routed or incapacitated, within
15 m of the old target and visible from the soldier; keep `suppress` and
`currentOrder`. The section shares the choice: the first soldier to switch
records it per squad for that tick, the rest follow, so the volley stays on
one man. With none, clear as today.

## Risks

- More soldiers crouch and move to cover in existing scenarios: e2e station
  tests that count soldiers in a zone may need small tick budgets.
- The golden changes when its scenario has fire; the new hash is recorded.
