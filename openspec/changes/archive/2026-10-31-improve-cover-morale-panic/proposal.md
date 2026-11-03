## Why

Cover currently works as a proximity aura: a sandbag gives protection from any
direction. Suppression is only a morale threshold, with no pinned or panic state,
and a broken soldier never leaves the fight. The sandbox cannot test real fire and
movement until cover is directional and morale has consequences.

## What Changes

- Replace proximity cover with **directional cover volumes** that only protect a
  unit when they lie between it and the threat.
- Separate **morale** from **suppression**.
- Add states: `steady`, `suppressed`, `pinned`, `panicked`, `routed`.
- An uncovered suppressed soldier drops to crouch/prone automatically.
- A pinned soldier seeks retrograde cover or hunkers; panic overrides stance lock.
- A panicked soldier stops fighting, flees to the map edge and becomes `routed`
  when crossing it.
- Cover reduces both hit chance and suppression accumulation.
- Outcome counts combat-effective units, not only `alive`.
- HUD shows cover, suppression and morale state.
- **Non-goals:** terrain heightfield, rallying routed units, new weapons, campaign
  content, final art and vehicles.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `simulation`: directional cover, suppression, pinned/panic/routed states and
  combat-effective outcome.
- `presentation`: cover, suppression and state in the orders panel.

## Impact

- `packages/shared`: cover volumes, directional cover helper, morale thresholds,
  map bounds, new frame/event fields.
- `packages/simulation`: suppression state machine, panic flee, routed filtering,
  outcome and cover-aware fire.
- `packages/view3d`: hide routed units from picking and rendering.
- `apps/game`: cover/suppression/state display.
- `packages/content`: PT-BR/EN state labels.
- Tests: directional cover, state thresholds, panic route, routed outcome, HUD.
- No GitHub action.

## Historical scope and legal note

The period sources describe real fire, casualties and the column's ammunition
scarcity, but they do not provide a morale model. Pinned/panic/routed behaviour is
a dramatised tactical abstraction, not a historical claim. No book text, art or
map is reproduced.
