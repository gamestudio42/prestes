## Context

Each frame (`Frame.units`) carries every soldier of both sides, and the view
draws them all. Soldiers already acquire targets through their own vision:
`visible()` in `systems/combat.ts`, a 120 m range, the 65-degree cone of
`shared/vision.ts` and `isLineBlocked` against covers and sight obstacles.
The enemy commander (`systems/enemy-commander.ts`) counts and locates the
player's soldiers from `ctx.units` directly. Contacts (`ctx.battle.contacts`)
already come from shots and current targets.

## Goals / Non-Goals

**Goals:** per-side vision computed in the simulation; the view hides what
the player's side does not see; faded last-seen silhouettes; "?" markers for
unseen fire; an enemy commander bound by the same fog; fog on in the 3v3,
off in the bootcamp, toggled in the sandbox. Determinism and the
simulation/view boundary hold: vision is simulation state, hiding is the
view's job.

**Non-Goals:** concealment and spotting delays (map kit), hills blocking
sight (terrain relief plugs into the same line-of-sight function), area fire,
hiding information from the developer bridge.

## Decisions

### Vision in the simulation, every other tick

`systems/vision.ts` runs every 2 ticks (0.2 s). For each side and each enemy
soldier, it looks for an observer: a fit soldier of the side within 120 m,
in his cone or within 15 m, with a clear line. It stops at the first
observer found. Observers are sorted by distance through a coarse 20 m grid,
so most enemies are settled by a near observer. The result is
`ctx.seen: Record<'column' | 'legalist', Set<number>>` plus
`lastSeen: Map<id, {x, y, tick}>`. The frame gains
`seen: { column: number[]; legalist: number[] }`, sorted ids. Targeting keeps
its own per-soldier `visible()`, since a soldier fires only at a man he sees
himself. The shared set decides what the side knows and what the player is
shown.

Rejected alternative: computing vision in the view. The enemy commander
needs the same knowledge, and both must agree and be deterministic.

### Unseen-fire event

In `fire()`, when the shooter's side is not seen by the target's side, the
shot also emits `unseen_fire { tick, side, shooterSquad, x, y, radius }`. The
position is the shooter's plus an offset drawn from the engine RNG, within
`3 + 0.08 * distance` m. If that side's markers in the last 10 s include one
within 6 m of the shooter, the bound is halved once per such marker, down to
2 m. The event carries the marker, never the shooter's id. The shot event
itself still carries the true source, because the simulation needs it. The
view decides what to show from `seen` and draws the tracer from the marker.

### View: hide, fade, mark

`CharacterLayer` gets a `visible(unitId)` predicate from `SceneView`. With fog
on, it is the player's `seen` set, plus his own soldiers and any enemy seen
down. A unit leaving the set keeps a faded copy (the strategic proxy at 35%
opacity) for 5 s at its last seen position. `EffectsLayer` and the audio take
an unseen shot's origin from the matching `unseen_fire` marker. A new
`MarkerLayer` draws "?" sprites from the effects sheet, fading over 8 s.
Selection and targeting in `apps/game` ignore unseen enemies.

### The commander's knowledge

`enemy-commander.ts` builds a `Knowledge` view per side:
- known enemies: seen now or in the last 30 s, at their last seen position;
- recent unseen-fire markers of the other side;
- the section contacts.

Strength comparison, target choice and the quiet-field attack read only
this. "Nearest fit enemy" becomes "nearest known enemy". With nothing known,
the commander advances toward the other side's deployment line, a fixed map
fact.

### Scope switch

The engine gains `fog: boolean`: on for `battle3v3`, off otherwise, and set
by a sandbox command `{ type: 'fog', enabled }`. When fog is off the frame
still carries `seen`, and the view simply shows everything. "Control both
sides" turns the view's fog off.

### Battle report under fog

The report's scripted player reads only the player's `seen` set and
unseen-fire markers, like a human would. The feel bands must still hold, and
the report adds the time to first sight.

## Risks / Trade-offs

- Cost: the vision pass is up to 33 × 33 line checks per side every 0.2 s.
  The grid and first-observer exit keep it far below that. The headless
  bench is the check: 3v3 tick time stays under 3 ms.
- Battles may lengthen while both sides hold and do not see each other. The
  quiet-field rule still sends the enemy looking, and the feel bands hold it.
- The "?" error must read as useful, not as noise. The hand check decides,
  and the numbers are constants in one place.
