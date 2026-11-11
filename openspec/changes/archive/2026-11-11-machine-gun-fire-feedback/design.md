## Context

See proposal.md (Why) for the probe and its figures. The current mechanics:

- `combat.ts` `engageRange` = `min(ctx.combatRange, weapon.range)`; the 3 vs 3
  sets `combatRange` to the Mauser's 120 m, and `visible()` needs the shooter's
  own cone, line of sight and range. `VISION_RANGE` (side sighting) is 120 m.
- `machine-gun.ts`: `gunStill` counts still ticks and any path step resets it;
  `gunReady` gates `fire()`. Orders (attack, pursue, advance) give the gunner
  a path like any rifleman, so he walks and never sets.
- Burst and belt fire emit one `shot` event per round, `burstStart` true on the
  first. `shotShown` (`burstStart !== false`) makes `ShotAudio` and
  `TracerLayer` act on the first round only; `EffectsLayer` acts on every
  round. `ShotAudio` has one output (Mauser shot + bolt), a cap of 4 voices
  of 350 ms.
- `TracerLayer`: one `LineSegments` buffer of 64 tracers, 1 px lines
  (`LineBasicMaterial` width is fixed at 1 px in WebGL), 5 m streak at
  90 m/s, same for every weapon.

Constraint: the simulation stays deterministic and never reads the view;
view-side variation comes only from event fields hashed with `shotNoise` /
`shotRate` (as today), never from `Math.random` in a path a test checks.

## Goals / Non-Goals

**Goals:**
- The machine gun fires when the player expects it to: halted, at its reach,
  and its fire is unmistakable in sound and sight at both camera bands.
- The battle report measures it, so this does not regress.

**Non-Goals:**
- Retuning burst lengths, accuracy or damage (only if the new report band
  fails after the halt and the reach work; then as a recorded task note).
- A new recording, an animated tripod, overheating, traverse limits.
- The automatic rifle's simulation (it only shares the view and audio work).

## Decisions

### D1. Reach: side's sighting, gunner's line of fire, 140 m

A belt weapon's `engageRange` is its own `range` (140), not capped by
`combatRange`. Its candidate test is: within 140 m, inside the gunner's
forward cone, line of fire clear from the gunner's eye height (the existing
`isLineBlocked` + vegetation test), and either seen by the gunner himself or
in his side's `ctx.vision.seen` set (fog on). Without fog, the gunner's own
sight to 140 m.

Alternatives: raise `VISION_RANGE` (changes every unit, all goldens, fog
balance); give only the gunner 140 m sight (a gunner does not see farther
than a rifleman; his mates spotting for him is the period practice and what
the side sighting already models). Rejected both.

### D2. Halt to fire as a gun-section rule in the simulation

In `updateMachineGuns` (runs each tick before movement), for a gun squad
under attack, pursue or advance: if the gunner has an engageable enemy (D1),
the gunner's path is held (not cleared: `pathIndex` frozen, a `gunHalt`
flag on the unit), so `gunStill` accumulates and the gun sets. The crew
within `FEED_RADIUS` of the gunner halts with him (they feed); crew farther
out close in. The halt ends after 50 ticks without an engageable enemy, and
the order resumes along the kept path. A `move` order, a `withdraw` or a
`flee` never halts. New optional `MutableUnit` fields (`gunHalt?`,
`gunIdleTicks?`) are hashed only when present, so units without a gun hash
as today.

Alternatives: have the player's orders panel issue "halt" automatically
(view deciding sim behaviour; rejected); let the gun fire on the move
(contradicts the spec and the period); a "support by fire" order of its own
(more UI; can come later on top of this rule).

### D3. Audio: per-weapon outputs, scheduled per round, own voice budget

`GunshotOutput.play` gains a sound key (`rifle`, `automatic`, `machine-gun`)
and a start delay. `ShotAudio.handleEvent` keys the sound by the shooter's
weapon kind, which it reads from the frame's unit snapshot (`weaponId`) via
the listener (add `weaponOf(unitId)` beside `factionOf`). Every round of
automatic fire plays; its delay inside the frame is
`(event.tick - frame's first tick) * 0.1 s / speed`, so rounds that arrive
together at speed 4 or 8 are still spread. A burst holds one voice of an
automatic-fire budget (2 voices) from its first round until 300 ms after its
last; rifle voices keep their own cap of 4. The bolt plays only for aimed
fire of a `bolt-rifle`.

The machine-gun and automatic-rifle reports are synthesized at unlock, like
the fallback gunshot: a short (≈90 ms) sharp crack with a low thump and a
quick decay, the gun's lower and heavier, the automatic rifle's higher and
lighter; per-round pitch from `shotRate(key)`. The synthesis uses a fixed
noise seed (a small LCG), so the buffers are the same on every run and can be
unit-tested. Registered in `docs/assets.md` as Prestes project, CC-BY-4.0.
A later recording by the owner can replace a buffer without a spec change.

