## MODIFIED Requirements

### Requirement: Historical figure registry

The project SHALL provide a machine-readable registry of historical figures. Each
entry SHALL include an id, a display name, a role, a playable flag, content labels
and at least one source reference. Siqueira Campos, Luís Carlos Prestes, Miguel
Costa and Isidoro Dias Lopes SHALL be playable, since each commands a campaign
map (on the field or as a voice).

#### Scenario: Registry contains the vertical-slice figures

- **WHEN** the registry is loaded
- **THEN** it contains entries for Siqueira Campos and Luis Carlos Prestes with roles and source references

#### Scenario: Figure without a source is rejected

- **WHEN** a registry entry has no source reference
- **THEN** the historical-content validation fails and names the figure id

#### Scenario: Chapter commanders are playable

- **WHEN** the registry is loaded
- **THEN** Miguel Costa and Isidoro Dias Lopes are playable

### Requirement: Playable figure and mission commander

The project SHALL provide a validation contract that ties a mission to one
playable historical figure and one perspective. A mission SHALL NOT reference an
unknown or non-playable commander. A campaign map that declares a commander
SHALL declare the `commanderId` of the chapter its mission belongs to.

#### Scenario: Valid commander is accepted

- **WHEN** a mission declares a playable figure id that exists in the registry
- **THEN** validation accepts the mission metadata

#### Scenario: Non-playable commander is rejected

- **WHEN** a mission declares a figure whose playable flag is false
- **THEN** validation fails with a commander error

#### Scenario: Unknown commander is rejected

- **WHEN** a mission declares a figure id absent from the registry
- **THEN** validation fails with an unknown-figure error

#### Scenario: Map commander differs from the chapter's

- **WHEN** the map Porto Mendes (mission `a-divisao`, chapter commander Miguel Costa) declares Luís Carlos Prestes as its commander
- **THEN** validation fails with a commander error naming the map
