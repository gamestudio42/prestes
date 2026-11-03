## 1. Content and protocol contract

- [x] 1.1 Create `packages/content/src/bootcamp-exercise.ts` with the three phase definitions, typed objectives, markers, drills and setup, and verify `pnpm typecheck` passes
- [x] 1.2 Export the new exercise types and values from `packages/content/src/index.ts` and verify the locale content check still builds
- [x] 1.3 Add EN and PT-BR locale keys for phase titles, objectives, instructor lines, failure reasons and debrief, and verify `pnpm check:locales` passes
- [x] 1.4 Add `role`, `nonLethal`, `training_phase` and `despawn_role` to the shared protocol and verify `pnpm typecheck` passes

## 2. Simulation training capabilities

- [x] 2.1 Add `role` and `nonLethal` to mutable units and spawned troop snapshots, and verify the engine test suite covers the new snapshot fields
- [x] 2.2 Implement non-lethal hit resolution that applies suppression and bounded morale pressure without HP loss, wounds, incapacitation, death or rout, and verify dedicated engine tests
- [x] 2.3 Implement the training-only phase setup command that clears orders, removes training enemies, repositions the troop and officer, resets training state and spawns the phase enemy, and verify reset/retry tests
- [x] 2.4 Implement training-only role despawn and reject both new commands outside training/sandbox, and verify rejection and hash tests
- [x] 2.5 Verify the headless hash and deterministic behavior across two runs with `pnpm sim`

## 3. Exercise director

- [x] 3.1 Implement the pure exercise state machine and phase progression in `apps/game/src/training/exercise.ts`, and verify phase 1/2/3 transition tests
- [x] 3.2 Implement objective evaluation for reach, suppress, secure, hold and protect-officer, and verify each objective with focused unit tests
- [x] 3.3 Implement hold-phase failure, local retry and debrief values, and verify failure/retry/debrief tests
- [x] 3.4 Implement phase progress persistence and legacy-progress fallback, and verify progress storage tests

## 4. App integration

- [x] 4.1 Replace the bootcamp mission state with the new exercise state and send director commands through `GameClient`, and verify phase 1 starts without auto-fire
- [x] 4.2 Remove the global dummy spawn from the bootcamp start and spawn the phase 1 training troop through the exercise setup, and verify no player target or shot occurs on entry
- [x] 4.3 Wire phase transitions, hold fire release, failure pause, retry and resume commands, and verify the exercise can complete and retry through the bridge

## 5. HUD and markers

- [x] 5.1 Replace the 27-step panel with phase and objective cards, live progress, instructor text and a collapsible drill section, and verify the bootcamp E2E selectors
- [x] 5.2 Add failure, retry, completion, replay and debrief states to the panel, and verify localized failure/debrief E2E coverage
- [x] 5.3 Add zone, approach and fallback markers to `TrainingLayer` and clear previous-phase markers, and verify the scene has no marker leaks
- [x] 5.4 Tune responsive HUD styling for the objective panel at desktop and narrow widths, and verify screenshots at 1440x900 and narrow viewport

## 6. Playable phase verification

- [x] 6.1 Make phase 1 playable end to end (assembly zone, minimum soldiers, instructor feedback) and verify with a bridge-driven E2E
- [x] 6.2 Make phase 2 playable end to end (non-lethal fire, suppression, flank, secure line) and verify with a bridge-driven E2E
- [x] 6.3 Make phase 3 playable end to end (hold 60 s, officer protected, victory) and verify with a bridge-driven E2E
- [x] 6.4 Verify failure by losing the line, retry restarts the phase, and completed phases remain completed

## 7. Cleanup and documentation

- [x] 7.1 Remove or isolate the unused `tutorial/*`, `TutorialPanel`, `TrainingCampaignScreen`, `boot-camp.ts` and unused `TRAINING_MISSIONS` path, and verify no imports remain
- [x] 7.2 Update the bootcamp spec purpose, status, architecture, README and bootcamp checklist to describe the playable exercise, and verify no 10-mission player-facing claims remain
- [x] 7.3 Update the asset/design docs only where the exercise changes behavior, and verify the docs name remaining placeholders

## 8. Full validation

- [x] 8.1 Run `pnpm check` and verify typecheck, lint, unit tests, locales and content pass
- [x] 8.2 Run `pnpm build` and verify the static build passes with the chunk warning acknowledged
- [x] 8.3 Run `pnpm e2e` and verify all bootcamp, sandbox, tactical and both-sides tests pass
- [x] 8.4 Run `pnpm sim` twice and verify the stable hash
- [x] 8.5 Run `openspec validate --specs` and `openspec validate "add-playable-bootcamp-exercise" --type change --strict`, and verify both pass
- [x] 8.6 Perform the manual checklist: no auto-fire, phase 1, phase 2, phase 3, deliberate failure, retry, debrief, PT-BR/EN

