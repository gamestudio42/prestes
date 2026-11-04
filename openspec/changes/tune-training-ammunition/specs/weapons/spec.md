## ADDED Requirements

### Requirement: Training ammunition load

In the training exercise, every player soldier and the instructor SHALL carry a
5-round magazine and a 45-round reserve, for 50 rounds per station. The training
enemy, dummies, the sandbox and the battle lab SHALL keep the Mauser profile's
20 rounds. Historical note: the load represents depot issue to a regular army
training troop at Vila Militar and is a game abstraction, not a sourced figure;
the Coluna's scarcity (Macaulay, p. 113) remains the default model. The readout
uses the existing PT-BR and EN ammunition strings; no new strings are added.

#### Scenario: Training troop starts with the training load

- **WHEN** a training exercise starts
- **THEN** every living player soldier and the instructor have 5 rounds in the
  magazine and 45 in reserve

#### Scenario: Other modes keep the sandbox model

- **WHEN** the sandbox starts, or a training enemy spawns
- **THEN** those soldiers have 5 rounds in the magazine and 15 in reserve
