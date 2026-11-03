## Why

The flat test map and three-unit section are too small to test the requested
tactics. The player needs a six-person troop, a defended position with mixed
obstacles, collision, whole-troop selection and clearer flank/withdraw rules.

## What Changes

- Remove the central house and replace it with walls, barrels, low walls, a trench,
  sandbags and terrain elevations.
- Add collision and pathfinding around blocking obstacles.
- Expand the player troop to five riflemen and one officer.
- Make any friendly click select the whole troop.
- Add left-drag blue all-troop and right-drag green soldiers-only selection boxes.
- Add officer morale aura and officer cover seeking.
- Split Flank into suppressing and flanking halves with cover-aware flank sides.
- Make Withdraw prefer high-cover positions opposite the enemy.
- Add hover hints: shield over defensible ground, target over enemies.
- Change the objective to taking the defensive position.
- **Non-goals:** campaign missions, new weapons, vehicles, destructible cover and
  final art.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sandbox`: six-person troop, selection modes, officer and hover hints.
- `simulation`: obstacle collision, officer aura, flank split and cover retreat.
- `presentation`: selection box, cursor hints and obstacle rendering.

## Impact

- `packages/shared`: blocking cover, obstacle pathfinding and sight blocking.
- `packages/simulation`: six-person troop, officer, collision and orders.
- `packages/view3d`: obstacle rendering on the frame.
- `apps/game`: selection rectangle, hover hints and full-troop commands.
- `packages/content`: objective text.
- No GitHub action.

## Historical scope and legal note

The defensive position is fictional and exists to test mechanics. It makes no
claim about a specific historical action and reproduces no book text or map.
