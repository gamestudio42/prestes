## Context

See proposal.md for the problem. The current state, read from the code:

- `isPointBlockedByCovers` (`packages/shared/src/world.ts`) skips covers
  with `wire: true`, so the A* in `searchPath`
  (`packages/shared/src/pathfinding.ts`) treats wire cells as open ground at
  the plain step cost.
- `isLineBlockedForMovement` on a battle map clips the segment against every
  cover with `blocksMovement`, and the compiler gives wire pieces
  `blocksMovement: true` with `wire: true`
  (`packages/shared/src/maps/document.ts`). So on a battle map the straight
  shortcut and the smoothing already refuse a segment across wire, but the
  A* behind them goes straight through it, and the smoothing then keeps the
  raw cells one by one across the wire. Off a battle map (the sampled branch)
  wire is ignored by both.
- The loss and the pace live in `packages/simulation/src/systems/movement.ts`
  (`WIRE_DAMAGE` 3 of `MAX_HP` 100, `WIRE_SPEED` 0.55, `crossWire` on entry
  into the footprint at margin 0). Soldiers follow the route they are given;
  a gathered section shares one route from `routes.ts`, shifted per soldier,
  and a soldier whose shifted leg hits a blocking line (wire counts there on
  a battle map) paths on his own.
- The battle grid is 1 m over up to 400 m a side; the A* there uses a
  heuristic weighted 1.6. Blocked state per cell is cached in a `Uint8Array`
  (0 unknown, 1 open, 2 blocked) while the map and covers are the same.

The simulation/presentation boundary is untouched: the routes are computed
in the deterministic simulation (and the same shared function in the order
preview); the view only draws the soldiers where the simulation puts them.
No low-poly asset, content schema field, historical research or figure is
involved.

## Goals / Non-Goals

**Goals:**

- Weigh a wire crossing against the way around inside the one A* search,
  with no second search, on every map.
- Keep the shortcut and the smoothing from crossing wire where the search
  went around it, and keep the crossing where the search chose to cross.
- Stay inside the tick budget on the 400 m grid.
- Let the player see the route before and while moving: the move preview
  and the live order line draw the route the soldiers walk.

**Non-Goals:**

- No change to the crossing's health loss, pace, sight, fire or cover.
- No player order to force a crossing, no wire cutting.
- The choice between river crossings in `findPath` (bridges, fords, ferries)
  still compares route lengths without the wire cost; a route that crosses
  wire on one bank and not on the other is rare enough to leave.
- No change to the authored maps, the editor or the map format.

## Decisions

### D1. A fixed cost of 25 m per wire entry

A step into a wire cell from a cell that is not on wire adds 25 m to the
path cost. Then a way around that is at most 25 m longer than the way across
is preferred, and a longer one is not.

Why 25 m: a crossing costs 3 health and a slow stretch, a real but small
loss; a 25 m detour is 10 to 17 s at a walk or a slow pace (1.5 and 1 m/s),
which an infantryman would spend to keep his skin and uniform out of the
wire. In plain terms, a gap about 10 m to the side of a fence crossed
square-on is taken (a fence 5 m ahead and the goal 5 m beyond: the gap at
8 m adds about 9 m), and the end of a long fence 30 m away is not (it adds
about 52 m, the layout of the existing `wire-fence` test, which keeps
crossing). The value is a named constant (`WIRE_PATH_DETOUR`) next to the
pathfinder; the owner can tune it after his hand check.

Alternatives considered:

- *Only the slow pace as cost* (step ÷ 0.55 across the band): adds about
  1 m per crossing, so a route would almost never go around. Kept only as
  the cost of walking along the band (D2).
- *Wire as blocking, falling back to crossing when no path exists*: binary,
  it would send a section 300 m round a long fence; and it needs a second
  search.
- *Exact segment test per expanded edge*: correct to the centimetre but one
  cover query per edge on the 400 m grid; the cached cell state (D2) costs
  one array read.

### D2. Wire cells cached with the blocked state

A cell is on wire when its centre lies within a wire cover's footprint grown
by the 0.8 m clearance the pathfinder already uses for blocking covers. The
band is then at least 1.9 m wide, so every straight or diagonal grid step
across a fence lands in it: no step can slip over the wire unseen. The state
joins the existing per-cell cache as a fourth value (3: open, on wire),
worked out once per cell with the blocked state; a new helper in `world.ts`
answers "is this point on wire within this margin" with the same spatial
index (`someCoverNear`) as the blocking test.

Inside the band each step costs its length ÷ `WIRE_SPEED`, so a route does
not run along a fence inside the band to dodge a second entry. `WIRE_SPEED`
moves to `@prestes/shared` and `movement.ts` imports it, so pace and cost
share one value. The entry cost is charged on the step into the band; a
soldier who starts inside the band pays no entry until he leaves and comes
back; a goal inside the band pays its entry, which cannot be avoided.

### D3. Shortcut and smoothing respect the search

