## Purpose

Defines the deterministic sandbox terrain: its height, surfaces and how height
and surface change movement and cover.

## ADDED Requirements

### Requirement: Deterministic terrain height

The sandbox SHALL define terrain from deterministic height features. Height SHALL
be a pure function of position and SHALL be used by both simulation and view.

#### Scenario: Ridge is high ground

- **WHEN** a position is inside the ridge feature
- **THEN** its terrain height is greater than flat ground

#### Scenario: Trench is low ground

- **WHEN** a position is inside the trench feature
- **THEN** its terrain height is lower than flat ground

#### Scenario: Height is deterministic

- **WHEN** the same position is sampled twice
- **THEN** both samples return the same height

### Requirement: Terrain changes movement speed

Unit movement SHALL be multiplied by a terrain speed factor derived from local
slope and surface. Uphill and rough ground SHALL reduce speed; road SHALL increase
it.

#### Scenario: Ridge slows movement

- **WHEN** a unit crosses the ridge
- **THEN** its step is smaller than on flat grass

#### Scenario: Road speeds movement

- **WHEN** a unit moves on the road surface
- **THEN** its speed factor is greater than on grass

### Requirement: Terrain provides cover

Terrain SHALL provide cover when the unit is in a trench or crater, or when a
ridge lies between the unit and the threat. Terrain and sandbag cover SHALL NOT
stack; the higher value applies.

#### Scenario: Trench cover

- **WHEN** a unit stands inside the trench
- **THEN** it receives trench cover against a threat

#### Scenario: Ridge cover

- **WHEN** the ridge lies between a unit and the threat
- **THEN** the unit receives ridge cover

#### Scenario: Cover does not stack

- **WHEN** a unit has both sandbag and terrain cover
- **THEN** the effective cover is the higher value, not the sum
