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
- **WHEN** the clock runs out on the test map with the column holding more value
- **THEN** the battle ends in victory and the panel lists the objectives and values

### Requirement: Battle feel report

A deterministic headless run of the 3v3 on the test map, in which the player's troops hold their own line and then counterattack once they outnumber the enemy 1.25 to 1 or once they hold less objective value, going for the objective of most value they do not hold, SHALL report the battle time, the outcome, how it was decided, each side's casualties, the shots per casualty, the largest number of shots on one tick, the longest stretch with no shot while both sides had fit soldiers, bunching (the largest share of a side's fit soldiers, while it has 6 or more, standing halted with a mate within 1 m; men passing each other on the move do not count), the men who went into a position and the close assaults started and won per side, and each objective's owner and the time it was taken. A test SHALL keep these within target bands: the battle ends within the report's 15-minute time limit, no tick holds more than 8 shots, no stretch without fire lasts over 120 s (with objectives a section may march the map to a far objective out of range; that walk is not a stall), and bunching stays under 15%. The report SHALL also run on any authored map named on its command line, for the author's own review.

#### Scenario: Report within bands
- **WHEN** the report runs on the test map with its fixed seed and orders
- **THEN** the battle ends and every figure lies within its band

#### Scenario: Sections keep their room
- **WHEN** the enemy defends its line and then attacks
- **THEN** fewer than 15% of its fit soldiers ever have a mate within 1 m

#### Scenario: Report on an authored map
- **WHEN** the author runs the report naming a saved skirmish map
- **THEN** it prints the same figures for that map, without failing on the bands
