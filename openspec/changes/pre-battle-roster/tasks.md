## 0. Prerequisites

- [ ] 0.1 Archive `fog-of-war` (after its hand check) and `add-battle-maps`, so the `battle-lab` delta here applies to the durable spec (verify: `openspec list` shows neither in flight; `openspec validate --specs` passes)
- [ ] 0.2 Pin today's default battle: a unit test that records the 66 units (id, squad, faction, x, y, weapon) of the default 3v3 on each map, so later slices prove the default roster changes nothing (verify: the test passes on `main` before any change)

## 1. Weapon catalog (shared, data only)

- [ ] 1.1 Extend `WeaponId` and `WeaponProfile` (`fire`, `burst`, `setupTicks`, `crew`, `nameKey`, `descriptionKey`); add the four new profiles with the design's starting values, `historicalStats: 'abstracted'` and source refs (verify: `validateWeapons` covers the new fields; unit test "every profile is complete"; Mauser profile byte-identical)
- [ ] 1.2 Training loads per weapon (`trainingLoad(weaponId)`): Mauser 5 + 45, automatic rifle 20 + 100, machine gun 250 + 750 pool, Winchester 9 + 36, revolver 6 + 18 (verify: unit test per weapon; default battle unchanged by 0.2's test)
- [ ] 1.3 Locale strings: weapon names, short names and one-line descriptions in EN and PT-BR; update the compendium weapon entries' game status in `docs/history/WEAPONS.md` ("equipable in the skirmish") (verify: `pnpm check:locales`, `pnpm check:content`)

## 2. Section catalog and roster rules (shared, data only)

- [ ] 2.1 `sections.ts`: the seven types with men, roles, weapons, sidearms, speed factors, limits and allowed sides; EN and PT-BR names and descriptions; a codex note "Forces in the skirmish" saying the types are a game organization (verify: unit test "catalog is complete"; locale and content checks)
- [ ] 2.2 `validateRoster`, `canAdd`, `DEFAULT_ROSTER`; refusals `over-men`, `over-sections`, `limit`, `empty`; the shared automatic-rifle limit (verify: unit tests for each refusal, including "30 men + rifle section is refused" and "third automatic rifle is refused")
- [ ] 2.3 Enemy presets per map (`enemyForces`) from the design's table; content check validates every preset and proves a 6-section roster deploys on walkable ground on every map (verify: `pnpm check:content` fails on a broken preset in a unit test and passes on the catalog)

## 3. Simulation: units and deployment

- [ ] 3.1 Protocol: `start` request and engine options gain `rosters?: { column: Roster; legalist?: Roster }`; worker host and client pass them (verify: typecheck; host unit test)
- [ ] 3.2 `battleUnits(deployment, rosters)`: front and rear slots, ranks of up to six, gun crew order, squad ids 1-6 / 11-16, walkable snapping within 6 m; the officer of a Comando is `kind: 'officer'` (verify: 0.2's test unchanged for the default; test "six small sections deploy" on each map; all goldens unchanged)
- [ ] 3.3 Enemy roster: with a player roster, draw a preset with the engine RNG; without, the default and no draw (verify: test "enemy roster is deterministic"; goldens unchanged)
- [ ] 3.4 Section speed factors (gun crew 0.85, irregulars 1.1) in movement (verify: unit test comparing a 100 m march time per type)

## 4. Simulation: weapons in combat

- [ ] 4.1 Per-weapon range in `visible()` (`min(combatRange, weapon.range)`); vision unchanged (verify: test "ranges differ" at 20, 60 and 100 m; goldens unchanged)
- [ ] 4.2 Burst fire: `burstLeft`, gap, per-round hit roll at the burst hit factor, suppression per round, burst cut by an empty magazine (verify: test "burst fire suppresses"; determinism test of a 600-tick burst duel)
- [ ] 4.3 Machine gun: set-up timer reset by movement, belt from the squad pool, loaders feeding (not firing within 3 m while it fires), gunner take-over by nearest fit mate (verify: tests "no fire on the move" and "crewman takes over"; test "pool runs dry, the gun falls silent")
- [ ] 4.4 Command section: the officer aura and `regroup` / `protect-officer` accepted when a Comando is fielded (verify: test that `regroup` is refused without and accepted with a Comando; aura test)
- [ ] 4.5 Mixed-roster goldens: `check-determinism` gains a fixed mixed roster per map (verify: `pnpm check:determinism`; the four default goldens unchanged)

## 5. Presentation

- [ ] 5.1 Roster spread in the book menu: types page, roster page, counters, refusal reasons, order and remove, "Tropa padrão", "Combater"; keyboard navigation; saved in `prestes.roster.v1` with fallback; EN and PT-BR (verify: e2e builds a 6-section roster on Bairro, sees "Homens 29/33", starts and counts six troop cards; e2e "roster remembered"; locale check)
- [ ] 5.2 HUD: section cards with the type's name; weapon card listing each weapon with rounds; gun crew shows "montando" / "pronta" and the pool; troop summary with each man's weapon short name (verify: e2e "weapon card shows the mix" for an Esquadra de 5 and a Metralhadora)
- [ ] 5.3 Sandbox: spawn a troop of a chosen section type (verify: sandbox e2e spawns a Metralhadora and sees its card)
- [ ] 5.4 View: weapon placeholders by kind (`placeholder:winchester`, `placeholder:revolver`, `placeholder:fuzil-automatico`, `placeholder:metralhadora` on its tripod when set), one tracer and one sound per burst; asset register entries (verify: screenshot reviewed at tactical zoom on Fazenda; `docs/assets.md` lists each placeholder)

## 6. Balance and close

- [ ] 6.1 Battle report runs each enemy preset against the default roster and against a mixed roster on three seeds per map; presets outside the feel bands are retuned (verify: report table recorded in `design.md` Apply findings)
- [ ] 6.2 Bench: 3v3 with the heaviest mixed rosters under 3 ms per tick on Fazenda, under 4.5 ms on Bairro (verify: `pnpm bench` numbers recorded)
- [ ] 6.3 Gates: `pnpm verify`, `pnpm e2e`, `openspec validate pre-battle-roster --type change --strict` (verify: all pass)
- [ ] 6.4 Hand check by the user: build two different rosters and fight on two maps; record findings in `docs/status.md`
