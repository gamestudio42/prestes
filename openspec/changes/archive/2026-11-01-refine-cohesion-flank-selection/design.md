## Context

The troop is six units in one section. Selection is id-based; movement uses
formation slots; auto-cover can still pull units away; flank paths are assigned per
unit. The HUD shows selection count but not cohesion.

## Decisions

### Cohesion

Each active unit has `cohesion` 0–100. It eases toward a target from distance to
the squad centroid and officer proximity. Low cohesion multiplies movement speed
down to 75%; auto-cover candidates farther than 9 m from the centroid are rejected.
The HUD and sandbox inspector display the value.

### Select all

A HUD button and Ctrl/Cmd+A select every active player unit. Directional marquee
selection remains.

### One-side flank

The group centroid and target choose a perpendicular side. Flank candidates are
filtered by the sign of the cross product relative to that side, so all flankers
use one side. If no candidate exists, the affected units fall back to attack.

## Risks

- Cohesion can slow a deliberately dispersed unit; withdraw/flank are intentional
  exceptions.
- One-side flank may fail on blocked terrain; the attack fallback is explicit.