A second helper in `world.ts` tells whether a segment enters a wire
footprint (clipped exactly in the cover's frame, like
`segmentCrossesCover`, at a 0.3 m margin for the soldier's body). Then:

- The straight shortcut is taken only when the line is clear of blocking
  covers and deep water as now and does not enter wire.
- The raw path is split into runs off wire and runs on wire (by the cell
  state of D2). The smoothing works inside each run off wire, never letting
  a segment enter wire; each run on wire is kept as its first and last cell.
  So the smoothed route crosses exactly where the search crossed and nowhere
  else.

This applies on every map, so it no longer depends on wire pieces happening
to carry `blocksMovement`. `isLineBlockedForMovement` is not changed: the
section routes in `routes.ts` keep treating wire as a line a shifted leg
must not cross on a battle map, and such a soldier gets his own weighed
route.

### D4. Determinism and budget

The cost is a constant added in the same float32 scores; the search order
and tie-breaks are unchanged, so routes stay deterministic. A detour makes
the A* expand the cells in front of the fence before it pays the entry, at
worst a region a few tens of metres across; with the 1.6 weight it stays
near the straight line. `pnpm check:budget` and a measured far-gap search on
a 400 m battle grid (expansions and time, written in an apply note) guard
it. Determinism goldens may move only where a map holds wire
(`paiolzinho.map.json` is the one authored map with a wire fence today); they
are re-recorded with the reason in the commit message.

### D5. The move preview draws the move's own route

Today `apps/game/src/hooks/useOrders.ts` asks `planOrderPreview` for the
quick form of every move preview (`fast: previewOrder === 'move'`), and the
quick form gives each soldier the one-point path `[destination]`, drawn as a
straight line from him (`packages/shared/src/preview.ts`). The full form
already searches one route per section, but shifts it per soldier with its
own simplified rule, which is not the move's (`routes.ts` hands a soldier
whose shifted leg hits a blocking line, wire included on a battle map, his
own search).

- `sectionRoutes` and `routeFor` move from
  `packages/simulation/src/systems/routes.ts` to `packages/shared` (they read
  only the covers from the context); the simulation imports them, so the move
  is unchanged, and the preview calls the same function with the frame's
  covers. Then the drawn route is the walked route by construction, not by a
  second copy kept in step.
- The quick form keeps skipping what made it quick (cover slots, final
  matching), but no longer skips the route: each soldier's path is the shared
  section route to his formation slot. The full form uses it too, in place of
  its local `sectionPath`.
- Cost: one search per section, recomputed only when the 1 m pointer cell,
  the selection or the soldiers' 1 m positions change (the existing
  `previewKey`). Over open ground the search ends in its straight-line
  shortcut; past a fence it is the D1 search. The `tactical-preview` limits
  (2 ms open ground, 6 ms past a fence on a 400 m map, three sections of 11)
  are checked by the existing preview cost test, extended.
- No view change: `packages/view3d/src/preview-layer.ts` draws every segment
  of each path it is given.

Alternative considered: draw the order's route only after the click (from
the frame's order paths). Rejected: the owner wants to see the way before he
commits the order, which is what the preview is for.

### D6. A re-routed soldier's line follows him

The live route drawn while moving comes from the frame's order paths
(`queueUnitOrder` in `movement.ts`), set once when the order is given. When
`moveUnit` searches a detour round something in the way it replaces the
soldier's path but not his order path, so the line shows a route he no
longer walks. The detour branches will refresh the order path through
`queueUnitOrder` with the same kind. View-only for the hash: order paths are
already outside the state hash (`simulation` spec), so this cannot move a
golden.

### D7. Several sections ordered together march as bodies

Found in apply: `sectionRoutes` took the whole selection as one body, so
three sections ordered together (more than 15 m from their common centre)
fell back to one search per soldier, about 0.3 ms each, 10 ms for 33 soldiers
past a wall, while the old preview drew one route per section, a route the
move never used. Mirroring the move would have cost the preview those 33
searches per pointer cell. Instead `sectionRoutes` groups the selection by
section and routes each as its own body (one search per section), in the move
and the preview alike. The determinism goldens do not move from this (the AI
orders one section at a time); measured by running them with and without the
grouping. The `formations` delta states it.

## Risks / Trade-offs

- [The move preview now searches while the pointer moves, which the quick
  mode was made to avoid] → one search per section, not per soldier, only on
  a new 1 m cell, and a time limit checked by a test; if a 400 m search past
  a long fence breaks the limit, the preview caps the search and falls back
  to the straight guide for that section, recorded in an apply note.
- [`packages/simulation/src/systems/snapshot.ts`, `protocol.ts` and
  `packages/view3d/src/scene-view.ts` carry uncommitted work of other
  sessions] → this design needs none of them; if apply finds it must touch
  one, it stops and asks.

- [The weighted heuristic (1.6) makes the search pick a route up to 1.6
  times the best cost, so a gap near the 25 m threshold may be taken or not
  depending on the layout] → the threshold is a feel, not a contract; tests
  use clear cases (about 9 m and about 50 m of extra way), and the owner's
  hand check on Paiolzinho decides the value.
- [A short hop with an expansion cap (`bounding.ts` passes 2500) may give up
  sooner now that a crossing is dearer] → those callers already fall back
  when no path is found; the tests of bounding and cover seeking must keep
  passing, and a capped search near wire is part of the budget check.
- [Soldiers of one section may split, some through the gap and some over the
  wire, when the shared route goes through a gap narrower than the body]
  → the shifted legs that hit wire path on their own with the same cost, so
  each soldier makes the same weighed choice; the new test checks that no
  one is hurt with a near gap.
- [A route across a long fence with no gap explores more cells than before]
  → bounded by the cost: past 25 m of extra way the crossing wins and the
  search closes.

## Migration Plan

None: no data or save format changes. Rollback is reverting the change.
