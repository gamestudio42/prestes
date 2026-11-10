## 1. Simulation

- [x] 1.1 Command `hurry` (unit ids, on/off), unit field `hurry` set only while on, snapshot `hurry`; `unitGait` runs a hurried soldier except in recon, under the winded cap; allowed in deployment (verify: tests "a running section crosses faster", "recon stays slow", "running still tires"; `pnpm check:determinism`)
  - Apply note: Command hurry; unit field hurry set only while on (deleted on Walk), so goldens hold; snapshot hurry; unitGait runs a hurried soldier after the order and fire rules, except recon, before the winded cap; hurry is a placing command in deployment. Tests in mechanics.test.ts (gaits).

## 2. Game

- [x] 2.1 Order board "Passo" group with Andar / Correr (EN Walk / Run), pressed state from the selection, key `R`, tooltips; PT-BR and EN (verify: e2e "run toggle" sets Run, the frame shows `hurry` and the gait is run on a move; locale check)
  - Apply note: Order board group Passo (Pace) with Andar / Correr (Walk / Run) as words between Corpo and Fogo (no new pixel icons: the sheet needs Aseprite); pressed when every selected soldier hurries; key R toggles; tooltip in PT-BR and EN. e2e run-toggle.spec.ts (Run sets hurry, a move runs, R walks again; Portuguese labels).

## 3. Close

- [x] 3.1 Docs `docs/status.md`; gates `pnpm check`, `pnpm e2e`, `pnpm check:determinism`, `openspec validate add-run-toggle --strict` (verify: all pass)
  - Apply note: docs/status.md has the Run toggle section (2026-11-09). Gates run with garrison-and-assault 5.3: pnpm check passed (713 tests), full pnpm e2e 120 passed (run-toggle.spec.ts included; one tactical tooltip test flaky under load, passes alone), pnpm check:determinism matches the golden, openspec validate add-run-toggle --strict valid.
