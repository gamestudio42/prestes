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
2. It assigns sections to anchors in roster order with the seeded RNG; a
   section takes only anchors within 40 m of its own default place, so the
   line holds together in front (the 4.1 report: unbounded, a section went
   195 m to the area's far edge and battles stalled).
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

## Apply findings

### 4.1 Battle report, with and without enemy deployment (2026-11-09)

`pnpm battle:report --deployment`: the default 3v3 rosters, seeds 1922, 1924, 1925, 900 s cap.

| Map | Enemy deployed | Seed | Time (s) | Outcome | Cas. col/leg | Shots/cas. | Max shots/tick | Silence (s) | Bunching | Bands |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| vila-militar | no | 1922 | 266.1 | victory | 4/33 | 21.1 | 5 | 4.6 | 0 | ok |
| vila-militar | no | 1924 | 253.8 | victory | 3/33 | 21.1 | 4 | 32.9 | 0 | ok |
| vila-militar | no | 1925 | 295.6 | victory | 13/33 | 19.8 | 4 | 3.5 | 0 | ok |
| vila-militar | yes | 1922 | 310.4 | victory | 6/33 | 18.2 | 4 | 57.5 | 0.13 | ok |
| vila-militar | yes | 1924 | 466 | defeat | 32/21 | 16.3 | 4 | 60.9 | 0.17 | bunching 0.17 |
| vila-militar | yes | 1925 | 245 | victory | 16/33 | 16.2 | 4 | 2.7 | 0 | ok |
| fazenda | no | 1922 | 364 | victory | 16/29 | 19.4 | 5 | 60.8 | 0.13 | ok |
| fazenda | no | 1924 | 308.7 | victory | 16/32 | 17.7 | 5 | 57.8 | 0.06 | ok |
| fazenda | no | 1925 | 304 | victory | 14/32 | 17 | 5 | 60 | 0.06 | ok |
| fazenda | yes | 1922 | 377 | victory | 6/29 | 21.3 | 5 | 59.9 | 0 | ok |
| fazenda | yes | 1924 | 335 | victory | 9/29 | 22 | 4 | 60.7 | 0.06 | ok |
| fazenda | yes | 1925 | 368 | victory | 1/30 | 21 | 5 | 96.7 | 0.15 | silence 96.7s, bunching 0.15 |
| serra-rio | no | 1922 | 629.4 | victory | 14/33 | 15.1 | 4 | 10.5 | 0.24 | time 629.4s, bunching 0.24 |
| serra-rio | no | 1924 | 505.7 | victory | 7/33 | 13.6 | 5 | 4.6 | 0.18 | bunching 0.18 |
| serra-rio | no | 1925 | 376.5 | victory | 1/33 | 12.7 | 5 | 4.5 | 0.19 | bunching 0.19 |
| serra-rio | yes | 1922 | 402 | victory | 5/31 | 17.8 | 4 | 59.9 | 0.06 | ok |
| serra-rio | yes | 1924 | 900 | none | 20/16 | 20.8 | 3 | 112.2 | 0 | time 900s, silence 112.2s |
| serra-rio | yes | 1925 | 457.5 | victory | 18/33 | 15.1 | 6 | 4.6 | 0.14 | ok |
| bairro | no | 1922 | 438 | victory | 17/29 | 11.4 | 3 | 60.3 | 0.19 | bunching 0.19 |
| bairro | no | 1924 | 443 | victory | 3/28 | 12.5 | 4 | 60.3 | 0.14 | ok |
| bairro | no | 1925 | 505 | victory | 2/29 | 18.6 | 3 | 60.4 | 0.07 | ok |
| bairro | yes | 1922 | 900 | none | 2/21 | 15.9 | 3 | 538.1 | 0.22 | time 900s, silence 538.1s, bunching 0.22 |
| bairro | yes | 1924 | 494 | victory | 14/28 | 11.4 | 3 | 60.2 | 0.16 | bunching 0.16 |
| bairro | yes | 1925 | 510 | victory | 26/29 | 12.5 | 5 | 60.8 | 0.3 | bunching 0.3 |

- Without enemy deployment, serra-rio (all three seeds) and bairro 1922 already miss the bunching band; that is not from this change.
- With it, two battles stall (serra-rio 1924, bairro 1922: no outcome at 900 s). On serra-rio 1924 one enemy section deploys at (182, -153), 195 m from its default point at the far edge of its area. On bairro the outer sections sit 60 m to the side of the line the report's scripted player advances on, and under fog the player never finds them.
- Decision (user, 2026-11-09): each enemy section takes cover only within 40 m of its default place (D4).

### 4.1 Rerun with the 40 m reach

| Map | Enemy deployed | Seed | Time (s) | Outcome | Cas. col/leg | Shots/cas. | Max shots/tick | Silence (s) | Bunching | Bands |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| vila-militar | no | 1922 | 266.1 | victory | 4/33 | 21.1 | 5 | 4.6 | 0 | ok |
| vila-militar | no | 1924 | 253.8 | victory | 3/33 | 21.1 | 4 | 32.9 | 0 | ok |
| vila-militar | no | 1925 | 295.6 | victory | 13/33 | 19.8 | 4 | 3.5 | 0 | ok |
| vila-militar | yes | 1922 | 211.7 | victory | 6/33 | 19.9 | 5 | 1.6 | 0 | ok |
| vila-militar | yes | 1924 | 419.2 | defeat | 33/21 | 15.9 | 4 | 35.4 | 0 | ok |
| vila-militar | yes | 1925 | 299.3 | victory | 10/33 | 21.2 | 4 | 8.7 | 0.24 | bunching 0.24 |
| fazenda | no | 1922 | 364 | victory | 16/29 | 19.4 | 5 | 60.8 | 0.13 | ok |
| fazenda | no | 1924 | 308.7 | victory | 16/32 | 17.7 | 5 | 57.8 | 0.06 | ok |
| fazenda | no | 1925 | 304 | victory | 14/32 | 17 | 5 | 60 | 0.06 | ok |
| fazenda | yes | 1922 | 392 | victory | 19/26 | 23.6 | 4 | 60.8 | 0 | ok |
| fazenda | yes | 1924 | 353 | victory | 5/25 | 26.1 | 3 | 60.2 | 0 | ok |
| fazenda | yes | 1925 | 296 | victory | 3/29 | 21 | 4 | 60.3 | 0 | ok |
| serra-rio | no | 1922 | 629.4 | victory | 14/33 | 15.1 | 4 | 10.5 | 0.24 | time 629.4s, bunching 0.24 |
| serra-rio | no | 1924 | 505.7 | victory | 7/33 | 13.6 | 5 | 4.6 | 0.18 | bunching 0.18 |
| serra-rio | no | 1925 | 376.5 | victory | 1/33 | 12.7 | 5 | 4.5 | 0.19 | bunching 0.19 |
| serra-rio | yes | 1922 | 482.4 | victory | 6/33 | 16.8 | 5 | 10.9 | 0.19 | bunching 0.19 |
| serra-rio | yes | 1924 | 411.1 | victory | 2/33 | 14.4 | 4 | 18.1 | 0.14 | ok |
| serra-rio | yes | 1925 | 454.3 | victory | 5/33 | 15.6 | 7 | 30.3 | 0.09 | ok |
| bairro | no | 1922 | 438 | victory | 17/29 | 11.4 | 3 | 60.3 | 0.19 | bunching 0.19 |
| bairro | no | 1924 | 443 | victory | 3/28 | 12.5 | 4 | 60.3 | 0.14 | ok |
| bairro | no | 1925 | 505 | victory | 2/29 | 18.6 | 3 | 60.4 | 0.07 | ok |
| bairro | yes | 1922 | 900 | none | 4/17 | 14 | 3 | 182.2 | 0.42 | time 900s, silence 182.2s, bunching 0.42 |
| bairro | yes | 1924 | 900 | none | 8/21 | 12.8 | 3 | 162.3 | 0.44 | time 900s, silence 162.3s, bunching 0.44 |
| bairro | yes | 1925 | 625 | victory | 13/30 | 11.6 | 2 | 60.4 | 0.2 | time 625s, bunching 0.2 |

- Vila Militar, Fazenda and Serra e Rio hold the bands but for two bunching misses (vila-militar 1925 0.24, serra-rio 1922 0.19; serra-rio missed bunching on every seed before this change).
- Bairro misses on every seed and stalls on two (no outcome at 900 s). The enemy is placed well there (each section in a house and behind low walls, about 100 m apart, no bunching on its side). The bunching is the column's: the report's scripted player sends every section at the few enemies it sees, they pile into one street, and the 12 to 16 defenders left in the houses are never dug out.
- Decision (user, 2026-11-09): the Bairro is resolved with objectives (`add-map-objectives`): a time limit and objectives to take turn a stall into a decided battle. Its 4.1 reruns the report with the enemy deployed; this change keeps the rows above as its finding.
