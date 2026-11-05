## Why

The user's hand check of the 3 vs 3 (2026-11-05) liked the battle and the
rushes but found three movement faults: the enemy bunches up (and is easy to
kill), a rush sometimes goes sideways before it advances, and the movement
preview weighs on the game before a placement click. Measured: a defending
section stands in pairs 0.5 m apart, because a trench bay and its sandbag
parapet each offer cover slots and the two sets overlap, and the soldiers left
without a slot all get the same fallback point (three men on (-34, -81)). A rush
accepts any cover within 30 m that is only 1.5 m nearer the objective, so a
cover 25 m to the side wins. And the Attack preview of three sections takes
364 ms per preview (3.5 ms for one section, under 2 ms for any other order),
because it routes every soldier to the target with A* on every frame.

## What Changes

- **Cover slots keep a soldier's room**: overlapping covers no longer stack
  slots closer than a man's width (about 1.2 m); soldiers without a slot take
  distinct places in the section's formation, never one shared point.
- **Rushes go forward**: a rush to cover takes only cover inside a forward cone
  toward the objective that gains real ground (at least half the rush length);
  otherwise the soldier rushes straight ahead in the open.
- **Light preview**: Attack, Flank, Pursue and Rescue previews draw straight
  approach guides to the section's approach point instead of searching a route
  per soldier (they move by rushes and find their way as they go); the preview is recomputed only when
  the pointer moves to another cell, the selection or the order changes, not on
  every frame; a budget is checked: under 2 ms per preview with three sections.
- **Spacing in the feel gate**: the battle report also measures bunching
  (soldiers with two or more mates within 1.5 m) and the test keeps it low.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cover-slots`: slots of overlapping covers keep a minimum spacing; overflow
  soldiers get distinct places.
- `formations`: the rush length requirement gains the forward cone.
- `tactical-preview`: the preview is computed per section and cached, under a
  time budget.
- `battle-lab`: the feel report measures bunching.

## Impact

- `packages/shared` (cover slots, preview), `packages/simulation` (bounding,
  slot assignment), `apps/game` (preview memoization), `tools/battle-report.ts`,
  tests. The determinism golden changes on purpose (positions).
- Player fantasy: sections that look and move like trained infantry, spread
  along their cover and rushing toward the enemy.
- Historical scope: none; no new content or claims. Multi-perspective: unchanged.
- Legal and ethical note: none beyond the project's standing rules.
- Localization: no new player strings.
- MVP: the three fixes and the bunching metric. Non-goals: new orders, terrain,
  fog of war (its own change), formation types.
