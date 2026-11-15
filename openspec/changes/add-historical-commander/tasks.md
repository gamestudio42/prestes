## 0. Before starting

- [x] 0.1 Read this change's proposal, design and specs; confirm the uncommitted edits in `document.ts`, `types.ts`, `engine.ts`, `combat.ts`, `model.ts`, `EditorApp.tsx` and the editor locales are committed by their session before touching those files; keep the game muted (`prestes.audio.v1`) in the preview pane; Copacabana (map 01) may be edited for its commander only (owner's approval, 2026-11-15); do not edit any skirmish map; verify: `pnpm check` passes before any change

## 1. Data and map check

- [x] 1.1 `commander?: { figure, presence, loss }` on the map document and `{ presence, loss }` on `BattleMap`, with document shape check, compile and round trip; verify with unit tests in `packages/shared/test/map-document.test.ts`: a map without it loads unchanged, a round trip keeps it, `BattleMap` carries no figure id
- [x] 1.2 Map document checks: commander only on campaign maps, field commander needs a `comando` in `columnForce`; verify with one unit test per check (including the "Commander on a skirmish map" and "Field commander without a Comando" scenarios)
- [x] 1.3 `miguel-costa` and `isidoro-dias-lopes` `playable: true` in `figures.ts`, and a content check (test plus `tools/check-maps.ts`) that each campaign map's commander is registered, playable and equals its mission's chapter `commanderId`; verify with `packages/content/test/figures.test.ts` covering "Chapter commanders are playable" and "Map commander differs from the chapter's", and `pnpm check:maps`

## 2. Simulation

- [x] 2.1 Spawn: the first Comando officer of the column gets `figure: true` (unit and snapshot record) on field-commander maps only; verify with unit tests of "Prestes at the Verdinho bridge" and "Isidoro as a voice" on fixtures, and `pnpm check:determinism` shows skirmish, test and scenario goldens unchanged
- [x] 2.2 Command radius (30 m, rally cap 75, 0.1 per tick, any Column army, not legalists) in `morale.ts`; verify with unit tests of "Steadier near him" and "Beyond the radius", and a test that the figure's hit chance equals an ordinary officer's ("No combat bonus")
- [x] 2.3 Loss: 40 m / -25 replacing the ordinary officer loss, cohesion and protect-officer as for an officer, `commander_down` event, `defeat` with `decidedBy: 'commander'` or continue with re-arm on recovery; verify with unit tests of "Prestes falls at Serra Nova", "Loss is not doubled" and "Continue"
- [x] 2.4 Event trigger "commander down" (type, compile, scripted state, map check on maps without a field commander); verify with unit tests of "Commander down with a card" and "Commander down on a map without one"
- [x] 2.5 Determinism of a commander battle; verify with a test that plays a fixture map with a field commander twice with the same seed and commands and compares hashes on every tick

## 3. Presentation

- [x] 3.1 Troop panel: the figure's display name and localized role on the Comando card; verify with a component test in PT-BR and EN ("Name in the panel")
- [x] 3.2 Placeholder pennant `figure-pennant-placeholder` over the figure in `view3d`, entered in `docs/assets.md` as a placeholder; verify by screenshot in the preview pane on Serra Nova (muted)
- [x] 3.3 HUD notice on `commander_down` with the name, strings `commander.down.killed` / `commander.down.incapacitated` in EN and PT-BR; verify with a unit test of the mapping ("Loss reported in English") and `pnpm check:locales`

## 4. Editor

- [x] 4.1 Commander section in the map properties for campaign maps only (playable figures, presence, loss), check messages in the existing list, labels in EN and PT-BR; verify with an editor store test ("Setting the commander" on an in-memory copy), "Skirmish map in the editor", `pnpm check:locales`, and a screenshot in the preview pane without saving

## 5. Campaign maps

- [x] 5.1 Set the commanders on maps 02-08 as listed in the spec (Prestes field/defeat on 02, 05, 06, 07; Miguel Costa field/defeat on 03; Isidoro voice/continue on 04; Prestes field/continue on 08) and add a "commander down" card where the loss is continue and a card fits the chapter's voice; verify with `pnpm check:maps` ("Every campaign map checked")
- [x] 5.2 Regenerate the campaign goldens in `tools/determinism-golden.json` in its own commit; verify with `pnpm check:determinism`, and that only campaign map entries changed in the diff
- [x] 5.3 Copacabana (01): Siqueira Campos, field, continue, with a "commander down" card in the prologue's voice (record, not legend: wounded, survived); regenerate its golden with 5.2; verify with `pnpm check:maps` and a unit test of "Siqueira Campos falls on the avenue"

## 6. Docs and close

- [x] 6.1 Update `docs/campaign/CAMPAIGN.md` (commander presence per mission, Miguel Costa and Isidoro playable) and close the related open questions in the mission docs, including the prologue's "command voice only, or a unit?" (answer: a unit, the Comando's officer); verify with `pnpm check:content`
- [ ] 6.2 Full check; verify with `pnpm check` and `openspec validate add-historical-commander --strict`, and a muted playthrough of Serra Nova in the preview pane where the figure is named, his radius steadies a pinned section, and his fall ends the battle as a defeat
