## 1. Data and checks (shared)

- [x] 1.1 Add `GunId`, `BombardmentTarget`, the `bombardment` action and the `BOMBARD_*` ranges to `packages/shared/src/maps/events.ts`, with its shape check and `compileAction` clamping (D1); verify with unit tests that out-of-range rate, spread and seconds are clamped and a malformed action fails `isBattleEvent`
- [x] 1.2 Add the gun table (lethal, wounding, suppression radii) in shared, so the simulation, the editor ring and the view read one source; verify a unit test pins the table values from the artillery spec
- [x] 1.3 Add the bombardment checks to `validate-events.ts` (missing or non-area target, missing or self "until" event, out of range, warning for an aim point in the firing side's own deployment area) and add bombardments to the "used by" lookups for areas and events; verify with unit tests for each problem
- [x] 1.4 Add `shell_incoming` and `shell_impact` to `SimEvent` and `'crater'` to `CoverKind` in `protocol.ts`, and crater rim slots in `cover-slots.ts` (D5, D6); verify `pnpm typecheck` passes and a unit test gives a crater two slots

## 2. Simulation

- [x] 2.1 Extract `applyDamage` from `combat.ts`'s `applyHit` keeping its draw order (D3); verify `pnpm check:determinism` still matches every recorded golden before any artillery code exists
- [x] 2.2 Create `packages/simulation/src/systems/artillery.ts` with the bombardment and shell lists on `ScriptedState`, scheduling, aim (area and enemy, D4), landing offset and shell landing (D2), and call it from the engine after `updateBattleEvents`; start bombardments in `battle-events.ts` `fire()`; verify unit tests: first shell announced on the firing tick and landing 20 ticks later, no announcement after the end or after the "until" event, landing points within the spread, at most 4 bombardments, no shell when the enemy is unknown with fog on
- [x] 2.3 Implement impact resolution: protection (stance and cover against the burst, trench 0.8 unless within 1.5 m, garrison), hit chance and damage by distance, suppression and morale by distance (D3); verify unit tests: falloff shares at 2, 10 and 14 m for the 75 mm gun over 500 seeded shells, nothing hit at 16 m, prone hit less than standing, a trench protects from behind, a direct hit in a trench ignores it, two bursts at 8 m pin a section in the open, own side is hit
- [x] 2.4 Implement craters (open dry ground, 3 m spacing, cap 40, low cover, not blocking) appended to `ctx.covers` (D5); verify unit tests: a crater is created and gives a prone man cover, none in water or inside a cover, the cap holds, and `seekCover` can take a crater slot
- [x] 2.5 Add bombardments and shells to `scriptedHashState`, omitted when empty (D2); verify a test that runs a map with a bombardment twice with the same seed and gets equal hashes every tick, and that a map with events but no bombardment hashes as before; run `pnpm check:determinism` and confirm every existing golden matches

## 3. View and sound

- [x] 3.1 Add the shell burst to `packages/view3d/src/effects-layer.ts` (flash, dust column tinted by ground, smoke, debris; 105 mm larger) driven by `shell_impact`, with view-only seeded randomness (D7); verify in the playtest preview (sound muted) with a screenshot of a burst
- [x] 3.2 Draw kind `crater` in the cover layer as a dark low ring decal; verify in the preview that craters stay after bursts
- [x] 3.3 Add `kick(strength)` camera shake in `camera-rig.ts` applied to the rendered position only, strength by distance to focus (D7); verify a unit test that the rig's resting target is unchanged after a kick and the offset decays to zero, and see it in the preview
- [x] 3.4 Find CC0 whistle and burst recordings (Freesound), cut them with `tools/cut-audio-sources.ts` into `apps/game/public/audio/`, credit them in `docs/assets.md` under "Artillery" (or name a synthesized whistle as a placeholder if no CC0 whistle fits); verify the files exist and `docs/assets.md` lists author, link, licence and excerpt for each
- [x] 3.5 Play the whistle (ending on the landing tick, cut off beyond 250 m) and the near/far bursts in `apps/game/src/audio/` through the effects volume and mute (D8); verify unit tests for the variant pick and the cutoff, and listen in the preview with the owner (muted while Claude tests)

## 4. Editor

- [x] 4.1 Add the bombardment to `EventsPanel.tsx` and the editor `events.ts` (side, gun, target, rate, spread, duration or until event, summary line), each change one undo step (D9); verify an editor unit or e2e test that authors it, saves it and undoes it
- [x] 4.2 Highlight the target area and draw the spread ring in the viewport when the event is selected; verify in the editor preview with a screenshot
- [x] 4.3 Add EN and PT-BR labels, summaries and check messages to `editor-en.ts` and `editor-pt-BR.ts`; verify `pnpm check:locales` passes

## 5. Docs, demo and gate

- [x] 5.1 Add the bombardment section to `docs/maps/EVENTOS_DE_BATALHA.md` (PT-BR) and note the action and gun profiles under artillery in `docs/history/WEAPONS.md`; verify the guide names every field the panel shows
- [x] 5.2 Add an e2e: author a bombardment on an area in the editor, playtest, "fire now", and see `shell_impact` events and men hit; verify `pnpm e2e` passes for it
- [x] 5.3 Run `pnpm check`, `pnpm check:determinism` and `openspec validate add-artillery-bombardment --type change --strict`; verify all pass
- [ ] 5.4 Demo for the owner: a scratch test map (not an authored campaign map) with a legalist 75 mm bombardment on an area and a 105 mm bombardment on the enemy's positions, shown in the editor playtest; tune the gun table with the owner's feedback and re-run 5.3
