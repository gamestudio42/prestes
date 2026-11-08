## 0. Prerequisite

- [ ] 0.1 Archive `fog-of-war` after its hand check, so this change builds on its durable spec (verify: `openspec list` shows only `add-battle-maps` in flight; `openspec validate --specs` passes)

## 1. Map definition, default map unchanged

- [x] 1.1 `shared/maps/`: `BattleMap` type, `catalog.ts`, `setActiveMap` baking a `MapRuntime`; wrap the current 3v3 field as `vila-militar` (features height, current covers and buildings); engine `map` option defaulting to it; move `setActiveTerrain` callers (verify: all existing tests pass; Vila Militar golden byte-identical)
- [x] 1.2 Per-map bounds and pathfinding grid from the map; order targets outside bounds, in deep water or in buildings refused or snapped (verify: unit tests for bounds and snap; A* bench reports path time on a 400 m empty test map)
- [x] 1.3 Map content check in `pnpm check`: deployment zones inside bounds, walkable, at least 160 m apart, connected by a path (verify: check fails on a broken test map and passes on the catalog)

## 2. Terrain relief

- [x] 2.1 Heightfield bake from hill, ridge, channel, embankment and cut shapes on a 2 m grid, bilinear sampling, slope and speed from it; new surfaces and speed factors (verify: unit tests for hill height, smooth sampling, bake determinism, speed table)
- [x] 2.2 Terrain in the sight line for vision, acquisition and shots; ridge cover on field maps from the same check (verify: tests "behind the crest" and "over the crest"; bench 3v3 on a hilly test map under 3 ms per tick)
- [x] 2.3 View: heightfield ground mesh with surface vertex colours, units and props placed on it (verify: e2e loads a test field map; screenshot reviewed)

## 3. Water and crossings

- [x] 3.1 Deep water unwalkable, ford surface (0.5, no prone), bridge deck (verify: tests "only three crossings" on a river test map, ford speed and no-prone)
- [x] 3.2 Ferry entity and state machine (capacity 6, 20 s), order split across the ferry, in `hashState()` (verify: tests "ferry trips" for eleven soldiers and ferry determinism)
- [x] 3.3 View: water planes, ford band, ferry drawn from the frame; placeholders `placeholder:bridge`, `placeholder:ferry` until the models exist (verify: e2e orders a section across by ferry through the dev bridge; screenshot reviewed)

## 4. Concealment

- [x] 4.1 Vegetation grid bake; concealment distances by kind and stance, doubled when running, lifted for 4 s after firing (`revealedUntil`, hashed) in side vision and in `visible()` (verify: tests "crouched in the corn", "too close to hide", "standing in tall grass", "rifle in the cane", "running in the corn")
- [x] 4.2 Crop sight-line cut over 6 m below crop height, passing over from higher eyes; no hit-chance change (verify: tests "field between two sections", "looking down from a rise", "shot through the stalks")
- [x] 4.3 View: instanced corn, cane, tall-grass and scrub clumps (view-seeded jitter), concealed marker and tooltip label in PT-BR and EN; placeholder clumps named `placeholder:corn`, `placeholder:cane`, `placeholder:capim`, `placeholder:scrub` (verify: locale check; e2e reads the concealed flag through the dev bridge; screenshot reviewed)

## 5. Fazenda

- [x] 5.1 Fazenda data: 400 × 400 m, pasture, coffee rows, cornfield and canefield (each at least 40 × 30 m), casa-sede, colonist row, engenho, corral, fences, dirt road, rises, both trench lines with communication trenches, deployment and defensive lines (verify: map check passes; tests "hidden flank through the cane" and "open ground is dangerous"; new golden recorded)
- [ ] 5.2 Fazenda kit in Blender (casa-sede, colonist house, engenho, corral, coffee row, corn and cane clumps, wire fence) exported by `pnpm models`, entries in `docs/assets.md`; until then named placeholders (verify: `pnpm models`; asset register lists each; screenshot reviewed)

## 6. Serra e Rio

- [x] 6.1 Serra e Rio data: 400 × 400 m, two hill masses, river across the map, ford, bridge and ferry, capim, cerrado scrub, buriti and outcrops, deployment and lines on banks, rocks and scrub edges (verify: map check; tests "only three crossings", "hill blocks sight", "search toward the right side"; new golden)
- [ ] 6.2 Serra e Rio kit (wooden bridge, ferry and landings, buriti, cerrado tree, outcrop, capim clump) with asset register entries; named placeholders until done (verify: `pnpm models`; screenshot reviewed)

## 7. Bairro

- [x] 7.1 Bairro data (redrawn as a Brazilian plan: main street of vendas, praça and matriz, small houses on long walled lots): 320 × 320 m, terraced-house blocks, factory with yard and chimney, church and square, cobbled streets with tram rails, lamps, rail embankment, barricade lines for both sides, no civilians (verify: map check; tests "streets are fire lanes", "blocks break sight", "enemy takes its line"; new golden)
- [ ] 7.2 Bairro kit (terraced house in two widths and heights, factory, church, tram rails, gas lamp, barricade, embankment) with asset register entries; named placeholders until done (verify: `pnpm models`; screenshot reviewed)

## 8. Map choice and history

- [x] 8.1 Start menu map list under 3 vs 3 and sandbox select; names, descriptions and labels in the locale catalog, PT-BR and EN (verify: locale check; e2e starts the 3v3 on each map and counts 66 units)
- [x] 8.2 Codex entry per map with setting label and source note; check Fazenda and Serra e Rio claims against `macaulay-1974` ch. III–IV page images and `blanc-2024`, log any conflict in `docs/history/TIMELINE.md`; Bairro note names the civilian cost of July 1924 (verify: content check; citations present in `docs/history/SOURCES.md`)

## 9. Close

- [ ] 9.1 Battle report on each new map within the feel bands, 3v3 bench under 3 ms per tick on Fazenda; `pnpm verify` and `openspec validate add-battle-maps --type change --strict` (verify: gates pass)
- [ ] 9.2 Hand check by the user in Chrome: one 3v3 on each map (crouched flank through the cane, the three crossings, a street fight); record in `docs/status.md`
