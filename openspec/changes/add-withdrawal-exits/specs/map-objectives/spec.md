## MODIFIED Requirements

### Requirement: Battle clock and victory

The skirmish setup screen SHALL let the player choose a time limit of 15,
20 or 30 minutes (default 20), localized, and SHALL show the chosen map's
objectives (name, value and initial owner, and their flags over the map's
preview) while the player builds his force. The battle SHALL end at the time limit,
or earlier when a side holds every objective for 2 continuous minutes, or
when a side breaks or has no fit soldier. The winner SHALL be: the side
that is not broken when the other breaks; otherwise the side holding more
objective value at the end; equal value SHALL be a draw. On a map with a
withdrawal (map-withdrawal capability), the withdrawal's rules SHALL decide
instead for the column: meeting the requirement SHALL be a victory decided by
withdrawal, the time limit or no fit column soldier on the field without it
SHALL be a defeat decided as "cut off", and the column SHALL NOT win by
holding every objective or by objective value; the legalists holding every
objective for 2 minutes SHALL still be a defeat. The end panel SHALL show
each objective's owner and each side's value, and how the battle was
decided, localized in EN and PT-BR.

#### Scenario: Objectives shown before the battle
- **WHEN** the player chooses the test map on the setup screen
- **THEN** the screen lists its objectives with their values and initial owners and marks them on the preview

#### Scenario: Time runs out
- **WHEN** the clock reaches the limit with the column holding value 4 and the legalists value 3
- **THEN** the battle ends in victory and the panel says it was decided on objectives

#### Scenario: All objectives held
- **WHEN** the column holds every objective for 2 minutes
- **THEN** the battle ends in victory before the time limit

#### Scenario: Draw
- **WHEN** the time limit is reached with equal value
- **THEN** the battle ends in a draw

#### Scenario: Time runs out on a withdrawal map
- **WHEN** on a map with a withdrawal the clock reaches the limit with the column holding more objective value but short of the requirement
- **THEN** the battle ends in defeat and the panel says the column was cut off
