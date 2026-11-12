## MODIFIED Requirements

### Requirement: Concealing vegetation

A map SHALL define concealing vegetation areas of four kinds: cornfield,
canefield, tall grass (capim) and scrub (mato). Each kind SHALL have a height
and, for each stance, a concealment distance: an observer farther than it does
not see a soldier inside the area; an observer within it sees him under the
ordinary vision rules, as on open ground. The starting values SHALL be:

| Kind | Height | Standing | Crouched | Prone |
| --- | --- | --- | --- | --- |
| Canefield | 2.5 m | 10 m | 6 m | 4 m |
| Cornfield | 2.0 m | 15 m | 8 m | 5 m |
| Scrub | 1.6 m | none | 50 m | 30 m |
| Tall grass | 1.0 m | none | 40 m | 12 m |

"None" means the soldier is not concealed in that stance. Every map object
that conceals as scrub (a bush, a hedgerow, the foliage round a tree or a
cactus) SHALL follow the scrub row. Concealment SHALL be part of the side
vision of fog of war, deterministic, and the same for both sides.

A section that halts in scrub (every fit man stopped, most of them inside it)
SHALL take the crouched stance for each man whose stance the player has not
set and who is standing; a stance the player set SHALL be kept. The rule SHALL
be the same for both sides.

#### Scenario: Crouched in the corn
- **WHEN** a crouched soldier is 4 m inside a cornfield and the nearest enemy observer is 30 m away with a clear line
- **THEN** the enemy side does not see him

#### Scenario: Too close to hide
- **WHEN** an enemy observer comes within 8 m of a crouched soldier inside the cornfield
- **THEN** the enemy side sees him

#### Scenario: Standing in tall grass
- **WHEN** a standing soldier is inside tall grass in an observer's cone and range with a clear line
- **THEN** the observer sees him

#### Scenario: Standing in scrub
- **WHEN** a standing soldier is inside scrub and an enemy observer 100 m away has him in his cone with a clear line
- **THEN** the enemy side sees him

#### Scenario: Crouched in scrub beyond 50 m
- **WHEN** a crouched soldier is inside scrub and the nearest enemy observer with a clear line is 60 m away
- **THEN** the enemy side does not see him

#### Scenario: Crouched in scrub within 50 m
- **WHEN** an enemy observer with the soldier in his cone and a clear line comes within 45 m of a crouched soldier inside scrub
- **THEN** the enemy side sees him

#### Scenario: Prone in scrub
- **WHEN** a prone soldier is inside scrub and enemy observers with a clear line stand 35 m and then 25 m away
- **THEN** the enemy side does not see him at 35 m and sees him at 25 m

#### Scenario: Behind a bush
- **WHEN** a crouched soldier stands in the concealment a bush object stamps and the observer is 60 m away
- **THEN** he is concealed exactly as in painted scrub

#### Scenario: A section settles in the bushes
- **WHEN** a section whose stance the player never set halts with most of its men in scrub
- **THEN** its standing men in the scrub crouch, and the section shows as concealed to its owner

#### Scenario: The player's stance is kept
- **WHEN** the player has set his section's stance to standing and it halts in scrub
- **THEN** the men stay standing and are not concealed

#### Scenario: Same result every run
- **WHEN** the same battle with sections in scrub is run twice from the same seed and commands
- **THEN** the state hash is the same at every tick

### Requirement: Moving through crops

Movement through cornfields and canefields SHALL be slower than on pasture,
and through tall grass and scrub slightly slower. A section moving at a run
inside a crop SHALL be detected within twice the concealment distance of its
stance. The player SHALL see in the view which of his soldiers are concealed,
with a localized PT-BR and EN label in the soldier tooltip. The tooltip hint
SHALL say that in scrub and tall grass only a man who keeps low is hidden.

#### Scenario: Running in the corn
- **WHEN** a crouched section runs through the cornfield past an enemy 14 m away
- **THEN** the enemy side sees it

#### Scenario: Running in the scrub
- **WHEN** a crouched section runs through scrub past an enemy 90 m away who has it in his cone with a clear line
- **THEN** the enemy side sees it

#### Scenario: Concealed marker
- **WHEN** one of the player's soldiers is concealed
- **THEN** the view marks him as concealed and his tooltip says so in the active locale, adding that in scrub and tall grass only a man who keeps low is hidden
