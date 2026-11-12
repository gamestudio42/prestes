## 0. Owner's values

- [x] 0.1 (Owner confirmed the proposed values on 2026-11-11; no delta changed.) Record the owner's answer on X (crouched/prone in scrub) and the area-fire accuracy and suppression factors; if they differ from the proposal, update the concealment and orders deltas and design D1/D5 first; verify: `openspec validate scrub-concealment-and-area-fire --type change --strict` green with the confirmed numbers

## 1. Scrub concealment

- [x] 1.1 Scrub row (D1): `VEGETATION.scrub.conceal` = standing null, crouched 50, prone 30 in `packages/shared/src/maps/concealment.ts`; verify: `packages/simulation/test/battle-maps.test.ts` cases on a code-built map with painted scrub: standing seen at 100 m, crouched hidden at 60 m and seen at 45 m, prone hidden at 35 m and seen at 25 m, crouched running seen at 90 m; a case with a `bush` object's stamped scrub giving the same result; the corn, cane and tall-grass cases unchanged
- [x] 1.2 Settling in scrub crouches (D2): beside `defaultConcealedFire()` in `packages/simulation/src/systems/concealment.ts`, a settled section in scrub crouches its standing men whose stance the player has not set; verify: simulation tests that a default-stance section halting in scrub crouches and shows `concealed`, that a section the player set to standing stays standing and unconcealed, and that both sides behave alike
- [x] 1.3 Concealed hint: `hud.concealedHint` in `packages/content/src/locales/en.ts` and `pt-BR.ts` gains the keep-low sentence (design D8); verify: `pnpm check:locales`

## 2. Area fire in the simulation

- [x] 2.1 Protocol (D3): `area_fire` command, `'area-fire'` in `UnitOrder`, `'no_suspected_contact'` in `RejectionReason`, `area?: true` on the `shot` event, `areaFire?: { x, y, radius }` on `UnitSnapshot` in `packages/shared/src/protocol.ts`; verify: `pnpm typecheck`
- [x] 2.2 Contact memory (D4): `radius` kept on each `vision.heard` entry in `vision.ts`; validation in `commands.ts` (same squad, not in deployment, within 8 m of a heard entry younger than 100 ticks or a last sighting younger than 70 ticks of an unseen enemy; any point with fog off) and the per-unit `areaFire` state with its clamped radius and `untilTick`; verify: simulation tests for a marker accepted, a ghost accepted at 5 s, a point 30 m off rejected with `no_suspected_contact` and an unchanged hash, a marker 12 s old rejected, fog off accepted, deployment rejected
- [x] 2.3 The round (D5): the area branch of `combat.ts:fire()` (reach and line, aim point, candidate roll with `AREA_FIRE_ACCURACY` 0.03 capped at 0.03, suppress damage, suppression ×0.5 to the disc + 2 m, ammunition, reveal, shot and unseen-fire events, rapid interval); verify: tests that the computed chance for a Mauser at 60 m on a man in the open is about 0.012 and never over 0.03; that an unhit man in the disc gains half a missed round's suppression per round and is pinned by eight riflemen in 10 s; that an empty disc spends rounds and touches no one; that a man behind a building does not fire; that a 400-round seeded batch on one man hits under 3 %
- [x] 2.4 Ending (D6, D7): end at 200 ticks or at the quarter-load floor (Mauser stops at 5), on another order, or on seeing an enemy in the disc or within 15 m (switch to aimed fire under fire control); fire under Hold fire without changing the fire control; verify: tests for each end, and that a Hold-fire section is still Hold fire afterwards
- [x] 2.5 Snapshot and hash: `areaFire` in `snapshot.ts` and in `hashState()`; verify: a battle with an area-fire order run twice from the same seed gives the same hash at every tick

## 3. HUD and view

- [x] 3.1 Order and strings (D8): `area-fire` in `ORDER_CATALOG`, the `order-area-fire` pixel icon (named placeholder), `hud.orderAreaFire`, `hud.tip.areaFire`, `hud.pickAreaFire`, `hud.areaFireUnavailable` and the rejection message in EN and PT-BR; verify: the icon uniqueness unit test, `pnpm check:locales`, the order board test lists eleven orders
- [x] 3.2 Picking (D8): `useOrders.ts` arms Area fire, resolves a click against the fogged frame's markers and ghosts and sends `area_fire`; other armed orders ignore markers; the button is unavailable with its reason when none is shown; verify: HUD unit tests for a click in a marker's ring, on a ghost, on bare ground (nothing sent, still armed) and Attack armed on a marker (nothing sent)
- [x] 3.3 View (D8): the dashed ground ring for the player's units' `areaFire`, dropped by `FogView` for enemy units; area tracers and impacts at `x2/y2`; verify: a `FogView` unit test that an enemy unit's `areaFire` is removed, and a view test that an area shot with `target: -1` draws without error
- [x] 3.4 In the browser preview pane with sound muted (`prestes.audio.v1`): on an authored map, let an unseen enemy fire, arm Area fire, click the "?", and watch the section fire into the ring and the enemy pinned; verify: a screenshot in an apply note

## 4. Determinism and gates

- [x] 4.1 Determinism: `pnpm check:determinism`; re-record moved goldens with `pnpm check:determinism --update` and name the reason (scrub row, auto-crouch) in the commit message; verify: twice-run battles hash the same
- [x] 4.2 Gates: `pnpm check` and `openspec validate scrub-concealment-and-area-fire --type change --strict`; verify: both green
- [ ] 4.3 The owner's hand check in the skirmish, sound muted: standing men in bushes are seen, crouched ones only near; a "?" can be answered with area fire that pins and rarely hits; verify: his word recorded in an apply note before archive
