# Battle map review

The per-map review of the battle maps (`refine-battle-maps`, design section 7).
Each item has a status: **fix** (to change, with its owner task), **keep**
(checked and intended) or **log** (known, deferred, with where it is tracked).
The probe tables come from `pnpm exec tsx tools/map-review.ts`.

## Carried over from `add-battle-maps`

`add-battle-maps` was archived on 2026-11-08 with these items still open; they
are tracked here until they land.

| Item | Status | Owner |
| --- | --- | --- |
| Archive `fog-of-war` after the owner's hand check (fog-of-war 4.2) | log | owner hand check, then archive |
| Fazenda kit in Blender (casa-sede, colonist house, engenho, corral, coffee row, crop clumps, wire fence) | log | later Blender pass; placeholders improved by refine-battle-maps 5.1, 5.2 |
| Serra e Rio kit in Blender (wooden bridge, ferry and landings, buriti, cerrado tree, outcrop, capim clump) | log | later Blender pass; banks and ford by refine-battle-maps 5.4, 5.10 |
| Bairro kit in Blender (terraced houses, factory, church, tram rails, gas lamp, barricade, embankment) | log | later Blender pass; placeholders by refine-battle-maps 5.1, 5.2 |
| Battles on each map end with an outcome (no length band since 2026-11-08); 3 ms a tick | fix (done 2026-11-08) | refine-battle-maps 2.1, 2.2; 3.1, 3.3 (`pnpm check:budget`) |
| Owner's hand check: one 3v3 on each map | log | refine-battle-maps 7.2 |

## Findings (2026-11-08)

From the probes below, the battle reports and the known items in the
`refine-battle-maps` design.

| Map | Item | Status | Owner |
| --- | --- | --- | --- |
| Vila Militar | Longest open stretch on the attack axis 102 m (lane -40 m; lane -20 m 62 m), over the 60 m line | keep | training ground; open by design; not one of 5.7's maps |
| Fazenda | Open stretches of 134 to 146 m on every lane of the attack axis. Fixed: a broken field wall across midfield, carts, haystack, woodpile, fallen log, trough and stone pile; longest now 42 m | fix (done 2026-11-08) | 5.7; test "Fazenda is no longer open" |
| Fazenda | West legalist bays 18 m from the cane's corner: a crouched man in the cane is seen only within 6 m, so the edge is not a free kill from range; up close it is the point | log | owner hand check 7.2 |
| Fazenda | Coffee rows walling in the north-east grove | keep | flood fill reaches every walkable cell |
| Fazenda | Road ditches: main road both sides, branch roads north side; trench cover and slots along the floor | fix (done 2026-11-08) | 5.5; tests "cover in the ditch" and "slots along the ditch" |
| Fazenda | Communication trenches 660 to 663 (36 to 40 m) shelter only within 2.2 m of their centres: one long cover, one radius. `trenchRun` (5.5) would cut them into 6 m pieces | log | owner's call; changes the lines' play |
| Fazenda | Corral gate faces the trench: the corral (x 150 to 170, y -32 to -60) lies about 105 m east of the nearest legalist bay (x 44); its open north-west corner is no trap, and the flood fill reaches inside | keep | 4.1 |
| Serra e Rio | Open stretches of 142 to 194 m on lanes -40, -20 and +20 m. Fixed: a gully down the west slope (channel and trench cover), fallen trees and boulders along both banks; longest now 58 m | fix (done 2026-11-08) | 5.7; same test |
| Serra e Rio | Capim moved to the river: a 24 m belt on both banks and two veredas with buriti, instead of inland patches; none on the bridge deck. The review flags the capim edge (a crouched man seen at 30 m in every probe): that is the concealment rule (crouched hidden beyond 40 m), not a gap | fix (done 2026-11-08) | 5.11; test "grass by the river" |
| Serra e Rio | Crossings: bridge, ferry and ford approaches 21 to 25 m wide, clear for 3 m, pathable end to end | keep | probe |
| Serra e Rio | Ferry state invisible in the HUD | fix | 5.4 |
| Serra e Rio | Ford reads as deep water | fix | 5.4, 5.10 |
| Serra e Rio | Legalist knoll at (-10, -55) dominates the bridge exit | log | owner hand check 7.2 |
| Serra e Rio | The ford is an axis-aligned box across a diagonal river: its corners show as pale shallows on both banks (5.10 screenshot) | log | owner hand check 7.2; reshaping it is map data |
| Serra e Rio | Ferry raft hidden under the bank at its landings (0.6 m above the water). Fixed: the raft sits on the landing ground when docked, with a pennant pole | fix (done 2026-11-08) | 5.4 |
| Bairro | Every quintal (124 of 124) was closed: the 2 m side passage was shut by the pathfinder's 0.8 m clearance around walls on the 1 m grid; confirmed with `findPath` from the column's deployment. Fixed: the walls between quintais start 2.5 m behind the houses, so each pair of passages opens on a strip that leads into both quintais; 124 of 124 reached | fix (done 2026-11-08) | 4.3; test "every quintal can be reached from the street" |
| Bairro | Lines of fire from both deployment zones to midfield almost all closed (3 % and 1 %): the blocks hide the field; fire runs only down the streets | log | owner hand check 7.2; revisit with 4.3 if the streets play as corridors |
| Bairro | Barricades at y = ±79 on x = ±100 in the side streets | keep | intended: the map closes part of each north-south street ahead of each side's start (4.3) |
| Bairro | Factory yard walls trapping paths | keep | flood fill finds no closed area |
| Bairro | Tram rails across the praça | keep | view only, no effect on movement |
| Bairro | Open praça: longest stretch 70 m before 5.7. Fixed: a cart, barrels and crates on the praça; longest now 26 m. No sack or tram-stop model exists; crates and barrels stand in | fix (done 2026-11-08) | 5.7; same test |
| All | Props out of bounds or over deep water | keep | none found |
| All | Deployment points and cover slots inside a blocker | keep | none found |
| All | Battle reports end with an outcome on seeds 1922, 7, 42 (after 5.7: Fazenda 171 to 262 s, Serra e Rio 392 to 404 s, all victories; Bairro 414 s and 828 s victory, 684 s defeat; at most 5 shots in a tick) | keep | 1.3 tests |

