## ADDED Requirements

### Requirement: Preview cone matches gameplay vision

The preview cone SHALL use the same 65-degree forward cone and facing rule as the
simulation, and SHALL rotate from the previewed destination toward the selected
threat.

#### Scenario: Preview cone points at the threat

- **WHEN** a target or ground order is previewed with a known threat
- **THEN** the cone points from the planned destination toward that threat

#### Scenario: Preview cone uses gameplay angle

- **WHEN** the preview draws a cone
- **THEN** its full angle equals the simulation's 65-degree vision cone

## MODIFIED Requirements

### Requirement: Cover-first preview

The preview SHALL show the same cover-first destinations the simulation will use,
including soldiers entering cover before reaching the formation's ideal slot.
Defend previews SHALL clamp every destination to the same 8 m region as the
simulation.

#### Scenario: Cover available

- **WHEN** a reachable cover position is available near the pending destination
- **THEN** the preview path ends at that cover and the cone faces the threat side

#### Scenario: No cover available

- **WHEN** no reachable cover position exists
- **THEN** the preview falls back to the formation slot

#### Scenario: Defend stays inside the region

- **WHEN** a defend order is previewed near the region edge
- **THEN** every previewed destination stays within 8 m of the picked point

### Requirement: Visual facing cone

The view SHALL draw a translucent cone for a soldier's facing/covered arc, using
the gameplay cone angle, separate from the selection ring and the casualty marker.

#### Scenario: Cone follows facing

- **WHEN** a soldier changes facing or takes cover
- **THEN** the cone rotates with the facing direction

#### Scenario: Preview cone

- **WHEN** a target order is pending
- **THEN** the preview shows the intended facing cone before commitment
