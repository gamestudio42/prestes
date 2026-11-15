# historical-commander Specification

## Purpose
Puts each campaign chapter's historical figure on its battle map, as the
Comando's officer or as a command voice, with a command radius that steadies
the column and a loss that can end the mission, without making him a hero.

## Requirements

### Requirement: Commander declaration on a campaign map

A campaign map document SHALL be able to declare one commander with: a figure
id from the historical figure registry, a presence of **field** or **voice**,
and a loss outcome of **defeat** or **continue**. A map without a commander
SHALL play exactly as before this change. Skirmish and test maps SHALL NOT
declare a commander; the map check SHALL report one as an error. The map check
SHALL also report an unknown or non-playable figure, a figure other than the
chapter's `commanderId` for the map's mission, and a field commander on a map
whose column force has no Comando section.

#### Scenario: Map without a commander
- **WHEN** a skirmish map is played with a given seed and commands
- **THEN** the battle and its state hash are the same as before this change

#### Scenario: Commander on a skirmish map
- **WHEN** the author gives the skirmish map Paiolzinho a commander
- **THEN** the map check fails with a commander error naming the map

#### Scenario: Field commander without a Comando
- **WHEN** a campaign map declares a field commander and its column force has no Comando section
- **THEN** the map check fails naming the map

### Requirement: The figure on the field

On a map whose commander is on the field, the officer of the first Comando
section of the column force SHALL be the figure. He SHALL keep every officer
rule (the 12 m aura, regroup and protect-officer, being screened under fire)
and the Comando officer's weapon, hit points, speed and accuracy, with no
bonus of his own. A voice commander SHALL put no unit on the map; that map's
Comando officer SHALL stay an ordinary officer. Which unit is the figure SHALL
be part of the hashed state.

#### Scenario: Prestes at the Verdinho bridge
- **WHEN** the map Ponte de Verdinho starts (commander Luís Carlos Prestes, field; source: Macaulay 1974, Prestes present with Cordeiro's detachment)
- **THEN** the officer of the column's Comando section is Prestes, armed and hit-pointed as any Comando officer

#### Scenario: Isidoro as a voice
- **WHEN** the map Catanduvas starts (commander Isidoro Dias Lopes, voice; historical note: he commanded from Foz do Iguaçu)
- **THEN** no unit is Isidoro and the Comando's officer is an ordinary officer

#### Scenario: No combat bonus
- **WHEN** the figure and an ordinary Comando officer fire at the same target under the same conditions with the same seed
- **THEN** their hit chances and damage are the same

### Requirement: Command radius

While the figure is fit (alive, not incapacitated, not panicked, not routed),
every fit soldier of any Column army within 30 m of him SHALL, out of fire,
rally up to 75 morale instead of 60, and SHALL gain 0.1 morale per tick up to
75. The command radius SHALL add to the officer aura and SHALL NOT raise
morale above 75 by itself. It SHALL NOT act on legalist soldiers.

#### Scenario: Steadier near him
- **WHEN** a column soldier at 50 morale is out of fire 20 m from the fit figure
- **THEN** his morale rises toward 75 and stops there unless an officer aura lifts it further

#### Scenario: Beyond the radius
- **WHEN** a column soldier at 50 morale is out of fire 40 m from the figure and away from any officer
- **THEN** his morale rises only to 60

### Requirement: Losing the figure

When the figure is killed or incapacitated, the command radius SHALL stop,
every living column soldier within 40 m SHALL lose 25 morale once (instead of
the ordinary officer loss, not in addition), his section SHALL lose cohesion
as for an officer, protect-officer orders SHALL be interrupted as for an
officer, and the simulation SHALL emit a `commander_down` event naming whether
he was killed or incapacitated. On a map whose loss outcome is **defeat**, the
battle SHALL end that tick as a defeat decided by `commander`. On a map whose
loss outcome is **continue**, the battle SHALL go on, and if an incapacitated
figure recovers the command radius SHALL resume and the loss SHALL re-arm.

#### Scenario: Prestes falls at Serra Nova
- **WHEN** the figure is incapacitated on Serra Nova (loss outcome defeat; mission doc failure condition "Prestes falls or is captured")
- **THEN** the battle ends as a defeat decided by `commander` on that tick

#### Scenario: Loss is not doubled
- **WHEN** the figure is killed with a column soldier 10 m away at 60 morale
- **THEN** that soldier's morale falls to 35, not lower

#### Scenario: Continue
- **WHEN** the figure is incapacitated on a map whose loss outcome is continue
- **THEN** the battle goes on, `commander_down` is emitted once, and the radius resumes if he recovers

### Requirement: The figure is named

The troop panel SHALL show the figure's display name and localized role on his
section's card, and the battlefield SHALL mark his unit with a pennant
distinct from an ordinary officer's (a named placeholder until real art
exists). When `commander_down` arrives the HUD SHALL report it in the game's
language with the figure's name. Names SHALL be the registry's proper names
and SHALL NOT be translated; every other string SHALL exist in PT-BR and EN.