(Apply, 2026-11-09: the user could not tell the gun by ear. Its report gained
a deeper boom and a metallic clack of the action 45 ms after each round, and
its rounds play 1.5 times as loud as a rifle's at an almost steady pitch, a
quarter of the rifle's spread, so a burst is a regular mechanical rattle.)

Alternatives: one long burst sample on `burstStart` (the view does not know
the burst length, and a cut-off burst would sound wrong); public-domain
recordings (provenance work, out of scope; the user can supply one later).

### D4. Tracers: camera-facing ribbons with a pixel floor, styled per weapon

Replace the 1 px `LineSegments` with a ribbon mesh (two triangles per
segment, expanded in the vertex shader perpendicular to the view direction).
Width in metres = `max(styleWidth, minPixels * metresPerPixel)`, with
`metresPerPixel` from the rig's span (as markers and characters already
use). Styles by weapon kind:

| Kind | Streak | Speed | Width | Head colour | Every round |
| --- | --- | --- | --- | --- | --- |
| aimed rifle / pistol | 8 m | 150 m/s | 1 render px | pale straw | n/a |
| automatic rifle | 10 m | 165 m/s | 1 render px | amber | yes |
| machine gun | 13 m | 180 m/s | 1 render px | red-orange, less fade | yes |

(Apply, 2026-11-09: the first widths, 1 / 1.5 / 2 px, were too thick for the
user, then 0.7 / 0.85 / 1 px still read thick and the gun was not told apart.
One render pixel is the thinnest line that does not break up in the
low-resolution target, and the thickness came mostly from the post's bloom
halo round heads above its 0.85 threshold. So every tracer is one render
pixel with its head under the threshold, longer and faster, and the gun is
told apart by hue, length and its stream of rounds.)

`MAX_TRACERS` rises to 160 (one belt burst is 6; the 3 vs 3 peak is 8 shots
a tick), in one buffer. Smoke spawns on `burstStart !== false` only; the
flash stays per round. The unseen-fire marker rule (fog-of-war) is kept: a
tracer of an unseen shooter starts at his "?".

Alternatives: `Line2`/`LineMaterial` from three/examples (adds a dependency
and a resolution uniform; the ribbon is ~80 lines); screen-space post bloom
(costly, blurs the pixel look).

### D5. Gun state in the snapshot

`UnitSnapshot` gains an optional `gun?: { state: 'moving' | 'setting' | 'set';
setupLeft: number }` for the gunner only, built in `snapshot.ts` from
`gunStill` and the path. The weapon card shows it with locale keys
`hud.gun.moving|setting|set|noGunner` in PT-BR and EN. Not hashed (derived).

### D6. Report figures

`battleReport` returns `weapons: Record<'column'|'legalist', Record<WeaponId,
{ rounds; bursts; hits }>>` and `gunSetShare` per side (ticks set with a
target / ticks with a target). The band test asserts ≥ 0.70 for the player's
gun in the mixed presets.

### D7. Apply findings (2026-11-09)

- The whole gun squad (the 4-man crew) halts with the gunner, rather than only
  the men within `FEED_RADIUS`: simpler and what the spec says ("the crew").
- Target flicker: `acquireTargets` counted the shooter himself among the men
  on his current target (25 points, above the 20-point hysteresis), so a lone
  gunner swapped between like targets every tick and each swap drew a fresh
  reaction delay; at 130 m on three targets the gun never fired. Fixed for
  belt weapons only (`currentEngaged`), so the 3 x 11 golden is unchanged. The
  same swap hits rifles (about 9% of their targeted ticks in a 3 x 11 run); a
  general fix moves every golden and is left to the user.
- The report's "has a target" counts only a target in sight and reach: an
  attack keeps its objective out of sight, and the gun walking toward it is
  not a gun failing to set.

## Risks / Trade-offs

- [The halt freezes an attack: the gun stops far behind and the riflemen go
  on alone] → that is the intended support by fire; the 5 s resume keeps the
  gun moving once the enemy is gone; measured by the report.
- [140 m on side sightings makes the gun much stronger] → hit chance falls
  with range (rangeFactor) and per round (×0.5); watch shots per casualty and
  battle time in the bands; tune only if bands fail, with a task note.
- [Per-round sound floods at speed 8] → automatic budget of 2 voices and
  per-burst holding; rounds beyond the budget are dropped, not queued.
- [Ribbon tracers cost more] → at most 160 quads in one draw call; check the
  `performance.spec.ts` budget.
- [Goldens change] → only for rosters with a gun; regenerate the mixed-roster
  golden deliberately, keep the 3 × 11 golden byte-identical (verify).
- [Base drift] → this change is written in a worktree whose branch predates
  the 2026-11-09 archive; apply it on top of the committed archive work.

## Migration Plan

No save migration: the new unit fields are optional and absent for every
unit without a gun. Roll back by reverting the change; the mixed-roster
golden returns with it.
