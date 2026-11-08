## Why

The menu desk works, but it does not yet read as one set of objects, and its
books are hard to use. The closed sprites mix three pixel densities (2x, 3x and
4x) and two art styles. The labels sit at uneven distances from their art, and
the drop shadows use five different offsets. Opening an object recentres it and
saves that centre as its desk position, so closing it leaves it in the middle of
the screen instead of where the player put it. The open books are mostly empty
parchment with small text. The compendium shows only a short paragraph per
entry, with no images, although fourteen treated historical images and twenty
drafted entries are ready in the docs. The campaign book shows a single "in
preparation" page, although the prologue and chapters 2 to 8 are drafted with
bilingual prose, commanders, dates and sources. This change polishes the desk
and turns both books into finished reading surfaces, so the campaign is fully
prepared and only the playable missions are missing.

## What Changes

### Desk polish

- **One pixel scale.** Every closed desk object is drawn at 2x on every screen,
  so the default desk fits 1280 x 720 and every object keeps about the same
  scale (amended 2026-11-07; first planned at 3x). The compass is redrawn at a
  finer pixel and the reference pile in the books' language, both at 2x.
- **Clean pixel art, books preserved.** The two books keep their silhouette,
  angle, cover colour (navy campaign, green compendium) and default position,
  and get a cleanup pass rather than a redesign. Every object gets the shared
  desk palette, one top-left light and a one-pixel dark outline.
- **Common label baseline and one hard shadow.** A held object lifts by one art
  pixel, and its shadow grows.
- **2 px drag grid**, one art pixel, as in `add-menu-desk`.
- **Position kept across open and close.** Opening an object shows its open
  screen as a centred overlay without moving or saving the object's desk
  position. Closing it shows the object again exactly where it was.
- **Reference pile default spot.** This fixes the current typecheck failure.

### Books as finished reading surfaces

- **Redesigned open spreads.** Each spread has a left and a right page with a
  clear role. Text sits at a readable size, with no large empty areas. Long text
  is split into pages, so no page needs an inner scroll. Section ribbons sit on
  the book's edge. The open frame keeps the closed book's colour.
- **Compendium with images and full notes.** Entries carry an image plate where
  a registered image exists, with caption, credit and licence. Each entry gets an
  extended note, a date and place line, its label, confidence and sources. The
  twenty drafted doc entries are brought into the runtime, including the new
  Miguel Costa and Isidoro Dias Lopes figures. The fourteen registered compendium
  images are wired in.
- **Campaign book fully prepared.** It opens with a title page and a table of
  contents of the prologue and chapters 2 to 8. Each chapter has an opening
  spread (number, title, date, place, commander and perspective, label, image
  plate), the chapter prose split into pages, and a closing briefing spread
  (pitch, objectives summary, links to the chapter's compendium entries). The
  play action on each chapter is shown and disabled, with "in preparation".

## Design intent

- **Player fantasy:** the officer's things lie scattered on top of the march.
  The two books are a real field book and a real record, worth reading before
  the order is given.
- **Core loop beat:** pre-battle planning and consulting the record.
- **Pillars served:** "History with receipts", since every page shows its label,
  confidence and sources. "Read the ground before the fight" is served by the
  map fan and the chapter briefings.
- **Hypothesis:** one pixel scale, outlines and hard shadows make the pile read
  as physical objects over the march without a drawn table. Paged books with
  images make the compendium and campaign something the player reads, not skips.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `presentation`: this adds the desk art standard, pick-up feedback with a 2 px
  grid, position preservation across open and close, the reference pile default
  spot, and the open-book spread layout for both books. The desk requirements
  themselves arrive with `add-menu-desk`.
- `historical-content`: compendium entries gain image plates, extended notes and
  the new entries. A campaign chapter registry is added for the prologue and
  chapters 2 to 8, with commander, perspective, label, sources and a playable
  flag that stays off.

## Impact

- **Art:** `art-src/menu/*.aseprite` and `apps/game/src/assets/menu/desk/` for
  the cleanup and redraws, plus open-book frame art. `docs/assets.md` is updated.
- **Content:** `packages/content/src/compendium.ts` gains image, extended-note
  and place fields and the new entries. A new campaign chapter registry and
  bilingual chapter text modules go under `packages/content/src/campaign/`.
  `figures.ts` gains Miguel Costa and Isidoro Dias Lopes. The locale catalogs
  gain the new labels. `tools/check-content.ts` validates the new data.
- **Code:** `apps/game/src/ui/menu/` (`MenuDesk`, `DeskObject`, `BookFrame`,
  `CampaignBook`, `CompendiumBook`, `deskArt`, `deskLayout`) and
  `apps/game/src/styles/menu-desk.css`.
- **Docs:** `docs/campaign/` entry and chapter files are marked as applied to the
  runtime. `docs/status.md` records the new menu state.
- **Tests:** `tests/hud/desk-layout.test.ts`, content validation tests,
  `tests/e2e/desk.spec.ts`, `tests/e2e/compendium.spec.ts` and the desk visual
  baselines.
- **Unchanged:** the book fallback at `?menu=book` (it reads the same compendium
  registry, so it gains the new entries as text), the marching scene, audio,
  battle maps, simulation and determinism.

## Scope

- **Historical scope:** the prologue (the 1922 Forte de Copacabana revolt) and
  chapters 2 to 8, from the October 1924 rising in Rio Grande do Sul to La Gaiba
  in July 1927. Every claim comes from the existing docs and their source
  register (Macaulay 1974 as baseline). This change adds no new research and no
  new historical claim. Low-confidence items keep their confidence on the page.
- **Multi-perspective:** each chapter names the historical figure who commanded
  it, as recorded in `docs/campaign/CAMPAIGN.md`:
  - Siqueira Campos for the prologue.
  - Luís Carlos Prestes for chapters 2, 5, 6 and 7.
  - Miguel Costa for chapter 3.
  - Isidoro Dias Lopes for chapter 4.
  - Prestes and the exiles for chapter 8.

  Miguel Costa and Isidoro Dias Lopes are added to the figure registry. No
  chapter is playable in this change, so every playable flag stays off.
- **MVP:**
  - Desk: the polish above and position preservation.
  - Compendium: the twenty drafted entries in the runtime and the fourteen
    images wired in.
  - Campaign book: title page, table of contents, the eight chapters with
    opening, prose and briefing spreads, and a disabled play action.
- **Non-goals:**
  - A drawn desk or table surface, or any change to the marching video.
  - Free rotation of sprites.
  - Playable campaign missions, mission maps, objectives or scripting.
  - New historical photographs or research, and new compendium images beyond
    the fourteen registered ones.
  - Removing the book fallback.
- **Legal and ethical note:**
  - The chapter prose is original and dramatized, with Jorge Amado's book only
    as a tone reference. No book text is reproduced, and every chapter page shows
    its historical, dramatized or fictional label.
  - The historical photographs ship under the public-domain determinations
    recorded in `docs/assets.md`. Images still pending verification do not ship.
  - All desk art is original. The book covers are generic. Reference photographs
    used to trace shapes stay out of the repository.
  - Sensitive history (repression, deaths, exile) is presented without
    hagiography. The command structure (Miguel Costa formal commander, Prestes
    chief of staff) is shown as recorded.
