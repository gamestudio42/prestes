## MODIFIED Requirements

### Requirement: Large battle laboratory

The game SHALL start a 3v3 battle with three player troops and three enemy troops of 11 soldiers each, for 66 units total, from the start menu (beside the bootcamp) and from the sandbox panel, on the battle map the player chose (the Vila Militar field when none is chosen). Each troop SHALL be selectable by clicking any of its soldiers. The two sides SHALL deploy in their map's deployment zones, about 180 m apart, out of rifle range, so that contact begins when one side moves. On every map, as it is still a training battle, both sides SHALL carry the training ammunition load (5 + 45 rounds). The menu entry SHALL be localized in PT-BR and EN.

#### Scenario: Start 3v3
- **WHEN** the player starts the 3v3 battle in the sandbox
- **THEN** 66 units are created in six squads and each side has three troops

#### Scenario: Start from the menu
- **WHEN** the player chooses the 3 vs 3 battle on the start menu
- **THEN** the battle starts with the same 66 units on the chosen map, without opening the sandbox

#### Scenario: No contact at deployment
- **WHEN** the battle starts on any map and no order is given for 10 s
- **THEN** no shot is fired

## ADDED Requirements

### Requirement: Map defensive lines

Each battle map SHALL place each side's defensive line from its own data:
trench bays with parapets on Fazenda, banks, rocks and scrub edges on Serra e
Rio, and barricades and house corners on Bairro. Each line SHALL give every
section of its side a position with cover facing the enemy deployment zone.
The enemy commander's advance toward "the player's deployment side" SHALL use
the active map's player deployment zone.

#### Scenario: Enemy takes its line
- **WHEN** the 3v3 starts on Bairro
- **THEN** the enemy sections move into cover in their line, facing the player's zone, before contact

#### Scenario: Search toward the right side
- **WHEN** the enemy commander attacks with nothing known on Serra e Rio
- **THEN** its sections advance toward the player's deployment zone by a crossing
