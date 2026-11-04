## Context

`formationSlots(positions, to, spacing, formation, facing?)` already lays out
every formation around a point for a given facing; the move handler passes
the section's aim (or nothing, so the formation faces along the march).
`move_line` spreads soldiers on a dragged line and sets their aim
perpendicular to it. The canvas uses left-drag with Move armed and right-drag
for that line; left-drag without an order is box selection.

## Decisions

### Gesture

- Destination is the press point; facing is press → cursor. The drag starts
  counting after 8 px on screen, as the right-drag does today; below that it is
  a click.
- Shift + drag keeps the line spread (`move_line`). Without Shift, a drag is a
  facing drag. The stations that teach the line drag change their text to
  mention Shift.
- Orders that take a target (Attack, Suppress, Flank, Rescue) and Aim ignore
  the drag: they have their own direction.

### Simulation

- `facing` is normalised and validated (finite, length > 0.001), otherwise the
  command is rejected as `invalid_position`.
- The handlers use the ordered facing instead of the computed one for
  `formationSlots` and for the cover planner's `facing`, and store it as each
  soldier's aim (`aimX`, `aimY`), the direction he already keeps while he
  stands with no target (as after a Face order or a line move). No new unit
  field is needed; a later move without facing keeps that aim, as today.
- Bounding (on by default) re-lays the formation for its two teams; it now
  prefers the soldiers' aim over their current heading, like the move handler,
  so the dragged facing survives the leapfrog.
- Defend and Ambush: an ordered facing overrides the facing toward the nearest
  enemy, since the player said where the threat is.
- No change without `facing`: the golden replay hash must not move.

### Preview

The preview request carries `facing`; `planOrderPreview` uses it as the
formation facing. The view draws an arrow (pixel style, the order colour)
from the destination, 6 m long, and the slot cones already follow the
per-slot facing.

## Risks

- Box selection and the facing drag share the left button: the facing drag
  only applies while a ground order is armed, as the line drag does today.
- A short drag at a steep camera angle can flip the facing; the 8 px threshold
  and the ground-projected direction keep it stable enough, and the arrow
  shows the result before release.
