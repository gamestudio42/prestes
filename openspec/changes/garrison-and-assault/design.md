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
  for houses and vendas) and, for buildings over 10 m long, a back door;
  ports every 3 m along each wall, facing out, 120 degrees.
- Trench lines: a position per section's line (the four bays and their
  parapets of `trenchLine`): capacity 12, entrances at both ends and the
  communication trench, ports along the parapet facing the enemy side.
- Yards (factory yard): walls as ports.
- `positionsFor(map)` builds them at map load (shared, pure) and the content
  check verifies reachable entrances.

### 1b. Elevated ports and roofs

- `PositionDef.ports` gain `eye: number` (height of the eye above the
  ground at the building's footprint) and `level: 'ground' | 'upper' |
  'tower' | 'roof'`.
- Upper ports: sobrado (4.6 m), factory and armazém (5 m), casa-sede and
  engenho lofts (4 m); the matriz tower: 2 ports facing all round at 9 m.
- Roofs: `RoofDef { positionId, polygon, eye, cover: 0.25, capacity }` for
  the factory and the armazéns; men on a roof are ordinary units with
  `x, y` on the roof, `elevation` set, drawn standing on it, not hidden.
- Sight and fire use `terrainHeightAt + elevation + stance eye` at both
  ends, so walls (`cover.height`), hedges and crops (`cropBlocksLine`
  already compares the line height with the crop top) stop blocking when
  the line passes above them. `isLineBlocked` takes an elevation offset for
  each end; the footprint of the shooter's own building is ignored.
- Vision range stays 120 m; a man at height is seen from as far as anyone
  (no extra range), but nothing low in between hides him.
- Choosing posts: when a section enters a building with upper ports or a
  roof, its men fill tower/upper ports first if the threat is beyond a
  wall or crop, else ground ports; the order board has "Ao telhado" for
  buildings with a roof, which moves the garrison (up to the roof's
  capacity) onto it.
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
  own for state and fire rate.
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
  - defenders' losses x 0.7 (defender's bonus) unless pinned.
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

## Migration Plan

New fields optional; no saved data. Goldens re-recorded with the reason.

## Open Questions

- Resolved (user, 2026-11-09): trench lines keep drawing their men (they
  are open works); the position serves only for capacity, cover and
  assault. Buildings keep the garrison marker.
