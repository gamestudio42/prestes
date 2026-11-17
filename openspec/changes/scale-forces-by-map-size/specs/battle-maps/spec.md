## ADDED Requirements

### Requirement: Force limits by map size

Each map size SHALL carry the force limits that every roster fielded on a
map of that size obeys at the start of the battle: the player's roster, a
roster built for the enemy, the map's enemy presets and a campaign map's
fixed column force.

| Size | Side | Men | Sections | Command | Machine guns | Automatic rifles | Cangaceiros |
|---|---|---|---|---|---|---|---|
| small | 240 m | 33 | 6 | 1 | 1 | 2 | 1 |
| medium | 400 m | 66 | 12 | 1 | 2 | 4 | 1 |
| large | 640 m | 100 | 16 | 1 | 3 | 6 | 1 |

Sections that arrive by a battle event SHALL NOT count against them (battle-events,
"Troops enter"). The limits SHALL be one table shared by the setup screen,
the map editor, the map check and the battle's own roster check, so the
same roster is accepted or refused alike everywhere.

#### Scenario: The same roster on two sizes
- **WHEN** a roster of four rifle sections (44 men) is checked for a small and for a medium map
- **THEN** it is refused for the small map as over 33 men and accepted for the medium map

#### Scenario: The battle refuses what the screen refuses
- **WHEN** a battle is asked to start on a small map with a roster of 44 men
- **THEN** the battle does not start and reports the roster as over the limit

#### Scenario: Arrivals are not counted
- **WHEN** a small map's events bring 40 legalist men during the battle
- **THEN** the map check accepts the map and the men enter

### Requirement: Campaign forces on medium maps

The medium campaign maps SHALL start with forces that fill their field:
on Catanduvas (`frente-do-parana`), Porto Mendes (`a-divisao`), São Luiz /
Ramada (`anel-de-ferro`), Serra Nova (`serra-nova`) and Pantanal
(`pantanal`), the column's fixed force SHALL hold 40 to 55 men and each
enemy preset 40 to 60 men, within the medium limits. The enemy's arrivals by
event SHALL begin by 180 s, and none SHALL be later than 540 s, unless an
event is triggered by the player's own move. Each map SHALL keep its
chapter's historical figure as the column's commander and the column's
perspective (historical-commander). The small campaign maps (Copacabana,
Ponte de Verdinho, La Gaiba) SHALL keep their forces.

Historical note: at São Luiz Gonzaga the column numbered in the low
thousands and the government forces closed on it from several directions
(`macaulay-1974`; chapter `anel-de-ferro` sources). The game's forces are a
dramatized sample of those numbers, and the chapter stays labelled
dramatized.

#### Scenario: A medium chapter fields a company
- **WHEN** the São Luiz / Ramada chapter starts
- **THEN** the column fields 40 to 55 men under Luís Carlos Prestes and the enemy 40 to 60 men

#### Scenario: Copacabana is unchanged
- **WHEN** the prologue (Copacabana) starts
- **THEN** the column and the enemy field the same sections as before this change

#### Scenario: The map check holds the bands
- **WHEN** a medium campaign map's column force is edited down to 30 men
- **THEN** the content check fails naming the map and the band

### Requirement: São Luiz / Ramada uses its whole field

The São Luiz / Ramada map (`sao-luiz-ramada`, chapter `anel-de-ferro`,
commander Luís Carlos Prestes, column perspective) SHALL use its
north-east quarter: it SHALL hold a legalist entry point there and a
legalist force that starts in or enters through that quarter during the
battle, and an objective or a route the column may use there. No quarter of
a medium campaign map SHALL be without an objective, a deployment area, an
entry point or an event area.

Historical note: the legalist encirclement of São Luiz from several sides is
recorded (`macaulay-1974`); the flank force in the north-east, and where it
enters, are dramatized.

#### Scenario: Pressure from the north-east
- **WHEN** the São Luiz / Ramada chapter runs to 300 s with the column holding its start
- **THEN** a legalist section has stood in or entered through the north-east quarter

#### Scenario: Every quarter is used
- **WHEN** the content check reviews the medium campaign maps
- **THEN** each quarter of each map holds an objective, a deployment area, an entry point or an event area

### Requirement: Performance budget for large forces

With 66 men a side on the test map, the battle SHALL run under 8 ms per tick
in the headless bench, garrisons included, and the view SHALL hold 30
frames per second at strategic zoom on the reference machine.

#### Scenario: Two companies within budget
- **WHEN** the bench runs 3,000 ticks of twelve sections against twelve on the test map
- **THEN** the mean tick time is under 8 ms

## MODIFIED Requirements

### Requirement: Enemy presets in the map document

A map document SHALL be able to carry the legalist forces one of which is
drawn when the player brings a roster (pre-battle-roster's map presets);
without them the enemy fields the default roster. The map check SHALL refuse
a preset that is not a valid legalist roster under the force limits of the
map's own size, and SHALL check that every section type deploys in every
slot of both sides, up to the section limit of that size.

#### Scenario: The test map's presets
- **WHEN** the player brings a roster to the test map and leaves the enemy to chance
- **THEN** the enemy fields one of the test map's three presets, the same one for the same seed

#### Scenario: A preset judged by its map
- **WHEN** a small map carries a preset of 44 men and a medium map the same preset
- **THEN** the map check refuses the small map's preset and accepts the medium map's
