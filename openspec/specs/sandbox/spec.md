# sandbox Specification

## Purpose
Defines the sandbox test panel, its read-only inspector, reset, cover spawning and
target dummies.

## Requirements

### Requirement: Sandbox panel

The game SHALL expose a sandbox panel toggled with F1 or a HUD button. The panel
SHALL NOT pause the game by itself and SHALL read only from the client frame.

#### Scenario: Panel toggles

- **WHEN** the player presses F1
- **THEN** the sandbox panel opens or closes

#### Scenario: Panel follows selection

- **WHEN** the selected section changes
- **THEN** the inspector shows that section's active unit

### Requirement: Unit inspector

The inspector SHALL show weapon, magazine, reserve, morale, suppression, morale
state, effective cover, terrain elevation, terrain speed factor, target and target
distance for the selected unit.

#### Scenario: Values update

- **WHEN** combat changes ammunition, morale, suppression or cover
- **THEN** the inspector values update from the frame without a reload

#### Scenario: Terrain values

- **WHEN** a unit stands on the ridge or in the trench
- **THEN** elevation and speed factor reflect the terrain at its position

### Requirement: Pause and step

The sandbox SHALL pause and advance exactly one fixed simulation tick from the
panel.

#### Scenario: Step advances one tick

- **WHEN** the player presses Step while paused
- **THEN** the tick advances by exactly one and then stops

### Requirement: Reset sandbox

The sandbox SHALL reset by discarding the current client and starting a fresh
simulation with the same seed and no spawned objects.

#### Scenario: Reset clears spawns

- **WHEN** the player resets after spawning cover or dummies
- **THEN** only the initial sandbox objects remain

#### Scenario: Reset is deterministic

- **WHEN** two sandboxes perform the same spawns and reset
- **THEN** their next frames have the same hash

### Requirement: Spawn cover

The sandbox SHALL place a sandbag wall, stone wall or trench at a picked ground
point. Cover SHALL be simulation-owned and exposed in the frame.

#### Scenario: Spawn a sandbag

- **WHEN** the player chooses Sandbag and clicks the ground
- **THEN** a sandbag cover appears and blocks fire from its protected side

#### Scenario: Spawn rejects the building

- **WHEN** the player picks a point inside the building footprint
- **THEN** the spawn is rejected and no cover is added

### Requirement: Target dummies

The sandbox SHALL spawn stationary target dummies that can be shot but do not
move, fire, join enemy AI or count toward victory/defeat.

#### Scenario: Dummy is targetable

- **WHEN** the player attacks a dummy
- **THEN** the selected units acquire and fire at it

#### Scenario: Dummy does not end the fight

- **WHEN** all legalist combat units are dead but dummies remain
- **THEN** the outcome is still victory

#### Scenario: Dummy does not fight back

- **WHEN** a dummy is alive
- **THEN** it does not move, fire or acquire targets

### Requirement: Localized sandbox UI

Every sandbox label, tool name, prompt and rejection message SHALL come from the
PT-BR and EN catalogs.

#### Scenario: Locale switch

- **WHEN** the player switches locale with the panel open
- **THEN** all panel labels update without a reload

### Requirement: Six-person test troop

The sandbox player troop SHALL consist of five riflemen and one officer in one
section. Clicking any friendly unit SHALL select the whole active troop.

#### Scenario: Troop size
- **WHEN** the sandbox starts
- **THEN** the player has five riflemen and one officer

#### Scenario: Friendly click selects the troop
- **WHEN** the player left-clicks a friendly unit
- **THEN** every active player unit becomes selected

### Requirement: Directional marquee selection

A left drag SHALL draw a selection rectangle. Dragging leftward SHALL use blue and
select all player units in the rectangle, including the officer. Dragging
rightward SHALL use green and select only riflemen.

#### Scenario: Blue all-troop box
- **WHEN** the player drags leftward over the troop
- **THEN** the blue box selects all player units inside it

#### Scenario: Green soldiers-only box
- **WHEN** the player drags rightward over the troop
- **THEN** the green box selects only riflemen inside it

### Requirement: Officer aura

The officer SHALL regenerate morale for allies within 12 m and SHALL seek cover
even when it has no target.

