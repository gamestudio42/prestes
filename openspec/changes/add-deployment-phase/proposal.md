## Why

With the pre-battle roster the player chooses his force. The user asked
(2026-11-08) for the next step: a deployment round before the battle starts,
where he places his sections on his side of the map. In this round every
order takes effect at once, and a section told to defend a trench drops
straight into it. Today the sections appear at three fixed points and the
clock is already running. On a map built around a ford, a cane flank or a
trench system, the first minute is spent walking into position instead of
choosing it.

## What Changes

- **A deployment phase** opens every skirmish battle after the roster.
  - Time is stopped: no tick runs, nobody fires or moves on his own, and the
    battle clock and objective timers have not started.
  - A banner says the phase is on.
  - A "Start battle" button (and its key) ends it.
  - "Reset deployment" puts every section back at its default place.
- **Orders take effect at once**:
  - **Move** places the section in its formation at the target, facing as
    ordered.
  - **Defend** puts the men straight into the cover slots they would take.
    Defend at or near a trench line fills its fire step; defend at a wall or
    a hedge lines it.
  - **Facing, stance, formation, spacing and fire control** are set at once.
  - **Entering a building**, once `garrison-and-assault` is in, puts the men
    inside.
  - **Orders that belong to the fight** (fire at, assault, rush, retreat)
    are refused with a localized reason.
- **Deployment areas**:
  - Each side has a deployment area, drawn on the map during the phase.
  - An order whose positions would fall outside it is refused, with the
    reason.
  - Every map gets its areas. Hand-written maps get them in data, authored
    maps from the editor, and older documents from a default built around
    their section points.
- **The enemy deploys too**:
  - The legalist commander places its sections in its area at the start of
    the phase, deterministically by seed. It favours trench lines, walls and
    buildings facing the column and, once objectives exist, its objectives.
  - Under fog of war the player sees none of it unless his men could
    already see it.
- **Cover preview while placing**: with a section selected and a move or
  defend order on the cursor, the map shows the cover slots near the cursor
  with their count and protection class, and the positions the men would
  take. It uses the same slots as the editor's cover overlay from
  `refine-map-editor`.
- **Editor**: the deployment tool also draws each side's area as a polygon.
  The map check refuses section points outside their area and areas that
  overlap or lie in deep water.
- **Determinism**:
  - Deployment orders are commands like any other, recorded and replayed.
  - The battle's first tick is the first tick after "Start battle".
  - A battle started with no deployment changes has today's units and
    today's hash, so the goldens hold.
  - The headless tools and tests skip the phase unless they ask for it.
- **Localization**: every banner, button, refusal and label ships in EN and
  PT-BR.

## Capabilities

### New Capabilities

- `deployment-phase`: the pre-battle phase, instant orders, deployment
  areas in battle, enemy deployment, starting the battle, the placement
  preview and its determinism.

### Modified Capabilities

- `map-editor`: the gameplay layers gain each side's deployment area, with
  its checks.
- `battle-maps`: every battle map defines a deployment area per side.

## Impact

- **Shared**:
  - `DeploymentZone` gains `area` (polygon), with a default built from the
    section points;
  - the protocol gains a `phase` in frames, a `start_battle` command and the
    `battle_started` event;
  - map document version 3: zone areas, with migration.
- **Simulation**:
  - the phase state;
  - instant resolution of move, defend, set-up and enter orders through the
    existing formation and slot planners;
  - the commander's deployment;
  - the worker holds the tick loop until the battle starts.
- **Game**: the banner, the start and reset buttons, zone outlines, refusal
  messages, the placement preview in the order cursor; the clock and the
  objective strip start at "Start battle".
- **Editor**: the area polygon in the deployment tool, and the checks.
- **Ordering**: lands after `pre-battle-roster` (sections by type) and
  `refine-map-editor` (trench lines, cover overlay), and before
  `add-map-objectives` and `garrison-and-assault`, which then add their own
  instant orders (enter) and the commander's objective-aware deployment.
- **Non-goals**: no deployment budget or points; no hidden deployment
  tokens; no deployment in the sandbox unless switched on; no multiplayer
  simultaneous deployment.
