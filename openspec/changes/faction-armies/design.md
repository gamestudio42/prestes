## Context

See proposal.md. Today `Faction` is `'column' | 'legalist' | 'cangaceiro' |
'civilian' | 'target'` (`packages/shared/src/protocol.ts`), and
`SECTION_TYPES` (`packages/shared/src/sections.ts`) holds seven types, every
one with `sides: ['column', 'legalist']`. Sides drive vision, targeting,
the enemy commander and deployment areas; all of that assumes two sides.
Soldier outfits are `'column' | 'legalist' | 'officer'`
(`packages/view3d/src/soldier-clips.ts`).

`docs/history` does not record the government's order of battle: a search
for the state police forces, the patriotic battalions and their leaders
finds nothing. The naming and the catalogs therefore wait for research.

The simulation/presentation boundary is unchanged: armies are shared data,
the simulation reads their numbers, the view reads their uniforms.

## Goals / Non-Goals

**Goals:**

- Add armies without adding sides: two sides, three armies.
- Names that come from the record, with the source beside them.
- Old maps and old saved rosters keep working.

**Non-Goals:**

- A third side or three-way battles.
- Reworking the unused `cangaceiro` and `civilian` factions.

## Decisions

**D1. An army is a layer under the side.** `Faction` (the side) stays as it
is; a new `ArmyId` (`'coluna' | 'legalista' | 'patriotico'`, final ids at
apply) maps to a side. Units carry `army` beside `faction`. Vision,
targeting and the commander keep using the side. Alternative: make the
patriotic battalions a third `Faction`; rejected, because every two-side
assumption (seen sets, deployment areas, outcome) would need a third case
for no gameplay gain.

**D2. Research method.** Macaulay is read first (the owner's copy under
`livros/`, never committed), for: which forces pursued the column in each
phase, their names in Portuguese at the time, their arms and their
behaviour in contact. Blanc and the regional studies fill the interior
phases. Each finding is one row in `FORCES.md`: force, period name, phase
and region, arms, source key and page, confidence. What is expected but not
yet confirmed (state police forces such as São Paulo's and Rio Grande do
Sul's fought for the government, and part of São Paulo's force rebelled
with Miguel Costa; the patriotic battalions were raised by regional bosses
in the interior) is written as a question in `open-questions.md` until a
page supports it.

**D3. The catalog is the owner's decision.** After the research, a table of
proposed section types per army (name, men, weapons, values, source or
"game organization") goes to the owner. The `force-roster` deltas and the
data are written only from the approved table.

**D4. Values by army, not new mechanics.** An army sets numbers the
simulation already has: starting morale, suppression resistance, accuracy,
ammunition carried, speed factor, whether the section holds a formation.
No new system is added for an army.

**D5. Map document version.** Enemy presets gain an army per section in a
new document version; the loader maps older presets to legalist regulars.
Follows the versioning already used for v2 to v4.

**D6. Stored rosters.** A roster saved by the setup screen is migrated on
read by section type id; an id that no longer exists falls back to the
army's default rifle section, and the screen says so once.

## Risks / Trade-offs

- [The record does not support section-level detail for the irregulars] →
  mark the type a game organization and say so in its note (the naming
  rule allows it).
- [Renaming breaks goldens and e2e text] → goldens are re-recorded once, at
  the task that changes the data; e2e selects by test id, not by name.
- [Balance shifts when values differ by army] → the battle report runs per
  army pairing and its bands are reviewed in the same task.

## Open Questions

- Whether the federal army and the state police forces are one army with
  different section types or the catalog needs a visible split: answered by
  the research table (D3) and does not change the two-side design.
