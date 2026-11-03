## Context

The tactical core has combat, cover points and movement. This change makes the
units use them autonomously. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**

- Deterministic A* on a 1 m grid around the building.
- Facing toward target or path.
- Auto-cover with line-of-sight and occupancy checks.
- Player stance lock.

**Non-Goals:**

- Flanking, formations, destructible cover, campaign, audio.

## Decisions

### 1. A* on a coarse grid

`packages/shared/src/pathfinding.ts` runs A* on a 201×201 grid of 1 m cells over
−100..100 m. The building footprint is blocked. Movement is 8-directional with no
corner cutting; paths are smoothed with the existing line-of-sight check. The
function is pure and testable headless.

### 2. Per-unit routes

A move command computes a path for each unit. Each route creates its own order so
the path layer shows the actual detour. Clear straight lines still produce a
single destination waypoint.

### 3. Facing

The simulation stores `facingX`/`facingY`. A unit with a target faces it; otherwise
it faces the next path point. The character root rotates by
`atan2(-facingX, -facingY)` so its local −Z rifle points at the target.

### 4. Auto-cover

After target acquisition, a unit with a target, no active path and low cover
looks for the nearest sandbag within 16 m whose stand position is outside the
building, inside fire range and has line of sight to the target. It moves there
with A* and crouches if the player has not locked its stance. A cooldown prevents
thrashing.

### 5. Stance lock

`stance` commands set `stanceLocked`. Auto-cover may move a unit but cannot
override an explicit player stance. The unit still gains sandbag cover if it
stands or lies there.

## Risks / Trade-offs

- **Pathfinding cost** → 40k cells and few units; cache is unnecessary for this
  slice. Keep the grid coarse and deterministic.
- **Auto-cover can pull units away from player intent** → only when idle, only
  when cover is low, and never overrides stance.
- **Occupancy thrash** → one unit per cover point within 1.2 m and a 120-tick
  cooldown.
- **Balance shifts toward cover** → combat tests will confirm a finite outcome;
  numbers remain provisional.
