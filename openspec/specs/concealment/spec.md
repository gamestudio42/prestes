# concealment Specification

## Purpose
Defines how vegetation on a battle map hides soldiers: which crops and grasses conceal, at what range a man in them is seen by stance, how crops cut sight lines, how concealment differs from cover, how a shot gives the shooter away, and how crops slow movement.

## Requirements

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

### Requirement: Crops cut sight lines

A sight line SHALL be blocked when it runs through more than 6 m of a
cornfield or canefield below the crop's height, so that soldiers on either
side of a field, or deep inside it, do not see each other. Tall grass and
scrub SHALL NOT block sight lines across them; they only conceal the soldier
inside. A sight line from an eye above the crop's height (an observer on
higher ground) SHALL pass over the field.

#### Scenario: Field between two sections
- **WHEN** a 30 m deep canefield lies between two standing soldiers outside it
- **THEN** neither sees the other

#### Scenario: Looking down from a rise
- **WHEN** the observer's eye is above the crop's top along the whole line
- **THEN** the field does not block his sight, though a soldier inside it keeps his concealment distance

### Requirement: Concealment is not cover

Vegetation SHALL NOT reduce hit chance or damage. A soldier who is seen, or
whose position is fired at, SHALL be hit as on open ground of the same
stance.

#### Scenario: Shot through the stalks
- **WHEN** a seen soldier inside a cornfield is fired at
- **THEN** his hit chance is the same as on open ground in the same stance

### Requirement: Firing gives the position away

A concealed soldier who fires SHALL lose his concealment for 4 s: in that
time the normal vision rules apply to him. Unseen fire from inside
vegetation SHALL still produce the fog-of-war unseen-fire marker.

#### Scenario: Rifle in the cane
- **WHEN** a concealed soldier in the cane fires at an enemy 60 m away who faces him
- **THEN** the enemy side sees him for 4 s, then he is concealed again if he stops firing

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
