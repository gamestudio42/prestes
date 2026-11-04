## Why

Soldiers cannot be placed reliably in cover. The bootcamp play-through showed it
directly: ordering a section of 11 into the training trench put 8 inside and only
7 behind cover, defenders spread along the parapet at random spots, and a click
on a wall either moved nobody or sent soldiers around it. Cover today is a
footprint plus a "stand 2 m behind it" heuristic (`coverDestinationForSlot`,
`seekCover`), so two soldiers can aim for the same spot, long cover such as a
trench or wall has no idea how many soldiers it holds, and buildings are not
cover at all (the farmhouse, barn and chapel are visual props outside the
simulation).

This is phase 1 of the redesign agreed on 2026-11-03 (cover slots, then the new
Rio training ground, then pixel-art HUD and menus, then the low-poly art pass).
The new training ground is built around trenches, walls and buildings, so it
needs slots first.

## What Changes

- Every cover object exposes **cover slots**: positions where one soldier can
  stand, kneel or lie in cover, each with a facing and the side it protects.
  Linear cover (sandbags, stone walls, low walls) has slots along both long sides
  about 1.2 m apart; a trench has slots inside along its length; a barrel has a
  slot per side; a new `building` cover kind has slots at its corners and along
  its walls.
- Slots are **reserved** per soldier: two soldiers never take the same slot, and
  a slot is released when its soldier leaves, falls or is reassigned.
- Move, defend, ambush, reserve and automatic cover seeking choose **free slots
  on the side away from the threat**, nearest to each soldier's formation slot,
  before falling back to open ground. A click on a cover object (or its slot
  marker) fills its free slots with the selected soldiers.
- A soldier in a slot takes the slot's stance and facing, keeps line of sight
  over the cover, and gets the cover value of that slot.
- The order preview shows the slots a pending order will use and how many are
  free; hovering cover shows its slots.
- Buildings in the simulation: a `building` cover kind blocks movement and sight
  and offers corner and wall slots. The existing farmhouse, barn and chapel get
  simulation footprints so they become real cover.

Non-goals: the new training-ground map and commander (phase 2), pixel-art UI
(phase 3), new art for cover objects and animations (phase 4), destructible
cover, interior building positions (only corners and walls), vehicles.

Player fantasy and core loop: unchanged; positioning in cover becomes precise and
readable. Historical scope: none in this phase. Playable figures: unchanged; the
bootcamp instructor and section are fictional.

Legal/ethical note: no historical claims, book text or third-party assets are
added.

## Capabilities

### New Capabilities

- `cover-slots`: slot layout per cover kind, slot reservation, slot selection by
  orders and automatic cover seeking, and the building cover kind.

### Modified Capabilities

- `orders`: cover-first destinations use reserved cover slots.
- `tactical-preview`: the cover-first preview shows the slots an order will use.
- `presentation`: hovering cover shows its slots and free count.

## Impact

- `packages/shared`: `CoverKind` gains `building`; new `cover-slots.ts` (slot
  layout from a cover footprint); preview uses slots.
- `packages/simulation`: slot reservation in the context, slot-aware
  `seekCover`, move/defend/ambush/reserve destinations, slot stance and facing;
  building footprints in the training cover set.
- `packages/view3d` and `apps/game`: slot markers on hover and in the preview.
- Tests: slot layout and reservation unit tests, mechanics scenarios (11 into a
  trench, a wall, a building corner), e2e for click-on-cover; the determinism
  golden changes (recorded with `--update`).
