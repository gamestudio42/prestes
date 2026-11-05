## Why

Phase 4 of the redesign agreed on 2026-11-03: the in-game world stays 3D
low-poly, and after phases 1 to 3 (cover slots, the Vila Militar training
ground, the pixel-art interface) it is the part that still looks like a
prototype. Soldiers are capsules with a head and a hat assembled from
primitives, the training ground's barracks, trenches and walls are flat boxes,
and a shot is a thin line with nothing at either end. The user's first redesign
note asked to "rever elementos gráficos, objetos, movimentação, tiro".

Decisions taken with the user on 2026-11-04:

- **Blender, scripted**: models are built by Blender Python scripts (Blender
  5.2 is installed), exported to glTF through the existing `pnpm models`
  pipeline; the `.blend` files are kept so the user can edit them.
- **Pixel textures**: low-poly shapes with small pixel-art textures (32 to 64
  px, nearest filtering, the sepia palette), tying the world to the pixel
  interface.
- **Scope**: soldiers, the training ground, and fire and movement feedback.

## What Changes

- **Art pipeline**: `art-src/` holds the Blender build scripts and the
  generated `.blend` sources; `pnpm art` runs Blender in background mode to
  rebuild them and export glTF, and `pnpm models` (existing) prunes and
  deduplicates into `apps/game/public/models/`. Textures are drawn as pixel
  grids in code (like the icons) into small PNG atlases. The exported models
  and textures are committed, so building and testing never need Blender.
- **Soldier**: one original 1920s infantry model at 1.75 m with a simple rig
  (hips, spine, head, arms, legs, rifle) and clips: idle, walk, crouch idle,
  crouch walk, prone, prone crawl, aim and fire (standing, crouched, prone),
  wounded on the ground, and the corpse pose. Two outfits on one mesh through
  the texture atlas: the column (worn khaki, red scarf, slouch hat or kepi,
  bandolier) and the legalists (army uniform, kepi); the instructor gets an
  officer variant. The Mauser is part of the model.
- **Training ground models**: barracks, chapel, farmhouse, barn, aid tent,
  flagpole, target frames and butts; trench sections with sandbag parapets,
  stone walls, low walls, crates, barrels; three tree types, hedges and fence
  sections. Building meshes keep the shared footprints from
  `TRAINING_GROUND`, so simulation cover and slots are unchanged.
- **Fire and movement feedback**: muzzle flash and a short smoke puff at the
  shooter, a brighter tracer, dust or splinter puffs where a shot hits cover or
  ground, footstep dust when marching, a suppression cue (small dirt spurts
  around a suppressed soldier), and a fall when a soldier is hit hard.
- **Performance**: soldiers render through one skinned mesh per soldier with
  shared geometry, textures and clips; environment props through instancing
  where repeated. A frame budget is checked in the e2e performance probe.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `presentation`: the character rig, movement animation, stance poses and
  combat feedback requirements change to the Blender-built models, clips and
  effects; new requirements for the art pipeline, pixel textures and the
  training ground models.

## Impact

- `art-src/` (new: Blender scripts, `.blend` sources, texture grids),
  `tools/` (art build script), `apps/game/public/models/` and textures
  (exported, committed), `packages/view3d` (character, world, training, cover
  and effect layers load and drive the models), `docs/assets.md` and
  `docs/decisions` (visual language update), visual baselines.
- No simulation change: models follow `UnitSnapshot` and covers follow the
  shared footprints; determinism is unchanged.
- Player fantasy: a recruit section on a 1922 training field that looks like
  one, and fire that reads at a glance.
- Historical scope: uniforms and equipment are representative of the period
  (Brazilian Army khaki and kepi, Mauser rifle, gaúcho irregular dress for the
  column), labelled as game art, not as reconstructions of specific units.
  The Mauser identity is documented (Macaulay, p. 113); its model shape is
  representative.
- Legal and ethical note: all models and textures are original; no third-party
  models; Vazante techniques stay credited in the visual-language decision.
- Perspective: unchanged (the player's training section; the instructor NPC).
- Localization: no new player strings expected; any added (for example an
  art credit) in PT-BR and EN.
- Non-goals: new mechanics, campaign maps, cavalry and artillery models, voice
  and music, mobile performance.
