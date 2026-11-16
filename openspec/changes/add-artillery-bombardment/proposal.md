## Why

The owner asked (2026-11-15) for artillery on the São Paulo map: in July
1924 the government's guns shelled the city's districts for two weeks, and
the same pressure comes back at Catanduvas and other campaign battles.
Today the game has no artillery at all: `field-gun-75` is a static prop and
the simulation knows only small arms. Battle events (`add-battle-events`)
already let the author plan what happens during a battle; a bombardment is
one more thing an event can do.

## What Changes

- **A new event action, `bombardment`** ("Bombardeio de artilharia"). It
  names whose guns fire (Column or legalists), the gun (75 mm field gun or
  105 mm howitzer), the target (an authored trigger area, or the enemy's
  positions as the firing side knows them), a rate in shells per minute, a
  spread (how far shells fall from the aim point) and how long it lasts (a
  time, or until another event fires).
- **Shells in the simulation.** Each shell is scheduled, announced a moment
  before it lands, and lands at a point drawn from the simulation's seeded
  RNG. On impact it wounds and kills by distance (a lethal core, a wounding
  ring), reduced by the man's stance, the cover between him and the burst,
  a trench he stands in or the building he garrisons. Everyone in a wider
  ring is suppressed and loses morale. Shells do not take sides: men of the
  firing side under the burst are hit too.
- **Craters.** A shell that lands on open ground may leave a shallow crater
  that is low cover (prone and crouched men), up to a cap per battle.
- **View and sound.** An incoming whistle at the landing point, then the
  burst: flash, a column of dust and smoke, debris, a crater mark, and a
  camera shake that fades with the camera's distance. Sounds are CC0
  recordings (the owner records only voices), credited in `docs/assets.md`.
- **Editor.** The Events panel authors the action (PT-BR and EN labels),
  the map check validates it, and the playtest's "fire now" rehearses it.
- **Determinism.** Active bombardments and pending shells are part of the
  hashed state; a map without a bombardment draws no extra random numbers,
  so every existing determinism golden holds.
- No map document version change: the action is a new member of the
  existing action list; older documents load unchanged.

## Player fantasy, loop and scope

The player commands the historical figure's force while shells fall: the
whistle sends men to the ground, a section caught in the open breaks, the
trench line holds. The loop is unchanged (deploy, order sections, take and
hold objectives); a bombardment is a hazard the player reads and answers by
moving out of the beaten zone, going prone or digging in. The defender of
São Paulo in July 1924 (the revolt under Isidoro Dias Lopes, per
`docs/campaign/CAMPAIGN.md`) suffers the government's guns; at Catanduvas
it is again the rebels under government shells. Which figure commands each
mission is set by the mission, not by this change.

Historical scope: the mechanism only. The July 1924 bombardment of São
Paulo (Mooca, Brás, Cambuci and other districts; `docs/history/TIMELINE.md`,
`cohen-2007`, `macaulay-1974` ch. I) and the government's 75 mm and 105 mm
guns at Catanduvas (`docs/history/WEAPONS.md`, Macaulay pp. 85, 93) are the
reasons for it; the bombardments of each map are authored per map by the
owner (or, for campaign maps 02 to 08, by the main session) with their
sources in the mission file.

MVP: the `bombardment` action with two gun profiles, area and enemy-position
targets, damage and suppression by distance with cover, craters, whistle,
burst and shake, the editor fields and checks.

Non-goals: guns as units on the map (crewed, targetable, moved); a placed
`field-gun-75` object as the source (open question in the design);
counter-battery fire; player-called artillery; aircraft (also hit São Paulo
in 1924); buildings and walls destroyed by shells; fire and burning;
civilian figures; a HUD message for the bombardment (the whistle is the
warning; an event card can narrate it).

## Legal and ethical note

The 1924 shelling of São Paulo fell mostly on working-class districts and
killed civilians. The game shows soldiers under fire on a battlefield; it
does not put civilians on screen as targets and does not turn the
bombardment of a city into spectacle or a score. Map texts that mention it
paraphrase the sources under `docs/history/SOURCE_POLICY.md` and label
dramatized content. Sounds are CC0 field and library recordings, credited;
no copyrighted audio or art is used.

## Capabilities

### New Capabilities
- `artillery`: shells in the simulation: scheduling, the landing point,
  damage, wounds, suppression and morale by distance, cover and trenches,
  craters, and the sim events the view reacts to.

### Modified Capabilities
- `battle-events`: the `bombardment` action, its targets, rate, spread and
  duration, and its place in the hashed state.
- `map-editor`: authoring the bombardment in the Events panel and its checks.
- `audio`: the incoming whistle and the burst, by distance.
- `presentation`: the burst effect, crater mark and camera shake.

## Impact

- `packages/shared/src/maps/events.ts`, `validate-events.ts` — the action
  type, shape check, compile, map checks.
- `packages/shared/src/protocol.ts` — `shell_incoming` and `shell_impact`
  sim events.
- `packages/simulation/src/systems/` — a new `artillery.ts`; `battle-events.ts`
  starts and stops bombardments; `engine.ts` tick order and `hashState`;
  craters through the existing cover list.
- `packages/view3d/src/effects-layer.ts`, `camera-rig.ts` — burst, crater
  mark, shake.
- `apps/game/src/audio/` — whistle and burst sounds; `apps/game/public/audio/`
  new CC0 files; `docs/assets.md` credits.
- `apps/game/src/editor/EventsPanel.tsx`, `events.ts` — action fields.
- `packages/content/src/locales/` — EN and PT-BR editor labels and checks.
- `docs/maps/EVENTOS_DE_BATALHA.md` — the owner's guide gains the action.
- Tests: falloff, cover and trench, determinism, no RNG on maps without it,
  editor checks; an e2e for authoring and firing it in the playtest.
