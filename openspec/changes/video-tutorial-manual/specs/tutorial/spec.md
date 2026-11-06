## ADDED Requirements

### Requirement: Manual section of the book

The book menu SHALL have a Manual bookmark between Campaign and Skirmish. Its
first spread SHALL list the lessons with their number, title, map and a tick
for lessons already watched. Choosing a lesson SHALL open its spread; the
page corners and the arrow keys SHALL turn to the previous and next lesson.
The campaign page's "in preparation" note SHALL point to the Manual as well
as to the skirmish. All labels SHALL be localized in PT-BR and EN.

#### Scenario: Open a lesson
- **WHEN** the player opens the Manual and chooses lesson 8
- **THEN** the spread of "Travessias: vau, ponte e balsa" opens with its text and video

#### Scenario: Turn the pages
- **WHEN** the player presses the right arrow on lesson 2
- **THEN** lesson 3 opens

### Requirement: Lesson catalog

The game SHALL define the lessons as data: id, number, title and text keys,
battlefield, the mechanics taught, the video and caption files, and the
recording script. The catalog SHALL hold ten lessons covering: selection and
movement; stance and concealment; aimed fire and suppression; cover and
positions; bounds and flanking; defend and ambush; relief and line of sight;
the three crossings; fog of war and the unseen-fire marker; wounded, morale
and withdrawal. Every lesson SHALL be set on Fazenda, Serra e Rio or Bairro.

#### Scenario: Catalog is complete
- **WHEN** the content check runs
- **THEN** every lesson has its texts in PT-BR and EN, a battlefield, a video file and a caption file per locale

### Requirement: Lesson video player

A lesson's video SHALL play in a pixel-filtered plate with play, pause and
replay controls, keyboard operable, muted by default with the game's audio
setting respected. Captions SHALL come from WebVTT tracks in the active
locale and SHALL switch when the locale changes. If the video cannot play,
the plate SHALL show the lesson's still image and the full caption text.

#### Scenario: Captions follow the language
- **WHEN** the player switches from PT-BR to EN while lesson 2 plays
- **THEN** the captions continue in English

#### Scenario: Video fails
- **WHEN** the video file cannot be loaded
- **THEN** the plate shows the still and the lesson's caption text, and no error stops the menu

### Requirement: Recorded from the game

Lesson videos SHALL be recorded from the game's own simulation and view by a
project tool that plays each lesson's script deterministically (fixed seed,
scripted commands at given ticks, scripted camera, a drawn cursor and
highlights) and writes the video, a still and the caption files. Running the
tool twice on the same build SHALL produce the same simulation states at
every scripted tick. Videos SHALL carry no burned-in text, SHALL be at most
45 s and 3 MB each, 640 x 360 or smaller.

#### Scenario: Scripted state is reproducible
- **WHEN** the recording tool runs lesson 8 twice
- **THEN** the frame hash at each scripted tick is the same in both runs

#### Scenario: Budget
- **WHEN** the content check inspects the lesson files
- **THEN** no video exceeds 45 s or 3 MB

### Requirement: Try it

Each lesson SHALL offer "Experimentar", which opens the skirmish page with
the lesson's battlefield chosen. Returning to the menu from that battle SHALL
reopen the Manual at the same lesson.

#### Scenario: Try the crossings
- **WHEN** the player chooses Experimentar on lesson 8
- **THEN** the skirmish page opens with Serra e Rio chosen

### Requirement: Lesson progress

A lesson SHALL count as watched when its video has played to the end once.
Watched lessons SHALL be ticked on the contents spread and remembered in
local storage; a blocked storage SHALL only mean no ticks. No lesson SHALL be
locked.

#### Scenario: Ticked after watching
- **WHEN** lesson 1's video plays to the end and the player returns to the contents
- **THEN** lesson 1 is ticked
