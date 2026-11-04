## Context

The training engine (`training: true`) uses `BOOTCAMP_COVERS` (the sandbox
`COVER_POINTS` plus training covers and `BUILDINGS`), `TRAINING_SIGHT_OBSTACLES`
and `SANDBOX_TERRAIN` on the 240 x 240 m map. Station points live in
`packages/content/src/bootcamp-exercise.ts`; most stations reuse
`ASSEMBLY_POINT` (28,4) and `LINE_POINT` (52,-18). The view builds the same map
for sandbox and training (`world-layer.ts`, `training-layer.ts`).

Movement: `formationSlots` gives one destination per soldier,
`lineFormationSlots` assigns line slots by sorted unit id, `orderSlots` picks
cover slots greedily per soldier, and every soldier runs its own `findPath`.

The client steps the worker every 100 ms by `speed` ticks; speed 1 is labelled
0.5x, 2 is 1x and 4 is 2x, and the default is 1.

## Goals / Non-Goals

**Goals:** a readable course in station order; a section that marches as a body
and takes its positions without crossing; 1x default; the commander's order on
screen next to the commander; determinism kept.

**Non-Goals:** new art style (phase 4), pixel UI (phase 3), new mechanics,
campaign maps.

## Decisions

### Training world as its own data set

`packages/shared/src/training-ground.ts` exports `TRAINING_GROUND`: covers,
buildings, sight obstacles, terrain features, roads and named station areas
(id, centre, radius, label key). The engine uses it when `training` is true; the
sandbox keeps `COVER_POINTS`, `SANDBOX_TERRAIN` and the current buildings. The
view builds the training map from the same data, so simulation and view cannot
drift (the rule `add-cover-slots` set for buildings).

Course (x grows east; the road runs along y = 0; values are a starting layout,
tuned in play):

| Station | Area centre | Contents |
| --- | --- | --- |
| 1 formation | (-95, 0) | parade ground, two barracks blocks north, flagpole |
| 2 fire | (-60, 0) | sandbag firing line at y = 6, earth target butts 40 m north |
| 3 maneuver | (-20, 0) | open field, hedges and low walls, target post north-east |
| 4 defense | (15, 0) | training trench across the road, approach from the east |
| 5 recon | (50, -10) | hamlet: farmhouse, barn, chapel, hedgerows |
| 6 wounded | (50, 20) | aid post tent beside the road |
| 7 final | (90, 0) | assault line: trench and stone walls |

Each station starts with the section on the road at the west edge of its area
and the next station visible down the road. Station points in
`bootcamp-exercise.ts` come from the area table instead of shared constants.

### Section routes

When a move, line move or area order gives several soldiers destinations near
each other (within 15 m of their centroid), the controller:

1. matches soldiers to destinations by minimum total distance, with ties broken
   by id (a small Hungarian assignment; at most 12 soldiers, so O(n^3) is
   cheap and deterministic), replacing the id-sorted line slots and the greedy
   cover slot order. Matching destinations to soldiers by position removes the
   crossings;
2. finds one path for the section, from its centroid to the destination
   centroid, and gives each soldier that path shifted by its formation offset
   (clamped to walkable cells, falling back to its own path when an offset
   point is blocked);
3. on the last segment, sends each soldier to its own destination.

Bounding keeps its teams but uses the same matched destinations. Single
soldiers and spread-out groups keep per-soldier paths.

### Speed

Labels stay (0.5x, 1x, 2x = 1, 2, 4 ticks per 100 ms). The default state,
`GameClient` initial speed and every reset (start, retry, Continue, phase change)
use 2. The `Pause and speed` requirement is reworded to these labels.

### Commander balloon

The training panel already has the instructor callout. The HUD adds a balloon
over the instructor, positioned each frame from `groundToScreen` (a production
method of the scene view, not the dev hook), clamped to the viewport, hidden
while the instructor is off screen (the panel still shows it). One balloon at a
time; it shows the current objective's callout.

## Risks / Trade-offs

- Every station point moves, so the bootcamp e2e scripts and mechanics tests that
  use coordinates change. Mitigation: tests read points from the area table.
- Shared routes change unit paths everywhere, so the determinism golden changes
  and sandbox tests that rely on exact positions may need updating.
- Offsets near walls can clip; the fallback to per-soldier paths covers it.
- The bundle is at 99.9% of the index JS budget; new training data and the
  balloon need room. The first task raises the budget by a recorded amount or
  moves training data into a lazily loaded chunk.

## Migration Plan

Saved bootcamp progress keeps its station ids, so a player who stopped at a
station resumes at that station on the new map.
