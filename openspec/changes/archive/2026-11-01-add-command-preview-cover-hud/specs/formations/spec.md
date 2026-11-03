## ADDED Requirements

### Requirement: Formation slots yield to cover

Formation slots SHALL define the group's shape but SHALL NOT force a soldier to
stand exposed when a reachable cover position is available.

#### Scenario: Formation with cover
- **WHEN** a formation move has nearby reachable cover
- **THEN** each eligible soldier uses cover while the group keeps its general
  direction and spacing

#### Scenario: Formation without cover
- **WHEN** no nearby cover is reachable
- **THEN** the formation slots are used unchanged

#### Scenario: Formation change during cover
- **WHEN** the player changes formation while soldiers are moving to cover
- **THEN** the primary order remains and the cover plan is retained where valid
