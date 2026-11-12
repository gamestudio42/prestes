## Why

The owner, hand-testing the skirmish on 2026-11-11, saw soldiers walk
straight through barbed-wire fences and take the crossing's health loss when
a gap or the fence's end was a few metres away. The pathfinder treats wire as
open ground, so it never weighs the way around against the crossing. Soldiers
of the 1920s did not wade into wire beside an open gate; they should cross it
only when going around is far.

## What Changes

- A route weighs each barbed-wire crossing as a fixed detour: the route goes
  through a gap or past a fence's end when that way is at most 25 m longer
  than crossing, and crosses otherwise.
- The straight-line shortcut and the path smoothing no longer cut across wire
  where the searched route went around it.
- The move order's planning line shows the real route. Today the preview of
  a pending move draws a straight line from each soldier to his place (its
  quick mode skips the route search), so the owner could not see whether a
  detour works ("o planejamento não aparece os novos caminhos"). It will draw
  each soldier's searched route with its waypoints, the same route the move
  gives him, through a gap, round a building or across the wire where the
  move crosses.
- While the section moves, the drawn route follows a soldier who takes a new
  way (today his order line keeps the first route when he re-routes round
  something in the way).
- Unchanged: wire stays crossable, slows the soldier, costs 3 health once per
  crossing and never kills; it still blocks neither sight nor fire and gives
  no cover. Not breaking for saves or maps; the determinism goldens may move
  where an authored map holds wire (re-recorded and named in the commit).

Player fantasy and core loop: the player orders a section across fenced
fields and sees it take the gate when the gate is near, as a 1920s infantry
section would, and push through the wire only when the gate is far; the
decision is the soldiers', the player keeps giving move orders as before.
Historical scope: barbed wire on the pastures and coffee farms of the
column's campaign is already in the game (`terrain`); this change adds no
historical claim. MVP: the rule in the simulation's routes on every map.
Non-goals: no player toggle to force a crossing, no new map field, no change
to the editor or the authored maps, no AI that cuts wire.

Multi-perspective: the rule is the same for every side and army; it adds no
mission and no playable figure.

Legal/ethical note: no book text, art or source material is used; the change
is mechanics only.

Localization: no player-facing string is added or changed.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `terrain`: the requirement "Barbed-wire fences" gains the rule that a
  route takes a near way around a wire fence and crosses only when the way
  around is far.
- `tactical-preview`: a new requirement that the move preview draws the
  searched route the move will use; "Preview cost" allows the move preview
  one search per section and sets its time limit past a fence.
- `formations`: "Coordinated advance" states that several sections ordered
  together each march as a body on their own route (found in apply, design
  D7).
- `simulation`: "Active order paths" keeps a re-routed soldier's order path
  on his new route.

## Impact

- `packages/shared/src/pathfinding.ts`: the search cost of entering wire,
  the shortcut and the smoothing.
- `packages/shared/src/world.ts`: a helper that tells whether a point or a
  segment touches wire (wire stays out of movement blocking).
- Callers of `findPath` (orders, section routes in
  `packages/simulation/src/systems/routes.ts`, cover seeking, rescue, the
  order preview, the map validator) get the new routes without changes.
- `packages/simulation/src/systems/movement.ts`: the crossing loss and pace
  are unchanged; a re-route on the way refreshes the soldier's order path.
- The section route (`packages/simulation/src/systems/routes.ts`) moves to
  `packages/shared` so the move and its preview share one function;
  `packages/shared/src/preview.ts` uses it for the move preview, and
  `apps/game/src/hooks/useOrders.ts` keeps the quick mode only for cover
  slots. The 3D preview layer already draws every point it is given.
- Tests: a new simulation test with a fence and a near and a far gap; the
  existing `wire-fence` tests must still pass. Tick budget
  (`pnpm check:budget`) and determinism goldens checked.
