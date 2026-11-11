## 1. Measure first

- [x] 1.1 Add per-weapon figures (rounds, bursts, hits) and the gun's set share to `tools/battle-report.ts` (design D6) and print them in `--presets`; verify: a unit test reads them for a mixed preset, and the 3 × 11 presets report the same time, shots and casualties as before

## 2. Simulation: the gun fires when it should

- [x] 2.1 Belt weapon reach (D1): `engageRange` uses the gun's 140 m; candidates seen by the gunner or by his side's sighting, with a clear line of fire from him and inside his cone; verify: test "reach beyond the rifle" (enemy at 130 m spotted by a mate: the gun fires, a Mauser beside it does not)
- [x] 2.2 Halt to fire (D2): a gun squad under attack, pursue or advance halts on an engageable enemy, sets up and fires; resumes after 50 ticks without one; move, withdraw and flee never halt; verify: tests "an attacking gun halts to fire", "the gun moves on", "no fire on the move" still passes
- [x] 2.3 Determinism: new fields hashed only when present; verify: `pnpm check:determinism` keeps the 3 × 11 golden unchanged, the mixed-roster golden is regenerated on purpose, and a twice-run gun battle hashes identically
- [x] 2.4 Band: the player's gun is set ≥ 70% of the time it has a target in every mixed preset; verify: the battle-lab band test passes and the old bands hold (if a band fails, tune and record the values in an apply note)
  - Apply note (2026-11-09): measured over the 33 mixed presets with the target counted only in sight and reach (design D7): 27 of the 30 runs where the gun fought are at 0.70-1.00; below are vila-militar B 1924 (0.52, 10 bursts), serra-rio B 1922 (0.47, 3 bursts) and 1925 (0.54, 3 bursts), where the 4 s set-up weighs on few engagements. Before the change the same share (then counted with out-of-sight objectives) was 0.35-0.65. The band test runs vila-militar A, fazenda B and bairro B at seed 1922 (0.98, 1.00, 0.92). The 3 x 11 default reports are unchanged (vila-militar 1922: 266.1 s, 779 shots), so the old bands hold; also fixed belt-only target flicker (design D7).

## 3. Snapshot and HUD

- [x] 3.1 Gun state in `UnitSnapshot` (D5), not hashed; verify: snapshot unit test for moving, setting (with time left) and set
- [x] 3.2 Weapon card shows the gun state, with PT-BR and EN keys; verify: HUD test and `pnpm check:locales`

## 4. Audio

- [x] 4.1 Synthesize the machine-gun and automatic-rifle reports with a seeded generator (D3); verify: unit test that the buffers are identical on two runs and differ from each other; register both in `docs/assets.md`
- [x] 4.2 `ShotAudio`: sound by weapon kind, every round of automatic fire scheduled at its tick offset over the game speed, automatic budget of 2 voices, bolt only after aimed bolt-rifle fire; verify: tests "a burst is heard as a burst" (six plays ~100 ms apart, no bolt), "weapons sound different", "rifles are heard under the gun", "determinism is unchanged"

## 5. View

- [x] 5.1 Ribbon tracers with a pixel floor and per-weapon styles (D4), a tracer per round, `MAX_TRACERS` 160; verify: view3d unit tests (six tracers for a six-round burst; width ≥ floor at the strategic span; gun streak longer and brighter than a rifle's)
- [x] 5.2 Smoke once per burst, flash per round; fog's unseen-fire start at the "?" kept; verify: effects-layer test and `tests/e2e/fog-of-war.spec.ts`
- [x] 5.3 Visual check in the browser preview, sound muted (`prestes.audio.v1`): a rostered 3 vs 3 with a gun, screenshots at tactical and strategic zoom; verify: screenshots attached to the apply note; `tests/e2e/performance.spec.ts` within budget
  - Apply note (2026-11-09): preview on port 5183 (5173 held by the main checkout), sound muted. Vila-militar, MG + 2 rifle sections: the card showed "Metralhadora ×1 PRONTA"; the gun fired a whole belt (250) by tick 1,100; its gunner fell and a loader took the gun, set and firing (196 left). The pane was 357 px wide, too narrow for useful tracer screenshots; the user watched the tracers and found them too thick, so widths went down (rifle 0.7 px floor, automatic 0.85, gun 1; design D4). `performance.spec.ts` passes.
  - Apply note (2026-11-09, second pass): the user still found them thick and could not tell the gun's tracer or sound from a rifle's. Every tracer is now one render pixel with its head under the bloom threshold, longer and faster (rifle 8 m at 150 m/s, automatic 10 m at 165, gun 13 m at 180), the gun's red-orange; the gun's report gained a deeper boom and an action clack, plays 1.5 times as loud at a quarter of the pitch spread (design D3, D4).

## 6. Gates

- [x] 6.1 Run `pnpm check`, `pnpm check:determinism` and `pnpm e2e`; verify: all green, with the user's hand check of the gun's sound and tracers before archive
  - Apply note (2026-11-09): `pnpm check` green (656 tests; two earlier runs timed out on 20 s tests while another session ran battle reports on the same machine, and passed alone and on the rerun), `pnpm check:determinism` ok (3 x 11 golden unchanged, mixed-roster vila-militar and fazenda updated), `pnpm e2e` 111 passed. Left open for the user's hand check of the new sound and the thinner tracers.
  - Apply note (2026-11-11): the user's hand check passed ("testes realizados, ok"). `pnpm verify`: check (784 tests), build, bundle budget, determinism, tick budget and `openspec validate --specs` pass; `pnpm e2e` 128 of 130: `desk.spec` label gap fails since the base `6412ac9` (outside this change) and `performance.spec` tactical frame budget measured 23.7 ms at the end of the loaded gate run and passes alone. The battle-lab delta was rewritten on top of the current main requirement (objectives, the 15-minute limit and the authored-map report came after it was written).
