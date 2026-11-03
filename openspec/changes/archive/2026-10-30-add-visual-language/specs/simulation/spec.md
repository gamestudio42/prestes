## MODIFIED Requirements

### Requirement: Command and event boundary

Player and system intentions SHALL enter the simulation as commands, and the
simulation SHALL expose results as events and frames. Frames SHALL include unit
faction and active order paths for presentation, while presentation SHALL NOT
mutate simulation state directly.

#### Scenario: Rejected command produces an event

- **WHEN** a command is invalid for the current state
- **THEN** the simulation emits a rejection event with a machine-readable reason and leaves the state unchanged

#### Scenario: Presentation reads only frames and events

- **WHEN** the presentation layer requests the current state
- **THEN** it receives a read-only frame with units, factions, order paths and events, without a mutable simulation handle

### Requirement: State hashing

The simulation SHALL expose a stable state hash covering its authoritative state,
including unit faction. Presentation order metadata SHALL not change the world
hash.

#### Scenario: Hash changes after a state mutation

- **WHEN** a valid command changes simulation state
- **THEN** the state hash after the tick differs from the hash before the command

#### Scenario: Hash is stable without changes

- **WHEN** the simulation advances with no commands that change state
- **THEN** the authoritative state hash remains unchanged

#### Scenario: Order metadata does not mutate the world

- **WHEN** an order path is exposed in a frame
- **THEN** reading it does not change the state hash

## ADDED Requirements

### Requirement: Active order paths

The simulation SHALL expose active move orders as ordered path points with a
kind and the participating unit ids. An order SHALL clear when all its units
reach the target.

#### Scenario: Move command creates a path

- **WHEN** a valid move command is applied
- **THEN** the next frame contains an order with a route from the unit group to the target

#### Scenario: Arrival clears the order

- **WHEN** every unit in the order reaches the target
- **THEN** the next frame no longer contains that order

#### Scenario: Invalid command creates no path

- **WHEN** a move command is rejected
- **THEN** no order path is added to the frame
