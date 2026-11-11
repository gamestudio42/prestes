## MODIFIED Requirements

### Requirement: Training ammunition load

In the training exercise, every player soldier and the instructor SHALL carry a
5-round magazine and a 45-round reserve, for 50 rounds per station. The 3 vs 3
battle, a training battle between sections on the test map (`campo-de-provas`),
SHALL issue the same load to every soldier of both sides: at the aimed rate of
fire 20 rounds last about 80 seconds, and the battle runs for minutes. The
training enemy, dummies and the sandbox SHALL keep the Mauser profile's 20
rounds. Historical note: the load represents depot issue to a regular army
training troop and is a game abstraction, not a sourced figure; the Coluna's
scarcity (Macaulay, p. 113) remains the default model. The readout uses the
existing PT-BR and EN ammunition strings; no new strings are added.

#### Scenario: Training troop starts with the training load

- **WHEN** a training exercise starts
- **THEN** every living player soldier and the instructor have 5 rounds in the
  magazine and 45 in reserve

#### Scenario: The 3 vs 3 battle draws the training load

- **WHEN** the 3 vs 3 battle starts
- **THEN** all 66 soldiers have 5 rounds in the magazine and 45 in reserve

#### Scenario: Other modes keep the sandbox model

- **WHEN** the sandbox starts, or a training enemy spawns
- **THEN** those soldiers have 5 rounds in the magazine and 15 in reserve
