## MODIFIED Requirements

### Requirement: Pause and speed

The HUD SHALL pause the simulation and offer three speeds labelled 0.5x, 1x and
2x, which request one, two and four ticks per 100 ms interval. The game SHALL
start at 1x, and starting, retrying or continuing an exercise SHALL reset the
speed to 1x. 0.5x is the slow option for players who want it.

#### Scenario: Pause stops ticks

- **WHEN** the player pauses
- **THEN** the simulation tick stops advancing until resumed

#### Scenario: Default speed

- **WHEN** the player starts or retries the bootcamp or the sandbox
- **THEN** the 1x speed is selected and the client requests two ticks per
  100 ms interval

#### Scenario: Speed multiplies ticks

- **WHEN** the player selects 0.5x or 2x
- **THEN** the client requests one or four ticks per 100 ms interval
