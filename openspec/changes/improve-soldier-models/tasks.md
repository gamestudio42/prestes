## 0. Before starting

- [x] 0.1 Read this change's proposal, design and both delta specs. Confirm Blender is on the machine; verify: `pnpm art soldier` rebuilds the present `soldier.glb`, and `pnpm models` runs clean
- [x] 0.2 Record a baseline: `soldier.glb` size, triangle count, and the mean frame time from `tests/e2e/performance.spec.ts` at the tactical and strategic spans; verify: the numbers are written as an apply note here
  - Apply note (2026-11-16): baseline before this change: `soldier.glb` 354 KB, about 324 triangles (530 with the IK Mauser of 1.0, 398,872 bytes); `performance.spec.ts` on the RTX 3050 laptop: tactical mean 7.76 ms (p95 23.30), strategic 3.09 ms.

## 1. Weapons in the hands (current soldier)

- [x] 1.0 Hold the rifle by IK and model the Mauser: in `target_soldier.py` the poses that hold the rifle name the hands that grip it, the build solves each arm (two-bone IK, the shoulder allowed 12 cm forward) onto points on the rifle and keys every frame between two held keys; the rifle's butt moves into the right shoulder pocket, the aim blades the body and brings the butt to the cheek; the Mauser is rebuilt in 16 parts; verify: a hand more than 2 cm off its point fails the build, view3d tests pass, `performance.spec.ts` passes, `pnpm thumbs` and `pnpm check:content` pass
  - Apply note (2026-11-16): before, the right hand sat about 40 cm from the stock in every aim and the left 8 to 37 cm from the forend (the arms were posed by angle alone); after, 0 cm on keys and in-between frames (raise, lower, run, crouch-walk, prone, aim turn). Found and fixed on the way: `aim_arms` reset the crouch lean, so the crouched aim pointed 14 degrees up (now 2). `soldier.glb` 398,872 bytes. The four weapon placeholders (Winchester as a shortened Mauser, revolver, bipod, machine gun) are unchanged.

- [x] 1.4 Weapon models in the soldier build: the Mauser, a lever-action carbine, a revolver (right hand), an automatic rifle with a bipod and a water-cooled machine gun on a tripod, each its own mesh in `soldier.glb`; `weapon-placeholders.ts` shows the one the catalog names instead of scaling the rifle bone; the four unnamed models listed as generic period types in `docs/assets.md`; verify: a unit test shows each weapon kind shows only its own mesh, the revolver hides every long arm, the gun shows only while set, and `pnpm thumbs` shows each weapon in the section pictures
  - Apply note (2026-11-16): each weapon is its own mesh (`soldier_parts.py`); `weapon-placeholders.ts` became `weapon-props.ts`, which shows the catalog's weapon by mesh name; the revolver rides the right forearm and has `<clip>-pistol` variants of 15 clips (arm out, left hand free; holstered in every other clip), added after the owner saw the chefe aiming his revolver like a rifle. `weapon-props.test.ts`, `section-thumbnails.test.ts` and `soldier-dress.test.ts` cover it; `pnpm thumbs` redrawn.

## 1. Lighter files and a model budget (current soldier)

- [ ] 1.1 Add `models` limits to `tools/bundle-budget.json` (`soldier.glb` ≤ 1,500,000 bytes, `soldier-*.png` group) and measure them in `tools/check-bundle.ts`; verify: `pnpm build && pnpm check:bundle` prints the model lines, and a test fixture over the limit makes it exit non-zero and name the model
- [ ] 1.2 Add `resample`, `quantize` and `meshopt` for the soldier in `tools/prepare-models.ts`, and register `MeshoptDecoder` on the `GLTFLoader` in the lazy loaders chunk; verify: `pnpm models` shrinks `soldier.glb`, the `model-loaders` chunk stays within 120 KB in `pnpm check:bundle`, and the soldier clip, gait and death tests pass
- [ ] 1.3 Key-pose test: load the source and compressed soldier and compare hand and foot bone positions at each clip's key frames within 1 cm; verify: the test passes, and fails when quantization is forced to 8 bits in a fixture

