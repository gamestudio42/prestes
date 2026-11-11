## 1. Mixer and the nearness rule

- [ ] 1.1 A mixer with effects, ambience and voices buses under a master, the ducking side-chain, and the shot audio moved onto effects; verify with unit tests on a fake output that shots still play as before and that a priority voice lowers the other buses and releases within 1 s
- [ ] 1.2 The listening point from the camera's ground focus and `gainAt(distance, range, zoom)` with left-right panning by screen position; verify with unit tests of range, zoom and pan
- [ ] 1.3 The audio preparation tool (trim, level, encode) and a loop test of one ambient bed in the target format; verify: the tool is repeatable (same input, same output) and the bed loops without an audible gap, with the format decision recorded in the design

## 2. Settings

- [ ] 2.1 Three channel volumes and the mute in the HUD overflow and the options compass, stored with migration from `prestes.audio.v1`; labels in EN and PT-BR; verify with unit tests of the migration and an e2e of "voices without ambience"

## 3. Ambience and water

- [ ] 3.1 The list of beds, one-shots, water and footstep sounds with a proposed source for each (the owner's recording, synthesis, or a named CC0 recording); verify: the owner approves the list, recorded in `docs/status.md`
- [ ] 3.2 Ambient beds by ground and hour with cross-fades and non-repeating one-shots; verify with unit tests of bed choice and the fade, and by ear in the preview
- [ ] 3.3 A shared helper for the nearest water of each kind to a point (river by width, ford, pond) and the water emitters; verify with unit tests of the helper on a test map and of the river/stream/ford scenarios
- [ ] 3.4 Wading sound for men in a ford; verify with a unit test from a mirror frame with men in water

## 4. Footsteps

- [ ] 4.1 Footstep groups by section, surface, pace and number of men moving, limited to units the listener's side sees, with a cap; verify with unit tests of surface change, the one-or-eleven layers, the fog rule and the cap

## 5. Voices

- [ ] 5.1 `VOICE_LINES` in `packages/content`: the commander's line and the section's answer for every order of the board (three takes each), and the eight call-outs; Portuguese text reviewed by the owner; captions in EN and PT-BR; decide from the snapshot how "out of ammunition", "reloading" and "gun set" are detected; verify with `pnpm check:content` (every order has both lines) and `pnpm check:locales`
- [ ] 5.2 `tools/voice-script.ts` writes `docs/audio/VOICE_SCRIPT.md` and the file manifest; the audio check lists lines without a recording and files without a line, and enforces the size budget and the asset register; verify with unit tests on fixtures (missing, orphan, over budget, unregistered)
- [ ] 5.3 The voice director: priority, no-repeat, quiet time, rapid-order replacement, no acknowledgement for a refused order; verify with unit tests, one per scenario of the order and call-out requirements
- [ ] 5.4 Order lines and answers play unattenuated with ducking; call-outs positioned at the speaker; enemy shouts without words, only when seen; verify with unit tests of the gains and an e2e with placeholder beeps standing in for recordings
- [ ] 5.5 Captions with their setting and defaults by language; verify with an e2e in EN (shown) and PT-BR (hidden, then turned on)
- [ ] 5.6 The owner records the lines from the script; the tool prepares them; `docs/assets.md` lists them; verify: the audio check reports full coverage of the order lines and answers, or lists what is still to record

## 6. Loading and gates

- [ ] 6.1 On-demand loading in priority order; a battle starts without waiting; verify with an e2e that throttles the audio requests and starts a battle, and `pnpm check:bundle` unchanged for the JS chunks
- [ ] 6.2 `pnpm verify` and `openspec validate ambient-sound-and-voices --type change --strict`; verify: all pass, the audio set's size in `docs/status.md`, determinism goldens unchanged
- [ ] 6.3 Hand check by the owner with headphones: the river and the stream, a march over three surfaces, orders to a far section under fire, the call-outs; findings in `docs/status.md`
