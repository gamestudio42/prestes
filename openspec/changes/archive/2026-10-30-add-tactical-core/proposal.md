## Why

The visual slice proves the camera, characters and paths, but there is no game
yet. The first tactical core gives the player something to do: select a section,
move it, attack a legalist squad, use cover and stance, manage ammunition and
morale, and win or lose the skirmish.

## What Changes

- Add two player sections (squads) and one legalist squad around the building.
- Add squad selection in the HUD and by clicking a friendly unit.
- Add move, attack and hold orders; right-click ground moves, right-click an
  enemy attacks.
- Add rifle combat: range, line of sight through the building, hit chance,
  damage, fire cooldown, ammunition, automatic reload and death.
- Add cover from sandbag points and stance; crouched/prone reduce exposure.
- Add morale and suppression: hits and near misses lower morale; low morale
  reduces accuracy and marks the unit suppressed.
- Add victory (legalist squad destroyed) and defeat (player squad destroyed).
- Add pause and 1×/2×/4× speed controls.
- Add tracer lines for shots.
- **Non-goals:** campaign, save/load, pathfinding around obstacles, cavalry,
  artillery, aircraft, final art/audio, multiplayer and GitHub publishing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `simulation`: squads, combat, cover, ammo, morale, attack/hold commands and
  outcome.
- `presentation`: squad selection, order input, combat feedback, pause/speed and
  outcome HUD.
- `localization`: squad, stance, speed, objective and outcome labels.

## Impact

- `packages/shared`: squad/health/ammo/morale fields, attack/hold commands, shot
  events, outcome, world cover/LOS helpers.
- `packages/simulation`: combat, cover, morale, ammunition, reload, outcome and
  enemy auto-engagement.
- `packages/view3d`: dead poses, cover props, tracers and screen picking.
- `apps/game`: squad HUD, selection, right-click orders, pause/speed, outcome.
- No GitHub action, push or repository creation.

## Legal and ethical note

Original procedural combat prototype. No third-party model, animation, sound or
code is copied. The skirmish is fictional and uses the historical figure roster
only as faction context; it is not a reconstruction of a specific engagement.
