## MODIFIED Requirements

### Requirement: The figure on the field

On a map whose commander is on the field, the officer of the first Comando
section of the column force SHALL be the figure. He SHALL keep every officer
rule (the 12 m aura, regroup and protect-officer, being screened under fire)
and the Comando officer's weapon, hit points, speed and accuracy, with no
bonus of his own, with one exception: the figure SHALL NOT start a flanking
move of his own; he stays where the player put him until ordered. A voice commander SHALL put no unit on the map; that map's
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

#### Scenario: The figure does not flank by himself
- **WHEN** the figure has no order, is not holding, and his target is in cover with no ally pinning it
- **THEN** he does not start a flanking move, while an ordinary officer in the same place does
