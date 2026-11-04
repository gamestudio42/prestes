## ADDED Requirements

### Requirement: Training ground terrain

The training map SHALL have its own terrain features (road, parade ground,
firing range, fields and hedgerows), separate from the sandbox terrain, and the
simulation and the view SHALL read them from the same data. Terrain speed and
cover rules SHALL apply to it as to the sandbox terrain.

#### Scenario: Road speeds the march

- **WHEN** a section marches along the training road
- **THEN** it moves at the road's terrain speed

#### Scenario: Sandbox unchanged

- **WHEN** the sandbox starts
- **THEN** it uses the sandbox terrain and props, not the training ground
