## Why

Every force in the game is held to one limit, 33 men and 6 sections, whatever
the map's size. On the small maps (240 m) that is right: Copacabana plays
well. On the medium maps (400 m, 2.8 times the area) the same handful of men
leaves the field empty, so most of a battle is spent looking for the enemy.
The enemy also arrives in small drips over ten minutes, which drags the
battle out further. The owner asked to revisit the limit on 2026-11-16 ("os
mapas ficam muito vazios e as batalhas muito longas"), with Copacabana kept
as it is. The owner also noticed that the second campaign map (São Luiz /
Ramada) never uses a quarter of its field: its north-east has no objective,
no deployment and no event.

Measured today (men at the start, column vs enemy presets):

| Map | Size | Column | Enemy | Enemy arrivals |
|---|---|---|---|---|
| copacabana | small | 18 | 30 / 29 | - |
| ponte-de-verdinho | small | 20 | 23 / 19 | events |
| sao-luiz-ramada | medium | 21 | 23 / 19 | 89 men in 5 drips, 240–660 s |
| catanduvas | medium | 23 | 30 / 29 | 3 drips, 240–720 s |
| porto-mendes | medium | 23 | 26 / 19 | 4 drips, 200–720 s |
| serra-nova | medium | 21 | 22 / 27 | 4 drips, 150–780 s |
| pantanal | medium | 18 | 23 / 20 | 3 drips, 200–480 s |

## What Changes

**Player fantasy and core loop.** On a bigger field the player commands a
bigger force: a company-sized column against a company-sized enemy, with
room to flank, to hold a line with part of the force and to move with the
rest. The loop does not change (choose force, deploy, fight). What changes is
that the fight starts sooner and fills the map.

- **Force limits by map size.** These replace the fixed 33 men / 6 sections:
  - small (240 m): 33 men, 6 sections. Unchanged.
  - medium (400 m): 66 men, 12 sections.
  - large (640 m): 100 men, 16 sections.
  - The group limits grow with the map: one command section on every size;
    machine guns 1 / 2 / 3; automatic rifles 2 / 4 / 6. Cangaceiros stay at one.
  - The limit applies to the player's roster, to a roster built for the
    enemy, to a map's enemy presets and to a campaign map's fixed column
    force, each against its own map's size.
- **The skirmish setup screen counts against the chosen map.** It shows,
  for example, "Homens 41/66 · Seções 7/12". Changing to a smaller map keeps
  the roster, but marks it over the limit and stops the battle from starting
  until it fits, with the reason shown. The default roster stays three rifle
  sections. **BREAKING** for saved rosters only in the sense that a roster is
  now judged against its map; no saved data is dropped.
- **Up to 12 / 16 sections deploy.** Each side's deployment gains more
  starting places beyond today's six, inside its deployment area. Small maps
  deploy exactly as today.
- **Bigger campaign battles on medium maps.** Catanduvas, Porto Mendes, São
  Luiz / Ramada, Serra Nova and Pantanal start with about 40–55 men a side.
  Part of the enemy's late drips move into the starting force or arrive
  earlier, so contact comes within the first two minutes. Small maps
  (Copacabana, Ponte de Verdinho, La Gaiba) keep their forces.
- **São Luiz / Ramada uses its north-east.** A legalist force holds or
  enters from the north-east, with an entry point there, so the column has a
  second front to watch. The map stays mine to draw (owner, 2026-11-15).
- **Battle length is measured.** The battle report runs each medium campaign
  map and records the first shot and the battle time, against a target of the
  first shot within 120 s and a decided battle within 12 minutes.
- **Large forces stay fast.** A headless bench of 66 against 66 on a medium
  map keeps a per-tick budget. The section card row and the troop panel hold
  12 sections at 1280 x 720.

**Historical scope.** No new period content. The bigger forces are closer to
the record: at São Luiz the column numbered in the low thousands and the
legalist "ring" converged on it from several directions (`macaulay-1974`;
chapter `anel-de-ferro` sources). The game's forces remain a dramatized
sample of those numbers. The north-east flank is dramatized and is labelled
so in the chapter, as the chapter already is.

**Multi-perspective.** No change to who commands. Each chapter keeps its
historical figure; São Luiz / Ramada stays Luís Carlos Prestes, from the
column's side.

**MVP.**
- Limits by size.
- The setup screen and the map editor's presets use them.
- Deployment of up to 12 sections.
- The five medium campaign maps re-forced and São Luiz's north-east used.
- The bench and the report figures.

**Non-goals.**
- Large-map content: no authored map is large today. The limit is defined
  and tested, but no large map is drawn here.
- New section types.
- Changing the AI's tactics beyond what more sections need.
- Rebalancing the small maps.
- Difficulty levels: `add-difficulty-levels` scales damage and ammunition,
  not force size.

**Legal / ethical note.** No text or map is taken from the book or from
other games. The force numbers are a game abstraction; casualty figures of
the real battles are not shown as the player's result.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `force-roster`: the roster limit depends on the map's size. The setup
  screen counts against the chosen map. Deployment of more than six
  sections.
- `battle-maps`: the force limits by map size are defined with the map
  sizes. Enemy presets and fixed column forces are checked against their
  map. Medium campaign maps carry bigger forces. A bench for large forces.
- `map-editor`: the enemy preset editor counts against the edited map's size.
- `battle-lab`: the battle report runs the medium campaign maps and reports
  the first shot.
- `presentation`: the section cards fit twelve sections.

## Impact

- `packages/shared/src/sections.ts`:
  - `ROSTER_MAX_MEN` / `ROSTER_MAX_SECTIONS` become a per-size table.
  - `validateRoster` / `canAdd` take the map size.
  - `LIMIT_GROUPS` per size.
- `packages/shared/src/deploy-roster.ts`:
  - more deployment slots;
  - `validateMapRosters` deploys the size's full count;
  - squad ids must not collide past ten sections (column 1–6 and legalist
    11–16 today, arrivals from 20).
- `packages/shared/src/maps/validate-document.ts`, `validate-withdrawal.ts`:
  pass the map size.
- `packages/simulation/src/worker-host.ts`: validates rosters against the map.
- `apps/game/src/ui/menu/setupState.ts` and the setup screen counters.
- The editor's map properties dialog.
- `packages/content/src/locales/*`: refusal text with the limit as a value.
  The text exists already.
- The five medium campaign map documents (`packages/shared/src/maps/authored/`).
- Tests that assert 33:
  - `tests/e2e/skirmish-setup.spec.ts`, `editor.spec.ts`, `battle.spec.ts`,
    `fog-of-war.spec.ts`;
  - `packages/shared/test/sections.test.ts`, `deploy-roster.test.ts`;
  - `tests/simulation/preview-cost.test.ts`.
  The ones on small maps or with the default roster stay at 33.
- `tools/battle-report.ts` and a new bench case.
- Overlap:
  - `make-campaign-playable`: tasks 6.2–6.3 are open. Its playthrough will
    see the new forces.
  - `add-difficulty-levels`: 6.3 is open.
  Neither changes roster limits.
