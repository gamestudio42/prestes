## 1. Content model and training ground

- [x] 1.1 Define the boot-camp content schema for chapters, steps, objectives, hints, spawn schedules and checkpoint ids; verify schema validation rejects duplicate chapter ids and missing locale keys.
- [x] 1.2 Add the fictional Campo de InstruÃ§Ã£o map data with firing lanes, target boards, low wall, stone wall, sandbags, trench, ridge, crater and casualty lane; verify content validation reports the map as fictional and complete.
- [x] 1.3 Add the six chapter definitions and their ordered steps; verify each chapter has a title, objective, hint, completion predicate and checkpoint id.

## 2. Training scenario mode

- [x] 2.1 Add a `training` scenario option to the simulation start contract, separate from `sandbox`, and allow the existing dummy/reinforce/casualty commands only in that scenario; verify normal skirmish still rejects scenario commands.
- [x] 2.2 Add deterministic boot-camp setup commands and fixed seed handling; verify two identical chapter runs produce the same hash.
- [x] 2.3 Verify training setup can spawn target dummies in chapters one to three, a real opponent in chapter four, a casualty in chapter five and both-sides reinforcements in chapter six.

## 3. Tutorial director and checkpoints

- [x] 3.1 Implement the presentation-side tutorial director as a pure state machine over frames/events and required steps; verify unit tests cover advance, wrong action, completion and replay.
- [x] 3.2 Implement checkpoint persistence under a versioned local-storage key; verify reload resumes the active chapter and malformed/missing data falls back to chapter one.
- [x] 3.3 Add chapter gating so both-sides and sandbox controls are unavailable before chapter six; verify the UI and director agree on availability.

## 4. Boot camp presentation

- [x] 4.1 Add the localized Boot Camp action to the start screen without changing the normal start, sandbox or codex actions; verify existing smoke tests remain green.
- [x] 4.2 Add the tutorial panel with chapter, objective, hint, checkpoint and completion feedback; verify it is absent outside the boot camp.
- [x] 4.3 Add chapter setup/spawn actions through the existing command boundary; verify the director never mutates simulation state directly.
- [x] 4.4 Add replay/checkpoint controls and a graduation screen; verify replay starts at the selected chapter checkpoint.

## 5. Chapter vertical slices

- [x] 5.1 Build chapter one (camera, selection, stance) with dummies and verify the checkpoint completes.
- [x] 5.2 Build chapter two (movement, terrain, cover, formations, fatigue) with dummies and verify the checkpoint completes.
- [x] 5.3 Build chapter three (fire, ammunition, suppression, morale, flank, withdraw, hold) with training targets and verify the checkpoint completes.
- [x] 5.4 Build chapter four (defend, ambush, recon, reserve, pursue, disperse, regroup, protect-officer) with a real opposing force and verify the checkpoint completes.
- [x] 5.5 Build chapter five (wound, incapacitation, rescue to cover, treatment, evacuation, recovery, rescue queue) and verify both casualties complete.
- [x] 5.6 Build chapter six (both-sides control, reinforcements, sandbox tools) and verify the graduation checkpoint completes.

## 6. Localization and acceptance

- [x] 6.1 Add EN and PT-BR boot-camp content keys and verify locale parity plus no hardcoded player copy.
- [x] 6.2 Add browser acceptance that completes every chapter, asserts each checkpoint and records a boot-camp video; verify the video artifact exists.
- [x] 6.3 Update architecture/status and run `pnpm check`, `pnpm build`, `pnpm e2e`, `openspec validate` and two deterministic boot-camp runs; record results before marking complete.

