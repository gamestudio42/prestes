## Why

The bootcamp was retired and the video manual planned to replace it was
dropped on 2026-11-11 (the owner: videos are for another time; an in-game
manual, as a section of the Column's book, is enough). The game now has
deployment, objectives, garrisons, fog of war, queued orders and a run
toggle, and nothing in it explains them: the campaign page still says the
manual is "in preparation".

## What Changes

- **A Manual part in the book "A Coluna Prestes"**, after the compendium's
  sections and before the corrections page: its own entry in the contents
  spread and twelve short text pages, read with the book's existing page
  turning. No video, no recording tool, no new desk object.
- **Twelve pages**, each a title, two to four short paragraphs and, where
  it applies, the orders it covers:
  1. Camera and selection
  2. Moving: move, advance, withdraw, hold, walk and run
  3. Fire: attack, suppress, flank, face, fire control
  4. Formation, facing and spacing
  5. Cover and stance
  6. Deployment before the battle
  7. Objectives and the battle clock
  8. Positions: enter, leave, assault
  9. Fog of war and the "?"
  10. Morale, suppression, the wounded and rescue
  11. Sections and weapons, the machine gun's set-up
  12. Queued orders and the keys
- **Coverage is checked, not promised**: `pnpm check:content` fails when an
  order of the order catalog is named by no manual page, or a page names an
  order the catalog does not have.
- **Order names and tips are not written twice**: a page lists its orders
  with the order board's own labels and tips from the locale catalog.
- The campaign page's "in preparation" text stops promising a manual and
  points to the book.
- All manual text in PT-BR and EN.

Design intent. Player fantasy: an officer of the column who reads his field
notes before the fight. Pillar: readable tactics (the player loses to the
enemy, not to the interface). Loop beat: before the battle, at the desk.
Hypothesis: a player who has read the moving, fire and deployment pages
deploys and gives a move, an attack and a defend order in the first skirmish
without trial and error.

MVP: the twelve pages above, text only. Non-goals: videos, interactive
lessons, opening the manual from inside a battle, illustrations (a later
change may add plates), and removing the leftover training-ground code
(`training-layer`, the `training_phase` command), which is its own clean-up.

Historical scope and note: the manual describes the game's rules, not
history. It makes no historical claim; where a page touches a period fact
(the weapons page), it links to the compendium entry that carries the
source instead of restating it. It reproduces no book text. The campaign's
multi-perspective approach and its playable figures are unchanged: the
manual names no commander.

## Capabilities

### New Capabilities

- `field-manual`: the Manual part of the Column's book, its pages, their
  coverage of the order catalog and their localization.

### Modified Capabilities

None. The compendium registry keeps its four sourced sections; the manual
is a separate part of the same book and is not a compendium section.

## Impact

- `packages/content`: a manual page registry and its PT-BR/EN text; the
  content check; the campaign page message.
- `apps/game/src/ui/menu`: `CompendiumBook.tsx` and `bookPages.ts` gain the
  Manual part and its contents entry.
- `tests/e2e`: the book specs (open the Manual, turn its pages, both
  locales, no overflow at 1440 x 900 and 1280 x 720).
- Bundle: text only, in the index chunk; no simulation or worker change, no
  determinism golden change.
- Docs: `docs/status.md`.
