## Why

The character proxies are static. The next visual milestone is to make cover
readable: soldiers must stand, crouch and lie down, and the movement cycle must
show when a unit is walking. A stance state also gives the future combat and cover
rules a stable contract without inventing combat now.

## What Changes

- Add a `Stance` state (`standing`, `crouched`, `prone`) to units and frames.
- Add a `stance` command for one or more units, with the same validation and
  rejection path as movement.
- Include stance in the world hash.
- Rebuild the character proxy as a small part rig: body, head, hat, two legs, two
  arms, rifle, gear, ring and shadow.
- Add procedural animation: walk/arm swing, crouch pose and prone pose, blended
  smoothly between stances.
- Add HUD controls to stand, crouch and lie down for the debug column.
- Add PT-BR/EN labels for the stance controls.
- **Non-goals:** combat, hit chance, cover geometry, LOS, formation stance,
  final Blender meshes and cavalry. Stance changes are visual and state metadata
  only; combat will consume them later.

## Capabilities

### New Capabilities

None. This change adds requirements to existing capabilities.

### Modified Capabilities

- `simulation`: stance command, unit stance state and stance in the world hash.
- `presentation`: part-rig character, procedural walk and stance poses.
- `localization`: stance control labels.

## Impact

- `packages/shared`: `Stance`, stance command and `UnitSnapshot.stance`.
- `packages/simulation`: stance state, command handling, hash and tests.
- `packages/view3d`: character part rig and procedural animation.
- `apps/game`: HUD stance buttons and locale keys.
- `docs/`: status and asset register notes.
- No Blender export, audio, combat or GitHub action in this change.

## Legal and ethical note

The stance animation is original procedural work. No third-party model or
animation is used. Final Blender meshes remain original and will be exported
through the existing `pnpm models` pipeline when authored.
