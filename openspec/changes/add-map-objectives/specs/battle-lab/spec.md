## MODIFIED Requirements

### Requirement: Battle end

The 3v3 SHALL end in victory when every enemy soldier is dead, incapacitated or routed, and in defeat when every player soldier is. On a map with objectives it SHALL also end at the battle clock's limit or when a side holds every objective for 2 minutes, with the outcome decided as the map-objectives capability states (victory, defeat or draw). On the end the simulation SHALL emit one end event and the view SHALL show an end panel with the result, how it was decided, the battle time, each side's casualties and, with objectives, each objective's owner and each side's value, and actions to restart the battle or return to the menu. The panel text SHALL be localized in PT-BR and EN.

#### Scenario: Victory
- **WHEN** the last fit enemy soldier is incapacitated
- **THEN** the battle ends in victory and the end panel shows the time and casualties

#### Scenario: Restart
- **WHEN** the player chooses restart on the end panel
- **THEN** a new 3v3 battle starts with all 66 soldiers on the same map and time limit

#### Scenario: Decided on objectives
- **WHEN** the clock runs out on the Fazenda with the column holding more value
- **THEN** the battle ends in victory and the panel lists the objectives and values
