## Context

- Buildings are `Building` records (model, centre, rotation, half sizes,
  height) turned into `building` covers (`buildingCover`, quality 0.8,
  blocks movement and sight). `coverSlots` gives a building slots at its
  corners and along its walls; soldiers fight beside buildings, never in.
- Trench lines are separate `trench` and `sandbag` covers (bays) with slots
  on their floors; a section holding a line already fights "in" it.
- Orders: `order` commands (`advance`, `defend`, `ambush`, ...), `attack`,
  `suppress`, `flank`, `withdraw`, `hold`; the HUD's order board groups
  them; ground orders take a click; there is a placement preview for the
  sandbox and for orders.
- Combat: `fire()` resolves aimed shots with `coverAgainst`; suppression and
  morale states (`steady → suppressed → pinned → panicked`) lower fire.
- Fog of war: per-side `seen` sets and unseen-fire markers.

## Goals / Non-Goals

**Goals:** positions from data, enter and leave (with a deploy click), fire
from ports, garrison casualties and suppression, a deterministic close
assault shown with bars, commander use, fog rules, HUD and view.

**Non-Goals:** interiors, floors as separate positions, grenades, fire and
demolition, civilians, melee animation of individual men.

## Decisions

### 1. Position data

```ts
interface PositionDef {
  id: number;                       // = the building's or the work's cover id
  kind: 'building' | 'trench-line' | 'yard';
  capacity: number;
  cover: number;                    // 0.6 building, 0.5 trench, 0.4 yard wall
  entrances: Vec2[];                // world points just outside the footprint
  ports: Array<{ x: number; y: number; facing: Vec2; arcDeg: number }>;
}
```

- Buildings: generated from the footprint and model: capacity by model
  (table in the spec); entrances at the door side's middle (the street face
  for houses and vendas) and a back door on every house and business; the
  church a front portal and a door in each side wall (user, 2026-11-09);
  ports every 3 m along each wall, facing out, 120 degrees, none within a
  door's width of an entrance. The windows are the ports: one shared
  function (`buildingWindows`) lays them out in the building's own frame,
  the simulation makes the ports from it and the view draws a window at
  each (user, 2026-11-09: windows on every side and upstairs, so a man is
  always at a window).
- Trench lines: a position per section's line (the four bays and their
  parapets of `trenchLine`): capacity 12, entrances at both ends and the
  communication trench, ports along the parapet facing the enemy side.
- Yards (factory yard): walls as ports.
- `positionsFor(map)` builds them at map load (shared, pure) and the content
  check verifies reachable entrances.

### 1b. Elevated ports

