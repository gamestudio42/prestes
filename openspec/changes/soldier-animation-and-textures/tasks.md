## 0. Before starting

- [ ] 0.1 Read `docs/handoff.md`, then this change's proposal, design and spec. Prerequisite: `faction-armies` section 2 (the armies and their uniform set ids) for section 3 here; sections 1 and 2 (clips and view) can start without it. Blender must be on the machine for `pnpm art`; verify: `pnpm art` runs for the soldier target and reproduces the present `soldier.glb`

## 1. Clips in the kit

- [ ] 1.1 Wound clips in `target_soldier.py`: limp, hold-wound idle, lying-wounded loop, carry and carried, kneel-treat and treated; verify: the model exports them, and the review sheet shows each
- [ ] 1.2 Death clips by stance and direction (standing front, back and flank; crouched; prone) ending in at least four corpse poses; verify on the review sheet and with a test that every death clip's last frame is one of the corpse poses
- [ ] 1.3 Crouch-walk redone, raise-to-aim and settle per stance, recoil, reload per stance, aim turn; verify on the review sheet and with the head-height check of the crouch-walk
- [ ] 1.4 Stride lengths keyed to the simulation's walk, crouch, limp and run speeds; verify with a unit test of clip durations and stride constants against the shared gait table

## 2. View

- [ ] 2.1 Clip choice in `soldier-clips.ts` for wound, carry, treatment, reload and death (direction from the frame's events); verify with unit tests, one per scenario of the wound, death and crouch requirements
- [ ] 2.2 Death and corpse variants from the soldier id and death tick; verify with a unit test that the same inputs give the same pose and that four poses occur over a battle's dead
- [ ] 2.3 Cross-fade between clips in `SoldierInstance`, deaths cut; verify with a unit test of the fade times and the frame budget e2e
- [ ] 2.4 The build fails when the view asks for a clip the model lacks; verify by removing a clip name in a test fixture

## 3. Textures

- [ ] 3.1 The larger atlas and the painted layers in `make_textures.py` (folds, belts, leg wear, headgear, wear), regions updated; verify on the review sheet and by the texture size check
- [ ] 3.2 Uniform sets for the three armies' rank and file and officers from `docs/history/FORCES.md`, with unsourced details listed as placeholders in `docs/assets.md`; verify: the content check finds a uniform set for every army, and the three read apart in a greyscale screenshot
- [ ] 3.3 Three variants per set chosen by soldier id; verify with a unit test and a screenshot of a section of eleven
- [ ] 3.4 The blood overlay on the wound's side; verify with a view test that a wounded soldier's material carries the overlay and an unwounded one does not

## 4. Gates

- [ ] 4.1 `pnpm art` review sheet committed for the owner's review; `docs/assets.md` updated; verify: the register lists the model, clips and textures with their licence
- [ ] 4.2 `pnpm verify` and `openspec validate soldier-animation-and-textures --type change --strict`; verify: all pass, model and texture sizes in `docs/status.md`
- [ ] 4.3 Hand check by the owner in a skirmish: the wounded, the dead, the crouch-walk, the aim and the uniforms; findings in `docs/status.md`