## 2. Animation cost follows view

- [ ] 2.1 In `character-layer.ts`, skip `mixer.update` for soldiers outside the camera frustum and accumulate their time; catch up with one update when they return to view; verify: a unit test shows no mixer advance off screen, and a soldier who went prone while hidden is drawn prone on return
- [ ] 2.2 Advance far-band soldiers every other frame with the accumulated time; verify: a unit test counts updates at the strategic band, the determinism golden still matches (`pnpm check:determinism`), and `performance.spec.ts` passes

## 3. New mesh, far mesh and weighted joints

- [x] 3.1 Rebuild the body in `target_soldier.py` at 1,500–3,000 triangles with joint loops weighted across two bones at elbows, knees, hips and neck. Re-target every existing clip to the new rig unchanged; verify: `pnpm art soldier` exports, every clip is present by name (existing missing-clip test), and the contact sheet shows no gaps at the knee, hip or elbow in the crouch, kneel and prone clips
  - Apply note (2026-11-16): near body 1,646 triangles; the build prints the count. `joints-2026-11-16.png` shows no gap in crouch, kneel, prone, crouched aim or crawl; the crouch-walk head check still passes (1.42 m).
- [x] 3.2 Gear as bone-parented meshes: brimmed slouch hat and kepi, puttees, cartridge belts, haversack, blanket roll, canteen and neckerchief, with outfit rules per army from `docs/history/FORCES.md`, and any unsourced detail listed as a placeholder in `docs/assets.md`; verify: the contact sheet shows each army told apart with colour removed
  - Apply note (2026-11-16): the gear pieces are bone-parented meshes (blanket roll, canteen, haversack, neckerchief, *bornais*, cartridge belts); the belt, pouches, bandoliers, puttees and shoulder boards are part of the body. `dress-grey-2026-11-16.png`: the sets are told apart by hat and kit; the column and the jagunços are the closest pair. Placeholders listed under "Uniform sets" in `docs/assets.md`.
- [ ] 3.3 Emit the far mesh `<mesh>.far` (≤ 600 triangles, same skeleton) and add a near and far triangle check to the art build next to the tree budgets; verify: the build fails on a fixture over either limit, and the contact sheet shows the far mesh per army
  - Apply note (2026-11-16): the far body (264 triangles) and far hats are emitted as `SoldierFar` / `<hat>Far` (the glTF loader drops dots in names) and `check_triangles` in `target_soldier.py` fails the build over 1,500-3,000 near or 600 far; the failing fixture is not written yet.
- [x] 3.4 In the view, draw the far mesh beyond a distance from the camera focus at the tactical band (the strategic band keeps its instanced markers), as a visibility swap on the same rig; verify: a unit test swaps meshes and checks that the clip, variant, gear and wound patch are kept, and a preview shows no pose jump
  - Apply note (2026-11-16): `SoldierInstance.setFar` swaps the body and hat and hides the gear past `FAR_MESH_DISTANCE` (28 m) from the camera focus at the tactical band; `soldier-dress.test.ts` checks that the clip, variant and wound are kept. Preview check under 7.1.

## 4. Uniform variants and gear by id

- [ ] 4.1 Raise `UNIFORM_VARIANTS` to 6 and draw the extra pixel textures (128×128, nearest filter) for all six outfits; verify: the texture loader finds 36 files, `check:bundle` keeps the PNG group within its limit, and the contact sheet shows every variant
  - Apply note (2026-11-16): six variants for the eight outfits: 48 files, 5.1 KB on average. The PNG group limit waits on 1.1.
