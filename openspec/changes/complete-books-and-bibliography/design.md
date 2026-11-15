## Context

The two desk books are rasterized two-page spreads built by
`apps/game/src/ui/menu/bookPages.ts` from content in `packages/content`.

- **Campaign book.** Chapter prose is in `campaign/text/{en,pt-BR}.ts`.
  Each chapter has one opening plate (`CampaignChapter.image`, a reference
  to a compendium image).
- **Compendium book.** Notes are in `compendium-notes/{en,pt-BR}.ts`, and
  short bodies in the locale catalogs.
- **Quotes.** `Quote` (`quotes.ts`) assumes a Portuguese original and a
  free source.
- **Images.** The image register (`compendium-docs.ts`) types every
  licence as `'public-domain'`. The book caption always appends the
  localized "public domain" line.
- **Sources.** `SOURCE_KEYS` and `SOURCE_RIGHTS` mirror
  `docs/history/SOURCES.md`, and `check:content` compares them.
- **Authoring.** The docs are the authoring source. Entries are drafted
  in `docs/campaign/compendium/entries/` and chapters in
  `docs/campaign/book/`, then imported.

This change touches no simulation, kernel, view3d or map code. The
simulation/presentation boundary is unchanged: books are menu UI over
static content. The low-poly pipeline is not involved. Images follow the
existing plate treatment (pixel sepia, fixed sizes).

Constraints:

- Another session owns the maps and the cards inside them, and is about
  to make chapters playable: `playable` and map files are off limits.
- An audio session shares the tree: commit with explicit paths only.

## Goals / Non-Goals

**Goals:**

- Close `enrich-texts-from-sources` cleanly before this change modifies
  its requirements.
- Every player-facing history text in both books is finished, dated where
  dates exist, sourced, and free of provisional phrasing in both
  languages.
- A quotation path that allows short citations of protected works with
  edition and page, English originals and secondary quotations, and
  refuses everything else.
- An in-game bibliography that is generated from the same table the
  content check reads.
- Plates inside chapters, and correct licence lines for every image.

**Non-Goals:**

- New chapters, missions, maps or card edits (the cards get a review
  list).
- Facsimiles, generated "period" images, or images without a verified
  licence.
- Translating a translation. A period quote known only in Blanc's English
  does not ship until its Portuguese original is found.

## Decisions

### D1. Close the old change, then open this one

`enrich-texts-from-sources` added the requirement "Quotations and source
rights", which this change modifies. A delta can only modify a requirement
that exists in the main spec. So the old change is archived first, after
its gate 5.1 passes.

- Its 5.2 (the owner reads the nine entries and chapters 6 and 8) moves
  here as part of task 7.2, because those texts change again.
- Its 5.3 is a standing note: the documentary stays "not consulted".

Alternative considered: widen the old change. Rejected because its
proposal, nine entries and two chapters, has been approved and
implemented, and this scope (both books, bibliography, images, rules) is
four times larger.

### D2. Rights gain `citation`; quotes gain language and secondary

`SourceRights` becomes `public-domain | free-licence | citation |
copyrighted | unknown`. The value `citation` means the work is protected,
and the owner has accepted short quotation under Lei 9.610, art. 46, III.
`Quote` gains three fields:

- `originalLocale: Locale` (default `pt-BR`). The text in that locale is
  the original. Every other locale must set `translated: true` and may
  name the translator in `cite` (e.g. "trans. Blanc 2024").
- `via?: { sourceKey; cite }`, for a quotation read only through another
  author. The attribution line then reads "… apud Mozzer 2009, p. 249".
- `approval: 'approved' | 'pending'`. A `pending` quote fails the content
  check. It exists so a drafted quote can sit in the entry doc, but never
  in code.

The rules `validateQuotes` enforces:

| Rights | Allowed | Limit |
| --- | --- | --- |
| `public-domain`, `free-licence` | yes | 60 words (current) |
| `citation` | yes, with a page in `cite` (matches `p\.\s?\d`) | 40 words; at most 2 quotations per source across both books and all locales counted once |
| `copyrighted`, `unknown` | no | — |

