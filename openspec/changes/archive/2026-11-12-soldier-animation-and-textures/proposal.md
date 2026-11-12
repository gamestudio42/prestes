## Why

The owner asked (2026-11-11) for better soldier animations and textures:
the wounded, the dead, walking crouched and aiming read poorly, and the
uniforms are flat. The rig and its eighteen clips are built by a script
(`art-src/blender/target_soldier.py`) with one `wounded` pose, one `corpse`
pose and a 64 x 64 texture of flat regions per outfit, and there are three
outfits for what will be three armies.

## What Changes

- **Wounded soldiers are shown by their wound.** A lightly or moderately
  wounded man walks with a limp and holds the wound when halted; an
  incapacitated man lies and moves (not a still pose); a man being carried
  and the man carrying him have clips of their own; a man being treated
  lies while the rescuer kneels over him.
- **The dead fall and lie in more than one way.** A death clip that depends
  on the stance he was in (standing, crouched, prone) and on where the shot
  came from, ending in one of several corpse poses, chosen from the
  soldier's id so the same battle draws the same field.
- **Crouched movement and aiming are redone.** A crouch-walk with the body
  low and the rifle forward, a clear raise into the aim and a settle after
  it in each stance, a visible recoil, reloading clips (standing, crouched,
  prone), and turning the aim without sliding.
- **Blends instead of snaps.** Clips cross-fade on a short, fixed time; the
  feet do not slide at the simulation's walk and run speeds.
- **Textures.** Uniform textures go from flat regions to drawn pixel
  texture (cloth folds, belts and bandoliers, puttees, buttons, hat bands,
  faces with a few skin tones, wear and dust), one set per army and rank,
  with a small number of variants per set so a section is not eleven copies.
  Blood shows on a wounded man's uniform at the wound's side.
- **A review sheet.** `pnpm art` renders a contact sheet of every clip and
  outfit for the owner's eye, as the build already does for other kits.
- No simulation change: the view reads what the frame already carries.

Design intent. Player fantasy: seeing your men, not markers: who is hit,
who is down, who is aiming. Pillar: readable tactics at a glance. Loop
beat: the fight itself, and the decision to rescue. Hypothesis: without
opening the panel, a player picks out a wounded man and a section that is
aiming from one that is only standing.

MVP: wound clips, death variety, the crouch-walk and aim rework, blends,
drawn textures for the three armies' rank and file and officers. Non-goals:
new body meshes or a higher polygon budget, facial animation, cavalry,
ragdolls, hand-authored `.blend` animation (the script stays the source),
and gore beyond a blood mark and pool.

Historical and ethical note. Uniforms follow the armies recorded by
`faction-armies` in `docs/history/FORCES.md`; a detail with no source is
labelled a placeholder in `docs/assets.md`. The dead and wounded are shown
with restraint, as the game already does: no dismemberment, and the same
treatment for every army. The textures are original work under CC-BY-4.0;
no photograph or other game's art is traced. The campaign's
multi-perspective approach and its playable figures are unchanged.

## Capabilities

### New Capabilities

- `soldier-art`: the soldier's clips by state, death and wound
  presentation, clip blending, uniform textures by army and rank, and the
  review sheet.

### Modified Capabilities

None. `presentation` keeps "Every faction animates alike" and the pose
requirements; this capability adds to them and contradicts none.

## Impact

- `art-src/blender/target_soldier.py`, `art-src/textures/make_textures.py`
  and `regions.json`; `apps/game/public/models/soldier.glb` and textures.
- `packages/view3d`: `soldier-clips.ts` (clip choice), `soldier-models.ts`
  (blending, variants), `character-layer.ts` (wound side, corpse pose).
- Budgets: the soldier model and textures are loaded once; the frame budget
  e2e (`performance.spec.ts`) and the bundle check guard the cost.
- Depends on `faction-armies` for the list of uniforms; the clips do not.
- `docs/assets.md`.
