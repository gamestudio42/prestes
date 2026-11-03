## 1. Campaign content

- [x] 1.1 Add the `TrainingMission` content schema and ten ordered mission records with title, briefing, objective, mechanics, zone, duration, reward and playable/locked status; verify content validation and EN/PT-BR key parity
- [x] 1.2 Add mission step definitions for missions 1-2 (camera, selection, movement, cover, stances); verify each step has a deterministic frame/event or presentation condition
- [x] 1.3 Map the existing ground/field boot-camp content to missions 1/2 and document where orders/casualty/graduation content moves for later missions

## 2. Campaign overview

- [x] 2.1 Add the Campanha de Treinamento entry to the start screen; verify it opens the campaign overview and the sandbox entry is unchanged
- [x] 2.2 Build the original low-poly sepia SVG camp map with zones 1-10, tutorial flow, legend and dynamic-event reminders; verify no raster reference image is shipped
- [x] 2.3 Build the mission list and briefing panel with progress, locked reasons, estimated time, reward and start/replay actions; verify locked missions do not start
- [x] 2.4 Make the overview responsive and keyboard accessible; verify desktop and narrow layouts and localized copy

## 3. Training field

- [x] 3.1 Add the low-poly camp field for areas 1-2 with tents, sheds, fences, roads, crates and vegetation arranged around the existing deterministic covers; verify the scene loads in missions 1-2
- [x] 3.2 Add mission markers for waypoints and cover stations; verify markers update with mission progress and do not mutate simulation state
- [x] 3.3 Verify no target dummy or target board is created in missions 1-2 and the existing sandbox target tool still works

## 4. Mission runtime

- [x] 4.1 Add the campaign persistence layer (`prestes.training.v1`), one-time boot-camp checkpoint migration, reset and replay; verify unit tests cover all transitions
- [x] 4.2 Replace the boot-camp director with the campaign mission director; verify mission steps observe frames/events and send setup/player intent through commands
- [x] 4.3 Implement mission 1 camera/selection flow from start to completion; verify keyboard, edge pan, zoom, rotation, single select, box select and select-all
- [x] 4.4 Implement mission 2 movement/cover/stance flow from start to completion; verify waypoint arrival, cover occupation and all three stances
- [x] 4.5 Add the mission panel with objective, hint, progress, pause/continue and completion/replay; verify completion pauses and offers the next mission

## 5. Migration and entry

- [x] 5.1 Remove the old boot-camp start entry and paused Contact path; verify no dead navigation or target spawn remains
- [x] 5.2 Keep sandbox and existing skirmish/both-sides entries working; verify their tests are unaffected
- [x] 5.3 Document the legacy-to-campaign mapping and the locked 3-10 rationale in status/architecture

## 6. Verification

- [x] 6.1 Add unit tests for ten-mission content, unlock/persistence, migration and mission step evaluation
- [x] 6.2 Add Playwright coverage for campaign overview, locked 3-10, mission 1, mission 2, resume and replay; record screenshots and video
- [x] 6.3 Run `pnpm check`, `pnpm build`, `pnpm e2e`, `pnpm sim` twice and `openspec validate --specs`; record counts, bundle size and hash

