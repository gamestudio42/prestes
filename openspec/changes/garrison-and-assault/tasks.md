## 0. Prerequisites

- [ ] 0.1 Archive `add-battle-maps`, `refine-map-editor` (trench lines) and `add-deployment-phase` (verify: `openspec validate --specs`)

## 1. Position data

- [ ] 1.1 `PositionDef` and `positionsFor(map)`: buildings (capacity by model, entrances on the street face and back door, ports every 3 m), trench lines from the shared trench builder (capacity one man per 1.2 m of fire step, entrances at the ends and every 10 m on the rear side, ports = fire-step slots; communication trenches one man per 2 m), the factory yard (verify: unit tests of capacities, entrance and port counts for each model)
- [ ] 1.2 Content check: every entrance reachable from both deployment zones; ports outside footprints (verify: unit test with a broken entrance; `pnpm check:content`)

- [ ] 1.3 Elevated ports and roofs: `eye`/`level` on ports, `RoofDef` for the factory and armazéns, elevation in sight and fire at both ends (verify: tests "over the walls from the tower", "over the corn from the loft", "exposed on the roof")
- [ ] 1.4 Placeholders: matriz tower with openings, sobrado upper windows, flat roofs with parapets; men drawn on roofs; tower and upper-floor markers (verify: screenshot review on Bairro; asset register)

## 2. Enter and leave

- [ ] 2.1 Protocol: orders `enter`, `exit` (with `to`), command `assault`; frame `garrisons` and `assaults`; events `unit_entered`, `unit_left`, `assault_started`, `assault_ended` (verify: typecheck; host test)
- [ ] 2.2 Enter: validation, paths to entrances, entering up to capacity, overflow to outside slots, garrisoned units skip movement, separation and slots (verify: tests "enter a house" and "over capacity"; determinism test)
- [ ] 2.3 Exit: 30 m and blocked-ground refusals with reasons, leave by the nearest entrance, defend around the point (verify: tests "leave to the back yard" and "too far")

## 3. Fire and assault

- [ ] 3.1 Port assignment, fire from ports with position cover, incoming fire resolved at the facing port, shared garrison suppression (verify: test "good cover, real losses" on 20 seeds; test "suppressed garrison fires less")
- [ ] 3.2 Close assault: fighters, per-second losses with the design's factors, surrender by panic, winners hold, losers fall back (verify: tests "suppress, then assault" and "assault without suppression" at 14 of 20 seeds; determinism of a fixed assault)
- [ ] 3.3 Fog rules for garrisons: known occupied after sighting or unseen fire; "?" strength until a man is seen at a port (verify: tests "hidden garrison" and "revealed by fire")
- [ ] 3.4 Commander: garrison near its line and objectives, suppress then assault (pinned or 2:1), leave lost causes (verify: test "suppress before assault"; battle report shows assaults on Bairro)

## 4. Presentation

- [ ] 4.0 "Ao telhado" order for buildings with a roof, and post filling (tower and upper ports first when the threat is behind walls or crops) (verify: e2e sends a section to the factory roof; unit test of post filling)
- [ ] 4.1 Order board buttons Ocupar, Sair, Assaltar with icons, tooltips and PT-BR/EN labels; Sair's placement mode with the 30 m ring (verify: e2e enters a house, leaves to a clicked point; locale check)
- [ ] 4.2 `GarrisonLayer`: markers with side colour, count or "?", strength bar; port flashes; entrance arrows when ordering (verify: screenshot review on Bairro; e2e reads the marker count through the scene bridge)
- [ ] 4.3 Assault bars for the fight's length (verify: e2e starts an assault through the bridge and sees the bars, then their removal)
- [ ] 4.4 Section cards show "Dentro: <position>"; troop summary lists garrisoned men (verify: e2e)
- [ ] 4.5 Enter in the deployment phase: an Ocupar order during deployment puts the men inside at once, up to capacity; the enemy commander's deployment garrisons buildings and trench lines (verify: e2e deploys a section into a house and sees the garrison marker at tick 0; test "enemy deploys into the engenho")
- [ ] 4.6 Editor: the properties panel shows each building's and trench line's capacity, entrances and ports; the cover overlay draws ports (verify: editor e2e reads a farmhouse's capacity)

## 5. Close

- [ ] 5.1 Goldens re-recorded; battle report bands on all maps with assaults counted (verify: `pnpm check:determinism`; report tests)
- [ ] 5.2 Bench: Bairro with garrisons under 3 ms a tick (verify: `pnpm bench`)
- [ ] 5.3 Gates: `pnpm verify`, `pnpm e2e`, `openspec validate garrison-and-assault --type change --strict`
- [ ] 5.4 Hand check by the user: clear a street in the Bairro and hold the engenho on the Fazenda; decide the open question on trench lines; findings in `docs/status.md`
