## Context

State after `add-battle-maps` (commit f0672f2):

- Battle report (default rosters, 900 s cap): Fazenda ends in 4-5 min; Serra e
  Rio and Bairro never end: 5-8 enemies left fit, silences of 4-10 min, the
  last ones hidden in scrub, quintais or across the river.
- The enemy commander (`systems/enemy-commander.ts`) attacks when quiet for
  30 s (`QUIET_TICKS`) toward the nearest known enemy, unseen-fire marker or
  contact, else the player's deployment centroid. Sections that met the enemy
  and lost contact for 10 s advance on the last known position
  (`closeOnLostContact`). Nobody searches beyond that point.
- Rout exists per soldier (`checkRouted`, panic → routed, flee to the map
  edge). `updateOutcome` ends the battle when one side has no fit soldier.
- Bench: Fazenda 1.9 ms, Serra e Rio 1.8 ms, Bairro 3.9 ms a tick. The
  profile of Bairro: covers along sight lines (cover index), cover slots
  (`cachedCoverSlots` / `maintainSlots`), rush path searches, hash.
- View: battle maps use `BattleMapLayer` placeholders; walls (`low-wall`
  covers) are drawn by `CoverLayer` as stone blocks; fences as post and rail
  props; trench bays only as cover meshes on a flat heightfield; the camera
  opens at the player's deployment centroid minus 40 m at strategic span.

## Goals / Non-Goals

**Goals:** fights that end on every map; a searching commander that only
uses what it knows; all maps under 3 ms; placeholders that read as period
Brazil; a start view that orients the player; previews in the menu; a
recorded per-map review with fixes.

**Non-Goals:** Blender kits, new maps, weather, night, minimap, destructible
scenery, a roster (see `pre-battle-roster`).

## Decisions

### 1. Decided battle and fall-back

In `updateBattleFlow`, per side: `broken = fit < 0.2 x startStrength`. When
`broken` and the side's last contact is older than 600 ticks, every fit
soldier of that side gets `routed` with a path to the nearest point of its
own map edge (its deployment side: the edge beyond its zone). The existing
outcome rule then ends the battle when none is fit. For the player's side
the same rule applies (a defeat). Events: `side_fell_back { side }`, which
the end panel and the audio read.

Rejected: ending at a fixed timer (silly for the player), or forcing a
surrender with no in-world motion.

### 2. Search

A side's `Knowledge` (fog of war) already holds known enemies, unseen-fire
markers and contacts. Add `searchAreas(side)`: ordered list built when
nothing is known for 30 s:

