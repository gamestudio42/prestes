## Why

Every campaign chapter names the historical figure who commanded it, but in
battle that figure is nowhere: the Comando section's officer is an anonymous
man with a 12 m aura, and the mission docs' failure condition "Prestes falls
or is captured" (missions 02, 06, 07) cannot be expressed. The campaign maps
02-08 now exist with their events, so the commander is the missing piece that
ties each map to its chapter's perspective.

## What Changes

- A campaign map can declare its **historical commander**: a registered
  figure, whether he is **on the field** or a **command voice** only, and
  what his loss means (**defeat** or **continue**).
- On the field, the figure **is the officer of the column's first Comando
  section**: same man, same revolver, same hit points, no personal combat
  bonus. He keeps the officer's 12 m aura and adds a **command radius** of
  30 m in which soldiers of every Column army steady further (out of fire
  they rally up to 75 morale instead of 60).
- **Losing him** (killed or incapacitated) replaces the ordinary officer
  loss with a heavier one (every column soldier within 40 m loses 25 morale
  once), stops the command radius, emits `commander_down`, and, on maps whose
  loss is **defeat**, ends the battle as a defeat decided by `commander`.
- A new event trigger, **commander down**, lets the map author answer the
  loss with a card (or troops, or a posture).
- The troop panel and the battlefield name the figure (name, role, label);
  his model is the officer's, marked with a named placeholder pennant.
- The map editor gets a Commander panel for campaign maps; the map check
  refuses a commander on skirmish or test maps, an unknown or non-playable
  figure, or a field commander on a map without a Comando section.
- Per mission (historical notes in the design): 02, 05, 06, 07 Prestes on the
  field, loss is defeat; 03 Miguel Costa on the field, loss is defeat; 04
  Isidoro Dias Lopes as command voice (he was at Foz do Iguaçu); 08 Prestes on
  the field in a scene without an enemy; 01 Siqueira Campos on the field,
  loss is **continue** (he was wounded and survived), approved by the owner
  on 2026-11-15, which also closes the prologue doc's open question.
- `miguel-costa` and `isidoro-dias-lopes` become `playable: true`.
- **Not in this change:** a generic fictional officer for skirmish (a later
  change reuses this mechanic); order latency ("orders arrive faster near
  him" needs an order-delay system that does not exist); a second figure on
  one map (Prestes beside Miguel Costa in 03 stays in the cards); a portrait
  or a unique 3D model.

## Player fantasy, loop and scope

- **Fantasy:** you are the figure's command voice, and he is there, among
  the men, where the record puts him. Keeping him close steadies the line;
  exposing him can end the march.
- **Core loop change:** position the Comando where its radius covers the
  sections that will take fire, without putting the figure in the line of
  fire. Losing him is a tactical and a narrative event, not a cutscene.
- **Historical scope:** campaign chapters 01-08 (1922-1927), the figures
  already registered in `figures.ts` and `docs/history/FIGURES.md`. No figure
  is invented: Cordeiro (05) and Estilac Leal (04) are not registered and do
  not appear as named units.
- **MVP:** maps 01-08 with their commander, the mechanic, the trigger, the
  panel name and the placeholder marker, PT-BR and EN.
- **Multi-perspective:** the commander follows the chapter's `commanderId`;
  Prestes is the spine, Miguel Costa commands 03, Isidoro is the voice of 04,
  Siqueira Campos commands the prologue. Playable figures after this change:
  Siqueira Campos, Prestes, Miguel Costa, Isidoro Dias Lopes.

## Legal and ethical note

The commander is a historical figure, not a hero: no combat bonus, no
invulnerability, no scripted heroic moment, consistent with the pillar
"command the section, not the hero". His presence and his fate on each map
follow the mission's sources (Macaulay Tier 0) and are labeled; where the
record differs from the legend (Siqueira Campos survived Copacabana wounded)
the game follows the record. Names are historical proper names; no text from
Amado or other books is reproduced. Death of a real person in play is shown
soberly: a card in the chapter's voice, no gore, no celebration.

## Capabilities

### New Capabilities
- `historical-commander`: the map's commander declaration, the figure as the
  Comando officer, the command radius, his loss and its outcome, the
  presentation (name, marker), the editor panel and the map check.

### Modified Capabilities
- `historical-content`: a campaign map's commander must be the chapter's
  `commanderId` and a playable figure; Miguel Costa and Isidoro Dias Lopes
  become playable.
- `battle-events`: a new trigger, "commander down".

## Impact

- `packages/shared`: map document and `BattleMap` (`commander`), map check,
  event trigger type and compile, `DecidedBy` gains `commander`, `SimEvent`
  gains `commander_down`, snapshot exposes the figure flag.
- `packages/simulation`: spawning marks the figure, morale (command radius,
  heavier loss), outcome, battle-events trigger; hash includes the flag only
  when present, so skirmish and test goldens do not move; campaign goldens
  in `tools/determinism-golden.json` are regenerated.
- `packages/content`: `figures.ts` playable flags, locales (panel, loss
  cards, editor), content tests.
- `packages/view3d`: placeholder pennant over the figure.
- `apps/game`: troop panel name, editor Commander panel.
- Campaign map documents 01-08.
- Docs: `docs/campaign/CAMPAIGN.md` and mission docs' open questions.
