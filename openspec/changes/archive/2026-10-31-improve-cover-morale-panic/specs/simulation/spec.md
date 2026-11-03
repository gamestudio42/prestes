## MODIFIED Requirements

### Requirement: Cover and line of sight

Hit chance and suppression accumulation SHALL account for directional cover,
distance, target stance and the equipped weapon. A cover volume SHALL protect a
unit only when it lies between that unit and the threat. Low cover SHALL require
crouching or lying down; high cover MAY protect a standing unit. The building
SHALL block line of sight and movement.

#### Scenario: Cover only protects from the covered side

- **WHEN** a unit is behind a sandbag relative to the shooter
- **THEN** it receives cover against that shooter

#### Scenario: Flanking ignores the front cover

- **WHEN** a shooter is on the open side of a sandbag
- **THEN** the unit does not receive that sandbag's cover against the shooter

#### Scenario: Low cover requires a low stance

- **WHEN** a standing unit is directly behind a low sandbag
- **THEN** it receives less cover than the same unit crouched or prone

#### Scenario: Crouching or lying reduces exposure

- **WHEN** a target crouches or lies down
- **THEN** its cover value increases and incoming hit chance decreases

#### Scenario: Building blocks fire

- **WHEN** the building lies between a shooter and a target
- **THEN** the shooter does not acquire that target

### Requirement: Morale and suppression

Hits and near misses SHALL raise suppression and lower morale. Suppression SHALL
decay when the unit is no longer under fire. Cover SHALL reduce both hit chance and
suppression accumulation. A unit above the suppression threshold SHALL be
`suppressed`; a unit with high suppression SHALL be `pinned`; a pinned unit with
very low morale SHALL become `panicked`.

#### Scenario: Fire suppresses

- **WHEN** a unit is hit or near-missed repeatedly
- **THEN** its suppression rises, its morale falls and the frame marks it suppressed

#### Scenario: Cover reduces suppression

- **WHEN** two units receive the same fire, one behind cover and one in the open
- **THEN** the covered unit accumulates less suppression

#### Scenario: Suppression decays

- **WHEN** a unit is no longer under fire
- **THEN** its suppression decreases over time

## ADDED Requirements

### Requirement: Pinned and panic reaction

An uncovered suppressed unit SHALL crouch or lie down unless its stance is locked.
A pinned unit SHALL seek retrograde cover or hunker in place. A panicked unit SHALL
stop fighting and obey no player order until it leaves the map. Panic SHALL
override a player stance lock.

#### Scenario: Uncovered soldier lies down

- **WHEN** a suppressed unit is exposed and has no stance lock
- **THEN** it drops to crouched or prone

#### Scenario: Pinned soldier seeks cover

- **WHEN** a pinned unit has retrograde cover within reach
- **THEN** it moves to that cover

#### Scenario: Panic overrides stance

- **WHEN** a unit becomes panicked with a locked stance
- **THEN** its stance changes and it begins to flee

### Requirement: Routed units

A panicked unit SHALL flee toward the nearest map edge. When it crosses the map
boundary it SHALL become `routed`, emit a `unit_routed` event, stop firing, stop
moving and stop blocking cover. A routed unit SHALL NOT count as a combat-effective
unit.

#### Scenario: Panic reaches the edge

- **WHEN** a panicked unit reaches a map boundary
- **THEN** it becomes routed and a `unit_routed` event is emitted

#### Scenario: Routed unit leaves the fight

- **WHEN** a unit is routed
- **THEN** it cannot fire, move or be targeted

## MODIFIED Requirements

### Requirement: Outcome

The simulation SHALL expose an outcome: playing, victory when every legalist unit
is dead or routed, or defeat when every player unit is dead or routed.

#### Scenario: Victory

- **WHEN** the last combat-effective legalist unit is removed
- **THEN** the frame outcome becomes victory

#### Scenario: Defeat

- **WHEN** the last combat-effective player unit is removed
- **THEN** the frame outcome becomes defeat

#### Scenario: Routed unit counts as lost

- **WHEN** the last player unit routes off the map
- **THEN** the outcome becomes defeat


