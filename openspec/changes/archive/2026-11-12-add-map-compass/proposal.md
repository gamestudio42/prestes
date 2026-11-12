## Why

The battle view rotates in 45° steps, and nothing on screen says which way
north is. The owner draws maps from historical sketches whose north is not
always the top of the grid, and orders, reports and the sun all speak in
compass terms. A map that knows its north and a HUD compass that follows the
camera let the player read the field the way the historical commanders did.

## What Changes

- The map document gains an optional `north`: the bearing of true north on
  the grid, clockwise from the top edge, in degrees. Absent means 0 (the top
  is north, as today). The format moves to version 7 with a no-op migration.
- The sun bearing is now measured from the map's true north, so "sun from the
  north-east" stays north-east when the author turns north. Maps without
  `north` light exactly as before.
- The editor's map properties dialog offers a north slider (0–355° in 5°
  steps, with the eight-point direction), and the editor's view shows a north
  arrow in a corner that follows the setting.
- The battle HUD shows a small compass rose that turns with the camera;
  clicking it turns the view until north is up.

Player fantasy and loop are unchanged: the compass is a reading aid for the
tactical loop (look, order, watch). Historical scope: none; no historical
claim is made. MVP: the field, the editor slider and arrow, the HUD rose.
Non-goals: magnetic declination, a minimap, free (non-45°) camera rotation.
Legal/ethical note: original UI art, no book text. The multi-perspective
approach and the playable figures are unaffected.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `battle-maps`: the map document carries north; the sun bearing is read
  from true north.
- `map-editor`: the properties dialog sets north; the view shows a north arrow.
- `presentation`: the battle HUD compass rose.

## Impact

- `packages/shared/src/maps/document.ts` (field, validation, migration 6→7,
  carried into `BattleMap`), `packages/shared/src/maps/types.ts`.
- `packages/view3d` (sun direction from true north; a compass angle helper;
  `CameraRig.faceNorth`).
- `apps/game/src/editor/EditorApp.tsx`, `editor.css` (slider and arrow).
- `apps/game/src/ui/Hud.tsx` and a new `apps/game/src/ui/hud/Compass.tsx`.
- Locale catalogs (EN, PT-BR) for the new strings.
- Unit tests and a Playwright spec.
