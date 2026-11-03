## Context

The sandbox placement preview introduced a visual angle, but the simulation never received it. Cover points had no rotation and troops were spawned with axis-aligned offsets.

## Decisions

- Store rotation in radians on `CoverPoint` and spawn commands.
- Share `rotateOffset`, `troopFormationOffsets` and `normaliseRotation`.
- Hold Z/X for continuous 90 deg/s rotation; release stops.
- Validate the full rotated footprint in the UI.
- Collision transforms points into cover-local axes; a WeakMap caches trigonometric axes.
- Three.js cover meshes use `rotation.y = -rotation` to match the world-space convention.

## Risks

- Rotated cover checks add trigonometry to pathfinding; caching keeps the cost bounded.
- Formation offsets and preview must stay identical; both use the shared helper.
