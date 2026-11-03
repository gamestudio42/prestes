## Purpose

Defines the deterministic game simulation that later missions build on: fixed-step
time, seeded randomness, replayable state and a command/event boundary that keeps
presentation out of the simulation.

## ADDED Requirements

### Requirement: Deterministic fixed-step simulation

The simulation SHALL advance in fixed 100 ms ticks. Given the same seed and the
same ordered commands, two runs SHALL produce the same state hash at the same tick.

#### Scenario: Two headless runs match

- **WHEN** two headless runs start from the same seed and apply the same command sequence
- **THEN** both runs report the same state hash at every checked tick

#### Scenario: Different seeds diverge

- **WHEN** two headless runs use different seeds and the same command sequence
- **THEN** the state hashes differ

### Requirement: Headless simulation

The simulation core SHALL run in a headless process without a browser, DOM,
renderer or user interface.

#### Scenario: Headless runner succeeds

- **WHEN** the headless runner executes a scenario for a fixed number of ticks
- **THEN** it completes without loading rendering or UI code and reports a final hash

### Requirement: Command and event boundary

Player and system intentions SHALL enter the simulation as commands, and the
simulation SHALL expose results as events and frames. Presentation SHALL NOT
mutate simulation state directly.

#### Scenario: Rejected command produces an event

- **WHEN** a command is invalid for the current state
- **THEN** the simulation emits a rejection event with a machine-readable reason and leaves the state unchanged

#### Scenario: Presentation reads only frames and events

- **WHEN** the presentation layer requests the current state
- **THEN** it receives a read-only frame and the events of that tick, without a mutable simulation handle

### Requirement: Seeded randomness

All simulation randomness SHALL come from the simulation's seeded random source.
The simulation SHALL NOT use wall-clock time or an unseeded random source.

#### Scenario: Random-dependent behaviour is reproducible

- **WHEN** a scenario that uses randomness is run twice with the same seed and commands
- **THEN** both runs produce the same events and final hash

### Requirement: State hashing

The simulation SHALL expose a stable state hash covering its authoritative state.

#### Scenario: Hash changes after a state mutation

- **WHEN** a valid command changes simulation state
- **THEN** the state hash after the tick differs from the hash before the command

#### Scenario: Hash is stable without changes

- **WHEN** the simulation advances with no commands that change state
- **THEN** the authoritative state hash remains unchanged
