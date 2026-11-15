## 1. Map data

- [ ] 1.1 Add `MapExit` and `Withdrawal` to `packages/shared/src/maps/types.ts` and `document.ts`; bump `MAP_DOCUMENT_VERSION` to 10 with the 9 → 10 relabel, the shape check and the compile copy; verify with a shared test that a version 9 document opens with no withdrawal and a version 10 one round-trips its exits and requirement
- [ ] 1.2 Add `'withdrawal' | 'cut-off'` to `DecidedBy`, the `unit_exited` and `section_exited` events and the outcome's `withdrawal` block in `protocol.ts`; verify `pnpm typecheck`

## 2. Leaving the field (simulation)

- [ ] 2.1 Add `exited` to the unit model and an `onField` helper; make the `fit` predicates in vision, targeting, combat, objectives, battle events, cover slots and garrisons skip exited men; verify with a test that an exited man is not seen, targeted, hit or counted for capture
- [ ] 2.2 Add the exit step (after movement, only after the deployment phase): fit column men inside an exit leave; record sections that got out (command section by its limit group); verify tests for "a section walks out", "wounded left behind", "routed men do not get out" and "not during deployment"
- [ ] 2.3 Filter exited men out of the worker's frame and add the frame's withdrawal progress block; verify a frame test

## 3. Outcome and report

- [ ] 3.1 Apply the withdrawal order in `updateOutcome` (met → victory; cut off by time or by no fit man on the field; column objective wins skipped; time limit applies without objectives) and count exited men as fit in `fallBack`; verify each scenario of "Victory and defeat by withdrawal" in `objectives-outcome.test.ts` or a new `withdrawal-outcome.test.ts`, and that a map without exits keeps its old outcomes
- [ ] 3.2 Show men out and sections out against the requirement on the end panel (row and "Saíram" column), and the new decided-by labels; verify a component test for victory and for cut off

## 4. Battle events

- [ ] 4.1 Add the `exited` trigger (sections count or command section) to `events.ts` (type, shape check, compile), `validate-events.ts` (no exits, count above sections) and `battle-events.ts`; make the losses trigger not count exited men; verify tests for "the commander crosses", "sections out", "men out are not losses" and the card arriving on the ending tick

## 5. Enemy commander

- [ ] 5.1 Add the `block-exit` plan: on the first think after deployment, block the route from the column's deployment to its nearest exit with one section (two with four or more), exempt from guards and the contact rule, re-applied after a posture ends; verify a simulation test for "blocking section at the start" and "posture overrides the block"
- [ ] 5.2 Turn attacking sections toward a known column man within 60 m of an exit, from fog-limited knowledge only; verify tests for "turning on a column near the exit" and "unseen column is not chased"

## 6. Editor

- [ ] 6.1 Add the `exit` tool (polygon editing like trigger areas, PT-BR/EN names, at most four, labelled drawing) and the requirement in Map properties, created with the first exit and removed with the last; verify editor store tests for draw, undo/redo and deleting the last exit used by an event
- [ ] 6.2 Add the exit and requirement checks to `validate-document.ts` (corners, walkable, reachable from the column, overlap with its deployment, names, count, requirement range, command section with and without a fixed force, edge warning) with click targets; verify a test per problem code
- [ ] 6.3 Offer the "exited" trigger in the Events panel only while the map has exits; verify an editor test and a manual playtest in the preview (sound muted via `prestes.audio.v1`) on a scratch map with an exit

## 7. View and HUD

- [ ] 7.1 Draw exits on the ground with their labels in `packages/view3d` during deployment and the battle (placeholder: a flat translucent band with chevrons, named as such in the code until final art); verify a screenshot in the preview
- [ ] 7.2 Add the withdrawal chip to the top bar and the "section got out by <exit>" announcement; verify a component test and the preview

## 8. Locales, determinism and checks

- [ ] 8.1 Add all EN and PT-BR strings (decided-by, end panel, HUD, editor tool, Map properties, problem codes, trigger summary); verify `pnpm check:locales`
- [ ] 8.2 Add a withdrawal test fixture map under `tools/fixtures/` and a `withdrawal` golden to `tools/check-determinism.ts`; hash `exited` only when true and `withdrawal.out`; verify `pnpm check:determinism` passes with the existing goldens unchanged
- [ ] 8.3 Run `pnpm check` and `openspec validate add-withdrawal-exits --strict`; both pass
