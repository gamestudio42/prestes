# soundscape Specification

## Purpose

What a battle sounds like beyond gunfire: the air of the place, its water,
troops moving over the ground, and the voices of the commander and the
soldiers.

## Requirements

### Requirement: Sound belongs to what is near

The client SHALL hear the battle from a listening point: the ground point
the camera looks at. Every positioned sound (water, footsteps, soldiers'
call-outs, gunfire) SHALL be louder the nearer its source is to the
listening point, silent beyond its own range, and panned left or right by
where the source lies on screen. Zooming out SHALL thin positioned sounds
and raise the general ambience; zooming in SHALL do the reverse. All sound
SHALL be presentation-only and SHALL NOT change frames, orders, RNG or
state hashes.

#### Scenario: Moving the camera moves the ear
- **WHEN** the player pans the camera from a river to a hilltop 200 m away
- **THEN** the river fades out and is silent on the hilltop

#### Scenario: A source to the left
- **WHEN** a section runs on a road at the left edge of the screen
- **THEN** its footsteps are heard on the left

#### Scenario: Determinism is unchanged
- **WHEN** the same commands run with sound on, off, or with any volume
- **THEN** the simulation hash and event stream are identical

### Requirement: Ambient beds by place and hour

The client SHALL play a continuous ambient bed chosen by the ground around
the listening point (open cerrado, forest edge, caatinga, pasture, town)
and by the map's time of day (dawn, day, dusk, night), with occasional
one-shots that fit both. A change of bed SHALL cross-fade over at least 2 s.
The same one-shot SHALL NOT play twice in a row.

#### Scenario: Forest to town
- **WHEN** the listening point moves from a wooded edge into a town
- **THEN** the forest bed cross-fades to the town bed, with no silence and no hard cut

#### Scenario: Night
- **WHEN** a map set at night starts
- **THEN** the night bed of its ground plays, not the day bed

### Requirement: Water sounds like its water

A wide river, a narrow stream and a pond SHALL each have their own sound,
played from the stretch of water nearest the listening point and louder as
it nears; a ford SHALL sound shallower than deep water. Soldiers wading
SHALL be heard wading. Water with no listening point within its range SHALL
make no sound.

#### Scenario: River and stream differ
- **WHEN** the listening point stands 10 m from a wide river and then 10 m from a narrow stream
- **THEN** two different water sounds are heard

#### Scenario: A ford
- **WHEN** the listening point follows a river from a deep stretch to a ford
- **THEN** the sound changes to the shallow one over the stretch between them

#### Scenario: Wading
- **WHEN** a section crosses a ford near the listening point
- **THEN** wading is heard while its men are in the water and stops when they leave it

### Requirement: Footsteps by ground, pace and number

Sections moving near the listening point SHALL be heard by the surface
under them (at least road, dirt, grass, mud, stone, wood, shallow water and
crops or scrub), by their pace (walk, run, crawl) and by how many of their
men are moving, with equipment rattle on the run. Footsteps SHALL be heard
for a soldier only while the listener's side sees him (under fog of war),
and the number of footstep voices playing at once SHALL be capped.

#### Scenario: Road to cane
- **WHEN** a section walks from a dirt road into a cane field near the listening point
- **THEN** its footsteps change from the dirt sound to the crop sound as its men enter

#### Scenario: One man or eleven
- **WHEN** one soldier walks and then a section of eleven walks on the same ground
- **THEN** the second is heard as many feet, not as the first played louder

#### Scenario: Unseen enemies are not betrayed
- **WHEN** an enemy section the player's side does not see runs near the listening point
- **THEN** its footsteps are not played

### Requirement: The commander's orders and the sections' answers

When the player gives an order, the commander SHALL speak a line for that
order, and the section that receives it SHALL answer with a line of its own.
Each order of the order board SHALL have at least three takes of the
commander's line and three of the answer, and the same take SHALL NOT play
twice in a row. An order given to several sections SHALL be spoken once and
answered by one of them. Orders given faster than they can be spoken SHALL
NOT pile up: a newer order replaces a line that has not started.

