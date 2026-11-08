## Why

After playing the Fazenda (2026-11-05) the user asked for objectives on the
maps: regions to capture and hold, marked by flags, in the style of the
victory-location wargames (the user named Close Combat as the reference).
Today a 3 vs 3 is won only by destroying the enemy, so open ground is
crossed for no reason and the maps' key places (the casa-sede, the bridge,
the praça) mean nothing to either side.

## What Changes

- **Objectives as map data**: each battle map defines 3 to 5 named
  objectives (an area and a flag point), each with a value, an initial
  owner (the side whose zone it is in, or neutral) and a localized name.
- **Capture and hold**: a side takes an objective when it has fit men inside
  and the enemy has none for 10 s; with men of both sides inside, it is
  contested and does not change hands. Ownership stays until the enemy takes
  it (no need to stay in it).
- **Victory**: the battle has a time limit chosen on the skirmish setup screen (15,
  20 or 30 minutes; default 20). It ends at the limit, or earlier when a
  side holds every objective for 2 minutes, or when a side breaks (the
  decided-battle rule). The winner is the side with more objective value at
  the end; a broken side loses; equal value is a draw.
- **Flags and HUD**: a flagpole in each objective with a cloth in the
  owner's colour (neutral, column, legalist), a capture progress ring while
  it is being taken, and a top-bar strip with each objective, its owner and
  value, and the battle clock. All labels localized.
- **The enemy commander plays the objectives**: it holds its own, attacks
  the nearest neutral or player-held objective of most value, and retakes a
  lost one, within what fog of war lets it know.
- **End panel** shows the objectives held and the value per side.

## Capabilities

### New Capabilities

- `map-objectives`: objective data, capture rules, flags, clock, victory by
  value, the commander's use of objectives, HUD and end panel.

### Modified Capabilities

- `battle-lab`: the battle's end and outcome now come from objectives and
  the clock as well as from destroying the enemy.

## Impact

- `packages/shared/src/maps/*` (objectives per map), protocol (objective
  state and clock in the frame; time limit in the start request),
  `packages/simulation` (capture system, clock, outcome, commander goals),
  `packages/view3d` (flagpoles, capture ring), `apps/game` (time limit on
  the skirmish setup screen's time limit and objectives, objective strip,
  end panel), `packages/content`
  (names, labels), tests, battle report (objectives held, decided by), new
  goldens.
- Depends on `add-battle-maps` (archived) and, for "a side breaks", on the
  decided-battle rule of `refine-battle-maps`; if it lands first, breaking
  is plain annihilation until then.
- **Player fantasy**: a tenente sent to take the engenho and hold the road,
  weighing men against ground.
- **Core loop**: read the objectives, plan, take, hold against the
  counterattack, decide when to push for the last one.
- **Historical scope**: objectives are game devices; their places are the
  maps' fictional landmarks. No historical claim.
- **Multi-perspective**: unchanged.
- **Legal and ethical note**: the mechanic is a genre convention; no rules
  text, art or interface from another game is reproduced.
- **MVP**: objectives on the three battle maps (and two on Vila Militar),
  capture, clock, victory by value, flags, strip, commander goals, end panel.
- **Non-goals**: reinforcements tied to objectives, supply, points bought
  with objectives, a campaign map.
