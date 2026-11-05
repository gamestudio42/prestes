## Why

The soldier AI review of 2026-11-04 (`docs/design/soldier-ai-review.md`)
ranked two findings first, and the user chose to start with them:

- **A section in the open does not react to the first shots** (finding 8).
  Without an order, automatic cover seeking does nothing, and the suppression
  reaction waits until a soldier is *suppressed*, so a standing section takes
  several volleys standing.
- **Suppress stops when its target breaks** (finding 9). The order ends as
  soon as the one target routs, and the section falls idle with the rest of
  that troop still in front of it. In the training stations this read as
  "Suprimir não atira".

## What Changes

- **Under fire**: a soldier is *under fire* for 3 s after a shot is aimed at
  him or at a squad mate within 6 m. While under fire:
  - He turns toward the shooter if he has no target, so he can see him and
    return fire (today a soldier facing away never sees who shoots him).
  - Standing, with no player stance lock and no order that keeps him moving
    (move, withdraw, flank, pursue, rescue), he crouches at once.
  - Idle or holding, with the balanced or defensive posture, he takes a
    free cover slot within 6 m that guards against the shooter and is not
    closer to him, if there is one; the section's slot planner is reused, so
    two soldiers do not race for one slot.
  - Aggressive soldiers only turn and return fire; they keep their stance and
    place.
  - Moving soldiers on advance or recon crouch and keep going; on move,
    withdraw, flank, pursue or rescue they keep their order and stance.
- **Suppress keeps on the troop**: when the suppressed target dies, routs or
  falls, the suppressing soldiers switch to the nearest visible member of
  the same enemy squad within 15 m of the old target. The order ends only when
  none is left in sight, or when the player gives another order.

The existing suppression reaction (fall back or hunker down once
suppressed) and the pinned and panic reactions are unchanged.

## Capabilities

### Modified Capabilities

- `simulation`: a new under-fire reaction; the suppress order continues on the
  target's troop.

## Impact

- `packages/simulation`: an `underFireTicks` and `lastShooter` per unit set
  from shot events in `fire`; a `reactToFire` system before `seekCover`; the
  suppress target hand-over in `orders.ts`; facing uses the last shooter.
- The determinism golden changes if its scenario takes fire (recorded with the
  reason).
- Tests: crouch on first shot, take cover in reach, aggressive keeps place,
  turn toward an unseen shooter, movers keep their order, suppress hands over
  to the next soldier of the troop and ends when none is in sight; e2e of the
  final training station (suppress then take the line) still passes.
