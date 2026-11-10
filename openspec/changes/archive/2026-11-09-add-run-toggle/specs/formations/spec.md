## ADDED Requirements

### Requirement: Run on the player's order

The player SHALL be able to set a section's pace to Walk or Run. While Run
is set, its soldiers SHALL move at the run gait in every order except
recon, which keeps its slow gait. Running SHALL tire them as any run does: a
winded soldier walks until he recovers. The pace SHALL stay set until the
player changes it, and SHALL NOT enter the state hash while it is Walk.

#### Scenario: A running section crosses faster
- **WHEN** two equal sections are ordered to move over the same open 40 m,
  one at Walk and one at Run
- **THEN** the running section arrives in less than two thirds of the time

#### Scenario: Recon stays slow
- **WHEN** a section at Run is ordered to recon
- **THEN** it moves at the slow gait

#### Scenario: Running still tires
- **WHEN** a section at Run moves until its soldiers' fatigue passes 70
- **THEN** they walk until it falls below 50

#### Scenario: Walk leaves the hash unchanged
- **WHEN** a battle is played with the pace never changed
- **THEN** its state hash equals the recorded golden
