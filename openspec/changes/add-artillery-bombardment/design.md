## Context

Battle events (`packages/shared/src/maps/events.ts`, run by
`packages/simulation/src/systems/battle-events.ts`) fire once on a trigger
and run up to four actions: troops, posture, card. The engine runs them
after objectives and casualties, before the outcome, and hashes their state
only on maps that have events. Small-arms fire lives in `combat.ts`: a hit
goes through `applyHit` (damage, wound or death drawn from `ctx.rng`,
morale for comrades within 12 m), suppression and morale scale by
`suppressionDivisor` and `unitValues`. Cover is `coverAgainst(x, y, threatX,
threatY, stance, covers)` in `packages/shared/src/world.ts` (stance 0 /
0.25 / 0.5 plus the best wall crossed, a fire trench only from its front,
capped at 0.75); a garrison has `garrisonCover`. Covers are a plain array
the engine owns; the cover index and the frame/hash cover caches are keyed
on count plus first and last object, so appending a cover invalidates them.
The view gets covers in each frame and sim events (`shot`, `unit_hit`...)
for effects and sound. `field-gun-75` is a catalog prop only.

## Goals / Non-Goals

**Goals:**
- One new event action, deterministic end to end, reusing the hit, wound
  and morale rules of small arms so artillery casualties look like the
  rest of the game (rescue, carry, routing all unchanged).
- Zero effect on battles without a bombardment: no RNG draw, no hash field.
- A presentation that sells the shell (whistle, burst, shake) with the
  existing particle and audio paths.

**Non-Goals:**
- Guns as simulated units, counter-battery, player-called fire, aircraft,
  destruction of walls and buildings, fire. A placed `field-gun-75` as the
  source is deferred (see Open Questions).

## Decisions

### D1. Data: one action kind, no document version bump

```ts
type GunId = 'field-75' | 'howitzer-105';
type BombardmentTarget = { kind: 'area'; area: number } | { kind: 'enemy' };
{ kind: 'bombardment'; side: EventSide; gun: GunId; target: BombardmentTarget;
  perMinute: number; spread: number; until: { seconds: number } | { event: number } }
```

`until` reuses the posture action's shape, so the editor's duration control
and the "until event" check are shared. Ranges live beside the other
constants: `BOMBARD_RATE {1,30}`, `BOMBARD_SPREAD {5,60}`,
`BOMBARD_SECONDS {10,600}`; `compileAction` clamps and rounds them. The
action is additive in the `EventAction` union, so document version 9 stays:
an older build would reject a map using it in its shape check, which is
acceptable for a local, single-owner project. Alternative considered: a
separate `bombardments` list on the map; rejected, it would duplicate the
trigger and delay machinery.

### D2. Simulation: a new `artillery.ts` system, driven by battle events

`ScriptedState` gains `bombardments: ActiveBombardment[]` (event id, side,
gun, target, spread, interval ticks, `nextTick`, `endsAt` or `untilEvent`)
and `shells: PendingShell[]` (gun, x, y, `landsAt`, side). `fire()` in
`battle-events.ts` pushes a bombardment with `nextTick = tick` (dropping the
oldest past 4). Engine order: `updateArtillery(ctx, tick, events)` runs
right after `updateBattleEvents`, so a bombardment fired this tick
announces its first shell on the same tick and an `until` event that fired
this tick ends it before another shell is announced. Each tick:

1. End bombardments whose `endsAt` passed or whose `untilEvent` fired.
2. For each bombardment in event-id order with `nextTick <= tick`: pick the
   aim point (area middle, or an enemy as in D4), draw the offset (`r =
   spread * sqrt(u1)`, `θ = 2π u2`), round to 0.01 m, clamp to bounds, push
   a shell landing at `tick + 20`, emit `shell_incoming`; then `nextTick +=
   round(interval * (0.75 + 0.5 * u3))` with `interval = 600 / perMinute`.
3. Land shells with `landsAt <= tick` in push order (D3).

All draws go through `ctx.rng` in that fixed order. Nothing runs (and no
draw happens) when both lists are empty. Both lists are added to
`scriptedHashState`, so they are hashed only on maps with events, and
empty lists on a map with events but no bombardment are omitted from the
hash object so those goldens hold too.

### D3. Impact resolution

For each unit in `ctx.units` order (ascending id), alive, not
incapacitated, not a dummy, `d` = distance to the burst:

