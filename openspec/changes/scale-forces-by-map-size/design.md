## Context

- **The limit is global today.** `ROSTER_MAX_MEN = 33` and
  `ROSTER_MAX_SECTIONS = 6` (`packages/shared/src/sections.ts`), plus the
  group limits in `LIMIT_GROUPS` (command 1, machine gun 1, automatic rifle 2).
  - `validateRoster` / `canAdd` use them with no knowledge of the map.
  - Their callers: the setup state (`apps/game/src/ui/menu/setupState.ts`),
    the worker host's guard (`packages/simulation/src/worker-host.ts`), the
    map check (`validate-document.ts` for `columnForce`), `validateMapRosters`
    (presets and the slot check), and the withdrawal check
    (`columnSectionCount`).
- **Map sizes are already data.** `MAP_SIZE_METRES` in
  `packages/shared/src/maps/sizes.ts` gives small 240, medium 400, large 640.
  Every map document carries `size`.
- **Deployment has six slots.** `deploymentSlots` gives the zone's front
  points, then three rear points `REAR_SLOT_DEPTH` (14 m) behind the middle
  of the first three. Sections past the slots reuse the last one.
  `deployRoster` also slices the roster at `ROSTER_MAX_SECTIONS`.
- **Squad ids are ranges.**
  - column `1 + index`, legalist `11 + index`;
  - event arrivals from `nextSquadId` (20 in the 3v3);
  - a seventh column section would already collide with the legalists'
    first id.
- **The simulation runs in a Web Worker** at a fixed 100 ms tick.
  - Vision is refreshed every 2 ticks as each soldier against each enemy, so
    it grows with the square of the force size.
  - The existing budget is under 3 ms per tick for 66 soldiers on the test
    map (`tools/sim-bench.ts`).
- **The enemy commander plans per section.** Doubling the sections doubles
  its planning work, but it plans on a slower cadence than the tick.

## Goals / Non-Goals

**Goals**
- One table of limits per map size, used everywhere a roster is judged.
- Small maps behave exactly as before: limits, deployment places,
  determinism hashes of the default 3v3.
- Up to 12 (medium) and 16 (large) sections deploy on walkable ground in the
  side's area, with unique troop ids.
- The five medium campaign maps start with 40–55 men a side, contact comes
  early, and São Luiz / Ramada uses its north-east.
- The cost of 132 soldiers is measured and kept within a budget.

**Non-Goals**
- Drawing a large map.
- New section types.
- New AI behaviours.
- Rebalancing the small maps.
- Force size per difficulty.

## Decisions

### 1. The limits live with the map sizes, one table

`FORCE_LIMITS: Record<MapSize, { men; sections; groups: Record<SectionLimitGroup, number> }>`
sits in `sizes.ts` (or beside it in `sections.ts`, imported by both),
holding the numbers in the battle-maps spec.
- `validateRoster(roster, { size, army })` and `canAdd(roster, type, { size, army })`
  take the size. A missing size means `small`, so a caller that has not been
  migrated keeps today's behaviour, and the type checker lists every call
  site to migrate.
- The refusal values already carry `max`, and the locale strings already
  use `{max}` / `{maxMen}`, so no new strings are needed beyond the "over the
  limit on this map" note on the setup screen.

*Alternative*: a per-map `forceLimit` field in the document. Rejected for
now. A size table keeps every map of a size alike and needs no document
version bump. A per-map override can be added later if a map needs it.

*Alternative*: limits proportional to area (small 33 → medium 92 → large 235).
Rejected. Large would be too costly, and medium at twice small already
reaches the density the owner asked for once deployment is closer.

### 2. Group limits grow with the size, command stays one

Machine guns 1/2/3 and automatic rifles 2/4/6 keep the share of support
weapons per man close to today's. One command section stays, because the
roster stands for one company with one commander. Cangaceiros stay one,
because they are a named band.

### 3. More slots, the first six unchanged

`deploymentSlots(map, side, count)` returns the first six exactly as today,
then adds places in this order:
1. **Outer flanks of the front** (7–8): beyond the first and third front
   point, at the mean spacing between the front points.
2. **Outer flanks of the rear** (9–10): the same, 14 m back.
3. **Second rear row** (11–12): behind the middle and the second rear
   point, at twice `REAR_SLOT_DEPTH`.
4. **Large maps only** (13–16): a third row and the far flanks.

