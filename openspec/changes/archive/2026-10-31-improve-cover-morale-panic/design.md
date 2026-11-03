## Context

`coverFor(x, y, stance)` is proximity-only and returns sandbag cover no matter
where the threat is. `morale` doubles as suppression; there is no panic or routed
state, and outcome only checks `alive`. The map has a flat 220 m ground plane and
pathfinding bounds of ±100 m. See the proposal and delta specs for the contract.

## Goals / Non-Goals

**Goals:**

- Make every cover volume directional and stance-aware.
- Separate short-term suppression from long-term morale.
- Add a deterministic pinned/panic/routed state machine.
- Keep player stance authority except during panic.
- Make routed units leave the fight without treating them as dead.

**Non-Goals:**

- Terrain heightfield, rallying, new weapons, vehicles, campaign or final art.

## Decisions

### 1. Cover volumes with a protected side

`CoverPoint` becomes a volume:

```ts
interface CoverPoint {
  x: number;
  y: number;
  halfWidth: number;
  halfDepth: number;
  height: number;
  radius: number;
  quality: number;
  kind: 'sandbag';
}
```

`coverAgainst(x, y, threatX, threatY, stance)` samples the unit-to-threat segment
against each volume. Cover applies only when the segment crosses the volume and
the unit is within its interaction radius. A standing unit gets no low-cover
bonus; crouched/prone units do. The result is capped at 0.75.

The building remains the only hard LOS blocker in this slice. Tree, trench and
stone volumes are added with the terrain change.

Alternative: per-wall normals only. Rejected because a segment test handles
corners and flanking without a hand-authored facing per wall.

### 2. Suppression and morale are separate

- `suppression` 0–100 rises from every incoming shot and decays each tick.
- `morale` 0–100 falls on hits and near misses; it does not decay in this slice.
- `suppressed`: suppression ≥ 30 or morale ≤ 30.
- `pinned`: suppression ≥ 65.
- `panicked`: morale ≤ 10 and suppression ≥ 30, or morale ≤ 5.
- `routed`: crossed the map boundary after panic.

Panic is persistent; the unit does not recover in this slice. `suppressed` remains
the compatibility flag exposed to the frame.

### 3. Directional cover in fire

`fire()` computes target cover from the shooter's position, not from the target's
nearest sandbag. Every shot adds suppression scaled by weapon suppression, range
and `(1 - cover * 0.8)`. Hits add more; near misses add less. This makes a covered
unit both harder to hit and slower to suppress.

### 4. Pinned and panic behaviour

- Exposed suppressed: drop to crouch, then prone, unless `stanceLocked`.
- Pinned: seek retrograde cover within 12 m; if none, hunker.
- Panicked: clear orders and target, ignore player orders, path to nearest map
  edge. Panic changes stance even if locked.
- When crossing `MAP_BOUNDS`, mark `routed`, emit `unit_routed`, clear path and
  target, hide ring.

Panic pathing uses A* to the nearest boundary point; if that route fails it tries
the next edge. Wall-clock time is never used.

### 5. Routed units are out of the fight

`routed` is separate from `alive`. Routed units are skipped by target acquisition,
fire, movement, cover occupancy, picking and rendering. `updateOutcome()` counts
`alive && !routed`. A unit that is routed is not a corpse and does not use the dead
pose.

### 6. HUD

The selected section shows average cover, average suppression and the worst state
among its active units. All strings use PT-BR/EN keys. The panel does not own
state.

## Risks / Trade-offs

- **Panic can remove a player's section quickly** → thresholds are tunable and
  the sandbox inspector will expose them later.
- **Directional cover can feel inconsistent at corners** → use a segment test with
  a fixed interaction radius and add tests for front/flank.
- **Routed units leave the frame's "alive" semantics** → keep `alive` for physical
  survival, add `routed`, and update every consumer.
- **More state changes the hash** → expected; determinism tests compare runs, not a
  frozen fixture.
