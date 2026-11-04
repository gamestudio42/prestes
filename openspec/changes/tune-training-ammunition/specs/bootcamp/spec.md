## MODIFIED Requirements

### Requirement: Station ammunition refill

At the start of every station, and on retry, the player troop SHALL have its
magazine and reserve restored to the training ammunition load.

#### Scenario: Refill on station start

- **WHEN** station 3 starts after the section spent ammunition in station 2
- **THEN** every living player soldier has 5 rounds in the magazine and 45 in
  reserve