- `PositionDef.ports` gain `level` (1 for an upper floor or a loft) and
  `elevation` (the floor's height above the ground), and `tower` for the
  matriz's tower ports.
- Upper ports: sobrado (4.6 m), factory and armazém (5 m), casa-sede and
  engenho lofts (4 m); the matriz tower: 2 ports facing all round at 9 m.
- No roofs (user, 2026-11-09): the factory and the armazéns keep their
  roofs as scenery; no section stands on a roof.
- Sight and fire use `terrainHeightAt + elevation + stance eye` at both
  ends, so walls (`cover.height`), hedges and crops (`cropBlocksLine`
  already compares the line height with the crop top) stop blocking when
  the line passes above them. `isLineBlocked` takes an elevation offset for
  each end; the footprint of the shooter's own building is ignored.
- Vision range stays 120 m; a man at height is seen from as far as anyone
  (no extra range), but nothing low in between hides him.
- Choosing posts: when a section enters a building with upper ports or a
  tower, its men fill tower/upper ports first if the threat is beyond a
  wall or crop, else ground ports; at most two men are in the tower.
- The commander puts a man in the tower when it holds the matriz.

### 2. Garrison state

`ctx.garrisons: Map<positionId, { side, unitIds: number[], suppression,
assault?: AssaultState }>`. A garrisoned unit has `garrison?: positionId`
(optional field, hashed only when set); its `x, y` is its port; it is not
moved by movement, separation or slots; it does not count for cover slots.

### 3. Enter

Command `{ type: 'order', order: 'enter', unitIds, positionId }`:
validation (own or empty position, not enemy-held), then each soldier gets a
path to the nearest free entrance; on arrival within 1.2 m he enters if
capacity remains (sets `garrison`, takes a free port facing the side's
current threat or the enemy zone), else he takes the nearest outside slot.
Events `unit_entered { unitId, positionId }`.

### 4. Fire from and at positions

- Port assignment every 10 ticks: each defender takes the free port whose
  facing is closest to the bearing of his chosen target (or the nearest known
  enemy); ties by port index.
- A defender fires by the normal `fire()` from his port position with
  `cover = min(0.75, stanceCover + position.cover)` for incoming shots.
- Incoming fire aimed at a garrisoned target: the target is the defender at
  the port facing the shooter (the closest facing); line of sight is
  computed to the port point at eye height and ignores the position's own
  footprint.
- Suppression: incoming shots that hit the footprint add suppression to the
  garrison as a whole (shared value), which every defender reads as his
  own for state and fire rate. The shared value is the mean of the men's
  suppression (each gains and recovers as outside); see Apply findings.
- Under fog, an enemy unit inside counts as seen only when the observer sees
  his port; the position counts as "known occupied" after a sighting or an
  unseen-fire marker from it.

### 5. Close assault

Command `{ type: 'assault', unitIds, positionId }`: attackers path to the
nearest entrance; when at least two are within 3 m of an entrance, the
assault starts:

- Fighters: attackers who reached the entrance zone (up to the capacity)
  and every defender. More attackers join as they arrive.
- Every 10 ticks (1 s), each side loses men with probability
  `p_side = base x (enemyFit / ownFit)^0.5 x weaponFactor_enemy x
  moraleFactor x suppressionFactor`, `base 0.12`, where:
  - `weaponFactor`: average over fighters: revolver 1.4, automatic rifle
    1.3, Winchester 1.15, Mauser 1.0, machine gun 0.8;
  - `moraleFactor`: steady 1.0, suppressed 1.25, pinned 1.6, panicked 2.2
    (for the side taking losses);
  - defenders' losses x 0.6 (defender's bonus; 0.7 at first, tuned by
    test) unless pinned.
  Each loss is drawn with the engine RNG: incapacitated (60 %) or dead.
- A side whose remaining fighters all panic surrenders the fight: the
  defenders flee out the far entrance; the attackers fall back to cover.
- End: one side with no fit fighter; winners hold the position (attackers
  enter as garrison up to capacity). Events `assault_started`,
  `assault_ended { positionId, winner }`; the frame carries
  `assaults: [{ positionId, attackers, defenders, attackersStart,
  defendersStart }]` for the bars.
- Starting values are tuned by tests (spec scenarios over 20 seeds: "most"
  = at least 14 of 20).

### 6. Exit

Command `{ type: 'order', order: 'exit', unitIds, to }`: refused when `to`
is over 30 m from the position or blocked; else the garrison leaves through
the entrance nearest `to`, one man per 0.5 s, and takes a `defend` around
`to`. The HUD's "Sair" button enters a placement mode (the existing
placement preview, a ring of 30 m) and sends the command on click.

### 7. Commander

- On deployment and on holding an objective: garrison the nearest position
  of capacity ≥ 4 within 40 m of its line or objective with one section.
- Assault rule: a known enemy garrison within 80 m of an attacking section
  is fired on (suppress) until pinned or until the attackers outnumber it
  2:1, then assaulted.
- Leave rule: a garrison with one fit man, or with known enemies at two
  entrances and no friendly section within 60 m, exits toward its side.

### 8. View and HUD

- Men inside a building are not drawn (user, 2026-11-09): each shows only
  as his rifle's barrel out of his window, at his eye height (the upper
  floor's for an upper window), pointing where he faces; shot events
  already leave from his port, so flashes and tracers come from the
  window. Men in trench lines and the yard stay drawn.