## Probe output (2026-11-08)

Run with `pnpm exec tsx tools/map-review.ts` (all maps) or `--map <id>`.
Re-run after 5.7 (cover clutter); the open-stretch line is now 60 m, the
bound of the test "Fazenda is no longer open".

### vila-militar

| Check | Result | Flag |
| --- | --- | --- |
| Reachability (flood fill) | 100 % of 39249 walkable cells reached; 0 unreachable area(s) > 20 m2 | ok |
| Deployment points walkable | 6 of 6 walkable | ok |
| Cover slots walkable | 480 of 480 walkable (116 of 596 raw slots already dropped by the engine's filter) | ok |
| Crossings | none on this map | ok |
| Lines of fire, column zone | 71 % open (385 of 540 lines to 180 midfield points) | ok |
| Lines of fire, legalist zone | 69 % open (374 of 540 lines to 180 midfield points) | ok |
| Cover density (slots per 50 m cell) | 480 slots; mean 19.2, max 96, 12 of 25 cells empty | ok |
| Open stretches on the attack axis (> 60 m) | longest 102 m over 5 lanes (axis length 180 m) | FLAG |
| Crop edges | no runtime | ok |
| Props in bounds and off deep water | 0 of 0 fine | ok |

#### Flagged

**Open stretches on the attack axis (> 60 m)**

- lane -40 m: 102 m without a slot within 10 m, (-40, 36) to (-40, -66)
- lane -20 m: 62 m without a slot within 10 m, (-20, 70) to (-20, 8)

### fazenda

| Check | Result | Flag |
| --- | --- | --- |
| Reachability (flood fill) | 100 % of 157432 walkable cells reached; 0 unreachable area(s) > 20 m2 | ok |
| Deployment points walkable | 6 of 6 walkable | ok |
| Cover slots walkable | 700 of 700 walkable (120 of 820 raw slots already dropped by the engine's filter) | ok |
| Crossings | none on this map | ok |
| Lines of fire, column zone | 46 % open (497 of 1086 lines to 362 midfield points) | ok |
| Lines of fire, legalist zone | 47 % open (507 of 1086 lines to 362 midfield points) | ok |
| Cover density (slots per 50 m cell) | 700 slots; mean 10.9, max 67, 36 of 64 cells empty | ok |
| Open stretches on the attack axis (> 60 m) | longest 42 m over 5 lanes (axis length 186 m) | ok |
| Crop edge: cane (1 area(s), 14 probes) | seen at 10 m 0 %, 30 m 0 %, 60 m 0 % (crouched concealment 6 m) | ok |
| Crop edge: corn (1 area(s), 12 probes) | seen at 10 m 0 %, 30 m 0 %, 60 m 0 % (crouched concealment 8 m) | ok |
| Crop edge: scrub (1 area(s), 10 probes) | seen at 10 m 100 %, 30 m 0 %, 60 m 0 % (crouched concealment 15 m) | ok |
| Crop edge: tall-grass (2 area(s), 14 probes) | seen at 10 m 100 %, 30 m 92 %, 60 m 0 % (crouched concealment 40 m) | ok |
| Props in bounds and off deep water | 110 of 110 fine | ok |

### serra-rio

| Check | Result | Flag |
| --- | --- | --- |
| Reachability (flood fill) | 100 % of 151973 walkable cells reached; 0 unreachable area(s) > 20 m2 | ok |
| Deployment points walkable | 6 of 6 walkable | ok |
| Cover slots walkable | 369 of 369 walkable (0 of 369 raw slots already dropped by the engine's filter) | ok |
| Crossings (width >= 4 m, clear 3 m, pathable) | 3 crossing(s), 0 flagged; bridge 1 end A: 21.5 m wide, clear; bridge 1 end B: 21.5 m wide, clear; ferry 1 end A: 24.5 m wide, clear; ferry 1 end B: 24.5 m wide, clear; ford 1 end A: 21.0 m wide, clear; ford 1 end B: 21.0 m wide, clear | ok |
| Lines of fire, column zone | 72 % open (621 of 858 lines to 286 midfield points) | ok |
| Lines of fire, legalist zone | 72 % open (616 of 858 lines to 286 midfield points) | ok |
| Cover density (slots per 50 m cell) | 369 slots; mean 5.8, max 30, 36 of 64 cells empty | ok |
| Open stretches on the attack axis (> 60 m) | longest 58 m over 5 lanes (axis length 192 m) | ok |
| Crop edge: scrub (4 area(s), 36 probes) | seen at 10 m 100 %, 30 m 0 %, 60 m 0 % (crouched concealment 15 m) | ok |
| Crop edge: tall-grass (5 area(s), 62 probes) | seen at 10 m 100 %, 30 m 89 %, 60 m 0 % (crouched concealment 40 m) | ok |
| Props in bounds and off deep water | 54 of 54 fine | ok |

### bairro

| Check | Result | Flag |
| --- | --- | --- |
| Reachability (flood fill) | 100 % of 83252 walkable cells reached; 0 unreachable area(s) > 20 m2 | ok |
| Yards (quintais) reachable | 124 of 124 reachable | ok |
| Deployment points walkable | 6 of 6 walkable | ok |
| Cover slots walkable | 4830 of 4830 walkable (2052 of 6882 raw slots already dropped by the engine's filter) | ok |
| Crossings | none on this map | ok |
| Lines of fire, column zone | 3 % open (19 of 744 lines to 248 midfield points) | FLAG |
| Lines of fire, legalist zone | 1 % open (8 of 744 lines to 248 midfield points) | FLAG |
| Cover density (slots per 50 m cell) | 4830 slots; mean 98.6, max 312, 19 of 49 cells empty | ok |
| Open stretches on the attack axis (> 60 m) | longest 26 m over 5 lanes (axis length 182 m) | ok |
| Crop edge: corn (18 area(s), 72 probes) | seen at 10 m 0 %, 30 m 0 %, 60 m 0 % (crouched concealment 8 m) | ok |
| Crop edge: tall-grass (20 area(s), 92 probes) | seen at 10 m 17 %, 30 m 11 %, 60 m 0 % (crouched concealment 40 m) | ok |
| Props in bounds and off deep water | 196 of 196 fine | ok |

#### Flagged

**Lines of fire, column zone**

- column: fully closed (< 10 %)

**Lines of fire, legalist zone**

- legalist: fully closed (< 10 %)

_Ran in 0.4 s._
