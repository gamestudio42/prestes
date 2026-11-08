## 1. Document version 2 and roads

- [ ] 1.1 Map document version 2: `trenches` list, road `camber` removed, `migrate()` from version 1 (trench objects to 12 m fire trenches, cambers dropped); writers write version 2 (verify: unit tests "old file opens" and "round trip writes v2"; `pnpm check:maps`)
- [ ] 1.2 Roads stop editing heights; ditches still dig their channel; road properties without camber; locale keys removed (verify: unit test "road follows the relief" and "cover in the ditch"; editor e2e road test updated)

## 2. Trench lines

- [ ] 2.1 `buildTrenchLine` in shared: height cuts, parapet, forward-facing trench covers, slots every 1.2 m, traverses, communication kind (verify: unit tests "fire step protects forward", "no protection from behind", "slots along a long trench", "communication trench has no slots")
- [ ] 2.2 Compile trench lines from documents; `trench-line` leaves the catalog (verify: unit test that the catalog has no trench object; compile determinism test)
- [ ] 2.3 Fazenda trenches as `TrenchLineDef` data through the builder, replacing its trench covers (verify: map scenario tests pass; Fazenda golden re-recorded with the reason; battle report bands pass)
- [ ] 2.4 View: trench channel walls, parapet berm or sandbags, duckboards, traverses (verify: test that a man on the floor is drawn below the ground; screenshot review)
- [ ] 2.5 Editor trench tool: polyline draw, kind, depth, facing flip key, bays, parapet; panel shows length, slots and capacity; EN and PT-BR (verify: e2e draws a 60 m fire trench, flips it, reads its slots through the bridge; locale check)
- [ ] 2.6 Rebuild `fazenda-doc` with trench lines (`pnpm map:fazenda-doc`) (verify: map check; its golden re-recorded with the reason)

## 3. Plants and where they grow

- [ ] 3.1 `growableCell` mask shared by the brush and the compiler; the map check warns about masked vegetation (verify: unit tests "nothing grows under water" and "ford without scrub"; editor e2e paints capim across a river)
- [ ] 3.2 Plant meshes: corn (stalk, leaves, tassel, rows on the field axis), cane, capim blade fans, scrub bushes; edge thinning; vertex sway; strategic-span caps and clump meshes (verify: view unit tests "corn in rows" and "capim as blades" (no cone geometry); battle goldens unchanged; screenshot review at both zooms)
- [ ] 3.3 Frame budget with the new plants (verify: performance e2e at strategic zoom on Fazenda and the largest authored map stays within budget)

## 4. Bridges and smooth edges

- [ ] 4.1 Bridge abutments: deck heights from the landings, ground lowered under the span on authored maps, the same heights for walking (verify: unit test "deck over a high bank"; screenshot shows no ground through the deck; hand-written goldens checked)
- [ ] 4.2 River centrelines smoothed (Catmull-Rom, 2 m) at compile time; water outlines by marching squares at 0.5 m (verify: unit test "diagonal river bank" has no 1 m staircase in the outline; `fazenda-doc` golden re-recorded if it changes)
- [ ] 4.3 Dithered material borders in `PaintedGround` (verify: pixel-art snapshot re-recorded after review; shader unit test of the Bayer offset at a border cell)
- [ ] 4.4 "Smooth edges" option (MSAA, default on) in the options compass, kept in `prestes.graphics.v1`, EN and PT-BR (verify: e2e toggles it, reloads and reads the renderer's antialias flag through the scene bridge; locale check)

## 5. Trees

- [ ] 5.1 Trees tool: seeded Poisson-disc scatter by biome mix, single placement, eraser, one undo step per stroke, thumbnails (verify: unit test of spacing and seed; e2e "scatter a cerrado grove" and "erase trees")
- [ ] 5.2 Tree models adapted from the owner's Refloreste trees at 300–800 triangles via `pnpm models`, after the owner confirms the licence; named placeholders otherwise (verify: model triangle-count test; asset register entries; screenshot review)

## 6. Cover preview

- [ ] 6.1 Cover overlay: slot dots by protection class, piece badges with counts (clustered at strategic span), hatched concealment, zone totals, hover detail; EN and PT-BR (verify: e2e "count the slots of a trench" matches `allCoverSlots` for that trench; e2e "zone totals" grows after a wall; locale check)

## 7. Close

- [ ] 7.1 Docs: `docs/map-editor.md` (trench tool, trees tool, cover overlay, roads and relief), `docs/architecture.md` (v2, trench builder, mask), `docs/assets.md` (plants, trees), `docs/status.md` (verify: `pnpm check`)
- [ ] 7.2 Gates: `pnpm check`, `pnpm e2e`, `pnpm check:determinism`, `pnpm build` + `pnpm check:bundle`, `openspec validate refine-map-editor --type change --strict` (verify: all pass)
- [ ] 7.3 Hand check by the user: build a map with a river, a bridge, crops, a grove and a trench system, read its cover, play it; findings in `docs/status.md`