- `GarrisonLayer`: over each known occupied position a marker (a small
  banner in the side's colour with the men count, "?" when unknown) and a
  strength bar; muzzle flashes at the firing ports from `shot` events whose
  source is garrisoned; the entrances shown as small arrows when a section
  with the enter order is selected.
- Assault bars: two horizontal bars over the position (attackers left,
  defenders right), proportional to fit fighters over their start, with
  side colours, for the fight's length.
- Order board: "Ocupar", "Sair" and "Assaltar" in the Position and Fire &
  manoeuvre tabs, with icons and tooltips; section cards show "Dentro:
  <position name>" (building model's localized name).

### 9. Determinism and performance

All draws use the engine RNG in fixed order (positions by id, fighters by
id). Garrisoned units skip movement and separation, so performance improves
when men are inside. Goldens re-recorded; new tests pin assault outcomes on
fixed seeds.

### Historical method

Mechanics only. A codex note on fighting around farm buildings and in towns
in 1924-1925 may cite Macaulay (ch. I for São Paulo, ch. III for the Paraná
front) as a historical note; no claim in the rules.

## Risks / Trade-offs

- [Garrisons too strong] → suppression shared by the whole garrison;
  assaults favoured when it is pinned; ports limit how many fire at one
  side.
- [Abstract fights feel opaque] → the bars, events and the troop summary
  list losses; the end panel counts them.
- [Pathing to entrances in the Bairro's quintais] → entrances on the street
  face; the content check proves reachability.
- [Fog leaks] → markers only when known; "?" strength until seen.

## Apply findings

- 3.1 (2026-11-09): the shared suppression was first the highest of the
  men's. The open section's shots all meet the man at the facing port, so
  his suppression (65+, where morale drains 0.5 a tick) became the whole
  house's: in 12 of 20 seeds a garrison of 4 panicked after one loss and
  lost the exchange to 4 men in the open. With the mean, the weight of fire
  falls on the garrison as a whole: over 20 seeds at 60 m for 60 s the
  garrison lost 19 men and the open section 61; the garrison lost no more
  in 17 of 20 seeds.
- 3.2 (2026-11-09): read as each fit fighter falling with his side's
  chance each second. `suppressionFactor` is not a separate term: the
  morale factor is taken from each fighter's state, which already follows
  his suppression (a pinned garrison fights at 1.6). The defender's bonus
  0.7 gave a steady 4 holding against 4 in 27 of 40 seeds (13 of 20 in the
  test, short of "most"); 0.6 gives 30 of 40, and a pinned 4 still falls to
  8 in 38 of 40. Fighters are held at the entrance; a loss shakes comrades
  within 12 m as a casualty by fire does. A position emptied by fire before
  the fight starts is simply entered. Losers fall back 20 m from the door
  the way they came and defend there.
- 3.2 / 3.4: the legalist commander leaves a section that is entering,
  holding or assaulting a position to it (it redeployed an assaulting
  section in its first think).
- 3.4 (2026-11-09), open: the commander's rules (garrison one section near
  its line on deployment; suppress until pinned or 2:1, then assault; leave
  a lost position) pass their tests (`garrison-commander.test.ts`: 5 of 10
  seeds reach an assault, every one after pinning the house). But the
  deployment garrison changes the battle reports (`pnpm battle:report
  --garrisons`, scripted player, enemy not deployed):

  | Map | Seed | without garrison | with garrison (entered col/leg) |
  | --- | --- | --- | --- |
  | vila-militar | 1922 | 266 s victory 4/33 | 418 s defeat 29/24 (0/11) |
  | vila-militar | 1924 | 254 s victory 3/33 | 602 s victory 27/33, time |
  | vila-militar | 1925 | 296 s victory 13/33 | 217 s victory 2/33 |
  | fazenda | 1922 | 364 s victory 16/29 | 900 s none 9/11, silence 308 s |
  | fazenda | 1924 | 309 s victory 16/32 | 610 s victory 15/33, time |
  | fazenda | 1925 | 304 s victory 14/32 | 830 s victory 17/31, time |
  | serra-rio | 1922-1925 | 376-629 s victories | 473-506 s victories |
  | bairro | 1922 | 438 s victory 17/29 | 810 s victory 6/32 (0/4), time |
  | bairro | 1924 | 443 s victory 3/28 | 657 s victory 1/26, time |
  | bairro | 1925 | 505 s victory 2/29 | 765 s victory 11/28, silence 86 s |

  The scripted player never garrisons nor assaults, so no assault shows on
  the Bairro, and a garrison it does not attack sits out the battle. With
  the garrison off, every row matches the earlier report: fire from ports
  and assaults change nothing in battles without garrisons.
  Decision (user, 2026-11-09): keep the deployment garrison; the stalls and
  the missing assaults are left to `add-map-objectives`, whose objectives
  give the column a reason to take positions (its task 4.1 reruns the
  report and counts assaults). Goldens re-recorded for it.
- 3.1: a garrison that has seen no enemy takes the ports facing the enemy's
  deployment area; fire from elsewhere turns it once a man has a target.
- 4.7 (windows and doors): `buildingOpenings` lays a window every 2.5 m on
  each wall, clear of the doors by 0.2 m, so a wall with a door still has
  a window either side of it (at 2.6 m and a 0.4 m gap the casa-térrea's
  back wall kept two and only two of four defenders faced a threat there;
  the 3.4 "suppress before assault" check fell to 2 of 10 seeds; now 4).
  Every house now has a back door, often in a walled yard, so a man
  walking in takes the door with the shortest walk (`reachableEntrance`,
  buildings only) and sets off again if he halts short of the doors. The
  Vila Militar battle-feel seeds 7 and 42 and the Bairro gun report fail
  with the old ports and doors as well (checked A/B): they are not from
  this task. On Vila Militar the enemy garrisons a trench line at the
  start. Decision (user, 2026-11-09): leave them to `add-map-objectives`
  4.1 like the report stalls; the tests mark them as known meanwhile.
- 1.3 (raised windows): `BUILDING_UPPER` holds the spec's eye heights; a
  port's `elevation` is that eye less a standing man's 1.6 m (sobrado 3.0,
  factory and armazéns 3.4, lofts 2.4). The "station armazéns" are read as
  the railway warehouses (`warehouse`, by the Bairro railway); the street
  `armazem` stays one storey. A loft has
  windows only in its gable ends (the short walls, the ridge running along
  the long side), half as many as the ground floor's and between them.
  `isLineBlocked` with a raised man at either end blocks at a cover only
  where the line runs below its top (the share of the line inside each
  cover), so he sees over a wall and is seen over it in turn; with both
  men on the ground the old rule stands (goldens unchanged). The spec's
  "Over the corn from the loft" named the engenho, but on the Fazenda the
  engenho stands by the cane and the cornfield lies below the casa-sede:
  the scenario now names the casa-sede's loft (a 4 m eye cannot see past
  60 m of 2.5 m cane to a man at its edge).
