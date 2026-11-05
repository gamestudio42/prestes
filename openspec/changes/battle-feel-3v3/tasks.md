## 1. Feel gate first

- [x] 1.1 `tools/battle-report.ts` and `pnpm battle:report`: headless 3v3, fixed seed, player sections attack by bounds and re-target; print battle time, shots per casualty, largest same-tick volley, longest silent stretch; record today's figures in `docs/status.md` as the baseline (verify: the script runs and reproduces the measured stall)
- [x] 1.2 `tests/simulation/battle-feel.test.ts` asserting the spec bands, marked as expected to fail until section 5 (verify: it fails on today's code for the right reasons)

## 2. Fire and lethality

- [x] 2.1 Weapon profile: `aimedIntervalTicks` and `reactionTicks`; combat draws the aimed cooldown and the reaction delay from the seeded RNG; suppressive fire keeps `fireIntervalTicks` (verify: unit test for the 11-man section scenario, no tick with more than three of its shots, intervals 3 to 5 s)
- [x] 2.2 Damage 35 to 55; unit test that an unwounded soldier goes down in two or three hits and never one (verify: test plus same-seed determinism test)
- [x] 2.3 Close-quarters cover fall-off and same-trench rule in `coverAgainst`; unit tests for the 6 m vs 60 m and the inside-the-trench scenarios (verify: tests, and the bootcamp defense station e2e still passes)

## 3. Movement

- [x] 3.1 Rush length: cover up to 30 m ahead, else 12 to 20 m capped at the objective; tests for open ground, wall at 25 m and objective at 8 m (verify: tests, and the maneuver station e2e still passes)
- [x] 3.2 Last known contact: units record it; an idle fit unit without an ordered position closes on it after 10 s; test that two sections out of sight find each other (verify: test)

## 4. The battle

- [x] 4.1 3v3 deployment about 180 m apart; test that nothing fires in the first 10 s without orders (verify: test)
- [x] 4.2 Enemy commander (`systems/enemy-commander.ts`): deploy to cover with Defend, hold, counterattack at 1.4 times strength, withdraw a broken section; tests for deploy and counterattack (verify: tests and the headless report)
- [x] 4.3 Outcome counts incapacitated column soldiers; end panel with result, time and casualties, Restart and Menu, PT-BR and EN strings (verify: locale check and `tests/e2e/battle.spec.ts`, which ends the 3v3 through the bridge's incapacitate command, restarts it and returns to the menu)
- [x] 4.4 "3 vs 3 battle" on the start menu (verify: e2e starts it from the menu)
- [x] 4.5 Routes drawn for the selected sections only (verify: view unit test of the order filter; the sandbox path count reads the frame's orders, not the drawn ones, so it cannot show this)

## 5. Tune until it plays well

- [x] 5.1 Tune the numbers by the report until `battle-feel.test.ts` passes; watch the battle in the browser at tactical span (screenshots at the approach, the firefight, the assault and the end) and fix what reads wrong, the enemy's clips included; view test pinning a legalist snapshot through walk, run, prone, fire and aim (verify: the feel test passes; screenshots reviewed)
- [x] 5.2 Re-record the determinism golden with the reason; rerun the bootcamp e2e and adjust station timeouts or targets only where the new fire rate requires it (verify: `pnpm verify`)
- [ ] 5.3 `docs/status.md` with the final figures; hand check by the user in Chrome: a full 3v3 from the menu to the end panel (verify: the user's notes recorded)
