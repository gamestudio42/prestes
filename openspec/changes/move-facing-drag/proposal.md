## Why

Requested by the user on 2026-11-04 after playing the training ground: when
giving a movement order they want to click, hold and turn the troop so that it
ends the move facing that way, keeping its formation. Today a move only takes
a point: the formation faces along the line of march (or the aim it had), so
a section sent to a wall arrives with its back or flank to the threat and
needs a second Face order. Dragging with a move armed already exists, but it
does something else: it lays the soldiers along the dragged line, which
replaces the formation with a line of that width.

## What Changes

- **Facing drag**: with a ground order armed (Move, Advance, Recon, Defend,
  Ambush, Reserve), pressing on the destination and dragging sets the facing:
  the destination is where the button went down, the facing points from there
  to the cursor. Releasing sends the order with the facing. A plain click
  behaves as today. The right-button quick move gets the same gesture.
- **Formation kept**: the section's current formation (line, column, wedge,
  free) is laid out around the destination rotated to the facing; the slot
  matching, the shared route and the cover-first slots are unchanged.
- **Facing persists**: on arrival each soldier faces and aims that way and
  keeps it until a new order, a target or a Face order changes it; cover
  slots are scored against that facing when no enemy is known.
- **Preview**: while dragging, the preview shows the rotated slots, an arrow
  from the destination in the facing direction and the facing cones.
- **Line drag moves to Shift**: the existing drag that spreads the soldiers
  along a line stays available with Shift held (left or right button), so no
  behaviour is lost.
- **Protocol**: `move` and `order` commands take an optional `facing` vector;
  without it the simulation behaves exactly as today (same golden replay).

## Capabilities

### Modified Capabilities

- `formations`: ordered facing for ground orders.
- `tactical-preview`: the facing drag preview.

## Impact

- `packages/shared`: `Command` (`facing?: Vec2` on `move` and `order`),
  preview request and `planOrderPreview`.
- `packages/simulation`: move and tactical order handlers pass the facing to
  `formationSlots` and the cover planner, and set aim and facing on arrival.
- `apps/game`: the canvas pointer gesture, `useOrders`, the preview arrow;
  the instructor text of the stations that teach the line drag.
- Tests: simulation tests for rotated slots and the kept facing on arrival,
  a preview test, an e2e drag on the training ground.