#### Scenario: An order is spoken and answered
- **WHEN** the player orders a section to attack
- **THEN** the commander's attack line plays, then the section's answer

#### Scenario: Rapid orders
- **WHEN** the player gives five orders within two seconds
- **THEN** at most the line in progress and the last order's line are spoken, and nothing plays late

#### Scenario: A refused order
- **WHEN** an order is refused by the simulation
- **THEN** no acknowledgement is spoken

### Requirement: Orders are always clear

The commander's order line and the section's answer SHALL NOT be attenuated
or panned by distance, wherever the camera is, and while either plays the
effects and ambience SHALL be lowered so the line is clear, returning to
their level within one second after it ends. Every other voice SHALL follow
the nearness rule. Every voice SHALL sound as heard across a field, not at
a microphone (filtered, with an open-air echo): the order line and answer
at one fixed middle distance, every other voice more distant the farther
its speaker is.

#### Scenario: An order to a far section
- **WHEN** the player orders a section that is off screen, 300 m from the listening point
- **THEN** the order and the answer are heard at full voice level

#### Scenario: Under fire
- **WHEN** an order is given while a machine gun fires near the listening point
- **THEN** the gunfire is lowered while the order and the answer play, and returns after them

### Requirement: Soldiers call out what happens

Soldiers of the player's side SHALL call out, from where they are: first
contact with the enemy, a man down, out of ammunition, reloading, pinned,
the machine gun set, an objective taken, and falling back; and they SHALL
shout without words: a battle cry when their section goes into an assault,
a cry of pain when a man is hit and stays up, a death cry when he falls. A
call-out or shout SHALL follow the nearness rule, SHALL NOT repeat for the same section and kind
within a quiet time (at least 8 s), and SHALL give way to an order line.

#### Scenario: A man down nearby
- **WHEN** a soldier of the player's side is incapacitated near the listening point
- **THEN** a comrade's call-out is heard from his position

#### Scenario: Far away, not heard
- **WHEN** the same happens 400 m from the listening point
- **THEN** no call-out is heard

#### Scenario: No chatter
- **WHEN** three soldiers of one section run out of ammunition within four seconds
- **THEN** one out-of-ammunition call-out plays for that section

### Requirement: Curses under fire

Now and then a soldier of the player's side SHALL swear, from where he
is: only while his section is firing or under fire, by chance, and not
again for that section within a quiet time (at least 20 s), with a cap on
curses heard at once across the field. A curse SHALL follow the nearness
rule and SHALL give way to an order line and to any other call-out. Curses
MAY be strong (obscenities and regional insults of the period, by the
speaker's side) but SHALL NOT be a slur, and a curse that names a side
SHALL be spoken only by the side that used it. The curse SHALL fit the
moment when the speaker's faction has one for it (his shot hit, he
missed, he is fired on, the other side runs), and otherwise be a general
insult. When the player has turned
curses off, no curse SHALL play, from either side.

#### Scenario: Sporadic, not constant
- **WHEN** a section fires for a full minute near the listening point
- **THEN** at most a few curses are heard from it, never two within the quiet time

#### Scenario: No curse in a quiet field
- **WHEN** no shot has been fired near a section
- **THEN** no curse plays for it

#### Scenario: A side's word
- **WHEN** a curse names the government's men as "chimangos"
- **THEN** only a soldier of the column speaks it

#### Scenario: Curses turned off
- **WHEN** the player has turned curses off and a section fires for a full minute near the listening point
- **THEN** no curse is heard, and the call-outs still play

### Requirement: Content warning

On the first opening, before the start screen can be used, the game SHALL
show a content warning, in the player's language from the PT-BR and EN
catalogs: the game is about a real war, with combat, the wounded and the
dead, and the soldiers swear under fire with strong language of the period
(with examples). The warning SHALL offer to continue as is or to continue
without curses, which turns the curses setting off. The answer SHALL
persist locally and the warning SHALL NOT show again until its text
changes in substance. The curses setting SHALL also be in the options,
beside the channel volumes, on by default.

