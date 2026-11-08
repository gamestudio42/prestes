## Context

See proposal.md for the motivation. Today the worker starts ticking when it
receives `start`. Sections are created at the zone's three section points
(and, after `pre-battle-roster`, also at three rear slots by
`battleUnits(deployment, rosters)`), and orders resolve over ticks through
the order, formation and slot systems. A `DeploymentZone` holds three points
and a facing, with no area. Cover slots and the slot planner are shared
code (`pickSlots`, `planCoverSlots`). After `refine-map-editor`, trench
lines provide forward-facing slots.

## Goals / Non-Goals

**Goals:**
- reuse the battle's own planners for instant placement, so a deployed
  position is exactly where the order would have led;
- zero impact on the goldens for an untouched deployment.

**Non-Goals:**
- deployment points or budgets;
- simultaneous hidden deployment for two humans;
- a timer on the phase.

## Decisions

### D1. Phase in the engine, ticks held by the host

- `SimulationEngine` gains `phase: 'deployment' | 'battle'`, with
  `deployment: true` in the start options for skirmishes.
- In deployment, `runTicks` refuses to advance. The worker host does not run
  its tick loop. Instead it answers each command by applying it and posting
  one frame.
- `start_battle` sets `phase = 'battle'`, emits `battle_started` and starts
  the loop.

The phase is part of `hashState()` only while it is `deployment`. Once the
battle starts, the hash covers exactly what it covers today, so an untouched
deployment gives today's hashes.

Alternative: pausing the battle with a speed of 0. Rejected: the rest of
the game keeps running (AI timers, reaction delays), and "orders take effect
at once" would still need special code.

### D2. Instant orders reuse the planners

A deployment order runs the same planning step the battle runs, then writes
the result straight into the units:

- **Move**: the formation planner gives each man's slot at the target. The
  men are placed there, with facing and stance set.
- **Defend**:
  - `planCoverSlots` / `pickSlots` choose the slots and the men are put in
    them.
  - Trench preference: when a trench line's fire step is within 10 m of the
    target, its slots are offered first.
- **Enter**: once `garrison-and-assault` exists, an enter order marks the
  section as garrisoned in the position, up to capacity. The overflow goes
  to outside slots.
- **Fight orders**: refused with `not-during-deployment`.

Each order is recorded as a command with the tick it was given (0), so a
replay applies it in the same way.

### D3. Areas and refusals

- `DeploymentZone.area: Polygon`.
- The validation of a deployment order computes the planned positions
  first. If any lies outside the area, in deep water or in a footprint, the
  whole order is refused (`outside-deployment-area`, `blocked`). Partial
  moves are not allowed.
- Default area (documents without one, and the migration to version 3): the
  bounding box of the section points grown by 30 m, clipped to the map and
  to the half of the map on that side of the perpendicular bisector between
  the two sides' centroids.
- Hand-written maps get hand-drawn areas in their data.

### D4. Enemy deployment by the commander

At phase start the commander takes these steps:

1. It scores candidate anchors inside its area: trench fire steps facing
   the column area, walls and hedges facing it, buildings when positions
   exist, and its objectives when objectives exist.
2. It assigns sections to anchors in roster order with the seeded RNG.
3. It places them with the same instant planners.

Sections with no anchor keep their default places. The commander reads only
map data and its own roster, never the player's units.

### D5. Placement preview

The order cursor already previews formation positions
(`tactical-preview`). In deployment it adds two things:

- the slots within 25 m of the cursor (dots by protection class and a count
  badge per piece), from the same `allCoverSlots`;
- the positions the planner would give.

It is view-only and recomputed when the cursor moves to a new cell.

### D6. Client flow

The flow is: roster → battle view in deployment → "Start battle" → clock.
`GameClient` sends `start` with `deployment: true`. The HUD shows the banner
and the controls while the frame's `phase` is `deployment`, and hides the
speed controls. `add-map-objectives` starts its clock on `battle_started`.

### D7. Map document version 3

Version 3 adds `deployment.*.area`. `migrate()` from version 2 builds the
default areas. The editor's deployment tool edits the polygon (corner drag,
double-click to insert, Delete to remove).

## Risks / Trade-offs

- [Instant defend places men in slots that would have been taken
  differently in motion (contention between sections)] → planners run
  section by section in order; tests compare an instant defend with the
  same order played out in battle on an empty map.
- [Hash drift from the phase field] → the phase is only hashed during
  deployment; the golden test covers an empty deployment.
- [Commander deployment makes battles harder or easier] → the battle report
  runs with and without enemy deployment; bands must hold.