1. the last known positions (seen, heard, contacts) not yet swept;
2. vegetation cells, enclosed yards (a map's `yards` polygons, new data:
   the Bairro's quintais) and crossing ends within 60 m of those;
3. the enemy's deployment zone.

Idle sections get `advance` to the next unswept area; an area is swept when
a fit soldier of the side passed within 8 m of its centre (vegetation: of
each 20 m cell). Sections attack on sight as today. Deterministic order:
by distance from the section, ties by area id. No area that the side never
saw or heard near is added (the "no cheating" scenario).

### 3. Performance plan for Bairro (3.9 → < 3 ms)

Measured hot spots and the fix for each, in order, re-profiling after each:

1. `cachedCoverSlots`: slots are recomputed from all ~430 covers whenever
   the cover array identity changes; cache by the `sameCovers` key and
   index slots by 8 m cell.
2. `maintainSlots` / `slotById`: map lookups instead of scans.
3. Sight lines: buildings and walls are static; precompute, per 8 m cell,
   which covers block sight above 1.0 m, and test only those.
4. Hash: the cover digest is already cached; the unit JSON stays.

The bench gains per-map lines; the budget test fails above 3 ms (mean of
two runs).

### 4. Placeholder kits

In `battle-map-layer.ts` and `cover-layer.ts`, battle maps only:

- `low-wall` with height ≥ 1.6 on a battle map → plastered wall: a box in
  `PALETTE.plaster` with a darker coping strip and a base strip; walls of
  the factory yard in brick.
- `fence` covers → a board fence for the Bairro (vertical boards, gaps),
  wire and posts for the Fazenda (the map's `fenceStyle: 'boards' |
  'wire'`).
- Houses (`casa-terrea`): a door on the street face, one or two windows,
  a tile roof with eaves; colours drawn from a period palette per lot seed.
- `venda` / `armazem`: wider door, an awning box, a plain signboard (no
  text); `sobrado`: two rows of windows and a balcony strip.
- `church`: a façade wider than the nave, a tower with a pyramid cap;
  `coreto`: an octagonal platform, posts and a roof.
- Fazenda trench bays: `cut` height shapes under each bay (1.1 m deep) so
  soldiers stand below ground; the heightfield gains a 1 m resolution patch
  under the trench lines only (a `detail` box in the map with its own grid).
- Riverbanks: gravel strip and instanced reed clumps along the deep water's
  edge, view only.

### 5. Start view and marks

`SceneView` opens at `TACTICAL_SPAN` on the centroid of squad 1. A
`DeploymentLayer` draws the two zones (ground decals, side colours) with
localized labels ("Sua tropa", "Inimigo") for 10 s, fading. `Home` frames
the map bounds at strategic span (`CameraRig.frame(bounds)`).

### 6. Map previews

`tools/map-previews.ts` runs the view headless in Playwright: for each map,
an orthographic top-down camera over the bounds, pixel post, deployment
zones marked, 256 x 256, saved as `apps/game/public/maps/<id>.webp`.
`pnpm maps:previews` regenerates; the content check fails if a catalog map
has no preview file. The skirmish page shows the image beside each entry
(`alt` from the map name key).

### 7. The per-map review

A scripted walk plus a hand check. For each map, run the headless report
and a set of probes (a tool, `tools/map-review.ts`), and record findings in
`docs/maps/REVIEW.md` with a status per item:

| Check | How |
| --- | --- |
| Every lot, yard and field reachable or deliberately closed | flood fill from each deployment over the walkable grid; list unreachable areas larger than 20 m² |
| No soldier spawn or slot inside a blocker | content check over slots |
| Crossings: approach widths ≥ 4 m, no blocker within 3 m of ends | probe paths through each crossing |
| Lines of fire across each zone | sight matrix 10 m grid zone-to-midfield; flag fully open (> 80 %) or fully closed (< 10 %) corridors |
| Cover density per 50 m cell | count slots; flag open stretches > 100 m without cover on the attack axes |
| Crops' edges and concealment | probe crouched observers at 10/30/60 m from each field edge |
| Props out of bounds or over water | list |
| Battle report per map | outcome, length, longest silence, bunching, casualties per side |

Known items to start the list:

- Fazenda: west legalist bays sit 18 m from the cane's corner (intended,
  check it is not a free kill); coffee rows as hedges may wall in the
  north-east grove (carreador gaps at x = -150 and x = 130 to verify);
  the corral gate faces the trench.
- Serra e Rio: ferry state is invisible in the HUD (add a raft marker and a
  "waiting" icon); the ford reads as deep water (lighter colour, ripple);
  the legalist knoll at (-10, -55) dominates the bridge exit.
- Bairro: some quintais may be closed on all sides (side passage blocked by
  a neighbour's divider); barricades at y = ±79 on x = ±100 sit in the side
  streets; the factory yard walls may trap paths; tram rails cross the
  praça.

Each fix is a data change with a test where a rule is involved; every
change re-records the map's golden with the reason.

## Risks / Trade-offs

- [Rout ends battles too early] → the 20 % threshold and the 60 s of no
  contact; the report's bands decide.
- [Search looks omniscient] → only known areas; a test proves no cheating.
- [A 1 m heightfield patch for trenches costs memory] → only under trench
  lines (two 140 x 10 m patches).
- [Previews drift from maps] → the content check requires one per map; the
  tool is cheap to re-run.

## Migration Plan

Goldens of the three battle maps are re-recorded (decided battles, search,
data fixes); the Vila Militar golden changes only if the search or rout rule
fires there within 1,000 ticks (it does not: first contact is later).

## Open Questions

- The reference machine for the 30 fps view budget: the user's desktop is
  assumed; a lower budget can be added later without changing the specs.
