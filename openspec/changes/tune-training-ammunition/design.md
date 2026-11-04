## Context

Ammunition comes from the single Mauser profile (`magazine` 5, `reserve` 15).
The training engine (`training: true`) refills the player troop at every station
through `resetTrainingUnit`. Suppress sets `unit.suppress`, and `combat.ts` uses
`SUPPRESS_FIRE_INTERVAL` (8 ticks) instead of the weapon's 12-tick interval.

## Goals / Non-Goals

**Goals:** station 7 finishable by hand with ammunition to spare; Coluna values
unchanged; deterministic and testable.

**Non-Goals:** campaign balance, resupply, per-soldier loadouts in the UI.

## Decisions

- `TRAINING_AMMUNITION = { magazine: 5, reserve: 45 }` in `packages/shared` next
  to the weapon profile, so tests and any later HUD use share it. A separate
  constant rather than a second weapon profile: the rifle is the same, only the
  issue differs.
- The training engine applies it to player-faction, non-dummy soldiers and the
  instructor at construction and in `resetTrainingUnit`. Training enemies and
  dummies are untouched. The simulation stays the only authority (it runs in the
  worker); the view only reads magazine and reserve from snapshots.
- Suppress cooldown: the fast `SUPPRESS_FIRE_INTERVAL` while the target's state
  is not `pinned`, otherwise `weapon.fireIntervalTicks`. It reads the target's
  state at the shot, so it adds no state and stays deterministic.

## Risks / Trade-offs

- More rounds make stations easier; objectives are order-based, so completion
  does not depend on scarcity. Watch the e2e run times.
- The golden hash may change; if so it is recorded in `docs/status.md`.