- `protection = min(0.8, max(coverAgainst(unit, burst, stance, covers),
  inTrench && d > 1.5 ? 0.8 : 0, garrisonCover ?? 0))`. `inTrench` is a
  cover of kind `trench` whose footprint contains the man (the existing
  `isPointInCover`), whatever its facing: a trench is a hole against a
  burst, not a parapet. `coverAgainst`'s close-quarters factor applies as
  is (a wall 3 m from a burst helps a third); that is intended.
- Within the wounding radius: `p = d <= lethal ? 0.85 : 0.85 - 0.75 *
  (d - lethal) / (wound - lethal)`, times `1 - protection`; one draw. On a
  hit, damage `60 + floor(u * 41)` in the core or `20 + floor(u * 36)` in
  the ring, applied through a shared `applyDamage(ctx, target, damage,
  moraleDamage, tick, events)` extracted from `combat.ts`'s `applyHit`
  (it already contains the down/dead draw and the comrades' morale), so
  rifle behaviour is byte-identical. Extracting keeps the draw order of
  `applyHit` unchanged.
- Within the suppression radius: `k = 1 - d / suppress`; suppression `+=
  70 * k * (1 - 0.5 * protection) / suppressionDivisor(unit)`; morale `-=
  round(14 * k * (1 - 0.5 * protection) * unitValues(unit).moraleLoss)`.
  No draw. Two bursts at 8 m from a 75 mm (k ≈ 0.73) put an exposed man at
  ~100 suppression: pinned. The constants sit in `artillery.ts` with the
  gun table and are tuned in the playtest.
- `markUnderFire` is not called (there is no shooter to turn to); the
  existing `reactToSuppression` sends pinned men prone.

Emit `shell_impact { tick, gun, x, y, crater?: id }`; `unit_hit`,
`unit_incapacitated`, `unit_died` come from `applyDamage` as for rifles.

### D4. Aiming at the enemy's positions

Candidates are the other side's units, fit and not routed, that the firing
side has in `vision.seen` or in `vision.lastSeen` within 300 ticks, at their
last-known position (current position when seen; all enemies at their
position when `ctx.fog` is off). Sorted by unit id; one draw picks one. No
candidate: no shell this slot, and `nextTick` still advances (no draw for
the offset). This reads the same vision state that already drives fog of
war, so it is deterministic.

### D5. Craters as covers

A new `CoverKind` `'crater'`: `halfWidth = halfDepth = 1.5`, `height 0.5`,
`radius 1.5`, `quality 0.35`, `blocksMovement false`, `blocksSight false`,
no facing. Created on impact when the point is not in water, not inside any
cover footprint, no crater within 3 m, and fewer than 40 exist; id from
`ctx.nextCoverId`. Appending to `ctx.covers` invalidates the cover index and
the frame/hash cover caches by design (they compare count and last object).
Height under 1.2 means standing men get nothing from it (existing rule). For
`seekCover`, cover slots are generated per kind in `cover-slots.ts`; a crater
gets two slots on its rim. Craters are hashed through the existing cover
hash. Craters reach the view through the frame's covers; the cover layer
draws kind `crater` as a decal ring.

### D6. Sim events and protocol

`SimEvent` gains `{ type: 'shell_incoming'; tick; gun; x; y; landsAt }` and
`{ type: 'shell_impact'; tick; gun; x; y; crater?: number }`. The worker
already forwards every tick's events (`runTicks` merges them), so a whistle
announced on a skipped tick still reaches the view.

### D7. View: burst, crater, shake

`effects-layer.ts` gets `burst(x, y, gun)`: one bright `muzzle` sprite
scaled up (flash, 0.1 s), 10–16 `dust` particles in a rising column tinted
by `terrainSurfaceAt`, 6–10 `smoke` particles slower and longer-lived,
8–12 `splinter` debris on ballistic arcs. Particle randomness in the view
uses a small local seeded generator keyed on the shell's tick and position,
never `Math.random` in a way that matters (the view is not hashed, but this
keeps replays identical to watch). The 105 mm burst is ~1.4x. The capacity
of 512 particles is enough for a few bursts a second; if saturated, oldest
particles are recycled (existing behaviour). Shake: `camera-rig.ts` gets
`kick(strength)`, a decaying offset (≈0.35 s, damped sine) added to the
rendered camera position only, never to the rig's target, so panning and
saved views are untouched. Strength `max(0, 1 - (dist - 20) / 100)` scaled
by gun.

Fog of war: bursts are always shown (the player hears the guns anywhere);
hit markers on men out of sight follow the existing `unit_hit` fog rules.

### D8. Audio

`ShotAudio.ts`/`sound-bank.ts` gain `artilleryWhistle` (one CC0 recording,
trimmed so its last 2 s lead into silence; played with its end on the
impact time, starting late into the clip if the event arrived late) and
`artilleryBurstNear` ×2, `artilleryBurstFar` ×2, chosen by `(x * 31 + y *
17 + tick) % n`. Distance gain and the 250 m whistle cutoff use the
existing listener position. Sources: Freesound CC0 searches ("artillery
whistle", "shell incoming", "explosion distant", "cannon boom"), cut with
`tools/cut-audio-sources.ts`, credited in `docs/assets.md` under a new
"Artillery" table. If no fitting CC0 whistle is found, the whistle is a
synthesized descending tone (Web Audio oscillator) and is named as a
placeholder in `docs/assets.md`.

### D9. Editor

`EventsPanel.tsx` adds the action to the action-kind select; fields reuse
the existing side select, area-place select and the posture's duration
control (mm:ss / until event). Rate and spread are number inputs with the
ranges. The summary line comes from `events.ts` (editor) like the others.
The viewport highlights the target area and draws a ring of `spread`
around its middle when the event is selected. `validate-events.ts` adds the
checks; deleting an area or event already asks via the existing
"used by" lookup, which gains the bombardment references. Locales in
`editor-en.ts` / `editor-pt-BR.ts`.

### D10. Simulation/presentation boundary and content

The simulation emits only data (gun id, point, tick); it imports nothing
from Three.js, the DOM or audio. The view and audio own every visual and
sound decision. No new 3D models: the burst is sprites from the existing
`effects.png`; the crater is a flat decal drawn by the cover layer. Map
content authors use the action in map JSON (`events[].actions[]`) as in
D1; the guide `docs/maps/EVENTOS_DE_BATALHA.md` gains a section in PT-BR.

### D11. Historical method

The mechanism cites `docs/history/TIMELINE.md` (1924-07-11/28, the
bombardment of São Paulo, `cohen-2007`, `fapesp-2007`, `macaulay-1974` ch.
I) and `docs/history/WEAPONS.md` (75 mm, 105 mm, Macaulay pp. 85, 93). The
Column itself had no artillery in 1925 (`FORCES.md`, p. 113), so the
"Column" side exists for the 1924 rebels in São Paulo and Paraná, who did
have guns, and for dramatized or fictional maps; each map's mission file
labels its bombardments. No figure roster changes.

## Risks / Trade-offs

- [Balance: shells wipe sections] → radii and chances are constants in one
  table, tuned in the playtest with the owner; trenches cap at 0.8 so dug-in
  defenders survive a long shelling, as at São Paulo and Catanduvas.
- [Hash change on maps with events] → empty artillery lists are omitted
  from the hash object; the determinism check covers the authored maps.
  When the main session adds a bombardment to an authored map, that map's
  golden is re-recorded in the same commit (its owner's step).
- [Crater cover changes pathing or cover index performance] → craters do
  not block movement; at most 40 index rebuilds per battle on town maps
  (each is the same cost as today's map load step for covers).
- [Extracting `applyDamage` from `applyHit` disturbs rifle draws] → the
  extraction keeps the draw order; the existing goldens prove it.
- [No good CC0 whistle] → synthesized placeholder, named as such.
- [Shake annoys] → short and distance-limited; a later setting could turn
  it off (not in this change).

## Migration Plan

Additive. No document version change; maps without the action behave and
hash exactly as before. Rollback is removing the action kind; maps using it
would fail the shape check and must drop it.

## Open Questions

- A placed `field-gun-75` (or a new standing gun object) as the visible
  source on a side: the shell's whistle direction, muzzle flash and boom at
  the gun, and the bombardment stopping when the gun's crew is gone. Deferred
  to a follow-up change once the owner has played the off-map version.
- Whether the owner wants a short HUD notice ("Artilharia inimiga!") on the
  first shell, beyond the whistle; left out (an event card can do it).
