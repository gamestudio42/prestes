## ADDED Requirements

### Requirement: Campaign battle length report

The battle report SHALL run each medium campaign map with its own forces,
commander and events, with the player's troops holding their start and
then counterattacking as in the battle feel report, and SHALL add to its
figures the time of the first shot. A test SHALL hold each of these maps,
on seeds 1922, 7 and 42, to the first shot within 120 s and a decided
battle (victory or defeat, not the time limit) within 720 s. The figures
are a target the owner reviews in play; a band moved after review SHALL be
recorded with its date in the design of the change that moves it.

#### Scenario: Contact comes early
- **WHEN** the report runs São Luiz / Ramada on seed 1922
- **THEN** the first shot is fired within 120 s

#### Scenario: Medium chapters end in time
- **WHEN** the report runs each medium campaign map on seeds 1922, 7 and 42
- **THEN** each battle is decided within 720 s

#### Scenario: First shot in the report
- **WHEN** the author runs the report on any map
- **THEN** it prints the time of the first shot with the other figures
