## Why

On 2026-11-15 the owner asked for a "revisão COMPLETA dos livros, textos,
enriquecer com as imagens, e finalizar todos, enriquecer com citações e
fatos, acrescentar todas as fontes, inclusive Guimarães Rosa". A review of
the two books on the same day found these gaps:

- **Thin chapters.** Chapters 4, 5, 7 and 8 have three short pages, and
  each says "it was not a victory" in one form or another. Apart from the
  manifesto and the La Gaiba farewell, no chapter gives a voice of the
  period, and most pages carry no date.
- **Wrong facts.**
  - Chapter 7 starts the Pantanal in February 1927. The column entered it
    in January (Blanc 2024, p. 126) and crossed into Bolivia on 3 February
    (Macaulay 1974, p. 234).
  - Chapter 7 says the column "was still together" in exile. It had split:
    Siqueira Campos's 65 men crossed into Paraguay on 23 or 24 March 1927.
  - The entry `exile-1927` says the column crossed "in February and
    March… into Paraguay and Bolivia".
  - The entry `la-gaiba-1927` cites only Macaulay, who does not mention La
    Gaiba. Its body says "the page in the baseline source is still to be
    checked".
- **Provisional text in the game.**
  - `la-gaiba-1927` (above).
  - `sao-luiz-gonzaga`: "still to be confirmed" / "ainda precisam ser
    confirmados".
  - Chapter 6 paraphrases Rosa where it could quote him.
- **A shallow compendium.** 40 of the 71 entries have no extended note.
  These include seven events (among them the Paraná crossing, the exile
  and La Gaiba), the two armies, all eight weapons and the four
  corrections. Only 8 entries have an image.
- **No bibliography.** Both books print sources as raw keys
  ("macaulay-1974, blanc-2024"). The player cannot tell what a key means.
- **Images.**
  - The campaign book shows one plate per chapter. Four chapters have
    none.
  - The image register accepts only `public-domain`, so a CC0 file or an
    original CC-BY-4.0 map cannot ship.
  - At least ten verified public-domain period images are waiting (see
    `IMAGE_SURVEY.md`).
- **Rosa.** The quotation rule (from `enrich-texts-from-sources`) allows
  quotes only from free sources. Rosa, Amado and the historians can only be
  paraphrased, though Lei 9.610, art. 46, III allows a short, attributed
  quotation for criticism or study.

