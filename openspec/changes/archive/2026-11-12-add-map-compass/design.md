## Context

The map grid is stored row by row from the north-west, and today "north"
means the grid's top edge (screen up when the camera yaw is 0). The camera
(`CameraRig`) turns in 45° steps; its default yaw is π/4. The sun bearing
(`MapLight.bearing`, 0 north, clockwise) is applied relative to the grid.

## Goals / Non-Goals

Goals: north stored with the map and read back; the editor sets it; the
battle HUD shows it at any camera rotation. Non-goals: declination, minimap,
free rotation, any change to the simulation. No historical content is added,
so no research method or figure roster changes.

## Decisions

- **Content schema.** `north?: number` on the map document body, degrees
  clockwise from the grid's top edge to true north. Normalised to [0, 360)
  on read; a non-finite value is invalid. Absent = 0. Written only when
  non-zero, so existing documents round-trip unchanged.
- **Version 7.** An optional field still bumps the format (as objectives
  did) so an older build refuses a newer map instead of dropping north. The
  6→7 migration is a no-op.
- **Sun.** The view lights the map from grid bearing `light.bearing + north`.
  Maps with north 0 light as before. `BattleMap` gains `north` next to
  `light`; both are view-only and never hashed.
- **Compass angle.** A pure helper in `packages/view3d`. With heading
  h = north + yaw, the screen angle of true north, clockwise from screen up,
  is atan2(sin h, cos h · sin tilt). Derivation: the camera looks along the
  ground direction (−sin yaw, −cos yaw) from `tilt` above the horizon, with
  screen right (cos yaw, −sin yaw); a ground direction's screen-up part is
  foreshortened by sin tilt. Seen from straight above this is just h. The
  unit tests check it against the real Three.js camera matrix.
- **Click to north.** `CameraRig.faceNorth(north)` sets the target yaw to the
  angle equivalent to `-north` nearest the current target (shortest turn).
- **Editor arrow.** The arrow is the same compass component, overlaid by
  `EditorApp.tsx`; it follows the editor camera too, which turns with Q and E.
- **Simulation/presentation boundary.** Nothing in `packages/simulation` or
  `packages/kernel` reads north; the deterministic kernel is untouched. The
  low-poly pipeline is untouched (the rose is HUD SVG).

## Risks / Trade-offs

- With north at an odd angle, "north up" is not a 45° step; after
  `faceNorth` the view rests at that yaw and rotation steps continue from
  there. Accepted.
- Another session is editing the editor viewport (scale bar); the arrow is an
  overlay placed by `EditorApp.tsx` to stay out of `viewport.ts`.