- 1.5 (tower, 2026-11-09): decision (user): no roofs, only towers; the
  roof posts, `RoofDef`, "Ao telhado" and the "Exposed on the roof"
  scenario are gone (spec, proposal, tasks 1.4, 1.5 and 4.0). The shared
  `buildingTower` places the matriz's tower front-centre over the façade
  (view and simulation alike); its two ports stand inside it, 0.6 m either
  side of its middle, one watching the front and one the rear, each
  looking all round, at a 9 m eye. A port marked `tower` sets the man's
  `inTower` to the church, and sight and fire to or from him pass through
  that church's own walls (`isLineBlocked` takes the cover ids to leave
  out); his own building still shuts a ground-floor window's view behind
  it, since those ports stand outside the walls. `towerCapacity` (2) keeps
  a third man out of the tower. Until 4.0 fills posts by the threat, a man
  takes a tower port only when it faces his threat better than any free
  window (one did in the full-church check). The view still draws a tower
  man's barrel at the church windows' height; the tower's openings and
  marker are 1.4.
- 4.0 (post filling): in a building with raised ports (`raisedPorts`),
  each man ranks the free ports against his threat: a ground window that
  sees the enemy man first, then a raised one (upper floor, loft, tower)
  that sees him, then the rest by how squarely they face, ground first on
  a tie; the same rank decides the re-pick every 10 ticks. The enemy man
  is his target, the nearest one his side sees, or, under fog, where his
  side last saw one (taken crouched, since he is out of sight); with none
  known the posts face the enemy's area and stay on the ground. Positions
  without raised ports keep the facing rule unchanged (goldens unchanged).
  The commander's "a man in the tower when it holds the matriz" comes from
  the same rule: its men go up when the enemy is behind the quintal walls.
  The 1.5 tower check now gives the column a sighting of the man behind the
  wall, and two men go up.
