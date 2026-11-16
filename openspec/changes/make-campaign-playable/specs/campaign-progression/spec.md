## Purpose

Lets the player play the campaign book's eight chapters in order: each from
its briefing on its authored map, opened by winning the chapter before it,
with progress kept in the browser and a debrief that leads on to the next
chapter.

## ADDED Requirements

### Requirement: Play a chapter from its briefing

A playable campaign chapter SHALL offer "Jogar o capítulo" / "Play chapter"
on its briefing spread.

Starting it SHALL begin a battle on the authored campaign map that holds the
chapter's mission id. The battle SHALL use that map's own settings, with no
roster screen and no skirmish setup:

- the column's fixed force, or the default column roster when the map fixes
  none;
- the enemy forces, or none on a map with no enemy;
- the historical commander;
- the battle events;
- the objectives and the time limit;
- the epilogue.

The battle SHALL open in the deployment phase like every battle. It SHALL be
marked as a campaign battle of that chapter, so the end panel and the progress
record know it.

The chapter's commander and perspective SHALL be the ones of the campaign
registry (`docs/campaign/CAMPAIGN.md`):

- Siqueira Campos in the prologue;
- Luís Carlos Prestes in chapters 2, 5, 6, 7 and 8, with the exiles as the
  perspective of chapter 8;
- Miguel Costa in chapter 3;
- Isidoro Dias Lopes, as a command voice, in chapter 4.

The same map, started the same way with the same seed, SHALL give the same
battle: a campaign start adds no randomness. All labels SHALL be localized in
PT-BR and EN.

#### Scenario: The prologue starts on Copacabana

- **WHEN** the player opens the prologue's briefing and chooses "Play chapter"
- **THEN** a battle starts on the Copacabana map in the deployment phase, with the map's fixed column force, Siqueira Campos named as its commander, and no roster screen

#### Scenario: A map with no enemy

- **WHEN** the player starts chapter 8 (La Gaiba), whose map has no enemy
- **THEN** the battle fields only the column, and Prestes is named as its commander

#### Scenario: Deterministic start

- **WHEN** a chapter is started twice with the same seed and the same commands
- **THEN** both battles produce the same state hash

### Requirement: A chapter opens when the one before it is won

The prologue SHALL always be open.

Chapter *n* (2 to 8) SHALL be open only after chapter *n − 1* has ended at
least once in **victory**. Any victory counts, whatever decided it: objectives,
all objectives held, the enemy broken or annihilated, or a withdrawal where
the map has one. A defeat (including the commander's fall on a map where that
is a defeat), a draw or a battle left before its end SHALL NOT open the next
chapter.

A locked chapter SHALL stay readable: its prose, plate and links. Its briefing
SHALL show, in place of the play action, which chapter must be won to open it.

An opened chapter SHALL stay open whatever later results are, and a won
chapter SHALL stay replayable.

The book's contents SHALL mark each chapter as won, open or locked, in PT-BR
and EN. (Owner's decision, 2026-11-15: "precisa vencer".)

#### Scenario: Winning opens the next chapter

- **WHEN** the player wins the prologue for the first time
- **THEN** chapter 2 (O Anel de Ferro) becomes open, and the contents mark the prologue won and chapter 2 open

#### Scenario: A defeat does not open it

- **WHEN** the player loses chapter 2 because Prestes falls
- **THEN** chapter 3 stays locked, and its briefing says chapter 2 must be won first

#### Scenario: A draw does not open it

- **WHEN** chapter 4 ends in a draw at the time limit
- **THEN** chapter 5 stays locked

#### Scenario: A later defeat keeps the chapter open

- **WHEN** the player has won chapter 3 and then replays it and loses
- **THEN** chapter 3 stays won and chapter 4 stays open

#### Scenario: Locked chapters can be read

- **WHEN** the player opens chapter 6 before chapter 5 is won
- **THEN** the chapter's prose and plate show, and the briefing shows no play action

### Requirement: Campaign progress is kept

The game SHALL keep the campaign's progress in the browser between visits.
For each chapter it SHALL record:

- whether the chapter was won;
- how many times it was played to an end;
- the last result;
- the best result.

A result SHALL hold the outcome, how it was decided, the battle time, the
column's losses and, once difficulty levels exist, the level it was played at.

The record SHALL carry a version. A missing, unreadable, foreign or older
record SHALL start a fresh campaign without an error shown to the player and
without breaking the menu. Storage that cannot be read or written (a private
window) SHALL leave the campaign playable for the session, with only the
prologue open at the start.

The book SHALL offer "Recomeçar a campanha" / "Restart campaign", which asks
for confirmation and then clears the record. This is not save and load of a
battle: a battle left before its end SHALL NOT be kept.

#### Scenario: Progress survives a reload

- **WHEN** the player wins the prologue and reloads the page
- **THEN** the prologue is still won and chapter 2 is still open

#### Scenario: A broken record

- **WHEN** the stored campaign record is not valid
- **THEN** the campaign opens with only the prologue open, and no error is shown

#### Scenario: Restart asks first

- **WHEN** the player chooses "Restart campaign" and confirms
- **THEN** every chapter but the prologue is locked again, and cancelling leaves the record as it was

### Requirement: The campaign debrief

When a campaign battle ends, the end panel SHALL show the following, as it
does for every battle:

- the outcome and how it was decided;
- the objectives' owners and each side's value;
- the losses;
- the map's epilogue.

It SHALL also show the chapter's number and title, and SHALL offer:

- "Próximo capítulo" / "Next chapter", only after a victory and only when a
  next chapter exists;
- "Jogar de novo" / "Play again", which restarts the same chapter from its
  deployment;
- "Voltar ao livro" / "Back to the book", which opens the campaign book at
  that chapter's briefing.

The result SHALL be recorded before the panel shows.

Winning chapter 8 SHALL close the campaign. The panel SHALL show a closing
line in place of "Next chapter", and the book's contents SHALL show the
campaign as completed. The closing line is the project's own words, labelled
`dramatized`, in PT-BR and EN.

#### Scenario: Victory offers the next chapter

- **WHEN** the player wins chapter 5
- **THEN** the panel shows the epilogue and offers "Next chapter", "Play again" and "Back to the book", and "Next chapter" starts chapter 6

#### Scenario: Defeat offers no next chapter

- **WHEN** the player loses chapter 5
- **THEN** the panel offers "Play again" and "Back to the book" only

#### Scenario: The campaign closes

- **WHEN** the player wins chapter 8 for the first time
- **THEN** the panel shows the closing line, and the book's contents mark the campaign completed

### Requirement: The level a chapter is played at

Once difficulty levels exist (`add-difficulty-levels`), a chapter SHALL start
at the level the player last chose, whether in the skirmish setup or in a
briefing. Soldado is the default.

The briefing SHALL show that level and let the player change it before
playing. The level SHALL be sent with the battle's start. The level SHALL NOT
change which chapters are open: a victory at any level opens the next chapter.
The result SHALL record the level. Labels SHALL be localized in PT-BR and EN.

#### Scenario: The briefing changes the level

- **WHEN** the player sets História on chapter 3's briefing and plays
- **THEN** the battle starts at História, and the recorded result says História

#### Scenario: Any level opens the next chapter

- **WHEN** the player wins chapter 3 at História
- **THEN** chapter 4 opens
