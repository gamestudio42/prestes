## 0. Prerequisite

- [ ] 0.1 Archive `add-battle-maps` (and `fog-of-war`) so the battle-lab delta applies to the durable spec (verify: `openspec validate --specs`)

## 1. Catalogs

- [ ] 1.1 Weapon catalog: Mauser, fuzil automático 7 mm, metralhadora 7 mm, Winchester .44, revólver with fire modes, set-up and crew fields, abstracted stats labelled; PT-BR and EN names and descriptions (verify: weapon catalog tests; locale check)
- [ ] 1.2 Section catalog (seven types) and `validateRoster` with budget 33 men, 6 sections and the limits; codex note that the types are a game organization (verify: unit tests for each refusal; content check)

## 2. Simulation

- [ ] 2.1 Units from rosters and mixed-force deployment; default roster gives today's 66 units in today's order (verify: goldens unchanged for the default; test that six small sections deploy on walkable ground on each map)
- [ ] 2.2 Burst fire for the automatic rifle; revolver and Winchester ranges (verify: tests "ranges differ" and "burst fire suppresses")
- [ ] 2.3 Machine gun: set-up, no fire on the move, crew take-over, squad belt pool (verify: tests "no fire on the move" and "crewman takes over")
- [ ] 2.4 Command section carries the officer aura; enemy presets per map picked by seed (verify: aura test; "enemy roster is deterministic")

## 3. Presentation

- [ ] 3.1 Roster page in the book menu: types list, roster with budget, limits and refusal reasons, order, default, start; saved locally; PT-BR and EN (verify: e2e builds a roster, starts on Bairro, counts troop cards; locale check)
- [ ] 3.2 HUD: section cards with type names; weapon card per weapon and rounds (verify: e2e "weapon card shows the mix")
- [ ] 3.3 View: weapon placeholders by kind and the machine gun on its tripod, named placeholders, asset register entries (verify: screenshot reviewed; asset register lists each)

## 4. Close

- [ ] 4.1 Battle report with a mixed roster on each map; bench under 3 ms per tick on Fazenda; new goldens for mixed rosters; `pnpm verify`; `openspec validate pre-battle-roster --type change --strict` (verify: gates pass)
- [ ] 4.2 Hand check by the user: build two different rosters and fight on two maps; record in `docs/status.md`
