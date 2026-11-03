## Why

The stance rig now crouches and lies down, but the rifle was carried at the side.
The game reads better when every stance is already aiming: standing, crouched and
prone all point the weapon forward, and a prone soldier lies face-down with the
rifle still on target.

## What Changes

- Move the arms and rifle into a dedicated weapon group that always aims forward.
- Keep the weapon group level when the body lies down by counter-rotating it
  against the prone body rotation.
- Raise the prone body slightly so the head and weapon do not clip the ground.
- Keep the selection ring and shadow flat and recolour them by stance.
- **Non-goals:** combat, firing, recoil, cover geometry, final Blender meshes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `presentation`: every stance aims the rifle forward; prone lies face-down with
  the weapon still aimed forward.

## Impact

- `packages/view3d/src/character-layer.ts` only.
- No protocol, simulation, UI or locale change.

## Legal and ethical note

Original procedural work only. No third-party model or animation is used.
