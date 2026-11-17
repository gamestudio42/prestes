## MODIFIED Requirements

### Requirement: Skirmish setup screen

The desk menu SHALL show one generic skirmish map; activating it SHALL open
a setup screen where the player chooses, before the 3 vs 3 starts, the map,
the enemy and his own force, and then starts the battle ("Combater") or
returns to the desk ("Voltar"). The map choice SHALL list every battle map
with its preview and description. The player builds his force, of the
Coluna Prestes, by adding, removing and ordering sections of that army. A
roster SHALL hold at most the force limits of the chosen map's size (battle-maps,
"Force limits by map size"): its men, its sections, one command section,
one section of cangaceiros, and the machine-gun crews and automatic rifles
(Fogão com fuzil-metralhador, Guarnição de fuzil-metralhador and Jagunços
com Mauser together) that size allows. On a small map these are 33 men, 6
sections, one machine gun and two automatic rifles, as before. The screen
SHALL show the men used and the sections used against the chosen map's
limits, and why an addition is refused. When the player chooses a map whose
limits the roster exceeds, the roster SHALL be kept, the screen SHALL say
which limit it breaks, and "Combater" SHALL stay disabled until the roster
fits. A default roster of three rifle sections of the army
SHALL be one action away. The enemy SHALL be one of: "Sorteado" (a preset of
the map drawn by seed, the default), a preset of the map chosen by name, or
a roster the player builds under the same rules for one enemy army he
chooses, the Forças legalistas or the Batalhões patrióticos. A preset SHALL
show the armies it holds. The last map, roster and enemy choice SHALL be
saved in local storage and offered again, a saved roster judged against the
saved map's limits; a roster saved before the armies
existed SHALL be offered with each older section type mapped to its
successor, and a type with no successor replaced by its army's rifle
section, which the screen SHALL say once. Every label, count and refusal,
with the limit as a value, SHALL be localized in PT-BR and EN.

#### Scenario: Setup opens from the desk
- **WHEN** the player activates the skirmish map on the desk
- **THEN** the setup screen opens with the last map, roster and enemy choice

#### Scenario: Back to the desk
- **WHEN** the player chooses "Voltar" on the setup screen
- **THEN** the desk is shown and no battle starts

#### Scenario: Budget refuses an addition
- **WHEN** on a small map the roster holds 30 men and the player adds a rifle section of eleven
- **THEN** the addition is refused and the screen says the 33-man limit is reached

#### Scenario: A medium map holds more
- **WHEN** on a medium map the roster holds 30 men and the player adds a rifle section of eleven
- **THEN** the addition is accepted and the screen shows "Homens 41/66" in PT-BR and "Men 41/66" in EN

#### Scenario: A second machine gun on a medium map
- **WHEN** on a medium map the roster holds one machine-gun crew and the player adds another
- **THEN** the addition is accepted, and a third is refused with the reason shown

#### Scenario: Changing to a smaller map
- **WHEN** the roster holds 50 men for a medium map and the player chooses a small map
- **THEN** the roster is kept, the screen says the 33-man limit is exceeded, and "Combater" is disabled until sections are removed

#### Scenario: Default roster
- **WHEN** the player chooses the default roster and starts the battle
- **THEN** the battle starts with three Fogões of eleven

#### Scenario: Roster remembered
- **WHEN** the player builds a roster, fights and returns to the setup screen
- **THEN** the same roster is offered

#### Scenario: Enemy chosen
- **WHEN** the player chooses one of the map's presets for the enemy and starts the battle
- **THEN** the enemy fields that preset, each section in its army, and no preset is drawn

#### Scenario: Enemy built
- **WHEN** the player builds the enemy's roster on a small map and adds a second machine gun
- **THEN** the addition is refused with the same reason as for his own roster

#### Scenario: Enemy army chosen
- **WHEN** the player builds the enemy's roster for the Batalhões patrióticos
- **THEN** only that army's section types are offered

#### Scenario: A roster saved before the armies
- **WHEN** a player with a saved roster of "Seção de fuzileiros" and "Irregulares" opens the setup screen
- **THEN** the roster is offered as a Fogão and a Potreada

### Requirement: Mixed-force deployment

Each side's sections SHALL deploy across its map's deployment zone in roster
order: the zone's three section starts first, the three places between and
behind them next, and then further places on the outer flanks and further
back, up to the section limit of the map's size, every soldier on walkable
ground inside the side's deployment area. A roster of up to six sections
SHALL stand where it stood before this change. These are the starting
places; a deployment phase may rearrange them. Each section SHALL be one
selectable troop with its own card, and no two sections of either side,
nor any arriving section, SHALL share a troop identity. When the enemy is
left at "Sorteado", it SHALL field a roster drawn from preset forces for
the map, chosen by the battle seed, so the same seed fields the same enemy.

#### Scenario: Six small sections deploy
- **WHEN** a roster of six sections starts on the test map (`campo-de-provas`)
- **THEN** every soldier stands on walkable ground in the column's zone and six troop cards are shown

#### Scenario: Twelve sections deploy on a medium map
- **WHEN** a roster of twelve sections starts on the test map (`campo-de-provas`, medium)
- **THEN** every soldier stands on walkable ground inside the column's deployment area and twelve troop cards are shown

#### Scenario: Troops stay apart
- **WHEN** both sides field twelve sections and an event brings two more legalist sections
- **THEN** each of the 26 sections is selected and reported on its own

#### Scenario: Small rosters stand as before
- **WHEN** a roster of six sections deploys on any map
- **THEN** every soldier stands where the same roster stood before this change

#### Scenario: Enemy roster is deterministic
- **WHEN** two battles start with the same seed and map, the enemy left at "Sorteado"
- **THEN** the enemy fields the same sections in the same places
