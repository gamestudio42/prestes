## Context

See proposal.md. The soldier is one rigged model built by
`art-src/blender/target_soldier.py` (a `Poser` that keys bone rotations,
24 fps) and exported to `apps/game/public/models/soldier.glb`. The view
picks a clip from the snapshot in `packages/view3d/src/soldier-clips.ts`
(eighteen clips: idle, walk, ready variants, run, crouch-idle, crouch-walk,
prone, crawl, aim and fire per stance, hit, wounded, corpse); `HELD_CLIPS`
hold their last pose. Outfits are `column`, `legalist` and `officer`, each
a 64 x 64 texture of flat regions described by
`art-src/textures/regions.json` and painted by `make_textures.py`.

The frame already carries what the new clips need: `wound` (none, light,
moderate, severe, fatal), `incapacitated`, the rescue fields, the
`being-carried` and `rescuing` states, stance, gait and facing. Whether a
shot event carries the shooter's position at the moment of death is to be
confirmed at apply (task 2.1); if it does not, the direction comes from the
last `shot` event that named the victim, which the view already receives.

Boundary: nothing here touches the simulation. The low-poly pipeline stays
script-built.

## Goals / Non-Goals

**Goals:**

- Every state the frame reports has a clip that reads at the tactical band.
- Variety that is deterministic, chosen from ids, never from `Math.random`.
- The same model and the same budgets.

**Non-Goals:**

- Inverse kinematics at run time; foot sliding is fixed in the clips'
  stride lengths against the simulation's speeds.

## Decisions

**D1. Keep the script as the source of animation.** New clips are new
`Poser` functions. Hand animation in Blender was considered: it would read
better per clip, but the kit would stop being reproducible by `pnpm art`,
and the owner's time goes to maps and voices.

**D2. Clip choice stays a pure function.** `soldier-clips.ts` gains the
wound, carry, reload and death branches and stays testable without Three.js.
Death and corpse variants are picked by a hash of the soldier id and death
tick (the kernel's FNV-1a), as the uniform variant is by id.

**D3. Cross-fade in `SoldierInstance`.** One mixer per soldier already
exists; clip changes use a fixed fade. Deaths cut. At the strategic band,
where soldiers are instanced without a mixer, nothing changes.

**D4. Stride lengths from the simulation's speeds.** The walk, crouch-walk,
limp and run cycles are keyed so one cycle covers `speed x cycle time`; a
unit test reads the exported clip durations and the stride constants and
checks them against the speeds in the shared gait table.

**D5. Textures: a larger atlas, drawn by script with hand passes.** The
outfit atlas grows (128 x 128 per outfit, final size at apply against the
texture budget) and `make_textures.py` paints folds, belts and wear
procedurally from the region map, so a new army is a palette and a few
flags. Faces and insignia that need a hand are drawn once in Aseprite and
composited by the script. Variants are palette and face swaps, not new
atlases. Alternative: fully hand-painted atlases; rejected for the number
of outfits (three armies, ranks, variants).

**D6. Blood as an overlay region.** The wound mark is a second small
texture blended on the torso or limb region by a uniform, not a new atlas
per wound.

## Risks / Trade-offs

- [More clips make `soldier.glb` heavier] → clips share the rig and are
  short; the model budget is checked by the bundle check, and the model is
  not in the worker.
- [Script-built motion looks stiff] → the review sheet and a hand check per
  clip group; a clip the owner rejects is reworked before the next group.
- [The frame budget] → the performance e2e runs with a full 3v3; fades are
  two actions per soldier for 0.25 s at most.

## Open Questions

- The final atlas size, decided at apply from the measured texture memory.
