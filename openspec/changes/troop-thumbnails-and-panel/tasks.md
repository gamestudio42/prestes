Approved by the owner on 2026-11-11 ("Aprovo as três", with redo-battle-hud and the soldier figures); apply in the planned order: soldier-animation-and-textures, troop-thumbnails-and-panel, redo-battle-hud; remove-sandbox-panel at any time.

## 0. Before starting

- [x] 0.1 (2026-11-12: `faction-armies` and `soldier-animation-and-textures` both archived, so the thumbnails are the final ones. `redo-battle-hud` went first at the owner's request and already draws `SoldierFigure` (helmet by cover, body by health, clip, bandage/pinned/routed marks) in `TroopSummary`; section 3 builds on it, leader mark and gauges still here) Read `docs/handoff.md`, then this change's proposal, design and specs. Prerequisites: `faction-armies` section 2 for the full type list and `soldier-animation-and-textures` section 3 for the final uniforms; the tool (1.1, 1.2) and the panel (section 3) can be built before them and the thumbnails re-run after; verify: `docs/handoff.md` records which prerequisites were in place when the work started

## 1. Thumbnails

- [x] 1.1 (`sectionComposition`, `buildSectionScene`, `renderSectionThumbnails`; `packages/view3d/test/section-thumbnails.test.ts`. Pixels are checked by the tool's run, the view test compares the posed scenes) Section render in `packages/view3d/src/thumbnails.ts`: a type's men in the army's uniform with their weapons, fixed camera and light; verify with a view test that a rifle section and a machine-gun section produce different pictures and that the gun's model is in the scene
- [x] 1.2 (96 x 96, 19 types, 128 KB; two runs byte-identical) `tools/section-thumbs.ts` and `pnpm thumbs`: render every type headless and write `apps/game/public/assets/sections/<type>.png` with its hash file; verify: two runs give identical files, and every catalog type has an image
- [x] 1.3 (`tools/section-thumbs-hash.ts`, hash of the men, `soldier.glb` and the army's uniform textures; `tests/tools/section-thumbs.test.ts`; assets row added) Content check: a missing image or a stale hash fails and names the type; `docs/assets.md` lists the set; verify with a unit test of both failures and `pnpm check:content`

## 2. Roster builder

- [x] 2.1 (48 px picture, weapon icons by kind: four new ones (`weapon-carbine`, `-automatic`, `-machine-gun`, `-pistol`) added to the `.aseprite` by `pnpm icons --add`, which leaves drawn icons untouched; refused cards keep their colour, dimmed; styles in `troop-thumbs.css`) Type cards: thumbnail, name, men, weapon icons with counts, description or refusal reason; keyboard navigation kept; verify with the setup e2e (cards, a refused type's reason, arrow keys) in EN and PT-BR
- [x] 2.2 (24 px picture at the head of each row) Roster rows show the type's thumbnail; verify with the setup e2e

## 3. Troop panel

- [ ] 3.1 Header: thumbnail, name and type, army, current order, fit/wounded/down; totals for several sections; verify with a HUD unit test of both header scenarios
- [ ] 3.2 Soldier figures (D4): helmet by cover class, body by health, five-round clip, leader/bandage/pinned/routed marks, down laid flat, leader first and casualties last, tooltip with role, weapon and state word; verify with unit tests of the colour, clip and mark mapping from unit snapshots and of the ordering, and an e2e that reads a wounded man's and a prone man-in-trench's figure
- [ ] 3.3 Gauges for morale, cover, cohesion and suppression with band words from shared thresholds (add named bands to shared data where missing); verify with unit tests that the words follow the shared thresholds
- [ ] 3.4 Alerts as a pure function of the selected units, shown above the figures; verify with unit tests of each alert and of the empty case
- [ ] 3.5 Section cards take the thumbnail; the placeholder portrait, its label and its asset-register row are removed; verify with the HUD e2e and `pnpm check:locales` (no unused key left)
- [ ] 3.6 Eleven figures without scrolling at 1280 x 720, inner scroll for more, greyscale readability; verify with an overflow e2e in EN and PT-BR and a greyscale screenshot reviewed

## 4. Gates

- [ ] 4.1 Visual baselines of the roster builder and the troop panel refreshed and reviewed; verify: `pnpm e2e`
- [ ] 4.2 `pnpm verify` and `openspec validate troop-thumbnails-and-panel --type change --strict`; verify: all pass, sizes in `docs/status.md`
- [ ] 4.3 Hand check by the owner: build a roster and read the panel through a skirmish; findings in `docs/status.md`
