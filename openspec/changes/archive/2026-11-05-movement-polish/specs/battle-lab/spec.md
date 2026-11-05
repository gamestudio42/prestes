## MODIFIED Requirements

### Requirement: Battle feel report

A deterministic headless run of the 3v3, in which the player's troops hold their own line and counterattack by bounds once they outnumber the enemy 1.25 to 1, SHALL report the battle time, the outcome, each side's casualties, the shots per casualty, the largest number of shots on one tick, the longest stretch with no shot while both sides had fit soldiers, and bunching: the largest share of a side's fit soldiers (while it has 6 or more), over the battle, standing halted with a mate within 1 m, closer than a man's width (men passing each other on the move do not count). A test SHALL keep these within target bands: the battle ends within 3 to 10 minutes of simulated time, no tick holds more than 8 shots, no stretch without fire lasts over 75 s (a section crossing the ground between the lines out of range), and bunching stays under 15%.

#### Scenario: Report within bands
- **WHEN** the report runs with its fixed seed and orders
- **THEN** the battle ends and every figure lies within its band

#### Scenario: Sections keep their room
- **WHEN** the enemy defends its line and then attacks
- **THEN** fewer than 15% of its fit soldiers ever have a mate within 1 m
