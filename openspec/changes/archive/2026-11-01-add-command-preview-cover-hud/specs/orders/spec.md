## ADDED Requirements

### Requirement: Previewable order intent

Every selectable order SHALL expose a previewable intent before commitment,
covering paths, destinations, cover positions and facing.

#### Scenario: Previewable catalogue
- **WHEN** the player chooses any catalogued order
- **THEN** the order can be previewed before it is sent to the simulation

#### Scenario: Commit uses preview
- **WHEN** the player confirms a previewed order
- **THEN** the committed command uses the previewed destination or target

### Requirement: Cover-first destinations

For orders that move soldiers, the controller SHALL prefer a reachable cover
position near the formation destination, then fall back to the formation slot.

#### Scenario: Cover preferred
- **WHEN** a soldier has a reachable cover position near its slot
- **THEN** its commanded destination is the cover position

#### Scenario: Formation fallback
- **WHEN** no reachable cover position exists
- **THEN** the soldier keeps its formation slot

#### Scenario: Travel enters cover
- **WHEN** a soldier approaches its cover destination
- **THEN** the path ends behind the cover and the soldier adopts a covered stance
