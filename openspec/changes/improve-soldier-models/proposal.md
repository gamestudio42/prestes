## Why

The soldier is the thing the player looks at most, and today he is the
roughest asset in the game: about 324 triangles, rigidly skinned, with 44
clips keyed from a handful of poses in `art-src/blender/target_soldier.py`.
Buildings, trees and stones have had their art passes; the soldier has not.
The owner wants better soldiers, uniforms and animation while the game stays
light enough for the web. A pre-battle loading screen is acceptable, and one
already exists (`BattleLoading`, `preloadBattle`).

## What Changes

- **Model**: rebuild the soldier mesh at 1,500–3,000 triangles with readable
  1920s gear in the silhouette (slouch hat or kepi with a real brim, puttees,
  cartridge belts, haversack, rolled blanket, canteen). Joints get weighted
  skinning at elbows, knees, hips and neck instead of rigid parts.
- **Far mesh**: the model also carries a far mesh of at most 600 triangles
  that the strategic band and far soldiers draw. It reuses the far-mesh path
  that environment models already use.
- **Uniforms**: keep the pixel-texture look (128×128, nearest filter). Raise
  the variants from 3 to at least 6 per outfit, and add gear toggles chosen
  by soldier id (neckerchief, blanket roll, canteen, rolled sleeves), so a
  section reads as men and not copies. Armies stay told apart by silhouette
  and headgear.
- **Animation**: re-author the clips with weight shift, overlap and
  follow-through: a heavier walk and run, a settled aim, a kneel that loads
  onto the front leg, and falls that drop the body weight. Every clip the view
  asks for today stays, under the same name.
- **Lighter files**: the model pipeline resamples and quantizes the clips and
  compresses the mesh (meshopt). `soldier.glb` gets a hard ceiling of 1.5 MB.
- **Animation cost**: soldiers out of view do not update their animation.
  Far soldiers update at a reduced rate. This is presentation only and never
  touches the simulation.
- **Loading**: the soldier starts downloading as soon as a battle is chosen
  (briefing, deploy desk), and the loading screen counts it. Repeat battles in
  the same session never fetch it again.
- **Budgets**: the bundle check also measures model files against limits in
  the budget file. The frame-time probe in `tests/e2e/performance.spec.ts`
  (16.7 ms mean at tactical span with a full section) must still pass.
- Out of scope, recorded as a fallback: baking clips into textures and
  drawing soldiers as one instanced mesh (VAT). It is planned only if the
  frame-time probe fails after the steps above.

Player fantasy and core loop are unchanged. The player commands sections of
the column, the government forces or the patriotic battalions. The change
makes those men read as tired 1920s infantry at a glance, and a fall reads
as a man going down, not a pose swap.

**Historical scope**: uniforms and gear follow `docs/history/FORCES.md`.
A detail without a source is listed as a placeholder in `docs/assets.md`,
as the existing uniform rule already requires.

**Multi-perspective**: no change to which historical figures command which
mission. All three armies (column, legalist, patriotic) get the new model and
outfits together, so no side looks better made than another.

**MVP**: new mesh with far mesh, 6 variants and gear toggles per outfit,
re-authored locomotion, aim and death clips, compressed GLB within budget,
and animation culling. Wound, carry and treat clips are re-keyed on the new
rig but keep their current choreography.

**Non-goals**: VAT/instancing, motion capture, per-character faces for named
historical figures, cloth simulation, new clips or new soldier states.

**Legal/ethical note**: all art stays original, built by script in Blender
and recorded in the asset register. No meshes, rigs or animation are taken
from libraries (Mixamo or similar) or from other games, Vazante included.
Deaths and wounds keep the current restraint: a fall and a blood patch, with
no gore added. The book is not used as an art source.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `soldier-art`: uniforms gain more variants and id-chosen gear. New
  requirements cover the soldier's mesh detail and far mesh, weighted joints,
  the weight and follow-through of the clips, and animation that skips or
  slows for soldiers out of view or far away.
- `delivery`: the bundle budget also measures model files, with a 1.5 MB
  ceiling for `soldier.glb`. The original model pipeline compresses meshes
  and animation.

## Impact

- `art-src/blender/target_soldier.py` (mesh, rig, clips), `art-src/characters/`
- `tools/prepare-models.ts` (resample, quantize, meshopt), `tools/check-bundle.ts`,
  `tools/bundle-budget.json`
- `packages/view3d/src/soldier-models.ts`, `soldier-clips.ts`, `character-layer.ts`
  (gear toggles, far mesh, animation culling), `battle-assets.ts` (preload timing)
- `apps/game/src/App.tsx` / `client/battle-start.ts` (earlier soldier prefetch)
- `apps/game/public/models/soldier.glb` and `models/textures/soldier-*.png`
- Model loaders chunk gains the meshopt decoder (stays within its 120 KB budget)
- Tests: `soldier-model-clips`, `soldier-gaits`, `soldier-death-clips`,
  `tests/e2e/performance.spec.ts`, visual snapshots that show soldiers
- `docs/assets.md` (soldier model, clips and textures)
