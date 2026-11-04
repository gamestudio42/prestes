## 1. Speed and budget

- [x] 1.1 Default speed 1x (two ticks per 100 ms) in `App.tsx` and `GameClient`, and on start, retry, Continue and phase change; unit and e2e tests for the default and the reset
- [x] 1.2 Make room in the index JS bundle (raise the budget with a recorded reason, or split training data into a lazy chunk)

## 2. Organized movement

- [x] 2.1 Deterministic minimum-distance matching of soldiers to formation, line and cover slots (ties by id); replace id-sorted line slots and greedy cover order; unit test: no crossing for a line moving to a line of slots
- [x] 2.2 Shared section route with formation offsets and per-soldier fallback, spreading to own destinations on the last segment; bounding uses the matched destinations; mechanics test: 11 soldiers march 40 m within the cohesion limit
- [x] 2.3 Run mechanics, cover slot and bootcamp tests; update the determinism golden and record why

## 3. Training ground

- [x] 3.1 `TRAINING_GROUND` data in `packages/shared` (covers, buildings, sight obstacles, terrain, road, station areas with locale keys); engine uses it in training; sandbox unchanged; tests: covers and slots reachable, no sandbox props, sandbox still uses its map
- [x] 3.2 Move every station's points, markers and training troop into its area; update mechanics tests and e2e scripts to read points from the area table
- [x] 3.3 View: build the training map from `TRAINING_GROUND` (parade ground, barracks, flagpole, firing range butts, hedges, trench line, hamlet, aid tent, assault line, road); camera starts on the current station
- [x] 3.4 PT-BR and EN names for the area labels; `pnpm check:locales`

## 4. Commander balloon

- [x] 4.1 Balloon over the instructor with the current order, positioned from the scene view each frame, hidden off screen; panel unchanged; e2e: balloon text matches the current objective's callout

## 5. Close

- [x] 5.1 `pnpm verify`
- [ ] 5.2 Play all seven stations by hand in Chrome (PT-BR) on the new map; record times, problems and fixes in `docs/status.md`
- [ ] 5.3 EN pass: play at least stations 1 and 7 in EN and fix untranslated or overflowing text