The open change `enrich-texts-from-sources` is 12 of 15. Its last tasks
are gates (verify, the owner's reading, the documentary placeholder). It
is closed first, not widened: its scope was nine entries and two chapters,
and this review covers both books, the bibliography, the images and the
quotation rule.

## What Changes

- **Close `enrich-texts-from-sources` first.**
  - Run its gate 5.1 (`pnpm verify`, strict validate).
  - Fold its owner reading (5.2) into this change's final reading, since
    those pages change again here.
  - Keep 5.3 (the documentary stays "not consulted") as a note in the
    source register.
  - Archive it, so its requirements land in the main specs before this
    change modifies them.
- **Owner approval before content.** `approval-list.md` lists the 14 new
  quotations and the 20 images with what was checked, the rights and what
  is pending. Nothing goes into code until the owner approves it. A
  pending item ships only once it is closed.
- **Quotation rule, widened.** A source gains one more right: `citation`.
  This covers a protected work that may be quoted briefly under art. 46,
  III. Such a quotation:
  - is capped at 40 words;
  - must name an edition and a page;
  - may appear at most twice per source across both books.

  A quotation also declares its original language, so English originals
  (Macaulay, Blanc) are shown as originals in EN and as marked
  translations in PT-BR. A quotation read only through another author is
  marked `secondary`, and its citation names both (e.g. "Rosa 1986, p. 82,
  apud Mozzer 2009, p. 249"). Rights change for two sources:
  - `blanc-2024` becomes `free-licence` (CC BY-NC 4.0, read on the
    copyright page);
  - `rosa-1956`, `amado-1942`, `macaulay-1974`, `anita-1991` and the new
    `anita-1995` become `citation`.
- **Bibliography in the game.**
  - A "Fontes" / "Sources" part closes the compendium book. It lists every
    source cited in either book, with the full reference (author, title,
    edition, place, publisher, year), its tier, its rights and how much
    of it was read.
  - The short source lines in both books show "Macaulay 1974", not the
    key, and open the bibliography at that source.
  - Both are built from one table in `sources.ts`, which is checked
    against `docs/history/SOURCES.md`.
  - New keys: `starling-1999`, `anita-1995`, `landucci-1947`,
    `correio-da-manha-1927`, `o-jornal-1927`, `careta-1927`, `o-malho-1926`.
    `joao-alberto-1954` is already registered.
- **Campaign book, every chapter revised in both languages.**
  - Each chapter gains dated facts drawn from the matrices in
    `docs/history/CHAPTER_SOURCES.md`, at least one quotation from the
    approved list, a page with a second plate where an image exists, and
    a "Sources" line in short form.
  - The repeated "not a victory" closings are cut to one per chapter at
    most.
  - Chapter 4's date and order are stated: it covers 1924–March 1925, a
    flashback before the junction of chapter 3. The book's contents say
    so.
  - Chapter 5 gains Klinger, the trucks, Cordeiro's rearguard and the
    cost: one rebel killed and one wounded on the 27th, and five rebels
    killed on the 29th (Macaulay pp. 122–125).
  - Chapter 7 is rewritten on Macaulay pp. 230–234 and Blanc pp. 126–127:
    the entry on 10 January, the anthills and the hearts of palm, the
    surrender of 620 men and 90 Mausers at San Matías on 4 February, and
    Siqueira's separate road to Paraguay.
  - Chapter 8 is rewritten on Blanc ch. 7: the work for Bolivian
    Concessions Ltd., malaria, Hermínia as nurse, the journalists and the
    fundraising, the monument on 5 July 1927, the "Knight of Hope" myth,
    and Macaulay's closing judgement (Q10).
- **Compendium, finished.**
  - Every entry in the figures, events, places, weapons and forces
    sections, and the four corrections, gets an extended note in both
    languages. Each note has at least one dated fact and one source.
  - The 19 roster-section entries get a short historical paragraph each,
    linking their parent force note.
  - `la-gaiba-1927` moves to Blanc and the *Correio da Manhã*. `exile-1927`
    is corrected.
  - Every entry with an approved image shows it.
- **Images.**
  - The campaign book can show a plate inside a chapter, on a page that
    asks for one.
  - The image register records the licence of each image (public domain,
    CC0, CC BY, CC BY-SA or the project's CC-BY-4.0), and the caption's
    credit line names that licence in the player's language.
  - Approved images are processed like the existing plates and registered
    in `docs/assets.md`.
  - On 2026-11-15 the owner asked that the books have images even under
    other licences, and that the permission requests be prepared.
    - CC BY-SA images (the modern Verdinho for chapter 5, modern route
      maps, the Mauser 1908) are used with attribution.
    - Images that need permission are inserted as `permission-pending`:
      CPDOC/FGV's photographs of the exile and the La Gaiba monument,
      Malan's 1977 map, Portinari's *Coluna Prestes* and Blanc's maps.
      They show only on the owner's machine, from a gitignored folder,
      and never in a commit or a build, until a grant is recorded.
    - The requests are drafted in `docs/rights/permission-requests/`, for
      the owner to send.
- **Mission texts and narrative cards.** The chapter briefings are revised
  with the chapters. The map cards live in the map files, which another
  session owns. This change lists the card fixes in
  `docs/campaign/missions/card-review.md`, for example La Gaiba's date
  note: 5 July 1927 comes from a period newspaper, not "a secondary
  tradition". The map owner applies them. No map file is edited here.
- **No provisional text left.** `pnpm check:content` fails on the phrases
  "still to be checked/confirmed", "to be confirmed" and their PT-BR
  forms in player text. It also fails on a quotation whose approval is
  still pending.

Design intent:

- **Player fantasy:** the officer's desk holds a real field library. Every
  page says where it comes from, and a few voices of 1922–1927 speak in
  their own words.
- **Pillar:** history that is sourced and labelled.
- **Loop beat:** at the desk, in the two books, before and between
  battles.
- **Hypothesis:** a player who reads a chapter can name one dated fact,
  one voice of the period and the book it came from.
- **MVP:**
  - the closed old change;
  - the widened quotation rule;
  - the bibliography;
  - the eight revised chapters;
  - the 40 finished entries;
  - the approved images;
  - the content check against provisional text.
- **Non-goals:**
  - no new chapter;
  - no change to `playable`, to the maps, to the cards' files, to missions
    or to the simulation;
  - no protected image in a commit or a build before its grant;
  - nothing from the 2012 documentary;
  - no image generated to look like a period photograph.

Multi-perspective note: no commander changes:

- Siqueira Campos commands the prologue.
- Prestes commands chapters 2, 5, 6, 7 and 8.
- Miguel Costa commands chapter 3.
- Isidoro commands chapter 4.

New voices are added beside the commanders, not in their place:

- the pursuer, Klinger (ch. 5);
- the loyalist dead at Ramada (Blanc);
- Riobaldo, labelled fiction;
- Prestes's mother;
- the press that built and mocked the legend.

No new playable figure.

Legal and ethical note:

- **Quotations.** Protected works (Rosa, Amado, Macaulay, Anita Prestes,
  Landucci) are quoted only briefly, attributed, with edition and page,
  for criticism and study (Lei 9.610, art. 46, III), and never more than
  twice per work. Longer use stays paraphrase. Blanc is quoted under CC
  BY-NC 4.0 with attribution. The game is free and not sold.
- **Source files.** Scans and OCR stay in `livros/` and are never
  committed (`SOURCE_POLICY.md`).
- **Images.**
  - Public-domain and free-licence images are used with credit, and
    share-alike is honoured.
  - Protected images are used only under a written request. Until a grant
    is recorded, they stay on the owner's machine and are never committed,
    built or published.
  - A refusal removes the image.
- **Sensitive history.** The violence is not softened: Piancó,
  requisitions, the rapes Blanc documents (named, not described), and the
  loyalists killed at Ramada. Race is named as the sources name it,
  including the racism of the 1927 press (Q8). The march is not made
  heroic. "A maior marcha revolucionária do mundo" stays framed as memory.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `historical-content`:
  - the quotation rule gains `citation` rights, the original language and
    secondary quotations;
  - a bibliography requirement;
  - every compendium entry carries an extended note;
  - every chapter carries dated facts and a quotation;
  - no provisional text;
  - images record their licence.
- `presentation`:
  - the campaign book shows plates inside chapters;
  - the compendium book ends with the bibliography;
  - source lines open it;
  - captions name each image's licence.

## Impact

- `openspec/changes/enrich-texts-from-sources` (closed and archived first).
- Docs:
  - `docs/history/SOURCES.md`, `CHAPTER_SOURCES.md`, `TIMELINE.md`
    (Siqueira's Paraguay date, 23 or 24 March 1927, and Macaulay's "1926"
    misprints);
  - `docs/campaign/book/*.md`;
  - `docs/campaign/compendium/entries/*.md`, `images.md`;
  - `docs/campaign/missions/card-review.md` (new);
  - `docs/assets.md`;
  - `docs/rights/permission-requests/` (drafted 2026-11-15) and
    `docs/rights/grants/`;
  - `.gitignore` (`art-src/compendium-pending/`).
- `packages/content/src`:
  - `sources.ts` (rights, bibliography table);
  - `quotes.ts` (citation rule, original language, secondary);
  - `compendium-docs.ts` (image licences);
  - `compendium.ts`, `compendium-notes/{en,pt-BR}.ts`;
  - `campaign/chapters.ts` (page images; sources; links; never
    `playable`);
  - `campaign/text/{en,pt-BR}.ts`;
  - `locales/{en,pt-BR}.ts`.
- `apps/game/src/ui/menu/`: `bookPages.ts`, `CampaignBook.tsx`,
  `CompendiumBook.tsx`, `BookFrame.tsx` and the book styles.
- `apps/game/public/assets/compendium/` (new plates).
- `tools/check-content.ts`; tests in `packages/content/test` and the
  desk-books e2e.
- No change to the simulation, the maps, the audio or the HUD.
