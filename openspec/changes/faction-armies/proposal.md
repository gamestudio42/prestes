## Why

The skirmish has two sides that draw from one list of seven section types,
all open to both, with names the owner finds wrong for the period
(2026-11-11: "the army's troops in the roster and in the battle need names
more fitting to the time; I do not know, for one, whether the police counts
as a legalist troop"). The enemy the column fought was not one army: the
owner wants the legalist armies and the patriotic battalions as armies of
their own.

## What Changes

- **Three armies as data**: the Column (the player), the legalist regulars
  and the patriotic battalions (irregular forces raised against the column).
  Each army has a localized name, a short description, its own catalog of
  section types and its own uniform set. A battle's enemy is one army or a
  mix of the two enemy armies, set by the map's enemy presets.
- **Research first**: who fought on the government's side (federal army,
  state police forces, patriotic battalions), what each force was called at
  the time, how it was armed and organised at section level, and the same
  for the column. The findings go into `docs/history/FORCES.md` with source
  keys and page citations; conflicts go to `TIMELINE.md`. The owner's
  question about the police is answered there, with its source.
- **Period names**: every army and section type name shown in the roster
  and in battle is either a period term with a source or is labelled a game
  organization in its compendium note. The present names (Esquadra de 4,
  Esquadra de 5, Fuzileiros, Fuzil-metralhador) are reviewed against the
  research and replaced where a period term exists.
- **Richer section types per army**: each army gets types of its own
  (composition, weapons, ammunition, speed, morale and training values that
  differ by army), built from the weapons already in the game. New weapons
  are out of scope unless the research shows a type cannot exist without one.
- **Roster and presets**: the roster builder lists the chosen army's types
  only; a map's enemy presets name an army for each section; maps saved
  before this change keep loading.
- All names and descriptions in PT-BR and EN.

Design intent. Player fantasy: commanding the column against the forces it
really met, each fighting in its own way. Pillar: history you can play, with
the source one click away. Loop beat: building the force before the battle,
and reading the enemy during it. Hypothesis: a player tells a regular
company from a patriotic battalion by how it stands and fights, and changes
his plan for it.

MVP: the three armies, the reviewed names, at least four section types per
army, the roster and presets. Non-goals: cavalry, artillery, aircraft, new
weapons, a playable legalist campaign, and new uniforms' art (see
`soldier-animation-and-textures`, which draws the outfits this change
names).

Historical and ethical note. The patriotic battalions and the state forces
were raised and led by real people, some with descendants and a contested
memory; the game names forces, not individuals, unless a figure is already
in the figure registry with sources. No army is drawn as a caricature, and
the compendium notes say what is documented, what is dramatized and what is
a game organization. No book text is reproduced. The campaign stays
multi-perspective with Prestes as its spine; this change adds no playable
figure and makes no enemy army playable outside the sandbox's both-sides
control.

## Capabilities

### New Capabilities

- `armies`: the armies, their names, their section catalogs, the naming
  rule and the documented order of battle they rest on.

### Modified Capabilities

- `force-roster`: "Section types" and "Skirmish setup screen" change once
  the research fixes the names and the per-army catalogs. Their deltas are
  written at task 1.4, after the owner approves the catalog; until then this
  change carries only the `armies` spec.

## Impact

- `docs/history`: new `FORCES.md`; `SOURCES.md`, `TIMELINE.md`, `WEAPONS.md`.
- `packages/shared`: `sections.ts`, `deploy-roster.ts`, `protocol.ts`
  (the unit's army), the map document's enemy presets (a new document
  version that loads the older ones).
- `packages/simulation`: section values by army; the enemy commander reads
  the army of its sections. Determinism goldens are re-recorded.
- `packages/content`: army and section names, compendium notes.
- `apps/game`: `RosterBuilder.tsx`, `SkirmishSetup.tsx`, section cards.
- The editor: enemy presets pick an army per section.