- 4.2 (GarrisonLayer): a pixel banner (16 x 12, nearest filtering) in the
  side's colour over each held building the fog view passes, with its fit
  men in 3 x 5 digits or "?", and a one-pixel bar of the fit share (gold
  over half, red under); it floats above the roof and above the 1.4
  diamond. Trench lines and the yard get none (spec). The port flashes are
  the effects layer's, from the port since 3.1 and 4.7. The door arrows
  show for the positions that selected men are walking into, read from a
  new `entering` field on the unit snapshot (goldens unchanged). The dev
  hook `garrisonMarks()` returns the banners and the arrow count for e2e.
- 4.3 (assault bars): one pixel sprite (25 x 5) per frame assault over the
  position, above its banner: the attackers' bar left (emptying toward the
  middle) and the defenders' right, each fit fighters over its start, in
  the sides' colours; gone when the frame drops the assault. The e2e has
  the column hold a house and walks the nearest legalist section to its
  door through the bridge (assaulting the commander's own garrison does
  not work: it leaves once watched at its doors).

## Migration Plan

New fields optional; no saved data. Goldens re-recorded with the reason.

- 4.5 (deployment): Decision (user, 2026-11-09): nobody enters a position
  during deployment. The archived deployment-phase requirement said an order
  to enter a building SHALL put the men inside; the change now modifies it
  (delta `specs/deployment-phase/spec.md`) so enter and leave are refused
  like the fight orders. The code already refused them
  (`applyDeploymentCommand`: `enter`, `exit` and `assault` are not placing
  commands, reason `not_during_deployment`); the enemy commander's deployment
  garrison is an `enter` order that runs once the battle starts (3.4).
- 4.6 (editor): the panel reads the battle's own positions (`positionsFor`
  on the compiled map) and finds a piece's position through the covers it
  compiled to. The port ticks start at the post (0.05 m out of the wall) and
  run 1 m out, ending at the building's standing slots (1 m out); in the
  editor's top-down view they seem to cross the wall because the editor draws
  the roof about 0.5 m beyond the walls.
- 5.1 (reports, 2026-11-09): `pnpm check:determinism` matches the golden.
  `pnpm battle:report --garrisons` (entered col/leg, assaults 0 on every
  row, since the scripted column neither enters nor assaults):

  | Map | 1922 | 1924 | 1925 |
  | --- | --- | --- | --- |
  | vila-militar | 418 s defeat 29/24 | 602 s victory, time | 217 s victory |
  | fazenda | 900 s none, silence 308 s | 610 s victory, time | 830 s victory, time |
  | serra-rio | 473 s victory | 475 s victory | 506 s victory |
  | bairro | 726 s victory, time | 657 s victory, time | 666 s victory, time |

  Against the 3.4 table only the Bairro moved: shorter battles and no more
  86 s silence on 1925 (4.0's post filling). The stalls and the missing
  assaults stay with add-map-objectives 4.1 (user decision of 3.4).
- 5.4 (2026-11-09): Decision (user): close the change without the hand
  check on the Bairro and the Fazenda. The user will author the game's maps
  in the editor (campaign slots from docs/campaign/CAMPAIGN.md, skirmish
  maps, objectives); the generated maps leave the menu and one test map,
  laid out to exercise garrisons, assaults and objectives quickly, stays for
  the tests. The hand check runs there, in that change.
- 5.3 (gates): the simulation worker grew past its 200 KB bundle budget
  (211 KB) with the garrison systems. The generated battle maps are about
  20 KB of it and leave with the authored-maps change, so the budget is
  215 KB until then; that change puts it back to 200 KB.

## Open Questions

- Resolved (user, 2026-11-09): trench lines keep drawing their men (they
  are open works); the position serves only for capacity, cover and
  assault. Buildings keep the garrison marker.
