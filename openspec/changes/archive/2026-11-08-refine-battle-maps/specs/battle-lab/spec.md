## ADDED Requirements

### Requirement: A decided battle ends

When a side's fit soldiers fall below one fifth of its starting strength and
it has had no contact for 60 s, its remaining fit soldiers SHALL fall back
off the field toward their own map edge as routed, and the battle SHALL end
with the other side's victory once they are routed. Fallen and
incapacitated men stay as casualties. The end panel SHALL count the men who
fell back as routed. With the default rosters, every battle map's battle
report SHALL end with an outcome on three seeds. A battle's length is not
fixed here: map objectives (add-map-objectives) will shape it.

#### Scenario: Last survivors fall back
- **WHEN** the enemy has 5 of 33 fit soldiers left and no contact for 60 s
- **THEN** they rout toward the enemy's edge and the battle ends in victory

#### Scenario: Battles end on every map
- **WHEN** the battle report runs on Fazenda, Serra e Rio and Bairro with seeds 1922, 7 and 42
- **THEN** every run ends with an outcome within the report's 15 minutes

### Requirement: Concealed fire at range

A concealed soldier who fires SHALL be revealed for 4 s only to enemy
observers within 50 m of him; observers farther away SHALL instead receive
the unseen-fire marker near him, as for any unseen shooter. When a section
whose fire control the player has not set settles in concealing vegetation,
its fire control SHALL become "fire on contact" (hold fire until an enemy
is within 60 m). A soldier revealed by his own fire SHALL be marked
"Revelado" in his ring and in the HUD, localized in PT-BR and EN.

#### Scenario: Long-range shot from the capim
- **WHEN** a soldier prone in the capim fires at an enemy 117 m away
- **THEN** the enemy side is not shown him but gets a "?" marker near him

#### Scenario: Close shot gives him away
- **WHEN** the same soldier fires at an enemy 30 m away
- **THEN** that enemy's side sees him for 4 s

#### Scenario: Concealed section holds its fire
- **WHEN** a section with default fire control goes prone in the canefield
- **THEN** it holds fire until an enemy comes within 60 m

### Requirement: The winning side searches

When a side's commander has sections idle and knows of no enemy, those
sections SHALL sweep, in order: the last known enemy positions, then the
concealing vegetation, enclosed yards and crossings within 60 m of them,
then the enemy's deployment zone. Sweeping sections SHALL move by bounds and
attack an enemy they see. Searching SHALL use only what the side knows (fog
of war).

#### Scenario: Search the cane
- **WHEN** the last enemy section hides crouched in the Fazenda canefield after being seen entering it
- **THEN** an idle legalist section sweeps the canefield within 2 minutes

#### Scenario: No cheating
- **WHEN** an enemy section hides somewhere it was never seen near
- **THEN** the searching sections do not head straight for it
