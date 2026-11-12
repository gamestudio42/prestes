# Apply notes: scrub-concealment-and-area-fire

## 2026-11-11

- Values confirmed by the owner (task 0.1): scrub standing none, crouched 50 m,
  prone 30 m; area fire ×0.03 of aimed accuracy, capped at 3 %, half a missed
  round's suppression.
- Scrub (1.1, 1.2): the `VEGETATION.scrub` row and `settleLowInScrub` (runs
  before `defaultConcealedFire`). Tests in `packages/simulation/test/battle-maps.test.ts`
  (standing, crouched, prone, running in scrub; a section settling crouches, both
  sides; the player's stance kept) and `packages/shared/test/map-document.test.ts`
  (a `bush` object conceals as scrub).
- Area fire (2.x): `packages/simulation/src/systems/area-fire.ts` (validation
  against `vision.heard` / `vision.lastSeen`, setup, end), the round and the
  sighting exit in `combat.ts` (the hit's damage moved into `applyHit` /
  `applyMissMorale` without changing the RNG order: every existing golden but
  Paiolzinho's is unchanged). `isLineBlocked` gained a `throughCrops` flag for
  the line of fire. Tests: `packages/simulation/test/area-fire.test.ts` (18).
  A seeded batch of over 300 rounds on one hidden man hits under 3 %; eight
  riflemen pin him within 10 s.
- HUD (3.x): order catalog entry, `order-area-fire` icon (a named placeholder
  added to `assets/icons/prestes-icons.aseprite` by script and exported with
  `pnpm icons`; noted in `docs/assets.md`), locale keys in EN and PT-BR
  (`rejection.no_suspected_contact` follows the catalog's rejection keys),
  `pickSuspectedContact` (`apps/game/src/hooks/suspectedContact.ts`), the board
  button disabled with its reason while no "?" or ghost is shown, `FogView`
  stripping the enemy's disc and dropping his unmarked area rounds, the dashed
  ring in `marker-layer.ts`.
- 3.4: the browser pane was hidden (rendering paused), so the browser check ran
  as a Playwright test, `tests/e2e/area-fire.spec.ts`, sound muted: section 1
  walks up on Campo de Provas until an unseen enemy fires, Area fire is armed on
  the board, the "?" is clicked on the field, the section's disc equals the
  marker and area rounds are fired. Its screenshot shows the dashed ring round
  the contact and "Area fire" as the section's order.
- 4.1: `pnpm check:determinism` moved only on Paiolzinho (the other session's
  wire detour had already re-recorded it to 468bf801; this change moves it to
  5a549b2e). Re-recorded with the reason naming both changes.
- 3.4 found a flaw: on Campo de Provas the "?" (laid off the true shooter)
  had its centre behind a crest, and the line was checked to the centre, so
  no man in reach ever fired. Each round now draws its aim point first and
  checks the line to that point (up to three tries, `AREA_AIM_TRIES`), so the
  men fire into the open part of the disc. Orders delta, design D5 step 2–3
  and a unit test ("a '?' whose centre is hidden") updated. The e2e test now
  walks all three sections up, waits for a legalist "?" within 105 m of a
  section, selects that section and is deterministic (the bridge pauses
  before the first move).
- Many "?" in that skirmish come from the legalist machine gun at about
  125 m, beyond the Mauser's 120 m: Area fire is accepted there but the
  riflemen hold. Raised with the owner as a possible follow-up (show the
  reach, or refuse an out-of-reach contact).
- The timing test `preview-cost` failed once under load during `pnpm check`
  and passed when run alone (the route-around-wire session is editing the
  preview in the same checkout).
- 4.3: the owner said "pode comitar e finalizar" (2026-11-11) without
  reporting a hand check. Committed as a5603eb and archived.
