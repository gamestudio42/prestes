## 1. Scenario and troop model

- [x] 1.1 Add bootcamp scenario option with 11 player soldiers, non-controllable instructor officer and disabled defeat.
- [x] 1.2 Add troop identity and whole-troop selection in the HUD/app.
- [x] 1.3 Add whole-troop enemy targeting with nearest-member assignment.
- [x] 1.4 Remove select-all button, action and Ctrl/Cmd+A shortcut.

## 2. Remove legacy entry points

- [x] 2.1 Remove skirmish/battle start and old ten-mission campaign UI.
- [x] 2.2 Remove legacy tutorial/boot-camp data from the player flow.
- [x] 2.3 Keep sandbox as the only combat laboratory.

## 3. Sandbox

- [x] 3.1 Add spawn whole enemy troop command and command-troop template.
- [x] 3.2 Add universal placement preview state and 3D ghost rendering.
- [x] 3.3 Add Z/X rotation, validity feedback and cancel.
- [x] 3.4 Add preview for cover, obstacles, troops and future props.

## 4. Map and presentation

- [x] 4.1 Expand bounds and pathfinding to 240 x 240 m.
- [x] 4.2 Add bootcamp roads, buildings, trees, obstacles and station markers.
- [x] 4.3 Use procedural low-poly building covers with collision; GLB assets remain an optional later art swap.
- [x] 4.4 Share one procedural soldier rig/uniform and add the instructor uniform.
- [x] 4.5 Normalize movement speed, stride, spacing and facing.

## 5. Bootcamp curriculum

- [x] 5.1 Create the thirteen-station data model and instructor text.
- [x] 5.2 Add bootcamp director, station triggers, retry and dialogue overlay.
- [x] 5.3 Add training dummies and training enemy troop for combat stations.
- [x] 5.4 Add simulated casualty and rescue station.
- [x] 5.5 Add protect-officer station with the officer at the front.
- [x] 5.6 Persist station progress and resume.

## 6. Verification

- [x] 6.1 Replace battle/campaign unit tests with bootcamp and troop tests.
- [x] 6.2 Add E2E for troop selection, enemy troop targeting, sandbox preview and the full station flow.
- [x] 6.3 Run typecheck, lint, unit tests, locales, content, build, E2E and deterministic sim.
- [x] 6.4 Update docs and manual playtest checklist.
