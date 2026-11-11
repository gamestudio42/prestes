## Context

- Battle maps are authored map documents (`*.map.json` in
  `packages/shared/src/maps/authored/`, loaded on demand and compiled to
  `BattleMap`); the default is the test map `campo-de-provas`
  (author-game-maps, archived 2026-11-10, removed the hand-written maps). The engine's 3v3 ends in
  `updateOutcome` (`systems/combat.ts`) when a side has no fit soldier.
- The enemy commander (`systems/enemy-commander.ts`) holds its line, sends
  one more section when 1.4:1 ahead, attacks with all but one when quiet for
  30 s, withdraws broken sections, and with nothing known advances on the
  player's deployment centroid. It reads only its side's knowledge (fog).
- The top bar (`apps/game/src/ui/hud/TopBar.tsx`) shows speed and toggles;
  the end panel (`BattleEndPanel`) shows result, time and casualties.
- `refine-battle-maps` plans the decided-battle rule (a side below a fifth
  falls back) and search; this change uses "broken" from it when present.
- `pre-battle-roster` 6.1 found that 9 of 36 headless runs of a mixed
  roster against the enemy presets end without an outcome by 900 s: the
  enemy's first attack fails and stops, and the scripted player waits for a
  1.25:1 count it does not reach (see that change's "Apply findings"). The
  objectives and the time limit here are what make such battles end.

## Goals / Non-Goals

**Goals:** objectives as data, deterministic capture, a battle clock with
victory by value, flags and HUD strip, an enemy commander that plays the
objectives, end panel details, battle report and goldens.

**Non-Goals:** reinforcements or points from objectives, supply, artillery
on objectives, multiplayer.

## Decisions

### 1. Data

```ts
interface Objective {
  id: string; nameKey: MessageKey;
  area: { circle: { x: number; y: number; r: number } } | { polygon: Polygon };
  flag: Vec2; value: 1 | 2 | 3;
  initial: 'neutral' | 'column' | 'legalist';
}
// BattleMap gains: objectives: Objective[]
```

Objectives live in the map document (version 5); authors place them with
the editor's objective tool. The test map's first five (positions in the
map's frame; north is the legalist side; the river runs east-west at
y ≈ 4-8, the column deploys at y ≈ 95, the legalists at y ≈ -75):

| Map | Objective | Where | Value | Initial |
| --- | --- | --- | --- | --- |
| campo-de-provas | Ponte | bridge (60, 7) r 16 | 2 | neutral |
| campo-de-provas | Vau | ford (-56, 4) r 16 | 2 | neutral |
| campo-de-provas | Igreja | church and tower (70, -40) r 18 | 3 | legalist |
| campo-de-provas | Trincheira | fire trench (-45, -55) r 18 | 1 | legalist |
| campo-de-provas | Casario | houses and sobrado (-30, 60) r 20 | 1 | column |

The column must cross the river (bridge or ford) to reach the church, the
highest value, so the battle cannot be won by standing off.

Values are tuned by the battle report; positions are checked by the content
check (reachable, no overlap, not in deep water, not inside a building's
footprint except the flag).

### 2. Capture system

`systems/objectives.ts`, run every tick after movement and before outcome:

- `presence[obj][side]` = fit, not routed, not incapacitated, not garrisoned
  (see `garrison-and-assault`) soldiers inside the area. Garrisoned soldiers
  in a building whose footprint lies in the area DO count (a held house
  holds its objective).
- If one side present and the other not: `progress[obj][side] += 1`, the
  other's progress reset; at 100 ticks the owner becomes that side and the
  event `objective_taken { id, side, tick }` is emitted.
- Both present: contested; progress frozen; event on the first tick of a
  contest (`objective_contested`) for the HUD.
- None: progress decays by 2 a tick.
- State: `objectives: Array<{ id, owner, progress: { column, legalist },
  contested }>` in the engine, hashed, sent in the frame.

### 3. Clock and outcome

- `timeLimitTicks` from the start request (9000, 12000 or 18000; default
  12000); the frame carries `clock: { tick, limit }`.
- `allHeldSince[side]`: the tick a side came to hold every objective; ends
  after 1200 ticks.
- Outcome order each tick: annihilation → broken (if the rule exists) →
  all held 2 min → time limit by value → draw. The end event gains
  `decidedBy: 'annihilation' | 'broken' | 'all-objectives' | 'objectives' |
  'draw'` and the objective summary.
- `Outcome` gains `'draw'`.
- Maps without objectives (none after this change) keep today's rule.

### 4. The commander

Adds goals to `commandLegalists`:

- **Garrison**: for each held objective of value ≥ 2, the nearest idle
  section is assigned `defend` at the objective (once; reassigned if it
  breaks).
- **Attack**: attacking sections target the objective of highest value not
  held (ties: nearest to the section, then id), instead of the deployment
  centroid; on sight they attack as today.
- **Retake**: on `objective_taken` by the player, the nearest non-garrison
  section is sent within 60 s.
- **Last minutes**: with < 1800 ticks left and less value held, all but one
  section attack.
- Knowledge: objectives and owners are public; who holds them follows fog.

### 5. View and HUD

- `ObjectiveLayer` (view3d): a flagpole model (placeholder: pole and
  cloth plane with a two-frame wave), cloth colour by owner from the
  palette (neutral off-white, column khaki with a red band, legalist blue),
  an area outline decal at tactical span, a progress ring at the base.
- Top bar: `ObjectiveStrip` with an icon per objective (initial letter of
  its name in a period badge), owner colour, value pips, contested pulse;
  hover tooltip with the localized name and value; the clock (mm:ss left).
- Skirmish setup screen (`pre-battle-roster`), map column: the time-limit
  choice (15 / 20 / 30 min, saved with the other choices); over the chosen
  map's preview, each objective's flag in its initial owner's colour, and
  a list of the objectives (name, value, initial owner), so the player
  builds his force knowing what he must take and hold (user, 2026-11-08:
  the objectives drive the choice of troops).
- End panel: decided-by line, a table of objectives (name, owner, value)
  and total value per side.

### 6. Battle report and goldens

The report gains `decidedBy`, objectives held at the end, and the time of
each capture; feel bands: battles end within the limit on every map and
seed; the player's scripted counterattack targets the highest-value
objective not held. Goldens are re-recorded (objective state is hashed);
the reason is logged.

### Historical method

No historical claim: objectives are game devices placed on the maps'
fictional landmarks. Names are period place words (ponte, vau, igreja, casa-sede, engenho,
vau, praça, matriz).

## Risks / Trade-offs

- [Battles turn into flag races] → values favour the central, defensible
  places; holding needs men present against contests; the report watches
  casualties per capture.
- [The AI camps on objectives] → only value ≥ 2 objectives get a garrison
  section; the rest attack.
- [Fog leaks through the strip] → the strip shows ownership and contest
  only, never units.
- [Draws feel flat] → the end panel explains the values; a later change may
  add tie-breaks (casualties).

## Migration Plan

All maps gain objectives; the default battle now ends by the clock at the
latest. Goldens re-recorded. No saved data.

## Open Questions

- Whether the player may choose "annihilation only" (no objectives) on the
  skirmish setup screen; deferrable, a flag in the start request.
