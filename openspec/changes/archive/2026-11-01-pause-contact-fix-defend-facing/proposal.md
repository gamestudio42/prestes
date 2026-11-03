## Why

The training layout is being replaced, so the current target boards must leave
the boot camp. They also exposed a real order bug: a defend line used the
centroid-to-click direction for its formation, which could rotate the line across
a wall and put soldiers on the far side. The section then faced its target rather
than the ordered side.

## What Changes

- Remove the boot-camp target dummies and pause the Contact chapter until the new
  training layout arrives.
- Keep five active chapters: ground, field, orders, casualties and graduation.
  Saved progress on Contact resumes at Orders instead of restarting.
- Orient defend and ambush lines perpendicular to the threat, not to a short
  centroid-to-click vector.
- Reject cover candidates on the far side of the chosen cover, so a defend order
  cannot cross a wall to reach cover.
- Reserve cover destinations so multiple soldiers do not stack on one point.
- Make defending and ambushing soldiers face the threat after arrival; the
  character, vision cone and aim then agree with the preview.
- Keep sandbox target dummies available for manual testing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `boot-camp`: five active chapters; Contact paused; no training targets.
- `simulation`: defensive formations use the threat axis, stay on the ordered
  side of blocking cover, reserve distinct cover, and face the threat.
- `tactical-preview`: defend preview uses the same threat axis and near-side
  destinations as the simulation.

## Impact

- Boot-camp content and tutorial director chapter selection.
- Shared formation/cover planning and simulation defend orders/facing.
- Boot-camp E2E and content tests; no save schema change.
