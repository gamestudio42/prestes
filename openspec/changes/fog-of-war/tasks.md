## 1. Vision

- [ ] 1.1 `systems/vision.ts`: per-side seen sets every 2 ticks (120 m, cone or 15 m, clear line), last-seen positions; `Frame.seen`; engine `fog` option, on for the 3v3; tests for the cone, the wall and the 15 m scenarios and same-seed determinism (verify: tests; bench 3v3 tick under 3 ms)
- [ ] 1.2 Unseen-fire event with the marker error (3 m + 8% of distance, halved per repeated shot from within 6 m in 10 s, floor 2 m); tests for the 100 m shot and the narrowing (verify: tests)

## 2. A fair enemy

- [ ] 2.1 Commander knowledge (seen in 30 s, markers, contacts); strength comparison, targets and the quiet-field attack read only it; with nothing known, advance toward the player's deployment side; test that a hidden section is not counted (verify: tests and the battle report within bands)
- [ ] 2.2 The report's scripted player plays under fog too; report adds time to first sight (verify: feel test on three seeds)

## 3. The player's view

- [ ] 3.1 View hides unseen enemies, keeps seen fallen, fades last-seen silhouettes for 5 s (verify: view unit test of the visibility predicate; e2e that an enemy behind a building is not drawn)
- [ ] 3.2 "?" marker layer from unseen-fire events, fading in 8 s; tracer and sound from the marker (verify: e2e reads the marker count through the dev bridge; screenshot reviewed)
- [ ] 3.3 Selection and targeting only of seen enemies (verify: e2e: an attack order on an unseen enemy is not offered)
- [ ] 3.4 Sandbox fog toggle (PT-BR and EN), off with "control both sides"; bootcamp unaffected (verify: locale check, bootcamp e2e passes)

## 4. Close

- [ ] 4.1 Determinism golden re-recorded with the reason; `pnpm verify` (verify: gate passes)
- [ ] 4.2 Hand check by the user in Chrome: a 3v3 under fog; record in `docs/status.md`
