# sandbox Specification

## Purpose
Defines the sandbox test panel, its read-only inspector, reset, cover spawning and
target dummies.

## Requirements

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

In development builds the test bridge SHALL let a test control both
factions, so either section can be selected and given orders; the published
game SHALL NOT offer it.

#### Scenario: Select the legalist squad
- **WHEN** a test enables both-sides control through the development test bridge
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

The browser suite SHALL run a two-sided scenario, set up through the
development test bridge, that reinforces both sides, exercises the
implemented orders and records a video.

#### Scenario: Both-sides browser run
- **WHEN** the test controls both factions and steps the simulation
- **THEN** every issued command is accepted, the tick advances and a video is
  written to the test results
