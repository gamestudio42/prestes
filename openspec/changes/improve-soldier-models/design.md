## Context

See proposal.md (Why) for the motivation. What shapes the approach:

- **Boundary**: the soldier is presentation only. The simulation (Web
  Worker, 100 ms tick, `hashState()`) reports unit state in frames. The view
  (`packages/view3d/src/character-layer.ts`) picks a clip per unit from that
  frame. Nothing in this change crosses into the simulation, and every
  per-soldier choice (variant, gear, death pose) comes from the unit id and,
  for deaths, the tick, as it does today (`uniformVariant`, `fnv1a`).
- **Pipeline today**: `art-src/blender/target_soldier.py` builds the mesh,
  rig and 44 clips by script, with rigid skinning (one bone per part).
  `tools/prepare-models.ts` only runs `prune` and `dedup`.
  The result is `soldier.glb`: 354 KB, about 324 triangles, mostly animation
  data.
- **Look**: the scene is drawn at a low internal resolution and upscaled
  (`post.ts`). Uniforms are 128×128 pixel PNGs with nearest filtering, about
  2 KB each (18 files, 6 outfits × 3 variants), on a toon material. At this
  resolution a soldier covers few pixels, so outline and headgear read; fine
  surface texture does not.
- **Runtime today**: one `SkinnedMesh` clone and one `AnimationMixer` per
  soldier, advanced every frame for every unit, including those off screen.
- **Loading today**: `preloadBattle` / `battleAssets` already fetch the
  soldier behind `BattleLoading` (shown when the wait passes 300 ms), and
  `loadSoldierAsset` caches the promise per page.
- **Gates**: `tests/e2e/performance.spec.ts` (16.7 ms mean, GPU only),
  `tools/check-bundle.ts` with `tools/bundle-budget.json` (JS/CSS only today),
  and the soldier clip and gait tests in `packages/view3d/test/`.

## Goals / Non-Goals

**Goals:**
- A soldier who reads better at the low internal resolution: put the detail
  into the outline and the motion, not into texture resolution.
- Keep the download small and measured. Keep CPU cost per soldier flat or
  lower than today, even though the mesh gets heavier.
- Keep every clip name and every rule in the current `soldier-art` spec.

**Non-Goals:**
- Changing which states exist or how the view picks a clip from a frame.
- Higher-resolution or compressed GPU textures (see D3).
- VAT/instancing in this change (see D6).

## Decisions

**D1. Stay script-built in Blender, add weighted joints.**
Keep extending `target_soldier.py`, because it is the reviewable, original,
reproducible source the asset register already names. The new body is built
from the same proportions (1.75 m, feet at origin, facing -Z), with joint
loops at elbows, knees, hips and neck weighted across two bones. Gear
(belts, haversack, puttees, blanket roll, canteen, neckerchief) are separate
small meshes parented to the bones. That is the pattern the blood patch and
weapons already use.
*Alternatives*: sculpting by hand in a `.blend` (not reproducible by script,
and `.blend` stays out of git); a library rig such as Mixamo (licence and the
originality rule rule it out).

**D2. Far mesh in the same file, named `<mesh>.far`.**
The script also emits a far mesh of at most 600 triangles: the body without
the gear islands, plus headgear and rifle. This follows the `.far`
convention of `tools/model-split.ts` (`addFarMeshes`) and
`environment-models.ts`. It shares the skeleton, so swapping mesh is only a
visibility change on the same rig: no pose jump, and the mixer is untouched.
The strategic band already draws soldiers as instanced markers
(`character-layer.ts`, `farBand`), so the far mesh is used only at the
tactical band, beyond a distance from the camera focus.
*Alternative*: a second GLB (doubles the clip data); decimating at run time
(costs CPU, and the outline comes out uncontrolled).

**D3. Uniforms stay as 128×128 pixel PNGs; variety comes from more variants
and gear toggles.**
At the internal resolution a larger or KTX2 texture adds bytes and loader
code with no visible gain, and KTX2 would blur the nearest-filter pixel look.
So `UNIFORM_VARIANTS` goes from 3 to 6 (36 files, about 80 KB in total) and
gear pieces turn on or off per soldier by hash of the id, under the rules of
each outfit (for example, legalist troops never wear the column's
neckerchief). This corrects the KTX2 idea from the first conversation.
*Alternative*: palette or tint swap in a custom shader. It is cheaper still,
but replaces the toon material path and fights the drawn pixel textures. It
stays available if variants ever need to grow past about 10.

