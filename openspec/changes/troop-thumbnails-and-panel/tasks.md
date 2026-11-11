## 0. Before starting

- [ ] 0.1 Read `docs/handoff.md`, then this change's proposal, design and specs. Prerequisites: `faction-armies` section 2 for the full type list and `soldier-animation-and-textures` section 3 for the final uniforms; the tool (1.1, 1.2) and the panel (section 3) can be built before them and the thumbnails re-run after; verify: `docs/handoff.md` records which prerequisites were in place when the work started

## 1. Thumbnails

- [ ] 1.1 Section render in `packages/view3d/src/thumbnails.ts`: a type's men in the army's uniform with their weapons, fixed camera and light; verify with a view test that a rifle section and a machine-gun section produce different pictures and that the gun's model is in the scene
- [ ] 1.2 `tools/section-thumbs.ts` and `pnpm thumbs`: render every type headless and write `apps/game/public/assets/sections/<type>.png` with its hash file; verify: two runs give identical files, and every catalog type has an image
- [ ] 1.3 Content check: a missing image or a stale hash fails and names the type; `docs/assets.md` lists the set; verify with a unit test of both failures and `pnpm check:content`

## 2. Roster builder

- [ ] 2.1 Type cards: thumbnail, name, men, weapon icons with counts, description or refusal reason; keyboard navigation kept; verify with the setup e2e (cards, a refused type's reason, arrow keys) in EN and PT-BR
- [ ] 2.2 Roster rows show the type's thumbnail; verify with the setup e2e

## 3. Troop panel

- [ ] 3.1 Header: thumbnail, name and type, army, current order, fit/wounded/down; totals for several sections; verify with a HUD unit test of both header scenarios
- [ ] 3.2 Soldier rows: role, weapon, state word, labelled bars, leader first and casualties last; verify with unit tests of the ordering and the state word, and an e2e that reads a pinned man's row
- [ ] 3.3 Gauges for morale, cover, cohesion and suppression with band words from shared thresholds (add named bands to shared data where missing); verify with unit tests that the words follow the shared thresholds
- [ ] 3.4 Alerts as a pure function of the selected units, shown above the rows; verify with unit tests of each alert and of the empty case
- [ ] 3.5 Section cards take the thumbnail; the placeholder portrait, its label and its asset-register row are removed; verify with the HUD e2e and `pnpm check:locales` (no unused key left)
- [ ] 3.6 Eleven rows without scrolling at 1280 x 720, inner scroll for more, greyscale readability; verify with an overflow e2e in EN and PT-BR and a greyscale screenshot reviewed

## 4. Gates

- [ ] 4.1 Visual baselines of the roster builder and the troop panel refreshed and reviewed; verify: `pnpm e2e`
- [ ] 4.2 `pnpm verify` and `openspec validate troop-thumbnails-and-panel --type change --strict`; verify: all pass, sizes in `docs/status.md`
- [ ] 4.3 Hand check by the owner: build a roster and read the panel through a skirmish; findings in `docs/status.md`