#### Scenario: First opening
- **WHEN** a player opens the game for the first time
- **THEN** the content warning shows over the start screen, in their language

#### Scenario: Already answered
- **WHEN** a player who answered the warning opens the game again
- **THEN** the start screen opens without the warning

#### Scenario: Continue without curses
- **WHEN** the player chooses to continue without curses
- **THEN** the curses setting is off, in the options too, and survives a reload

### Requirement: The enemy is heard when seen

Enemy soldiers SHALL be heard, from where they are and by the nearness
rule, with call-outs of their own (contact, advancing, holding, a man
down, out of ammunition, pinned, under machine-gun fire, falling back, an
objective taken), curses and shouts without words, and SHALL be heard only
while the player's side sees the speaker. Their lines SHALL follow the
same quiet times as the player's side, SHALL give way to an order line,
and SHALL be recorded under their own speaker so they can have a voice of
their own. No enemy line SHALL carry information the player's side could
not see.

#### Scenario: An unseen enemy is silent
- **WHEN** an enemy section the player's side does not see falls back near the listening point
- **THEN** none of its lines are heard

#### Scenario: A seen enemy breaks
- **WHEN** a seen enemy section falls back near the listening point
- **THEN** one of its falling-back lines is heard from its position

#### Scenario: Orders first
- **WHEN** an enemy shout and the commander's order would play together
- **THEN** the order plays and the shout is dropped

### Requirement: Voice line catalog and recording script

Every voice line SHALL be an entry of a catalog with an id, its speaker
(commander, soldier or enemy), its text in Portuguese, the order or event it
belongs to, its takes and their file names. The project SHALL keep a
recording script generated from the catalog that lists every take still to
record. A line or take with no recording SHALL be skipped in silence,
without an error (an order line or answer still shows its caption, when
captions are on), and a check SHALL report the catalog's lines without a
recording and the audio files no line uses. The speech SHALL be original
script and SHALL reproduce no book text.

Historical note: forms of address and ranks follow
`docs/history/FORCES.md`; a line built on a period expression records its
source in the catalog.

#### Scenario: An unrecorded line
- **WHEN** the player gives an order whose commander line has no recording yet
- **THEN** no sound plays for it, its caption shows alone if captions are on, the game goes on and no error is logged for the player

#### Scenario: The script follows the catalog
- **WHEN** a line is added to the catalog and the script is generated
- **THEN** the script lists its takes with their file names as to be recorded

#### Scenario: Orphan and missing files
- **WHEN** the audio check runs
- **THEN** it lists lines without a recording and recordings without a line

### Requirement: Captions for speech

Spoken lines SHALL be able to show a caption with the speaker and the line,
from the PT-BR and EN catalogs: on by default when the language is English
(the speech is Portuguese) and off by default in Portuguese, with a setting
to change it that persists. A caption SHALL stay while its line plays.

#### Scenario: English player
- **WHEN** the language is English and the commander speaks an order
- **THEN** a caption shows the order's line in English while it plays

#### Scenario: Captions off
- **WHEN** the player turns captions off
- **THEN** no caption is shown and the choice survives a reload

### Requirement: Sound loads on demand and within budget

Ambient, footstep and voice recordings SHALL be loaded when a battle needs
them and SHALL NOT be part of the JavaScript bundles. A battle SHALL start
without waiting for them: a sound not yet loaded is skipped. The shipped set
SHALL stay inside a size budget that a check enforces, and every recording
SHALL be listed in the asset register with its source and licence.

#### Scenario: A slow connection
- **WHEN** a battle starts before its ambient files have loaded
- **THEN** the battle runs, and each sound begins once its file is ready

#### Scenario: Over budget
- **WHEN** the audio set exceeds its size budget
- **THEN** the audio check fails with the total and the largest files

#### Scenario: An unregistered recording
- **WHEN** an audio file ships without a row in the asset register
- **THEN** the content check fails and names the file