Rationale: art. 46, III permits quotation "na medida justificada para o
fim a atingir". A word cap, a page, a per-work count and the owner's
approval make that measurable. The pending state answers the request not
to invent quotes: an unconfirmed quote cannot reach the player.

Alternative considered: keep Rosa paraphrased. Rejected because the owner
asked for Rosa explicitly, and the passage is quoted verbatim, with page,
by two published critics.

### D3. Image licences

`RegisteredImage.licence` becomes `'public-domain' | 'CC0-1.0' |
'CC-BY-4.0' | 'CC-BY-SA-4.0' | 'CC-BY-SA-3.0'`, plus `author`, `sourceUrl`
and `archive`. The caption's credit line is built from the localized
licence name, not a fixed "public domain" string. `check:content` fails
when:

- a registered image lacks a licence, author or source URL;
- the licence disagrees with its row in `docs/assets.md`;
- a CC BY-SA image has no attribution.

The project's own maps use `CC-BY-4.0`.

### D3a. Images under a permission request

On 2026-11-15 the owner asked that the books have images even under other
licences, and that permission requests be prepared. Two more licence values
cover this:

- `permission-pending`: the image is used under a request to its holder, not
  yet answered;
- `permission-granted`: the holder agreed. The row cites a file in
  `docs/rights/grants/` with the terms and the required credit.

A pending image stays on the owner's machine:

- Its processed file lives in `art-src/compendium-pending/<entry>/<slot>.png`,
  which is gitignored. It is never committed, so it is never pushed or
  published.
- The game's image loader looks for the file at its served path. A dev
  server plugin serves `art-src/compendium-pending/` under
  `/assets/compendium/` in `pnpm dev` only. If the file is missing (a clean
  checkout, CI, a build), the book shows the section emblem, and the caption
  reads "image awaiting permission" in the player's language.
- `pnpm build` never copies the pending folder. `check:content` fails when a
  `permission-pending` file appears under `apps/game/public/` or in `dist/`.
