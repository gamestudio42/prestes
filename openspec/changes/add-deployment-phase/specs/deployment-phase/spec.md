## Purpose

A pre-battle phase in which each side places its sections inside its
deployment area with orders that take effect at once, before time starts.

## ADDED Requirements

### Requirement: Deployment phase before the battle

Every skirmish battle SHALL open in a deployment phase after the roster. In
it no simulation time SHALL pass: no soldier moves, fires or reacts on his
own, and the battle clock and objective timers SHALL NOT run. The view SHALL
show a banner naming the phase, both sides' deployment areas (the enemy's
only as an outline), a "Start battle" control with a key, and a "Reset
deployment" control. "Start battle" SHALL end the phase; the battle's first
tick SHALL be the first tick after it. Labels SHALL be localized in EN and
PT-BR ("Deployment" / "Desdobramento", "Start battle" / "Iniciar batalha",
"Reset deployment" / "Refazer desdobramento").

#### Scenario: Time stands still
- **WHEN** the deployment phase has been open for 30 s of real time
- **THEN** the simulation tick is 0, no shot has been fired and the clock shows its full time

#### Scenario: Start the battle
- **WHEN** the player presses "Start battle"
- **THEN** the banner goes, ticks begin and the clock starts counting

#### Scenario: Reset
- **WHEN** the player has moved two sections and presses "Reset deployment"
- **THEN** every section is back at its default place and facing

### Requirement: Orders take effect at once

During the deployment phase a move order SHALL place the section in its
formation at the target with the ordered facing; a defend order SHALL place
each man directly in the cover slot he would take in battle, and a defend
order at or within 10 m of a trench line SHALL fill that trench's fire step
first; stance, facing, formation, spacing and fire control SHALL be set at
once; an order to enter a building, where buildings can be entered, SHALL
put the men inside. Orders that belong to the fight (fire at, assault,
rush, retreat) SHALL be refused with a localized reason.

#### Scenario: Instant move
- **WHEN** the player orders a section to move 60 m forward inside the area
- **THEN** the section stands in formation at the target at once, still at tick 0

#### Scenario: Into the trench
- **WHEN** the player orders a section to defend at a point 5 m behind a fire trench
- **THEN** its men stand at once on the trench's fire step slots, facing the parapet

#### Scenario: Fight orders refused
- **WHEN** the player orders a section to fire at a point during deployment
- **THEN** the order is refused with the reason "Not during deployment" / "Não durante o desdobramento"

### Requirement: Deployment areas in battle

Each side SHALL deploy only inside its deployment area. An order whose
resulting positions would fall outside the area, in deep water or inside a
building's walls SHALL be refused with a localized reason and SHALL leave
the section where it was.

#### Scenario: Outside the area
- **WHEN** the player orders a section to move beyond the edge of his area
- **THEN** the order is refused with the reason "Outside your deployment area" / "Fora da sua área de desdobramento"

### Requirement: Enemy deployment

At the start of the phase the enemy commander SHALL place its sections inside
its area, deterministically by the battle seed, preferring trench lines,
walls and buildings that face the player's area and, when the map has
objectives, its own objectives. Under fog of war the player SHALL see no
enemy soldier his men could not see; the enemy commander SHALL NOT read the
player's deployment.

#### Scenario: Same seed, same deployment
- **WHEN** the same map and seed are started twice
- **THEN** the enemy sections stand in the same places both times

#### Scenario: Enemy takes the trenches
- **WHEN** a map's legalist area holds a fire trench facing the column
- **THEN** at least one legalist section starts on its fire step

### Requirement: Placement preview

While a section is selected and a move or defend order is on the cursor in
the deployment phase, the view SHALL show the cover slots near the cursor
with their count and protection class (standing, crouched, prone), and the
positions the men would take; the slots SHALL be the same ones the editor's
cover overlay and the battle use.

#### Scenario: Preview along a wall
- **WHEN** the player hovers a defend order over a stone wall in his area
- **THEN** the wall's free slots are shown with their count and the men's positions on it

### Requirement: Deployment is deterministic

Deployment orders SHALL be commands recorded and replayed like battle
commands. A battle started with no deployment change SHALL have the same
units, positions and state hash at its first tick as a battle started
without a deployment phase. Headless tools and tests SHALL skip the phase
unless they ask for it.

#### Scenario: Goldens hold
- **WHEN** the determinism check runs a default battle through an empty deployment phase
- **THEN** every battle golden is unchanged

#### Scenario: Replay a deployment
- **WHEN** a battle with three deployment orders is replayed from its commands
- **THEN** the replay reaches the same state hash at tick 1,000
