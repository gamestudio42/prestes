## ADDED Requirements

### Requirement: Troop cohesion

Each active soldier SHALL have cohesion that updates from squad spacing and officer
proximity. Low cohesion SHALL reduce movement speed, and auto-cover SHALL prefer
positions near the squad centroid.

#### Scenario: Spacing reduces cohesion
- **WHEN** a soldier moves far from the troop
- **THEN** its cohesion falls below 100

#### Scenario: Cohesion slows movement
- **WHEN** cohesion is low
- **THEN** the movement step is reduced

### Requirement: One-side flank

A group flank SHALL choose a single side of the target and assign every flanker to a
candidate on that side.

#### Scenario: All flankers use one side
- **WHEN** a group flanks
- **THEN** all flank paths finish on the same side of the target

#### Scenario: Flank fallback
- **WHEN** no side candidate has a path
- **THEN** the affected unit falls back to attack
