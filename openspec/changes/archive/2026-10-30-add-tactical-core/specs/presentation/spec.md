## ADDED Requirements

### Requirement: Squad selection and orders

The HUD SHALL show the two player sections with alive counts, and SHALL let the
player select a section. Clicking a friendly unit SHALL select its section.
Right-clicking the ground SHALL move the selected section; right-clicking a living
enemy SHALL attack it.

#### Scenario: HUD selects a section

- **WHEN** the player presses a section button
- **THEN** that section becomes selected and subsequent orders target its living units

#### Scenario: Click selects a unit's section

- **WHEN** the player left-clicks a friendly unit
- **THEN** its section becomes selected

#### Scenario: Right-click orders

- **WHEN** the player right-clicks the ground or a living enemy
- **THEN** the selected section receives a move or attack command

### Requirement: Squad status HUD

The HUD SHALL show the selected section's alive count, health, ammunition and
morale, the objective and the current outcome.

#### Scenario: Status follows the frame

- **WHEN** combat changes health, ammunition or morale
- **THEN** the selected section's HUD values update from the frame

#### Scenario: Outcome is visible

- **WHEN** the outcome becomes victory or defeat
- **THEN** the HUD shows it without a reload

### Requirement: Pause and speed

The HUD SHALL pause the simulation and set 1×, 2× or 4× speed.

#### Scenario: Pause stops ticks

- **WHEN** the player pauses
- **THEN** the simulation tick stops advancing until resumed

#### Scenario: Speed multiplies ticks

- **WHEN** the player selects 2× or 4×
- **THEN** the client requests two or four ticks per 100 ms interval

### Requirement: Combat feedback

The view SHALL draw a short tracer for each shot and SHALL show dead characters
lying on the ground without a selection ring.

#### Scenario: Shot tracer

- **WHEN** a shot event is received
- **THEN** a short-lived line appears from the shooter to the target

#### Scenario: Dead unit

- **WHEN** a unit dies
- **THEN** its body lies down and its selection ring is hidden
