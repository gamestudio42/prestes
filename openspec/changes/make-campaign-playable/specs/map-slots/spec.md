## MODIFIED Requirements

### Requirement: Play a mission's map

A campaign chapter whose mission has a saved map SHALL be played from its
briefing as a campaign chapter (see `campaign-progression`). The loose
"Jogar o mapa" / "Play the map" action SHALL be removed: it played a 3 vs 3
with the default rosters, outside the campaign.

A chapter without a map SHALL offer no play action.

In development builds only, the briefing of a chapter with a map SHALL offer
"Editar este mapa" / "Edit this map". It SHALL open the map editor on that
map. Saving it to the project SHALL make the next play of the chapter use the
edited map, with no code change. A chapter without a map SHALL instead offer
to open the editor on its empty slot. The published build SHALL show neither
action.

#### Scenario: A mission with a map plays

- **WHEN** "02 O Anel de Ferro" has a saved map and the player opens its chapter
- **THEN** the briefing offers "Play chapter" and no "Play the map"

#### Scenario: A mission without a map

- **WHEN** a chapter's mission has no map
- **THEN** its chapter offers no play action

#### Scenario: Edit link in development

- **WHEN** the owner opens chapter 6's briefing in the development build and chooses "Edit this map"
- **THEN** the editor opens with the Serra Nova map loaded, and after "Save to project" the next "Play chapter" uses the saved version

#### Scenario: No edit link when published

- **WHEN** the player opens any chapter's briefing in the published build
- **THEN** no edit action shows