#### Scenario: Name in the panel
- **WHEN** the map Serra Nova is played in PT-BR
- **THEN** the Comando card reads "Luís Carlos Prestes" with his role in Portuguese

#### Scenario: Loss reported in English
- **WHEN** the figure is killed in a battle played in EN
- **THEN** the HUD reports it in English with his name

### Requirement: Commander in the map editor

The map editor SHALL offer a Commander panel for campaign maps only, to choose
the figure among playable registry figures, the presence and the loss
outcome, and SHALL show the map check's commander errors. Its labels SHALL be
localized in PT-BR and EN.

#### Scenario: Skirmish map in the editor
- **WHEN** the author opens a skirmish map in the editor
- **THEN** no Commander panel is offered

#### Scenario: Setting the commander
- **WHEN** the author sets Miguel Costa, field, defeat on Porto Mendes and saves
- **THEN** the map document carries that commander and the map check passes

### Requirement: Campaign maps declare their commanders

Each campaign map SHALL declare the commander of its chapter, with presence and
loss outcome set from the mission's sources:
- **Copacabana** (01): Siqueira Campos, field, continue (historical: he was
  wounded and survived; Macaulay 1974, Hélio Silva 1922). He is the Comando's
  officer among the four groups, not a line rifleman; the owner approved him
  as a field unit and the edit of this map on 2026-11-15.
- **São Luiz e Ramada** (02): Luís Carlos Prestes, field, defeat (mission
  objective "cross the Uruguay with Prestes").
- **Porto Mendes** (03): Miguel Costa, field, defeat (formal commander of the
  First Revolutionary Division; Macaulay 1974).
- **Catanduvas** (04): Isidoro Dias Lopes, voice, continue (he commanded from
  Foz do Iguaçu; the section is fictional).
- **Ponte de Verdinho** (05): Luís Carlos Prestes, field, defeat (present with
  Cordeiro's detachment; Macaulay 1974).
- **Serra Nova** (06) and **Pantanal** (07): Luís Carlos Prestes, field,
  defeat (mission failure condition "Prestes falls or is captured").
- **La Gaiba** (08): Luís Carlos Prestes, field, continue (a scene without an
  enemy).

#### Scenario: Every campaign map checked
- **WHEN** the map check runs over the authored maps
- **THEN** each of the eight campaign maps declares its chapter's `commanderId` with the presence and outcome above, and the check passes

#### Scenario: Siqueira Campos falls on the avenue
- **WHEN** the figure is incapacitated on Copacabana (loss outcome continue)
- **THEN** the battle goes on, `commander_down` is emitted, and the groups keep fighting without his radius

#### Scenario: Deterministic campaign battle
- **WHEN** a campaign map with a field commander is played twice with the same seed and commands
- **THEN** both runs produce the same state hash on every tick
