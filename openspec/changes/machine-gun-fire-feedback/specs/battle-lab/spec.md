## MODIFIED Requirements

### Requirement: Battle feel report

A deterministic headless run of the 3v3, in which the player's troops hold their own line and counterattack by bounds once they outnumber the enemy 1.25 to 1, SHALL report the battle time, the outcome, each side's casualties, the shots per casualty, the largest number of shots on one tick, the longest stretch with no shot while both sides had fit soldiers, and bunching: the largest share of a side's fit soldiers (while it has 6 or more), over the battle, standing halted with a mate within 1 m, closer than a man's width (men passing each other on the move do not count). For each side and weapon it SHALL report the rounds fired, the bursts and the hits, and, for each machine gun, the share of the time its gunner had an enemy in sight and reach during which the gun was set (an attack's objective out of sight does not count). A test SHALL keep these within target bands: the battle ends within 3 to 10 minutes of simulated time, no tick holds more than 8 shots, no stretch without fire lasts over 75 s (a section crossing the ground between the lines out of range), bunching stays under 15%, and, in the band test's machine-gun runs (the mixed player roster against the test map's enemy presets, seed 1922; held only in a battle that lasts 600 s or more, since a battle decided early gives the gun too few targets), the gun is set during at least 70% of the time it has an enemy in sight and reach and fires at least 10 bursts.

#### Scenario: Report within bands
- **WHEN** the report runs with its fixed seed and orders
- **THEN** the battle ends and every figure lies within its band

#### Scenario: Sections keep their room
- **WHEN** the enemy defends its line and then attacks
- **THEN** fewer than 15% of its fit soldiers ever have a mate within 1 m

#### Scenario: The machine gun is accounted for
- **WHEN** the report runs a band-test preset whose player roster holds a machine gun
- **THEN** it lists the gun's rounds, bursts and hits, and the gun was set during at least 70% of the time it had an enemy in sight and reach