#### Scenario: Nearby morale
- **WHEN** an ally is within 12 m of a living officer
- **THEN** its morale recovers slowly

#### Scenario: Officer seeks cover
- **WHEN** the officer has low cover
- **THEN** it moves toward a cover position even without a target

### Requirement: Defensible-position objective

The sandbox objective SHALL be to take the defensive position, and the player-facing
objective SHALL say so.

#### Scenario: Objective text
- **WHEN** the HUD is shown
- **THEN** the objective is the defensive position

### Requirement: Select all control

The sandbox HUD SHALL provide a Select All button and Ctrl/Cmd+A. Either SHALL select
every active player unit.

#### Scenario: Select all button
- **WHEN** the player presses Select All
- **THEN** every active player unit is selected

#### Scenario: Select all shortcut
- **WHEN** the player presses Ctrl+A or Cmd+A
- **THEN** every active player unit is selected

### Requirement: Both-sides control

The sandbox SHALL allow the player to control both factions, select either
section and issue orders to it.

#### Scenario: Select the legalist squad
- **WHEN** both-sides control is enabled
- **THEN** the legalist section card appears and can be selected

#### Scenario: Order the legalist squad
- **WHEN** the legalist squad is selected
- **THEN** movement, formation, stance and tactical orders apply to its units

### Requirement: Reinforcements

The sandbox SHALL add riflemen to either faction at deterministic rear positions.

#### Scenario: Reinforce both sides
- **WHEN** the player adds a column rifleman and a legalist rifleman
- **THEN** both units appear in the frame with the correct faction and squad

### Requirement: Combat demonstration test

The browser suite SHALL run a two-sided sandbox scenario that reinforces both
sides, exercises the implemented orders and records a video.

#### Scenario: Both-sides browser run
- **WHEN** the test controls both factions and steps the simulation
- **THEN** every issued command is accepted, the tick advances and a video is
  written to the test results

### Requirement: Whole-troop sandbox insertion

The sandbox SHALL support inserting a complete 11-soldier enemy troop and a
complete 3-soldier command troop as single troops, in addition to existing
single-element tools. Each insertion SHALL create an independent troop.

#### Scenario: Insert enemy troop

- **WHEN** the player chooses the enemy-troop tool and confirms a valid position
- **THEN** 11 enemy soldiers appear in formation as one troop

#### Scenario: Select inserted troop

- **WHEN** the player clicks any soldier of an inserted troop
- **THEN** the whole troop is selected

### Requirement: Universal placement preview

Every sandbox placement tool SHALL show a preview of the full element before
placement. The preview SHALL follow the pointer, show footprint and direction,
mark valid or invalid placement, rotate with Z/X, confirm with a click and cancel
with Escape or the right mouse button.

#### Scenario: Valid preview

- **WHEN** the pointer is over a free position
- **THEN** the preview is valid and a click places the element

#### Scenario: Invalid preview

- **WHEN** the preview overlaps an obstacle, troop or map boundary
- **THEN** it is invalid and a click does not place the element

#### Scenario: Rotate and cancel

- **WHEN** the player presses Z or X
- **THEN** the preview rotates; pressing Escape or right-click cancels without
  changing the map

### Requirement: Continuous placement rotation

Sandbox placement SHALL rotate continuously while Z or X is held, at 90 degrees
per second, and SHALL retain the angle when the key is released. Z and X SHALL
rotate in opposite directions.

#### Scenario: Hold to rotate
- **WHEN** the player holds Z or X with a placement tool active
- **THEN** the preview angle changes gradually and stops when released

### Requirement: Real rotated placement

Placed covers and troops SHALL use the same rotation shown in the preview.
Cover collision, line checks and pathfinding SHALL use the oriented footprint.
Troop formation offsets and facing SHALL follow the chosen rotation.

#### Scenario: Rotated cover
- **WHEN** the player places a cover rotated 90 degrees
- **THEN** the rendered cover and its collision footprint are rotated

#### Scenario: Rotated troop
- **WHEN** the player places a troop with a rotation
- **THEN** its soldiers occupy the rotated formation shown by the preview
