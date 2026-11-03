## ADDED Requirements

### Requirement: Stance state

Each unit SHALL have a stance: standing, crouched or prone. The default SHALL be
standing, and stance SHALL be part of the authoritative world state and hash.

#### Scenario: Default stance

- **WHEN** the simulation starts
- **THEN** every unit reports standing in its frame snapshot

#### Scenario: Stance changes the hash

- **WHEN** a valid stance command changes a unit
- **THEN** the state hash differs from before the command

### Requirement: Stance command

A stance command SHALL target one or more units and SHALL be rejected when the
unit list is empty or contains an unknown unit. A rejected stance command SHALL
leave the state and hash unchanged.

#### Scenario: Valid stance command

- **WHEN** a stance command targets existing units
- **THEN** the next frame reports the requested stance for those units

#### Scenario: Invalid stance command

- **WHEN** a stance command has no units or an unknown unit
- **THEN** the simulation emits a rejection event and the hash is unchanged