**D4. Re-key the clips with weight, reusing the poser.**
The `Poser` helpers stay. Each locomotion clip gains in-between keys for hip
height and sideways shift, and a delay of one to three frames on the
spine, head and rifle bones (overlap). Aim, kneel and the five death clips
get a key that puts the weight on the loaded leg or drops the body. Gait
data in `soldier-gaits.json` is updated so the foot-slide rule (5 cm) still
holds, and the existing gait test stays the oracle.

**D5. Compress in `pnpm models`: resample, quantize, meshopt.**
Add `@gltf-transform/functions` `resample()` (drops linear-redundant keys),
`quantize()` and `meshopt()` for the soldier. The game registers
`MeshoptDecoder` (three's `meshopt_decoder.module.js`, about 20 KB) on the
`GLTFLoader` in the existing lazy `model-loaders` chunk (120 KB budget).
A pipeline test loads source and output and compares hand and foot bone
positions at each clip's key frames (1 cm tolerance).
*Alternative*: Draco (larger decoder, mesh only, does nothing for
animation, which is most of the file).

**D6. Animation culling and far-rate updates in the character layer.**
Each soldier keeps an accumulated time. Every frame the layer checks the
soldier against the camera frustum (bounding sphere at the unit position).
Off screen: `play()` still runs, so the clip choice stays current, but
`mixer.update` is skipped and the time accumulates. On screen with the far
mesh: update every other frame with the accumulated time. On return to view:
one update with the accumulated time, clamped to the clip length for
non-looping clips, so a prone soldier is drawn prone. Death and corpse
clips, which are chosen from id and tick, are unaffected.
**VAT fallback**: if the probe still fails after D1–D6, a follow-up change
bakes the far mesh clips into a vertex-animation texture and draws far
soldiers as one `InstancedMesh`. That is out of scope here.

**D7. Prefetch on briefing or deploy, count in the loading screen.**
`loadSoldierAsset()` is already idempotent per page. The briefing view and
the skirmish setup call it (fire and forget) when they open, so the request
is in flight before start. `battleAssets` keeps the soldier entry, so the
loading screen counts it, and an entry that is already resolved counts at
once. There is no service worker: repeat visits rely on the existing
versioned URLs (`versioned-urls.ts`) and HTTP caching.

**D8. Model budget in the existing bundle check.**
`bundle-budget.json` gains a `models` list (`{ file, maxBytes }`) checked
against `apps/game/dist/models/`. It starts with `soldier.glb` at 1,500,000
and a group limit for `soldier-*.png`. `check-bundle.ts` prints them with
the JS groups. A triangle check for near and far meshes is added to the art
build (`review.py` / `prepare-models.ts`), next to the tree triangle budgets
(`tree-budgets.ts`).

**Historical method and roster**: no new historical claims. Gear per army
is taken from `docs/history/FORCES.md`, and anything unsourced (for example,
the colour of a neckerchief) is listed as a placeholder in `docs/assets.md`.
The figure roster is unchanged. Officers are the officer outfit; named
figures have no unique face in this change.

**Content schema**: no change to maps, campaign or catalog schemas. Gear
rules per outfit live beside `SOLDIER_OUTFITS` in `soldier-clips.ts`.

## Risks / Trade-offs

- [Weighted skinning costs more per vertex than rigid] → Vertex count stays
  below about 2k, skinning runs on the GPU, and the frame probe is the gate.
  If it fails, the joint loops can be cut back before the far mesh is
  touched.
- [Quantized animation causes jitter or foot sliding] → Use the 1 cm
  key-pose test and the existing gait test, and keep rotation precision at
  16 bits if 12 bits shows error.
- [Culling shows a pose pop on return to view] → One catch-up update with
  the accumulated time. A test covers prone-while-hidden.
- [Visual snapshots that include soldiers will all change] → Update them in
  their own task after the art review sheet is approved by the owner.
- [Re-authoring 44 clips is the bulk of the work] → The MVP re-keys
  locomotion, aim, kneel and death with weight. Wound, carry and treat clips
  move to the new rig with current choreography (proposal MVP).

## Migration Plan

Each step lands as its own slice, and the game keeps working between them:
compression and the budget first, on the current soldier; then culling;
then the new mesh, gear and variants; then the clips. Rollback means
restoring the previous `soldier.glb` and textures from git, since the
loader stays compatible with an uncompressed file.

## Open Questions

- The exact far-mesh distance at the tactical band. It is tuned on the
  contact sheet and in play, and it does not change the specs.
- Whether 12-bit or 16-bit rotation quantization is needed. It is settled
  by the key-pose test.