- The caption of a pending image names the holder ("Acervo CPDOC/FGV, ILA
  foto 011-8, autorização solicitada"). It never says "public domain".

When a grant arrives, the image moves to `apps/game/public/assets/compendium/`
and its row becomes `permission-granted`, with the credit line the holder
asked for. When a refusal arrives, the reference is removed. The requests
and their status are in `docs/rights/permission-requests/README.md`.

Working copies:

- **CPDOC photographs Blanc printed** (fig. 7.1, 7.2 and 7.5). The working
  copy is extracted from the open-access PDF in `livros/`, which is
  gitignored, until CPDOC sends the files.
- **CPDOC items with only a 65 × 100 thumbnail.** No working copy; the
  emblem shows until CPDOC sends the files.

Alternative considered: wait for each answer before inserting. Rejected by
the owner, who wants to see the books with their images now. The
gitignored folder keeps that from becoming redistribution.

### D4. Plates inside chapters

`ChapterPage` gains `image?: ChapterImage`, using the same compendium image
reference as the opening plate. `bookPages.ts` lays out such a page as the
plate (caption and credit below), then the paragraphs. A plate page never
splits, and it costs a fixed share of the word budget (the plate counts as
90 words against `CHAPTER_PAGE_WORD_BUDGET`). The overflow e2e checks the
longest such page at 1440 x 900 and 1280 x 720 in both languages. A chapter
uses at most two plates (opening plus one).

### D5. Bibliography from one table

`sources.ts` gains a `SOURCE_BIBLIOGRAPHY` record keyed by `SourceKey`.
Each row holds:

- `short`: "Macaulay 1974";
- `reference`: author, title, edition, place, publisher, year. Not
  translated: a reference is the same in both languages;
- `tier`;
- `note?`: a localized message key for "read through Mozzer", "not
  consulted" and similar.

Rights and consultation come from `SOURCE_RIGHTS`. The compendium book
gains a final part, "Fontes" / "Sources". It lists every source cited by
any chapter, entry, quote or image caption, sorted by `short`, and shows
its tier, rights and consultation status in the player's language. Source
lines in both books print `short` forms joined by "; ", and each opens the
bibliography at that row.

`check:content` fails when:

- a cited key has no bibliography row;
- a row's reference is not on the key's line in `SOURCES.md`;
- a listed source is not cited anywhere. Uncited sources stay in
  `SOURCES.md` but are not printed.

### D6. Writing method and order

Research method (unchanged policy, applied to every page):

- Macaulay is the Tier 0 baseline for chronology.
- Blanc covers the interior and society.
- Anita Prestes, Vitor and the regional studies cover detail.
- Conflicts are logged in `TIMELINE.md`, and the text shows the
  divergence when it matters ("23 or 24 March").

Each chapter and entry is drafted in its doc first, from the matrix in
`CHAPTER_SOURCES.md`, then imported to code in both languages.

- **PT-BR prose.** PT-BR is written as Portuguese, not word for word from
  the English.
- **Quotations.** Quotations come only from the approved list
  (`approval-list.md`).
- **Order.** The chapters come first: the fixes in 7 and 8 are factual
  errors. Then the events and places without notes, then the forces and
  weapons, then the sections and corrections.

The figure roster is unchanged. Commanders stay as in
`docs/campaign/CAMPAIGN.md`. New named voices (Klinger, João Francisco,
Leocádia Prestes, Landucci, João Alberto, Moreira Lima) appear only as
quoted or cited people, never as figures or commanders.

### D7. Provisional-text guard

`check:content` scans player text in both books and the locale catalogs
for a fixed list of phrases. In EN these are "still to be checked", "still
to be confirmed", "to be confirmed", "TBD", "TODO" and "placeholder". In
PT-BR they are "ainda precisa(m) ser", "a confirmar", "a conferir" and
"provisório". It fails with the key and the phrase. The confidence label
"low, to be checked" is a legend, not a text, and is exempt by key.

### D8. Cards and mission texts

Chapter briefings (pitch and objectives) live in `campaign/text` and are
revised with the chapters. The narrative cards live in the authored map
files, which another session owns. This change writes
`docs/campaign/missions/card-review.md`: one row per card with the
current note, the proposed EN and PT-BR wording, and the source. It does
not edit a map file. The card review is handed to the map session through
the shared notes folder.

## Risks / Trade-offs

- **Pending originals may never be found.**
  - Risk: the quotes Q4–Q9 and Q11–Q12 are known only in English
    translation.
  - Mitigation: they stay out of the game, and the chapters are complete
    without them. Each chapter's MVP needs one approved quote, and Q0a,
    Q0b, Q1, Q10 and Q13 are already checked.
- **"Citation" is a legal judgement.**
  - Risk: art. 46, III is a fair-use-like defence, not a licence.
  - Mitigation: short, attributed, page-cited quotations, a per-work cap,
    and the owner's explicit approval recorded in `docs/status.md`.
- **Blanc's NC licence.**
  - Risk: CC BY-NC forbids commercial use.
  - Mitigation: the game is free (AGPL) and not sold. If that changes, the
    Blanc quotations fall back to the citation rule, which they also meet.
- **Image provenance.**
  - Risk: the Moreira Lima portrait comes from a blog via Commons.
  - Mitigation: the caption says "attributed", and the owner may reject
    it.
- **Text growth and the book budget.**
  - Risk: about 40 new notes and longer chapters add roughly 120 KB of
    text, and the bundle budget may need its documented raise.
  - Mitigation: check `pnpm verify` budgets at each slice, and keep notes
    to 120–300 words.
- **Shared tree.** Commit only explicit paths, never touch
  `apps/game/src/audio/`, `tests/audio/`, map files or `playable`.
