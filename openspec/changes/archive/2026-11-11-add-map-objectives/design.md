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

## Apply findings

- 2.3 (2026-11-10): `updateOutcome` now runs the full order for maps with
  objectives (a side that fell back, no fit soldier, every objective held for
  2 min, the time limit by value, a draw) and records `decidedBy` and the
  final `values` on the outcome event. `ObjectiveState` gained `value`;
  `objectiveValues(ctx)` totals it per side. The clock is
  `tickCount - battleStartTick`, `battleStartTick` set by `start_battle`, and
  the frame carries `clock` on maps with objectives (not hashed: it derives
  from the tick). Reading of the spec: a side that fell back reports
  `broken` even though its last fit men also rout and the design's
  annihilation-first order would name `annihilation`; with the literal order
  `broken` could never be reported. All-held counts the tick it was first
  seen as the first of its 1200 (the capture progress convention). Tests in
  `objectives-outcome.test.ts` (7: time limit, all held, loss restarts it,
  draw, broken, annihilation without objectives, the frame clock);
  simulation 315/315;   `pnpm check:determinism` unchanged (the 1000-tick runs
  end before an objective outcome); eslint clean. Maps without objectives
  keep the annihilation rule and carry no clock.
- 2.4 (2026-11-10): the commander plays the objectives. `ObjectiveState` carries
  `flag`; `attackObjective` replaces the deployment-centroid fallback (after
  the search areas) with the highest-value objective the legalists do not
  hold (ties nearest, then id), using public ownership only. Guards: each held
  value-2+ objective gets the nearest idle section, defending at its flag
  (plan `hold-objective`); a broken guard withdraws and is replaced. Retake:
  the commander watches owners, not events, because objective capture runs
  after it in the tick; within 60 s the nearest free section is sent.
  Last minutes (< 1800 ticks, less value): all attack but one, keeping a
  garrisoned section if there is one (it cannot be ordered out mid-fight),
  else the weakest. Reading of the spec: only a free section is sent to
  retake (a guard or a garrison is not pulled off its job, as the design's
  "nearest non-garrison section" says). Tests in `objectives-commander.test.ts`
  (4); two battle-feel commander tests updated (the guard is not held to the
  line's cover; he can spare one section to search). Simulation 319/319.
  Seen: the report tests under `tests/simulation` now end `none` at their
  900 s cap: the default 20-min clock is past the cap and the scripted player
  does not play the objectives. 4.1 gives the report a limit and the bands.
- 2.5 (2026-11-10): goldens re-recorded for the commander change (campo-de-provas
  `b3e2538f`, mixed `9fa6a458`, paiolzinho unchanged); reason logged in
  `tools/determinism-golden.json`.
- 2.6 (2026-11-10): the clock and the capture already waited for
  `battle_started`; a test now holds that (frame clock 0 through the phase,
  capture progress 0). The commander's deployment anchors now include the
  objectives it holds with value 2 or more, scored above cover. The anchor is
  not the raw flag: the test map's church flag stands on the church 5 m
  outside the default deployment area, so it is walked toward the area's
  middle until it is inside, clear of the boundary (3 m, so the section's
  line fits) and clear of the building footprint; it lands on the deployment
  edge 18 m from the flag, inside the objective circle. The golden runs open
  no deployment, so `pnpm check:determinism` is unchanged. Simulation
  321/321.
- 4.1 (2026-11-10, user: "nos testes que vc fizer o jogador precisa ter
  objetivos"): the report's script counterattacks once it outnumbers the
  enemy or holds less objective value, and sends the whole force to the
  objective of most value it does not hold (ties nearest to the column
  centroid, then id); the enemy's line only when it holds them all. The
  report runs its own 15-minute clock so every battle ends, and gains
  `decidedBy` and the objectives (owner, value, capture time). The bands move
  to "ends within the 15-minute limit" (was 3-10 min) and "no silence over
  120 s" (was 75: a section may march to a far objective out of range),
  through a MODIFIED battle-lab "Battle feel report" delta. The weapons
  test's stand-off exemption is gone: presets A, B and C all hold the gun's
  bands. Report tests 13/13 (battle-feel 3, battle-maps 6 including the enemy
  deployed, weapons 4); tests/simulation 19/19 with preview-cost.
- 3.1 (2026-11-10): `ObjectiveLayer` draws a `placeholder:flag` per objective: a
  7 m pole with a cloth in the owner's colour (off-white neutral, the column's
  khaki with a red band, the legalist blue), stepping between two wave angles;
  a draped area outline at tactical zoom; a capture ring filling with the
  taking side's progress. A flag whose point lies in a building footprint
  stands on its roof (the church), so it is not hidden inside. `InterpolatedFrame`
  carries the objectives and the clock now (the view reads them; 3.2 needs the
  clock). Screenshots reviewed on the test map (church, bridge, houses);
  `paiolzinho` has no objectives yet (`check:maps` warns), so nothing to
  review there.
- 3.2/3.3/3.4 (2026-11-10): the HUD gets the objective names and values in the
  frame (`ObjectiveSnapshot.value` and `name`), so the strip, the setup screen
  and the end panel all read one source. The top bar draws the objective strip
  (initial, owner colour, value pips, contested pulse, localized tooltip) and
  the mm:ss clock. The setup screen saves a 15/20/30-minute `timeLimit` with
  the other choices and shows the field's objectives over its preview from the
  map bounds; the limit reaches the worker through `GameClientOptions`.
  The end panel shows draw, the decided-by line (annihilation, broken, all
  objectives, the limit, draw), the values and the objectives table. E2e:
  owner change through the strip, localised tooltip, 15:00 clock, five
  objectives and flags before the battle, and a battle ended on the clock with
  the objectives table.
- 4.2 (2026-11-10): gates. The objectives' `value` and `name` are static map data,
  so the engine now hashes only the capture state (`objectiveHashState`); the
  goldens remain `b3e2538f`/`9fa6a458`. The worker bundle grew to 203,395 B for
  the objectives code, so its budget is 210,000 B. `pnpm verify` passes every
  step except `pnpm e2e` (125/127): the desk label-gap test fails at the
  change's base too (checked in a clean worktree at `6412ac9`), and the
  tactical tooltip test is a hover flake (passes alone). The preview-cost test
  needs the documented `PRESTES_PREVIEW_GUARD=2` on this machine under the
  full parallel run (≈2.9 ms vs 2 ms alone), a load effect, not a regression.

