## Why

The foundation proves the simulation and a graybox, but its perspective camera,
plain markers and flat materials do not carry the visual identity the game needs.
The studio reference is Vazante's low-resolution orthographic look: small
characters that stay readable when zoomed out, a restrained period palette, and
clear movement paths. Establishing that language now avoids repainting the
camera, units and HUD after combat is added.

## What Changes

- Replace the perspective graybox camera with a continuous orthographic rig:
  tactical tilt, strategic top-down, pan/rotate/zoom, texel snapping and a
  tactical/transition/strategic band readout.
- Add a low-resolution post pipeline: depth-edge outline, restrained bloom, soft
  shoulder, colour grade, posterized dither and vignette, with nearest upscale.
- Add a Prestes palette and toon materials for terrain, buildings, units and
  markers.
- Replace unit markers with an original low-poly modular 1920s character kit:
  soldier and officer variants first, with one shared rig, period hats, rifles
  and faction colours.
- Add small-character readability: 1.75 m models scaled up at strategic zoom so
  they remain readable without becoming giants at tactical zoom.
- Add movement paths: dashed routes, waypoint crosses, order markers and a debug
  move action that proves the path pipeline.
- Extend the frame protocol with unit faction and active order paths so the view
  draws routes without owning simulation state.
- Restyle the start screen, HUD and codex with Barlow / Barlow Condensed and
  Lucide icons.
- Add the original-model export pipeline and asset-register entries.
- **Non-goals:** combat, selection, squads, morale, logistics, missions, audio,
  final props, cavalry and the full character roster. Those belong to later
  changes.

## Capabilities

### New Capabilities

None. This change modifies existing capabilities.

### Modified Capabilities

- `presentation`: orthographic camera, period low-poly scene, post pipeline,
  small-character readability, movement paths and period UI.
- `simulation`: frames expose unit faction and active order paths for
  presentation; the simulation remains the only owner of state.
- `delivery`: original-model export pipeline, fonts/icons dependencies and asset
  register updates.

## Impact

- `packages/view3d`: camera rig, post process, palette, toon materials, character
  layer and path layer replace the graybox scene internals.
- `packages/shared`: frame protocol adds `faction` and `orders`.
- `packages/simulation`: units carry a faction; move commands create active order
  paths that clear on arrival.
- `apps/game`: Barlow/Barlow Condensed and Lucide dependencies, restyled UI, debug
  move action and path count.
- `tools/`: model preparation script and `pnpm models`.
- `docs/`: assets, architecture, decisions and status.
- No GitHub action, push or repository creation.

## Legal and ethical note

All character meshes and animations are original low-poly work. Fonts keep the
SIL OFL licence, Lucide icons keep ISC, and any future CC0 kit or audio source is
recorded in the asset register. Original art is released under CC-BY-4.0; code
remains AGPL-3.0-or-later. No Vazante asset or code is copied wholesale; its
techniques are reimplemented with attribution in `docs/decisions/`.
