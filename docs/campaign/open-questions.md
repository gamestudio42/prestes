# Open Questions

Unresolved items that block a mission from moving from `draft` to `locked`.
Record the answer and the source, then remove the question.

## History

- [ ] Which source gives an hour-by-hour sequence of the Forte de Copacabana
      fight on 5-6 July 1922? Chevalier (1930) still needs a register entry in
      `SOURCES.md` and page-level notes.
- [ ] Which pages cover the Combat of Ramada (3 January 1925) and the Uruguay
      River crossing at page level?
- [ ] Which districts did the July 1924 bombardment of São Paulo hit? Macaulay
      does not name them; do not name them in a mission until a source does.
- [ ] Which sources support the Paraná front and the Verdinho bridge at mission
      level, beyond the current notes in `CHAPTER_SOURCES.md`?

### Prologue - Os Dezoito do Forte

- [ ] Who commanded the Forte de Copacabana garrison on 5-6 July 1922, and what
      was Siqueira Campos's exact role? The registry makes him the Prologue
      commander; verify before `reviewed`.
- [ ] What was the fort's layout, garrison size and armament, and did
      government forces use artillery or naval fire? `helio-1922` is
      citation-only.
- [ ] Which source records the beach route and the final positions of the 18 at
      page level?
- [ ] How many of the 18 survived? The legend says all died; the record says
      Siqueira Campos survived. Which source supports the record?
- [ ] Which source supports the four groups of five, five, four and four? The
      grouping is the design's way of representing the 18; verify it against a
      source before `reviewed`.
- [ ] Did the fort have a working telegraph or signal link to Realengo or the
      city? The plan included cutting lines; the fort's communications are
      unclear.
- [ ] Which source supports the fort's ammunition supply? The mission uses a
      depot issue as a playability abstraction.

## Figures

- [ ] Who commanded the section or column at the Paraná front mission, and is
      that figure registered in `docs/history/FIGURES.md`?
- [ ] Who was present at the Verdinho bridge on 27-28 June 1925?
- [ ] Which missions are commanded by Miguel Costa, so the formal commander is
      not erased?
- [ ] Does every playable figure have an id in `packages/content/src/figures.ts`
      and a `sourceRef` in `packages/content/src/sources.ts`?

## Mechanics and capabilities

- [ ] Which missions need river crossing, bridge denial, building garrison or
      close assault, and which of those already exist or are in flight?
- [ ] Does any mission need a mechanic that no OpenSpec capability covers? Name
      the capability before writing the mission as if it ships.
- [ ] Should a campaign mission ever use the training ammunition load, or only
      the column load?
- [ ] Can four player groups with independent orders be represented without a
      multi-section command capability?
- [ ] Can the Prologue's withdrawal phases, certain-defeat end and delay
      measure be represented without campaign mission scripting?
- [ ] Is a political legitimacy or supply system needed? If yes, name the
      source, the sink and the verb; if not, cut it.

## Campaign structure

- [ ] What is the target length of a mission (for example 10-20 minutes)?
- [ ] How many missions are in the first campaign slice?
- [ ] Does a retry rewind casualties in the column, or only the mission result?
      The prologue's dead do not carry into mission 02.
- [ ] What is the save/load contract and its versioning?
- [ ] Which content is historical, dramatized or fictional in each mission?
- [ ] Confirm the 1-based numbering: mission 01 is the prologue, mission 02
      begins the column in the south.
- [ ] Reconcile the `check:content` fixture's placeholder mission id `prologue`
      with the campaign id `prologue-18-do-forte` when the mission metadata
      enters `packages/content`.

## Text and localization

- [ ] English is the source language for player strings. Who reviews the PT-BR
      translation, and when?
- [ ] Which key namespace should campaign strings use
      (`campaign.<mission>.<beat>`)?
- [ ] Which terms stay in Portuguese in the English source (for example
      `Coluna Prestes`, place names and ranks)?
- [ ] The repository forbids verbatim reproduction of Amado. Confirm that
      original prose in his register, with a tone citation, is the chosen
      approach.
- [ ] Which parts of the campaign book are read before the mission and which
      are read in the debrief?

## Compendium and images

- [ ] Which public-domain historical photos are available, and where?
- [ ] Who verifies the rights and writes the credit lines?
- [ ] Which illustration style should lead: pixel-art, low-poly or period
      illustration?
- [ ] Which image generator or commission path is used, and what are its terms?
- [ ] Which entry gets the first image, and what is the acceptance check?
- [ ] Does the compendium cover need a new image, or does the existing
      photograph stay?
- [ ] How many image slots are enough for a robust entry: two, three or four?

## Scope and verification

- [ ] What is the smallest playable slice that proves the campaign fantasy?
- [ ] Which mission can be played end to end before the second mission is
      written?
- [ ] What observation would make us revert a mission's design?