- [x] 4.4 Dress of the period (owner, 2026-11-16): legalists in khaki with the kepi instead of olive; the column's variants in worn khaki and civilian jackets; uniform sets of their own for cangaceiros (half-moon leather hat, leather leggings, sandals, cartridge belts, coloured bags and neckerchief) and jagunços (round leather hat, leather jacket, leggings), chosen by section type; sources in `docs/history/FORCES.md`; verify: a unit test maps each section type to its outfit, and the contact sheet shows the five sets told apart with colour removed
  - Apply note (2026-11-16): khaki legalists; column variants with civilian jackets; `cangaceiro-troop` and `jagunco-troop` chosen by the section type's `uniform`. `soldier-dress.test.ts` and `section-thumbnails.test.ts` map the section types; `dress-2026-11-16.png` and `dress-grey-2026-11-16.png`.
- [x] 4.2 Choose gear per soldier from a hash of the id under the outfit rules (`soldier-clips.ts`); verify: a unit test shows that the same id gives the same kit, that an eleven-man section shows at least four variants and three gear combinations, and that a legalist never wears column-only gear
  - Apply note (2026-11-16): `soldierGear` in `soldier-clips.ts`; `soldier-dress.test.ts`.
- [ ] 4.3 Gear is presentation only; verify: `pnpm check:determinism` matches the golden, and a headless and a browser run of the same seed give the same hashes
  - Apply note (2026-11-16): `pnpm check:determinism` matches the golden; the browser run of the same seed is not done yet.

## 5. Clips with weight

- [ ] 5.1 Re-key walk, walk-ready, run, crouch-walk and crawl with hip rise, fall and sideways shift, and a delay of one to three frames on the spine, head and rifle; update `soldier-gaits.json`; verify: `soldier-gaits.test.ts` passes (foot slide ≤ 5 cm), and the contact sheet shows the hip shift over the planted foot
- [ ] 5.2 Re-key the raise, aim, fire and lower clips and the halt-to-ready so the head and rifle settle after the feet stop (rest within 0.5 s), and the kneel loads onto the front leg; verify: a test reads the settle time from the glb, and the crouch-walk head-height check still passes
- [ ] 5.3 Re-key the five death clips so the body drops under its weight, ending in the same four corpse poses; verify: `soldier-death-clips.test.ts` passes, prone deaths never rise above prone height, and the contact sheet shows each fall
- [ ] 5.4 Placeholder note: the wound, carry and treat clips keep their current choreography on the new rig. List them as "re-targeted, not re-authored" in `docs/assets.md`; verify: the asset register entry is present

## 6. Prefetch before the battle

- [ ] 6.1 Call `loadSoldierAsset()` when a chapter briefing or the skirmish setup opens. The loading screen counts an already-resolved soldier at once; verify: an e2e test sees the `soldier.glb` request start before start is pressed, and a second battle in the same page makes no new request

## 7. Review and gates

- [ ] 7.1 Render the art review sheet (every clip at its key frames, every variant, gear combinations, near and far mesh) and get the owner's approval on it; verify: the sheet is in `docs/review/soldier-clips/` and the approval is noted here
  - Apply note (2026-11-16): sheets `dress`, `dress-grey`, `variants`, `weapons`, `joints` and `nearfar` (2026-11-16) are in `docs/review/soldier-clips/`; waiting for the owner's approval. Frame probe with the new model, A/B against the previous `soldier.glb` on the same loaded machine: tactical 5.7-11.7 ms against 10.2-10.7 ms, strategic 3.2-7.0 ms against 3.7-7.3 ms; within noise and under budget. `soldier.glb` 818,824 bytes.
- [ ] 7.2 Update the visual snapshots that show soldiers after 7.1; verify: `pnpm e2e` passes with the new snapshots reviewed
- [ ] 7.3 Final gate: `pnpm verify`, `openspec validate improve-soldier-models --strict`, and a check that `soldier.glb` is ≤ 1.5 MB and the frame probe is within budget at both spans. If the probe fails, record the numbers and open the VAT/instancing follow-up instead of cutting scope silently; verify: every step reports passed and the final sizes and frame times are written as an apply note
