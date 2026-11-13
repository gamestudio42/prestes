## ADDED Requirements

### Requirement: Battle events in the map document

A map document SHALL be able to carry the map's battle events and event
places (battle-events), and they SHALL be compiled into the map shared by
the simulation and the view. The document format SHALL move to version 9:
a document of version 8 or older SHALL load with no events and no event
places and play as before; saving SHALL always write version 9. Events and
places SHALL take part in the battle's state hash only through what they
make happen, so a battle on a map without events SHALL give the same state
hash as at version 8.

#### Scenario: Old map opens
- **WHEN** the author opens a version 8 map
- **THEN** it loads with no events, plays as before, and saving writes version 9

#### Scenario: Round trip
- **WHEN** a map with three events and two places is exported and imported
- **THEN** the events and places are identical, in the same order and ids

#### Scenario: Same hash without events
- **WHEN** a version 8 map without events is played with the same seed and commands before and after this change
- **THEN** the state hashes match on every tick
