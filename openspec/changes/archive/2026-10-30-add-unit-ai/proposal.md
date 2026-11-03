## Why

The tactical core shoots and moves, but units face a fixed direction, walk into the
building and stand in the open while under fire. The next step is unit autonomy:
face the target, path around obstacles and move to nearby cover.

## What Changes

- Add facing direction to unit snapshots; characters rotate toward their target
  while firing and toward their movement path otherwise.
- Add A* pathfinding on a 1 m grid around the building; move orders follow
  waypoints and draw the actual route.
- Add automatic cover seeking: a unit in the open with a visible target moves to a
  sandbag that has line of sight to that target, and crouches if its stance was
  not explicitly set by the player.
- Keep player stance commands authoritative by locking the stance.
- **Non-goals:** flanking, suppression-driven repositioning, destructible cover,
  squad formations, cavalry, campaign and audio.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `simulation`: facing, pathfinding, auto-cover and stance locking.
- `presentation`: character rotation toward facing and path routes from waypoints.

## Impact

- `packages/shared`: pathfinding helper and facing fields.
- `packages/simulation`: A* move paths, facing, auto-cover and stance lock.
- `packages/view3d`: character yaw from facing.
- `apps/game`: no new controls; behavior is automatic.
- No GitHub action.

## Legal and ethical note

Original procedural AI and pathfinding. No third-party code or asset is copied.
