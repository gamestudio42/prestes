## ADDED Requirements

### Requirement: Concealing vegetation

A map SHALL define concealing vegetation areas of four kinds: cornfield,
canefield, tall grass (capim) and scrub. Each kind SHALL have a height and,
for each stance, a concealment distance: an observer farther than it does
not see a soldier inside the area. The starting values SHALL be:

| Kind | Height | Standing | Crouched | Prone |
| --- | --- | --- | --- | --- |
| Canefield | 2.5 m | 10 m | 6 m | 4 m |
| Cornfield | 2.0 m | 15 m | 8 m | 5 m |
| Scrub | 1.6 m | 40 m | 15 m | 8 m |
| Tall grass | 1.0 m | none | 40 m | 12 m |

"None" means the soldier is not concealed in that stance. Concealment SHALL
be part of the side vision of fog of war, deterministic, and the same for
both sides.

#### Scenario: Crouched in the corn
- **WHEN** a crouched soldier is 4 m inside a cornfield and the nearest enemy observer is 30 m away with a clear line
- **THEN** the enemy side does not see him

#### Scenario: Too close to hide
- **WHEN** an enemy observer comes within 8 m of a crouched soldier inside the cornfield
- **THEN** the enemy side sees him

#### Scenario: Standing in tall grass
- **WHEN** a standing soldier is inside tall grass in an observer's cone and range with a clear line
- **THEN** the observer sees him

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
with a localized PT-BR and EN label in the soldier tooltip.

#### Scenario: Running in the corn
- **WHEN** a crouched section runs through the cornfield past an enemy 14 m away
- **THEN** the enemy side sees it

#### Scenario: Concealed marker
- **WHEN** one of the player's soldiers is concealed
- **THEN** the view marks him as concealed and his tooltip says so in the active locale
