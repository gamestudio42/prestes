## ADDED Requirements

### Requirement: Both-sides control

The sandbox SHALL allow the player to control both factions, select either
section and issue orders to it.

#### Scenario: Select the legalist squad
- **WHEN** both-sides control is enabled
- **THEN** the legalist section card appears and can be selected

#### Scenario: Order the legalist squad
- **WHEN** the legalist squad is selected
- **THEN** movement, formation, stance and tactical orders apply to its units

### Requirement: Reinforcements

The sandbox SHALL add riflemen to either faction at deterministic rear positions.

#### Scenario: Reinforce both sides
- **WHEN** the player adds a column rifleman and a legalist rifleman
- **THEN** both units appear in the frame with the correct faction and squad

### Requirement: Combat demonstration test

The browser suite SHALL run a two-sided sandbox scenario that reinforces both
sides, exercises the implemented orders and records a video.

#### Scenario: Both-sides browser run
- **WHEN** the test controls both factions and steps the simulation
- **THEN** every issued command is accepted, the tick advances and a video is
  written to the test results
