## Context

`packages/view3d` draws everything from primitives: `character-layer.ts` (650
lines) builds a part rig per unit and instanced proxies for the strategic band;
`world-layer.ts` and `training-layer.ts` build houses, fences and props from
boxes and cones; `cover-layer.ts` draws covers from their footprints;
`tracer-layer.ts` draws one line per shot. A glTF pipeline exists
(`tools/prepare-models.ts`, `pnpm models`, `art-src/characters`) but has no
models yet. The renderer is Three.js r181 with an orthographic camera, a
three-band toon ramp and a pixel post pass (outline, posterize, Bayer).

## Goals / Non-Goals

**Goals:** a readable, period-correct low-poly world in the same sepia
language as the pixel interface; animated soldiers whose stance, movement and
fire are clear at both camera bands; editable sources; no simulation change;
a stable frame rate on the user's machine.

**Non-Goals:** realistic shading, per-soldier unique models, new mechanics.

## Decisions

### Blender as a scripted build step

`art-src/blender/build.py` is run by `pnpm art` with
`blender -b -P art-src/blender/build.py -- <targets>`. Each target module
(`soldier.py`, `buildings.py`, `fortifications.py`, `vegetation.py`,
`props.py`) builds meshes from parameters with bmesh (low-poly, flat or
smooth groups chosen per part), assigns UVs into a shared atlas, adds the
armature and actions for the soldier, saves `art-src/<name>.blend`, and
exports glTF to `art-src/characters/` (soldier) or `art-src/environment/`.
`tools/prepare-models.ts` gains the environment folder. Blender is located
like Aseprite (default install path or `BLENDER`). Exports are committed.

Poly budgets: soldier about 400 triangles, building about 300 to 600, a trench
section about 120, a tree about 150.

### Pixel textures

Textures are drawn as pixel grids in Python (`art-src/textures/*.py`, the same
approach as the icons) into small atlases (`soldier.png` 64 x 64 with outfit
regions, `environment.png` 128 x 128 with plaster, tile, stone, sandbag,
timber, canvas, bark and leaf swatches), using only the sepia palette plus
faction accents. Three.js loads them with `NearestFilter`, no mipmaps, and the
existing toon ramp; the posterize pass already keeps colours in the palette.

### Soldier rig and clips

One armature: root, hips, spine, chest, head, upper and lower arms and legs,
and a rifle bone. Clips (Blender actions exported as glTF animations): idle,
walk, crouch-idle, crouch-walk, prone, crawl, aim-stand, fire-stand,
aim-crouch, fire-crouch, aim-prone, fire-prone, wounded, corpse. The view
picks the clip from the snapshot (stance, moving, shot event this frame,
incapacitated, alive) and cross-fades over 0.15 s; walk speed scales with
the unit's ground speed. Outfits are UV offsets into the atlas (column,
legalist, officer), so all soldiers share one geometry and one texture.

At strategic span the existing instanced proxies stay (they are cheaper and
already readable); the skinned soldiers show at tactical span and are hidden
past the band switch, as the part rig is today.

### Environment

The training layer loads the building, fortification and prop models and
places them from `TRAINING_GROUND` (position, rotation, footprint). The cover
layer swaps its boxes for the trench, sandbag, stone and low-wall models
scaled to each cover's footprint (sections tiled along long covers). Trees,
hedges and fences use instancing.

### Effects

`effects-layer.ts` replaces the tracer layer: pooled sprite and point effects
for muzzle flash (2 frames), smoke puff, tracer, impact dust or splinters
(chosen by what the shot hit: cover kind or ground), footstep dust for moving
soldiers (rate-limited), and dirt spurts around suppressed soldiers. All are
pixel sprites from a small effects sheet, drawn with nearest filtering.

## Risks / Trade-offs

- Blender scripting is a large surface; the first models are deliberately
  simple and can be refined in Blender afterwards.
- Skinned meshes cost more than the current parts; a soldier count of about 30
  at tactical span is the target. The e2e performance probe checks the mean
  frame time stays under an absolute budget (about 16.7 ms); the procedural
  rig is measured once before its removal, for the record only.
- Visual baselines and some view tests change; reviewed screen by screen.

## Migration Plan

The procedural rig and props stay until the models load everywhere and the
performance probe has measured both, then they are removed in the last task.
No second art set is kept: the models ship from the game's own origin, so a
load failure means a broken build or a lost connection. If a model fails to
load, the view falls back to the strategic proxy (already kept for the far
LOD) at every distance and logs the error, so the field stays playable.
