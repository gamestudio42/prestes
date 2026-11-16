## Why

Half of the campaign's battles were won by getting away. The column broke out of
the Iron Ring across the Uruguay, held the Verdinho bridge only long enough to
pass, slipped the rearguard out of Serra Nova and ended the march by crossing
into Bolivia at La Gaiba. Today a battle can only end by annihilation, by a side
breaking, by holding every objective for 2 minutes or by objective value at the
time limit, and a side that leaves the field is the broken one and loses. A
campaign map cannot say "get out alive", so these missions cannot be played as
what they were. The owner asked for it on 2026-11-15, while the campaign maps
02-08 are being drawn.

## What Changes

- A map MAY carry **exits** for the column: named areas (polygons, normally on a
  map edge) the column leaves the field through, and a **withdrawal
  requirement**: a number of column sections that must get out, and optionally
  that the command section (the commander's) is one of them.
- A fit column soldier who reaches an exit **leaves the field and is saved**: he
  is no longer on the map, cannot be shot, and is neither lost nor broken. A
  section has **got out** when all its men still fit have left by an exit. Men
  left behind dead, incapacitated or routed stay counted as losses.
- On a map with a withdrawal requirement, meeting it is **victory**
  ("decided by withdrawal"). Not meeting it before the time limit, or having no
  fit man left on the field without meeting it, is **defeat** ("cut off"). The
  column's objective victories (all objectives held, value at the time limit) do
  not apply on such a map; the legalists' still do, and the column still wins if
  the legalists break or are annihilated. Men who got out count as fit for the
  rule that makes a side fall back, so a column that gets most of its men out is
  not declared broken.
- The end panel and the outcome record report **how many men got out** (and how
  many sections, of how many), next to the losses, so the epilogue can say that
  the column survived even when the battle cost it dearly.
- During the battle the HUD shows the exits on the field and the requirement's
  progress ("Seções fora 1/2 · comando: não").
- Battle events gain an **"exited" trigger**: N column sections got out, or the
  command section got out. With the existing card action this gives the author
  "a card when the commander crosses".
- The **enemy commander** knows the exits (a fact of the map) and tries to cut
  them: it posts a blocking section between the column and its nearest exit and
  turns attackers toward a column section seen closing on an exit. A battle
  event's enemy posture still overrides it.
- The **map editor** places exits like event areas, edits the requirement in
  Map properties, and checks them: at least one exit when there is a
  requirement, each exit reachable from the column's deployment area and not
  overlapping it, the requirement no larger than the column's sections, a
  command requirement only when the column has a command section, and a warning
  for an exit away from the map edge.
- The map document goes from version 9 to 10 (`withdrawal` is new and optional;
  a version 9 map opens with none). Not breaking: maps without exits play
  exactly as today, and their determinism goldens do not change.
- EN and PT-BR strings for all of the above.

## Player fantasy, core loop and scope

- **Fantasy:** the column as it was: outnumbered, never encircled for long,
  winning by refusing the battle the government wanted. The player is the chief
  of staff who chooses who holds and who goes first.
- **Loop:** read the field and the exits → screen the route with a rearguard →
  move sections out in turn while the enemy closes on the crossing → decide
  whether the rearguard can still get out or is spent to save the rest.
- **Historical scope:** fighting withdrawals and breakouts of the column
  (1924-1927); this change supplies the rule, not the missions.
- **MVP:** exits, the requirement, the outcome rule, the end panel count, the
  HUD progress, the "exited" trigger, the commander cutting the exit, editor
  tools and checks, locales, tests and a determinism golden on a test fixture.
- **Non-goals:** horses, mules and baggage as units (the "horses do not" stays
  the epilogue's to tell); legalist exits; boats or ferries that carry men over
  water during the battle; changing campaign maps 02, 05, 06 and 08 (the main
  session updates them once this lands); persistent casualties carried into the
  next mission.

## Multi-perspective and figures

The rule serves the missions as their commanders saw them. All four maps that
want it are commanded by Luís Carlos Prestes (chief of staff; Miguel Costa the
formal commander): 02 O Anel de Ferro, 05 Ponte de Verdinho, 06 Serra Nova and
08 La Gaiba (`docs/campaign/missions/`). The "command section" is the
commanding figure's section on the field; the rule names no figure itself.

## Legal and ethical note

Original rules and text; nothing from Jorge Amado's book or from other games.
A withdrawal is not presented as defeat or as cowardice, nor as glory: the end
panel counts the men who got out and the men left behind side by side, without
commentary. Historical claims stay with the missions and cite
`docs/history/SOURCES.md` (Macaulay 1974 as Tier 0).

## Capabilities

### New Capabilities
- `map-withdrawal`: exits and the withdrawal requirement on a battle map; men and sections leaving the field; victory and defeat by withdrawal; the count of men who got out; HUD progress; the enemy commander cutting the exits; determinism.

### Modified Capabilities
- `map-objectives`: "Battle clock and victory" gains the withdrawal case (victory by withdrawal, defeat when cut off, the column's objective victories off on a withdrawal map).
- `battle-events`: "Triggers" gains the "exited" trigger.
- `map-editor`: new requirements for placing exits, editing the requirement in Map properties, and checking them.

## Impact

- `packages/shared`: map types and document (version 10, migration, shape
  check, compile), exit geometry, editor checks, `DecidedBy` and outcome event,
  a `section_exited` event, event trigger type and validation.
- `packages/simulation`: leaving the field, the outcome rule in
  `systems/combat.ts`, the fall-back count in `systems/enemy-commander.ts`, the
  commander's cut-exit plan, the event trigger in `systems/battle-events.ts`,
  `hashState`.
- `packages/view3d`: exits drawn on the ground; men who left are not drawn.
- `apps/game`: editor exit tool, Map properties requirement, events panel
  trigger, HUD progress, end panel count.
- `packages/content` locales (EN, PT-BR); tests in each package; a new
  determinism golden for a test fixture map.
