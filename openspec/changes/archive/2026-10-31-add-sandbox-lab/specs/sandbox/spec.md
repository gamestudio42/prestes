## Purpose

Defines the sandbox test panel, its read-only inspector, reset, cover spawning and
target dummies.

## ADDED Requirements

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
