## ADDED Requirements

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
