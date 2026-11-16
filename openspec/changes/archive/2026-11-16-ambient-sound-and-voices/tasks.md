## 0. Before starting

- [x] 0.1 Read `docs/handoff.md`, then this change's proposal, design and specs. Prerequisites: ffmpeg on the machine (as `tools/optimize-gramophone.ts` needs); keep the game muted (`prestes.audio.v1`) in the preview pane unless the task is to listen; the voice lines (5.1) wait for the forms of address in `docs/history/FORCES.md` and for the owner's review of the text; verify: `pnpm optimize:music` still runs

## 1. Mixer and the nearness rule

- [x] 1.1 A mixer with effects, ambience and voices buses under a master, the ducking side-chain, and the shot audio moved onto effects; verify with unit tests on a fake output that shots still play as before and that a priority voice lowers the other buses and releases within 1 s
- [x] 1.2 The listening point from the camera's ground focus and `gainAt(distance, range, zoom)` with left-right panning by screen position; verify with unit tests of range, zoom and pan
- [x] 1.3 The audio preparation tool (trim, level, encode) and a loop test of one ambient bed in the target format; verify: the tool is repeatable (same input, same output) and the bed loops without an audible gap, with the format decision recorded in the design

## 2. Settings

- [x] 2.1 Three channel volumes and the mute in the HUD overflow and the options compass, stored with migration from `prestes.audio.v1`; labels in EN and PT-BR; verify with unit tests of the migration and an e2e of "voices without ambience"
- [x] 2.2 The content warning on the first opening (EN and PT-BR) with "continue without swearing", and the curses setting in the options compass, stored in `prestes.audio.v1` (design D11); verify with unit tests of the stored answer and the setting, and `tests/e2e/content-warning.spec.ts`

## 3. Ambience and water

