## Context

See proposal.md (Why). Current state:

- `CoverPoint` (shared) is a rotated box with height, quality and
  movement/sight blocking. Kinds: sandbag, stone, trench, barrel, low-wall.
- Destinations: the move handler computes formation slots, then
  `coverDestinationForSlot` picks "2 m behind the nearest cover facing the
  threat", with a `usedCover` list that only spaces destinations of one order.
  `seekCover` (automatic) uses the same 2 m-behind rule with a 1.2 m occupancy
  test. Defend clamps to an 8 m region and snaps to cover.
- Buildings (farmhouse, barn, chapel, ruin, training house) exist only in
  `packages/view3d`; the training house has a matching sight obstacle, the others
  have nothing in the simulation.
- The simulation/presentation boundary stays: slots are computed in `shared`
  (pure, deterministic), reserved in the simulation state, and only displayed by
  the view. No content schema, figure roster or historical research is involved.

## Goals / Non-Goals

**Goals:**

- One slot model for every cover kind, used by orders, automatic cover, the
  preview and the HUD markers.
- 11 soldiers ordered into the training trench all end in distinct positions,
  at least 8 of them in trench slots.

**Non-Goals:**

- Interiors, windows, multi-storey positions; destructible cover; changing cover
  art (phase 4).

## Decisions

**Slots are derived, not authored.** `coverSlots(cover)` in
`packages/shared/src/cover-slots.ts` returns the slots of a cover from its
footprint: linear kinds (sandbag, stone, low-wall) put `floor(length / 1.2)` slots
on each long side, 0.8 m off the face; trench puts slots on its centre line
inside the footprint (its floor is walkable; the parapet ends block); barrel puts
4 slots (one per side); building puts one slot per corner (diagonal, 0.8 m out)
and slots every 2 m along each wall. Each slot carries `id` (`coverId * 64 +
index`), position, facing (outward normal), protected side, stance (crouched for
low cover, standing for walls and buildings, crouched in trenches) and the cover
value from `coverAgainst` for its protected side. Alternative: hand-placed slots
per map object (rejected: every new map piece would need authoring and could
drift from its footprint).

**Reservation lives in the simulation state.** `SimContext.slotHolders:
Map<slotId, unitId>` plus `MutableUnit.slotId`. Reservation is part of the hashed
state (the unit field is hashed). A slot is released by any order that sets a new
destination, by death, incapacitation, rout, despawn and by removing its cover.
Alternative: recompute occupancy from positions each tick (rejected: two soldiers
walking to the same slot both see it free).

**Slot selection.** `pickSlots(units, anchor, threat, covers, holders)`: candidate
slots are free, within 12 m of the anchor (order point or formation slot),
reachable (`findPath`), and on the side away from the threat (protected side
faces the threat within 90 degrees). Soldiers are assigned greedily by distance
from their formation slot, closest pairs first, ties by unit id then slot id.
With no threat known, the side is chosen from the order's facing. Defend and
ambush restrict candidates to the 8 m region. A click whose ground point falls
inside a cover footprint uses that cover's slots first.

**Slot stance and facing.** On arrival the soldier takes the slot stance unless
`stanceLocked`, faces the slot facing until it has a target, and `cover` uses the
slot's value. The line-of-sight reposition from the previous change keeps
working: a slot whose sightline to the ordered target is blocked is not chosen
for a soldier with a target.

**Buildings become simulation cover.** A `BUILDINGS` table in `shared/world.ts`
holds each building's footprint and rotation; `view3d` places the meshes from it
and the training cover set includes them as `building` covers (blocks movement and
sight, quality 0.8). The training house replaces its separate sight obstacle.

**Display.** The view draws slot markers (small ground ticks, free vs taken) for
the hovered cover and for the slots a pending order would use; the preview
planner calls the same `pickSlots` without reserving.

## Risks / Trade-offs

- [Pathing to slots inside a trench] → trench slots are on the walkable centre
  line; a unit test checks every slot of every training cover is reachable from
  open ground.
- [Behaviour change everywhere] → mechanics suite and the bootcamp e2e stay the
  gate; the determinism golden is updated once with the reason.
- [Buildings change the training field's lines of sight] → only the training
  house is near the stations today; others are outside the play area, and the
  new map (phase 2) is designed with them.

## Migration Plan

Additive; no saved data changes. Rollback is reverting the change.
