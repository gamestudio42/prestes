## Purpose

Keeps every wait of the published game visible and honest: an opening
splash from the first byte, a plain message where the browser cannot run the
game, and a loading screen that holds a battle until its world has arrived.

## ADDED Requirements

### Requirement: Opening splash

The game's page SHALL show an opening splash as soon as the HTML arrives,
before any script chunk has loaded or run. The splash SHALL hold:

- the title;
- a period line, the project's own text labelled `dramatized`;
- a line saying the game is loading.

The splash's text SHALL be in the stored game language when one is stored,
otherwise PT-BR for a browser whose language starts with `pt`, and EN for
any other. All its strings SHALL exist in PT-BR and EN.

The splash SHALL stay until the camp desk is drawn and ready for input, then
fade out within half a second. The first-opening content warning SHALL show
after the splash, never under it. The splash SHALL fit a 360 px wide screen
with no horizontal scroll.

#### Scenario: Splash before the scripts

- **WHEN** a visitor opens the game on a slow connection
- **THEN** the splash shows before the main script chunk has finished downloading, and the desk replaces it once ready

#### Scenario: Language of the splash

- **WHEN** a visitor whose browser language is `pt-BR` opens the game for the first time
- **THEN** the splash reads in Portuguese

#### Scenario: Warning after the splash

- **WHEN** a first-time visitor's desk becomes ready
- **THEN** the splash fades, and then the content warning shows

### Requirement: Unsupported browser message

Before the game starts, the page SHALL check that the browser offers WebGL 2
and module workers. When either is missing, the splash SHALL stay and show a
plain message in PT-BR or EN (chosen as for the splash), naming what is
missing and suggesting a current desktop browser. The game SHALL NOT start
in that case, and the page SHALL NOT be left blank or show a script error.

#### Scenario: No WebGL 2

- **WHEN** the game opens in a browser without WebGL 2
- **THEN** the splash shows the unsupported-browser message naming WebGL 2, and no battle or desk is started

### Requirement: Battle loading screen

Every battle start SHALL go through the battle loading screen: a skirmish
from the setup, a campaign chapter from its briefing or the debrief, a
replay, and the editor's playtest.

The screen SHALL wait for:

- the battle's map document (fetched when it is a chunk loaded on demand);
- the soldier model;
- the environment atlas;
- every environment model file the map uses, including the biome trees and
  stones it places;
- the ground atlas when the map is painted.

It SHALL show:

- the map's name, or for a campaign chapter its number, title and
  commander;
- the progress as files done of files needed, updated as each file
  arrives;
- one line of the chapter's briefing pitch, or the map's setting for a
  skirmish.

When everything has arrived, the battle SHALL open in its deployment phase
with every model in place, with no placeholder swapped for its model in
view.

The screen SHALL show only when loading takes longer than 300 ms. On a warm
cache, the battle SHALL open directly, with no flash of the screen.

A file that fails to load SHALL be retried once. If it fails again, the
battle SHALL open with the existing placeholders and a notice naming that
some models could not be loaded. A failed file SHALL never block the
battle.

The screen SHALL add nothing to the simulation: the battle's seed, commands
and state hashes SHALL be the same with or without it. Its strings SHALL
exist in PT-BR and EN.

#### Scenario: A chapter on a cold cache

- **WHEN** a visitor plays chapter 6 for the first time on a slow connection
- **THEN** the loading screen names "Serra Nova" and Luís Carlos Prestes, shows progress rising to all files, and the battle opens in deployment with its buildings and trees already drawn

#### Scenario: Warm cache skips the screen

- **WHEN** the visitor plays the same chapter again in the same session
- **THEN** the battle opens without the loading screen showing

#### Scenario: A file that fails

- **WHEN** a model file fails twice
- **THEN** the battle opens with placeholders for that file's models and a notice, and the player can play

#### Scenario: Same battle with or without the screen

- **WHEN** one skirmish is started with the same seed and commands on a cold and on a warm cache
- **THEN** both battles produce the same state hashes
