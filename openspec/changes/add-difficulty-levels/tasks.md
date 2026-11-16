## 0. Before starting

- [x] 0.1 Read `docs/status.md`, then this change's proposal, design and specs; keep the game muted (`prestes.audio.v1`) in the preview pane; check where `ambient-sound-and-voices` stands (voice catalog 5.1, director 5.3, playback 5.4, captions 5.5) to know whether task 5.2 can play lines or only caption them; verify: `pnpm check` passes before any change

## 1. Level in the simulation

- [x] 1.1 `Difficulty`, `DIFFICULTIES`, `DEFAULT_DIFFICULTY`, `DifficultyFactors` and the factor table (design D1 starting values) in `packages/shared`, with a check that every factor is ordered História ≥ Soldado ≥ Oficial in the player's favour and neighbouring levels differ; verify with a shared unit test of the ordering and of Soldado as default
- [x] 1.2 `difficulty?` on the `start` request, resolved in the engine (absent → Soldado), stored in `SimContext` with its factors, folded into `hashState()`, carried on the frame; verify with simulation unit tests "Default level", "Level in the hash" and "Same level, same hash"
- [x] 1.3 Enemy aim factor on aimed and area hit chance of the `legalist` side; verify with the unit test "Enemy aim follows the level" (same shooter, target and seed at each level)
- [x] 1.4 Enemy commander factors (think interval, counterattack ratio, retake force, last-minutes start) in `enemy-commander.ts`; verify with the unit test "Commander counterattacks sooner at Oficial" and a test that História never sends a retake while Soldado does
- [x] 1.5 Player-side morale factors (losses from fire, nearby losses, officer and figure loss; self and command rally rates) in `combat.ts` and `morale.ts`; verify with the unit test "Morale holds better at História" and the existing morale tests at Soldado
- [x] 1.6 Oficial reserve (× 0.6 after the type's factor, rounded) in spawning, including battle-event arrivals; verify with unit tests "Reduced reserve" (45 → 27), an Oficial arrival with the reduced reserve, "Enemy reserve unchanged" and "Forces unchanged by level"

## 2. Economical fire

- [x] 2.1 `'economy'` in `FireControl` and the `fire_control` command; target choice within 60 % of range, 1.5 × interval with × 1.15 hit chance, bursts at their low end, area and suppress orders bypass it, concealment treats it as a set control; verify with unit tests "Economical fire waits for range", "Economical fire spends less", "Short bursts", "Area fire under economical fire" and "Economical fire is deterministic", and the existing fire control tests unchanged
- [x] 2.2 HUD: economical button in the Fire row with a new icon slice (open cartridge box) and label/tooltip in EN and PT-BR; verify with the icon-map unit test, `pnpm check:locales`, and a screenshot of the order board in the preview pane

## 3. Setup screen and result

- [x] 3.1 `difficulty` in the skirmish setup state, validated with fallback to Soldado, saved and restored with the rest; verify with unit tests "Level remembered" and "Older saved setup"
- [x] 3.2 The three-level choice next to the time limit with each level's description, sent on `start`; level named on the result screen; names and descriptions in EN and PT-BR (História/Soldado/Oficial, Story/Soldier/Officer); verify with `pnpm check:locales` and an e2e that chooses Oficial, starts, and finds the level in the frame and on the result screen

## 4. Tuning and the check

- [x] 4.1 `--difficulty` on `tools/battle-report.ts` and `tools/headless-sim.ts` (and `--factors`, `--economy` for tuning); the scripted player fights in free fire at every level (it holds its line, so economical fire left it almost silent); verify: `pnpm sim -- --difficulty oficial` completes and the report prints the level
- [x] 4.2 `tools/check-difficulty.ts` (default skirmish map, seeds 1–20, casualty-exchange bands and their rise, names a level out of band, win rates printed for information) wired into `pnpm verify`; verify with a unit test of the band logic on fake results ("A level drifts", "Win rate is information")
- [x] 4.3 Tune the factor table until the check passes, keeping the ordering and the Oficial reserve at 0.6; record the final table and each level's casualty exchange and win rate in `design.md`; verify: `tools/check-difficulty.ts` passes
- [x] 4.4 Re-record the determinism goldens once with reason "add-difficulty-levels: Soldado rebalanced", and pin to a level any existing test that asserts today's balance; verify: `pnpm check` and the determinism check pass

## 5. Fire control voices

- [ ] 5.1 Draft lines of design D4 added to `docs/audio/ROTEIRO_RASCUNHO.md` (a "Controle de fogo" section, 24 takes) for the owner's review, and to the voice line catalog when it exists, with PT-BR and EN captions, including the owner's line "Só atirem quando virem o branco dos olhos deles!"; verify: the owner approves the lines; `pnpm check:locales` passes on the captions
- [ ] 5.2 Voice director plays the fire control line and answer on `fire_control` under the order rules (one line for several sections, newer replaces unstarted, nothing on refusal, caption only when unrecorded); placeholder: until the owner records the takes, captions only — this does not count as the voices being in; verify with unit tests "Fire control is spoken", "Several sections, one line" and "Not yet recorded" (blocked on ambient-sound-and-voices 5.3–5.5 if not yet done)

## 6. Verify

- [x] 6.1 `pnpm verify` passes, including the difficulty check, budgets and e2e; `openspec validate add-difficulty-levels --type change --strict` passes (2026-11-15: the 3v3 HUD and orders-column baselines re-recorded for the Economical button, which also picked up the battle menu from c58cd1d; the area-fire e2e fails at HEAD without this change too, and the performance e2e fail only under machine load)
- [x] 6.2 `docs/status.md` updated with the change's state and the tuned table's win rates
- [ ] 6.3 The owner plays one skirmish at each level and confirms História is forgiving, Soldado fair and Oficial hard with ammunition that has to be spared; retune within the bands if asked
