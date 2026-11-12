## MODIFIED Requirements

### Requirement: Large battle laboratory

The game SHALL start a 3v3 battle between the player's roster and the enemy's roster, on the battle map the player chose (the test map, `campo-de-provas`, when none is chosen), from the skirmish setup screen. With the default roster each side fields three rifle sections of 11 soldiers, 66 units in all, as before. Each section SHALL be selectable by clicking any of its soldiers. The two sides SHALL deploy in their map's deployment zones, about 180 m apart, out of rifle range, so that contact begins when one side moves. As a training battle, riflemen SHALL carry the training load (5 + 45 rounds) and the other weapons their own training loads. The menu entry SHALL be localized in PT-BR and EN.

#### Scenario: Start 3v3
- **WHEN** the player starts the 3v3 battle from the skirmish setup with the default roster
- **THEN** 66 units are created in six squads and each side has three troops

#### Scenario: Start from the menu
- **WHEN** the player builds a roster and starts the 3 vs 3 from the skirmish setup screen
- **THEN** the battle starts with the player's roster against the enemy's on the chosen map

#### Scenario: No contact at deployment
- **WHEN** the battle starts on any map with any rosters and no order is given for 10 s
- **THEN** no shot is fired