Each added place is pulled toward the area's centre until it lies inside the
side's deployment area and on walkable ground. `validateMapRosters`
deploys the full section count of the map's size, so the content check
catches a deployment area too small for it. The deployment phase can still
rearrange everything.

*Alternative*: fill the deployment polygon with a grid. Rejected, because it
would move the first six places and change every small map's start.

### 4. Squad ids: the first six unchanged, the rest clear of everything

- a side's first six sections keep their ids: column 1–6, legalist 11–16;
- the column's seventh section on gets 101+, the legalists' 151+;
- event arrivals keep taking ids from 20.

*Applied 2026-11-16, instead of the first plan of column 1–16 / legalist
101+ / arrivals 201+.* Keeping the first six ids means a roster of up to six
sections, and every existing battle, keeps its state hash: no golden hash
moved, and the 3v3 band tests needed no re-recording. Nothing in the
simulation infers the side from the id range; the special column id 99 and
arrivals (20 to 98) stay clear of 101+. The troop cards sort by id, so a
section arriving by event is listed between a company's sixth and seventh
sections.

### 5. Campaign forces: start bigger, arrive sooner

For each medium campaign map (authored by me, owner's rule of 2026-11-15):
- **Column.** Raise the fixed force to 40–55 men by adding sections of the
  chapter's types (Fogões, veteranos, esquadras, a second support weapon).
  The first four deployment points stay. The new places come from Decision 3.
- **Enemy presets.** Raise each to 40–60 men. Mostly move the sections
  that today arrive after 540 s into the starting force, so the total enemy
  in a chapter grows less than the starting count does.
- **Event timing.** Bring the remaining timed arrivals forward:
  - the first by 180 s, none after 540 s;
  - triggers on the player's own moves (area, objective taken) stay as they
    are.
- **Distance.** Where the two deployment areas are over 250 m apart, move the
  legalist area or its first objective closer, so the first shot falls
  within 120 s in the report.

**São Luiz / Ramada:**
- add an entry point at the north-east edge (about x 150, y −190, facing
  south-west);
- move one timed arrival (the 420 s pair) to that entry, earlier, with the
  order to go for the Vau do Riacho objective;
- add a small legalist post in the north-east, for example two sections on
  the trench segment already there, as part of one preset;
- give the column a reason to go there: a route along the high ground to the
  Passagem do Uruguai.

A content check rule flags any quarter of a medium campaign map with
nothing in it.

### 6. Measuring: bench and report

*Measured 2026-11-16* (`pnpm check:budget`, CPU time, mean of two runs of
3,000 ticks on `campo-de-provas`):

| Case | Soldiers | ms per tick | Budget |
|---|---|---|---|
| 3v3, default rosters | 66 | 1.98 | 4.5 |
| heavy rosters | 65 | 1.74 | 4.5 |
| garrisoned, heavy | 65 | 1.79 | 4.5 |
| two companies, 12 v 12 | 129 | 4.19 | 8 |

About 2.1 times the cost for 2 times the men, so the spatial grid was not
needed. The movement preview for twelve selected sections (65 men, attack
and move) stays under its own 8 ms budget in `preview-cost.test.ts`.


- **Bench.** `tools/sim-bench.ts` gains a case of twelve sections against
  twelve on the test map; a test asserts a mean under 8 ms over 3,000 ticks.
  If vision dominates, the first remedy is a coarse spatial grid for the
  enemy candidates of each soldier (cells of the longest vision range), which
  keeps the result identical and the cost near linear.
- **Report.** `tools/battle-report.ts` records `firstShotSeconds`. A new test
  file runs the five medium campaign maps on three seeds against the
  battle-lab bands.
  - The existing 3v3 bands, including at most 8 shots per tick, stay for the
    default roster.
  - For campaign maps, shots per tick is reported, not banded. A bigger
    force fires more at once by design.

### Simulation / presentation boundary

- The limits are shared data used by both the menu and the worker.
- The worker host refuses an over-limit roster before the engine starts, so
  a tampered setup cannot start a battle the screen would refuse.
- Presentation only reads more sections from the frame.
- The section card row is sized to twelve cards at 1280 x 720 (two rows of
  six, or narrower cards), scrolling beyond.

### Content schema

No document version change: `size`, `columnForce`, `enemyForces`, `eventPlaces`
and `events` already hold everything. The map check passes the document's
size to the roster checks.

### Historical method and figures

- **Figures.** No new figures. Each chapter keeps its commander
  (historical-commander); São Luiz / Ramada stays Luís Carlos Prestes.
- **Sources.** Force sizes are framed as a dramatized sample. For the
  encirclement of São Luiz the reference is `macaulay-1974`, through the
  chapter's existing source list. No new claims enter the compendium.

### Baseline before the campaign forces change

*Measured 2026-11-16* with `tools/campaign-length.ts` (the battle report on
each medium campaign map with its own forces, commander and events, the
enemy deployed as in the game; the scripted player holds, then
counterattacks):

| map | seed | first shot (s) | time (s) | outcome | decided by | casualties c/l | shots/tick | bunching | bands |
|---|---|---|---|---|---|---|---|---|---|
| catanduvas | 1922 | 49.4 | 583 | defeat | annihilation | 23/14 | 4 | 0.2 | ok |
| catanduvas | 7 | 50.1 | 477.9 | defeat | annihilation | 23/10 | 4 | 0.1 | ok |
| catanduvas | 42 | 49.3 | 511.1 | defeat | annihilation | 23/8 | 3 | 0.16 | ok |
| porto-mendes | 1922 | 419.3 | 544.5 | defeat | commander | 18/9 | 4 | 0.25 | first shot 419.3 s |
| porto-mendes | 7 | 420 | 505.2 | defeat | commander | 17/3 | 4 | 0.25 | first shot 420 s |
| porto-mendes | 42 | 419.2 | 509.7 | defeat | commander | 16/4 | 5 | 0.25 | first shot 419.2 s |
| sao-luiz-ramada | 1922 | 240.9 | 900 | victory | objectives | 7/19 | 4 | 0.36 | first shot 240.9 s, victory at 900 s |
| sao-luiz-ramada | 7 | 241.6 | 900 | victory | objectives | 7/16 | 3 | 0.38 | first shot 241.6 s, victory at 900 s |
| sao-luiz-ramada | 42 | 240.8 | 338 | defeat | commander | 9/14 | 3 | 0.21 | first shot 240.8 s |
| serra-nova | 1922 | 426.9 | 742.3 | defeat | commander | 13/6 | 5 | 0.12 | first shot 426.9 s, defeat at 742.3 s |
| serra-nova | 7 | 427 | 725.6 | defeat | commander | 11/7 | 4 | 0.17 | first shot 427 s, defeat at 725.6 s |
| serra-nova | 42 | 427 | 734.9 | defeat | commander | 16/9 | 4 | 0.18 | first shot 427 s, defeat at 734.9 s |
| pantanal | 1922 | 669.7 | 900 | defeat | objectives | 11/9 | 3 | 0.24 | first shot 669.7 s, defeat at 900 s |
| pantanal | 7 | 670.4 | 900 | defeat | objectives | 12/11 | 3 | 0.24 | first shot 670.4 s, defeat at 900 s |
| pantanal | 42 | 669.6 | 900 | defeat | objectives | 15/7 | 4 | 0.24 | first shot 669.6 s, defeat at 900 s |

Only Catanduvas meets the first-shot band. Porto Mendes, Serra Nova and
Pantanal see no shot until the first timed arrival (7 to 11 minutes), and
São Luiz until its 240 s arrival: the two starting forces never meet on
their own. Many defeats come from the commander falling (`commander`),
which the scripted player does not protect; the bands judge time, not who
wins.

### After the campaign forces change

*Measured 2026-11-17*, same tool and seeds, with the forces of Decision 5:

| map | seed | first shot (s) | time (s) | outcome | decided by | casualties c/l | shots/tick | bunching | bands |
|---|---|---|---|---|---|---|---|---|---|
| catanduvas | 1922 | 49.3 | 584.1 | defeat | annihilation | 49/11 | 5 | 0.17 | ok |
| catanduvas | 42 | 49.2 | 536.7 | defeat | annihilation | 49/34 | 4 | 0.2 | ok |
| catanduvas | 7 | 50 | 900 | victory | objectives | 36/35 | 5 | 0.2 | victory at 900 s |
| pantanal | 1922 | 45.6 | 900 | defeat | objectives | 19/24 | 3 | 0.17 | defeat at 900 s |
| pantanal | 42 | 45.9 | 900 | defeat | objectives | 20/22 | 4 | 0.17 | defeat at 900 s |
| pantanal | 7 | 45.7 | 900 | defeat | objectives | 17/25 | 4 | 0.17 | defeat at 900 s |
| porto-mendes | 1922 | 45.7 | 468.2 | defeat | commander | 22/5 | 4 | 0.17 | ok |
| porto-mendes | 42 | 45.6 | 545.3 | defeat | commander | 23/3 | 3 | 0.17 | ok |
| porto-mendes | 7 | 46.5 | 513.6 | defeat | commander | 23/19 | 4 | 0.17 | ok |
| sao-luiz-ramada | 1922 | 60.9 | 900 | defeat | objectives | 14/42 | 5 | 0.17 | defeat at 900 s |
| sao-luiz-ramada | 42 | 60.8 | 900 | draw | draw | 34/39 | 5 | 0.16 | draw at 900 s |
| sao-luiz-ramada | 7 | 61.6 | 900 | victory | objectives | 16/41 | 3 | 0.21 | victory at 900 s |
| serra-nova | 1922 | 49.4 | 597.9 | defeat | commander | 15/10 | 4 | 0.12 | ok |
| serra-nova | 42 | 47.9 | 860.2 | defeat | commander | 30/39 | 4 | 0.12 | defeat at 860.2 s |
| serra-nova | 7 | 47.7 | 632.3 | defeat | commander | 12/24 | 5 | 0.12 | ok |

What was changed, map by map:
- **Column forces:** 43 to 50 men (were 18 to 23).
- **Enemy presets:** 40 to 53 men (were 19 to 30). The arrivals the
  first plan said would move into the start force were trimmed instead,
  where the battle ran long.
- **Catanduvas:** arrivals at 180, 360 and 540 s (were 240, 480, 720).
- **Porto Mendes:** the south-east wood's column, which passes the
  canoes, comes first at 45 s; the others at 180 and 540 s.
- **São Luiz / Ramada:**
  - the government enters São Luiz at 60 s;
  - half of the east column comes by a new north-east picada at 150 s,
    heading for the ford, with the trail extended to that edge;
  - the ring tightens at 480 s as a change of posture only (its two
    sections were dropped).
  - A north-east objective was tried and dropped: the column could not
    hold all objectives with it.
- **Serra Nova:** the jagunços come by the west road at 45 s, for the
  supply train; the others at 240, 420 and 540 s.
- **Pantanal:** a new south patrol on the column's heels at 45 s; the
  crossing patrol at 360 s.

The first shot now falls at 45 to 62 s on every map and seed, against 49 s
to 11 minutes before. The decided-by-720-s band holds on 7 of 15 runs:
- **Porto Mendes:** 3 of 3.
- **Catanduvas:** 2 of 3.
- **Serra Nova:** 2 of 3.
- **Pantanal and São Luiz:** 0 of 3. These are marches, and the scripted
  player only holds and counterattacks, so it never reaches the northern
  objectives; their battles end on the 900 s limit by objective value.

The scripted player also loses most chapters, often to the commander's fall,
as it did before this change (status notes of 2026-11-16). So this figure
measures the script as much as the map. `campaign-length.test.ts` holds the
first-shot band. The battle's length is reported by the tool for the
owner's review in play.

**The owner's choice, 2026-11-17:** the decided-by-720-s band stays a report
figure, not a test. The first-shot band is the test.

## Risks / Trade-offs

- **Cost of 132 soldiers.** Vision and target scans grow with the square of
  the force size. *Mitigation*: the bench budget, and the spatial grid ready
  if needed. The 100 ms tick leaves headroom even at 8 ms.
- **Long battles may not get shorter.** More men alone does not shorten a
  battle if the start is far and the enemy drips in. *Mitigation*: Decision
  5 moves both. The report measures it, and the owner reviews in play
  before the bands are trusted.
- **The enemy commander with 12 sections** may bunch or leave sections idle.
  *Mitigation*: the bunching figure from the battle report is printed for
  campaign maps. A regression there is fixed in this change, or noted for a
  follow-up if it needs new AI behaviour (a non-goal).
- **Saved rosters and maps.**
  - A roster saved for a medium map is judged against that map. If the
    player's own saved map changes size, its presets may stop fitting: the
    editor reports it (map-editor spec).
  - No stored data is deleted.
- **Determinism hash churn.** The squad-id change moves every golden hash
  once. *Mitigation*: one commit, checked against unchanged outcomes on the
  fixed seeds.
- **Overlap with `make-campaign-playable`.** Its open playthrough (6.2–6.3)
  should run after this change lands, so the owner reviews the new forces
  once.
