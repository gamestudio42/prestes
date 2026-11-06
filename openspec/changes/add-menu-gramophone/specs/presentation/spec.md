## ADDED Requirements

### Requirement: Menu gramophone

The start screen SHALL show a period gramophone in the lower-left corner over
the menu scene, on every spread of the book. It SHALL expose previous,
play/pause and next controls with localized accessible labels and SHALL show
the current track title, composer and track position. The widget SHALL NOT
cover the book's actions at the reference desktop size and SHALL adapt to
narrow viewports.

#### Scenario: Gramophone is visible

- **WHEN** the start screen opens on any spread
- **THEN** the gramophone and its title are visible without opening a separate
  page

#### Scenario: Transport is accessible

- **WHEN** the player tabs to or hovers a gramophone control
- **THEN** it shows a localized accessible label and a visible focus state

#### Scenario: Track line

- **WHEN** the current track changes
- **THEN** the widget updates the title, composer and track position

### Requirement: First-gesture start and hint

The gramophone SHALL NOT play before a player gesture. The first click or key
on the menu SHALL start it with a slow fade, and while it is waiting the
widget SHALL visually offer the play action. Pressing Play when game sound is
muted SHALL enable sound and start the track.

#### Scenario: Waiting state

- **WHEN** the start screen opens and no gesture has happened
- **THEN** the gramophone is paused and the play action and a short hint are
  visible

#### Scenario: First gesture

- **WHEN** the player clicks or presses a key anywhere on the menu
- **THEN** the current track fades in instead of starting abruptly

#### Scenario: Play enables sound

- **WHEN** game sound is muted and the player presses the gramophone's Play
  control
- **THEN** game sound is enabled and the track starts

### Requirement: Track metadata card

Changing track SHALL show a localized card with the title, composer,
performer, year, genre, label, catalog number, public-domain year and a link
to the source page. The card SHALL be announced politely to assistive
technology, SHALL dismiss itself after a few seconds and SHALL NOT replace
the persistent track line.

#### Scenario: Card on change

- **WHEN** the player moves to another track or a track ends and the next one
  starts
- **THEN** the metadata card appears for the new track

#### Scenario: Card dismisses

- **WHEN** the card has been visible for its timeout
- **THEN** it disappears without stopping playback

#### Scenario: Source is reachable

- **WHEN** the player activates the source link
- **THEN** the Discografia Brasileira page for that recording opens

### Requirement: Motion and localization

The gramophone record SHALL spin only while a track is playing and SHALL stay
still when the player prefers reduced motion. Every player-facing label,
including transport labels, the hint and the card labels, SHALL come from the
PT-BR and EN catalogs.

#### Scenario: Reduced motion

- **WHEN** the player prefers reduced motion
- **THEN** the record does not spin and the controls remain usable

#### Scenario: Locale switch

- **WHEN** the player switches between PT-BR and EN
- **THEN** the gramophone labels and card labels update without a reload
