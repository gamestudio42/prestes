## Context

The simulation is a deterministic 10 Hz engine with a command/event boundary. It
already has rifle combat, cover, A* movement, facing, auto-cover and a seeded RNG.
All unit state is hashed, so any new AI state participates in determinism. See
`proposal.md` for motivation; `specs/simulation/spec.md` is the behaviour contract.

Presentation receives only `Frame` snapshots and draws paths from existing
waypoints. This change adds no renderer feature, new asset, mission content or
historical figure; the content schema, low-poly pipeline and figure roster remain
unchanged.

## Goals / Non-Goals

**Goals:**

- Make target choice and movement read as a section: focus, pin and flank.
- Keep AI deterministic, testable and inside the simulation package.
- Preserve player move, attack and stance authority.
- Reuse the existing A*, cover and path-layer systems.

**Non-Goals:**

- New units, weapons, maps or historical content.
- A formation picker or squad command chaining.
- Destructible cover, artillery, cavalry, campaign or audio.
- Perfect military doctrine; behaviour is a readable game abstraction.

## Decisions

### 1. One AI pipeline, ordered phases

Each tick runs, in order: acquire targets, suppression reaction, flanking,
auto-cover, advance when idle, fire. Every loop iterates units by ascending id.
No AI decision uses wall-clock time or an unseeded random source; only combat
uses the seeded RNG.

Alternative: independent behaviours racing for the same unit. Rejected because
it makes priority unstable and hard to test.

### 2. Tactical target score

A pure helper scores each visible enemy:

```text
score = 140 - 4 * distance - 80 * cover
        + 20 if suppressed + 15 if officer
        - 25 * alliesAlreadyTargeting
```

The engine acquires in unit-id order, so the "already targeting" count is
deterministic. A unit keeps its current target while it remains visible and its
score is within 20 of the best alternative; otherwise it switches. Ties go to the
lowest unit id.

Alternative: nearest-enemy only. Rejected because it ignores cover and creates
six units shooting the same exposed soldier.

### 3. Flanking as a bounded side step

When a unit has a visible target, the target has cover of at least 0.4, an ally is
already engaging it and the unit has no active path, the engine tests side
positions at 9 m from the target, at Â±90Â° and Â±65Â° from the pinning line. A
candidate must be outside the building, within fire range, have line of sight to
the target, and not be occupied. The unit takes the closest valid A* route. Only
one unit may hold `flankTargetId` for a target; a 180-tick cooldown and clearing
the id on arrival or target loss prevent thrashing.

Alternative: continuously orbit the target. Rejected because it looks agitated and
breaks path readability.

### 4. Suppression reaction

A suppressed unit below the morale threshold with no active path looks for a
cover point within 12 m that is at least 3 m farther from its target than its
current position and is not occupied. It paths there. If none exists, it crouches,
or lies prone when already crouched, unless `stanceLocked` is true. The unit keeps
firing while moving. A 150-tick cooldown prevents repeated retreats.

Alternative: freeze suppressed units. Rejected because it makes suppression a
stun and removes the fire-and-movement feel.

### 5. Section spacing

A multi-unit move computes the travel direction from the group centroid to the
destination, then assigns slots at 2.8 m intervals on the perpendicular, ordered
by unit id and centred on the destination. A slot inside the building or without
an A* path falls back to the ordered destination. Single-unit moves remain
unchanged.

Alternative: exact grid formations. Rejected because it needs a formation UI and
fails around the building; slots are enough for this slice.

### 6. Player authority stays explicit

An active path is never replaced by AI movement: flank, suppression and auto-cover
all skip a unit with a non-empty path. An explicit attack target remains because
target acquisition keeps any visible current target. `stanceLocked` remains
authoritative for posture.

Alternative: let AI override player paths when it sees a better position.
Rejected because it makes right-click orders unreliable.

### 7. Player orders and HUD

Player orders are explicit commands, not AI hints. `suppress` sets a target and a
suppress flag; the unit holds position, fires at the target, uses a shorter fire
interval and applies extra morale damage at lower lethal accuracy. `flank` asks the
engine for side positions around the target and creates `flank` order paths.
`withdraw` finds a rear point away from the nearest enemy and creates a `withdraw`
path. `hold` sets a hold flag that blocks all automatic movement but keeps
targeting and fire. A move, flank or withdraw clears hold and suppress.

The HUD is a bottom panel: section card left, 2x3 order grid centre, status and
pending-order prompt right. The panel is presentation only; every button sends a
command through `GameClient`. Move/attack/suppress/flank enter a pending mode and
wait for a right-click target or ground point; withdraw and hold execute at once;
Escape cancels. Section portraits are named placeholder silhouettes, not final
art. All labels and prompts come from the locale catalog.

Alternative: free-floating buttons on the canvas. Rejected because the player
needs one stable place for section state and orders.

### 8. Pure helpers for testability

Scoring, flank candidate generation and formation slots live in
`packages/simulation/src/tactical.ts` as pure functions. The engine composes them;
unit tests cover the geometry and the engine covers the integration. This keeps
the deterministic kernel and shared package unchanged.

## Risks / Trade-offs

- **Flankers stack or oscillate** â†’ one flanker per target, occupancy checks,
  180-tick cooldown and clearing on arrival.
- **Target switching feels random** â†’ 20-point hysteresis and id tie-break.
- **Suppression retreats into worse ground** â†’ require greater distance from the
  target and prefer unoccupied cover; fall back to hunkering.
- **Formation slots collide with the building** â†’ per-slot A* validation and
  fallback to the ordered point.
- **More AI paths make the skirmish longer** â†’ cap each behaviour with cooldowns
  and keep the existing 3000-tick outcome test.
- **Balance remains provisional** â†’ this change adds behaviour, not a balance
  pass; numbers stay tunable constants.

## Migration Plan

No data or protocol migration. New internal fields change the state hash, which is
expected; replay fixtures based on an old hash must be regenerated. Rollback is a
code revert of the AI helpers and engine phases.

## Historical method and roster

No historical claim or figure is added. The existing source policy still governs
future content; any later mission must name its commander and perspective. This
tactical behaviour is fictional and labelled as such.