- [x] 3.1 The list of beds, one-shots, water and footstep sounds with a proposed source for each (the owner's recording, synthesis, or a named CC0 recording); verify: the owner approves the list, recorded in `docs/status.md`
- [x] 3.2 Ambient beds by ground and hour with cross-fades and non-repeating one-shots; verify with unit tests of bed choice and the fade, and by ear in the preview
- [x] 3.3 A shared helper for the nearest water of each kind to a point (river by width, ford, pond) and the water emitters; verify with unit tests of the helper on a test map and of the river/stream/ford scenarios
- [x] 3.4 Wading sound for men in a ford; verify with a unit test from a mirror frame with men in water

## 4. Footsteps

- [x] 4.1 Footstep groups by section, surface, pace and number of men moving, limited to units the listener's side sees, with a cap; verify with unit tests of surface change, the one-or-eleven layers, the fog rule and the cap

## 5. Voices

- [x] 5.1 `VOICE_LINES` in `packages/content`: the commander's line and the section's answer for every order of the board (three takes each), the eight call-outs, the curses, and the enemy's call-outs, curses and wordless shouts (draft text in `docs/audio/ROTEIRO_RASCUNHO.md`; side-specific curses only with a sourced page); Portuguese text reviewed by the owner; captions in EN and PT-BR; decide from the snapshot how "out of ammunition", "reloading" and "gun set" are detected; verify with `pnpm check:content` (every order has both lines) and `pnpm check:locales`
- [x] 5.2 `tools/voice-script.ts` writes `docs/audio/VOICE_SCRIPT.md` and the file manifest; the audio check lists lines without a recording and files without a line, and enforces the size budget and the asset register; verify with unit tests on fixtures (missing, orphan, over budget, unregistered)
  - Done 2026-11-16. `pnpm check:audio` (`tools/voice-script.ts`, in `pnpm verify` after the content check) writes `docs/audio/VOICE_SCRIPT.md` from `VOICE_LINES` and the manifest `sound-files.ts` (written by `pnpm prepare:audio`); it lists takes to record and voice files without a line, and fails over `tools/audio-budget.json` (16 MB in all, 5 MB of voices) or on a file not in `docs/assets.md`. Now: 202 of 202 takes, 9.82 MB in all, 1.93 MB of voices. Fixture tests in `tests/tools/voice-script.test.ts`.
- [x] 5.3 The voice director: priority, no-repeat, quiet time, rapid-order replacement, no acknowledgement for a refused order, no curse when the curses setting is off (D11); verify with unit tests, one per scenario of the order and call-out requirements
- [x] 5.4 Order lines and answers play unattenuated with ducking; call-outs positioned at the speaker; curses only under fire, by chance, with their quiet time and cap; enemy lines and shouts only when seen; verify with unit tests of the gains and an e2e with placeholder beeps standing in for recordings
- [x] 5.5 Captions with their setting and defaults by language; verify with an e2e in EN (shown) and PT-BR (hidden, then turned on)
  - Done 2026-11-16. `packages/content/src/voice-lines.ts` holds the 202 generated takes (101 lines) with EN captions; curses without a sourced page and the enemy's wordless shouts are left out until they exist. From the snapshot: out of ammunition is magazine and reserve at 0, reloading is magazine at 0 with rounds in reserve, gun set is `gunState` becoming `set`. The client numbers its commands as the simulation does (from 1 per battle) and learns from each frame which it has run, so a refused order is silent. Curses come by chance (20%) to a section that is firing or fired on, at most one chance a second, 25 s per section and 6 s over all (the owner: random, when one troop engages another). The same call-out from any section waits 5 s. Captions show even when muted. Order voices are off in deployment. Unit tests `tests/audio/voices.test.ts`, e2e `tests/e2e/voices.spec.ts`; the real takes stand in for beeps.
- [x] 5.6 The owner records the lines from the script; the tool prepares them; `docs/assets.md` lists them; verify: the audio check reports full coverage of the order lines and answers, or lists what is still to record
  - Done 2026-11-16, by the owner's decision of 2026-11-15: the lines are generated from his own recorded voice (D8) rather than recorded take by take; `docs/assets.md` lists them. `pnpm check:audio` reports full coverage: 224 of 224 takes (order lines, answers, call-outs, shouts of both sides, curses and the enemy's lines). Column curses 13, 20 and 21 were dropped at the owner's word (no source in the project's books).

## 6. Loading and gates

- [x] 6.1 On-demand loading in priority order; a battle starts without waiting; verify with an e2e that throttles the audio requests and starts a battle, and `pnpm check:bundle` unchanged for the JS chunks
  - Done 2026-11-16. Audio was already fetched on demand; the voices now ask for the order lines and answers at the battle's first frame and the rest 4 s later (`LATER_VOICES_MS`), behind the beds and water. `tests/e2e/audio-loading.spec.ts` delays every audio file by 3 s: the battle opens and starts at once, order lines are asked for before call-outs, and an order is spoken once they arrive. `pnpm check:bundle` passes; the index JS grew with the voice catalogue to 989,826 B of 1,000,000 (99.0%).
- [x] 6.2 `pnpm verify` and `openspec validate ambient-sound-and-voices --type change --strict`; verify: all pass, the audio set's size in `docs/status.md`, determinism goldens unchanged
  - Done 2026-11-16. `pnpm verify` passed every step (check, published content, audio check, build, bundle, release check, determinism with goldens unchanged, difficulty, tick budget, OpenSpec, e2e 183 passed and 9 skipped in 15.6 min); `openspec validate ambient-sound-and-voices --type change --strict` passes. The audio set's size is in `docs/status.md`.
- [x] 6.3 Hand check by the owner with headphones: the river and the stream, a march over three surfaces, orders to a far section under fire, the call-outs; findings in `docs/status.md`
  - Closed 2026-11-16 at the owner's word ("deixe esses de fora e feche"). He played with the sound on: the sea at the fort (fixed to sound of waves), the voices in battle (made farther twice, kept). The full headphone list (river and stream, a march over three surfaces) was not walked item by item; anything he hears later is a new change.
