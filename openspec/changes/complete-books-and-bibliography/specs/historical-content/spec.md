## MODIFIED Requirements

### Requirement: Quotations and source rights

Every source in the register SHALL declare its rights, using one of these
values:

- `public-domain`;
- `free-licence`, naming the licence;
- `citation`: a protected work the owner has accepted for brief quotation
  for criticism or study (Lei 9.610, art. 46, III);
- `copyrighted`;
- `unknown`.

Player-facing text MAY quote a source verbatim only when that source is
`public-domain`, `free-licence` or `citation`. Text drawn from a
`copyrighted` or `unknown` source SHALL be paraphrased, with a page or
chapter citation.

Every quotation SHALL:

- be shown as a quotation, with an attribution that names the author or
  signatories and the date;
- resolve to a registered source key and a citation;
- declare its original language;
- appear in both locales. The text in the original language is the
  original, and the other locale's text is marked as a translation;
- carry the owner's approval. A quotation whose approval is pending SHALL
  NOT appear in player text.

A quotation of a `citation` source SHALL also:

- have at most 40 words;
- name an edition and a page;
- be one of at most two quotations of that source across both books.

A quotation read only through another author SHALL name both, as "apud".

The content check SHALL fail on any of these:

- a source whose rights do not allow quotation;
- an unknown source key;
- a missing translation mark;
- a pending approval;
- a `citation` quotation over 40 words, without a page, or over the
  per-source count.

Rights recorded by this change (source: each work's copyright page or the
author's death date, `docs/history/SOURCES.md`):

- `manifesto-1925`: `free-licence`, GNU FDL.
- `lima-1931`: `public-domain`. Lourenço Moreira Lima died in 1940.
- `blanc-2024`: `free-licence`, CC BY-NC 4.0, as on the copyright page of
  the Duke open-access edition.
- `rosa-1956`, `amado-1942`, `macaulay-1974`, `anita-1991`, `anita-1995`:
  `citation`.
- `mozzer-2009`: `copyrighted`, paraphrase only.

#### Scenario: Manifesto may be quoted

- **WHEN** a compendium note quotes the Manifesto of Porto Nacional with source `manifesto-1925`
- **THEN** the content check passes and the reading page shows the quotation attributed to Miguel Costa, Luís Carlos Prestes and Juarez Távora, Porto Nacional, 19 October 1925

#### Scenario: Rosa may be quoted briefly with edition and page

- **WHEN** chapter 6 quotes 31 words of *Grande sertão: veredas* with source `rosa-1956`, cite "36. ed., Nova Fronteira, 1986, p. 82", via `mozzer-2009`, and the quotation is approved
- **THEN** the content check passes and the attribution reads Guimarães Rosa, *Grande sertão: veredas*, apud Mozzer

#### Scenario: Long citation fails

- **WHEN** a quotation of a `citation` source has 41 words
- **THEN** the content check fails and names the place and the source

#### Scenario: Citation without a page fails

- **WHEN** a quotation of `macaulay-1974` has a cite with no page
- **THEN** the content check fails and names the place

#### Scenario: Paraphrase-only source may not be quoted

- **WHEN** a quotation names source `mozzer-2009`
- **THEN** the content check fails and names the place and the source

#### Scenario: Pending quotation never ships

- **WHEN** a quotation in player text is marked pending
- **THEN** the content check fails and names the place

#### Scenario: English original is marked in PT-BR

- **WHEN** the player reads the Macaulay quotation "In 1927 Brazil wanted heroes but not a revolution." in PT-BR
- **THEN** the PT-BR text is a translation and is marked as translated from the English

#### Scenario: Unknown source key in a quotation

- **WHEN** a quotation names a source key absent from the register
- **THEN** the content check fails and names the key

#### Scenario: Copyrighted source may not be quoted

- **WHEN** a quotation names source `helio-1922`, whose rights are `copyrighted`
- **THEN** the content check fails and names the entry and the source

#### Scenario: EN quotation is a marked translation

- **WHEN** the player reads the manifesto quotation in EN
- **THEN** the text is an English translation and is marked as translated from the Portuguese

### Requirement: Compendium images and extended notes

A compendium entry MAY reference one or more images. Each image SHALL be listed
in the asset register with its author, date, archive or source URL, licence and
rights determination. The licence SHALL be one of these:

- public domain;
- CC0 1.0;
- CC BY 4.0;
- CC BY-SA 3.0 or 4.0;
- permission pending, naming the holder and the request;
- permission granted, citing the grant and its credit line.

An image without a recorded determination SHALL NOT be referenced. A
caption's credit line SHALL name the image's own licence in the player's
language.

An image whose permission is pending SHALL stay out of the repository and of
every build. It MAY be shown only on the development machine, from a
gitignored folder. Where its file is absent, the book SHALL show the section
emblem and a caption saying the image awaits permission. The content check
SHALL fail when a permission-pending file is inside the published assets or
the build output.

Every entry SHALL carry an extended note in addition to its short body, with
one exception: the roster-section entries, whose note MAY be a single
paragraph that links their parent force entry. Every extended note SHALL:

- state at least one dated fact;
- cite at least one registered source.

Every player-facing caption, place, body and note SHALL exist in both PT-BR
and EN. Validation SHALL fail when an entry:

- references a missing image file, an unregistered image or an image whose
  licence disagrees with the asset register;
- has no extended note;
- has a text missing in either locale.

The compendium SHALL include the drafted entries from
`docs/campaign/compendium/entries/`, including the figures Miguel Costa and
Isidoro Dias Lopes, each with its section, label, sources and confidence as
recorded in the docs.

#### Scenario: Image must be registered

- **WHEN** an entry references an image path that is not in the asset register
- **THEN** the content check fails and names the entry and the path

#### Scenario: CC0 image shows its licence

- **WHEN** the player opens the `tenentismo` entry, whose plate is a CC0 image
- **THEN** the credit line names CC0, not "public domain"

#### Scenario: Pending image never ships

- **WHEN** the La Gaiba monument photograph is registered as permission pending to CPDOC/FGV and a build is made
- **THEN** the build contains no copy of the file, the chapter 8 page shows the emblem with "image awaiting permission", and the content check fails if the file is placed under the published assets

#### Scenario: Pending image shows on the owner's machine

- **WHEN** the owner runs the dev server with the processed file in the gitignored pending folder
- **THEN** the chapter 8 page shows the photograph with the credit "Acervo CPDOC/FGV, ILA foto 011-8" and the note that permission was requested

#### Scenario: Entry without a note fails

- **WHEN** an event entry has a short body and no extended note
- **THEN** the content check fails and names the entry

#### Scenario: Bilingual parity

- **WHEN** an entry has an extended note in EN but not in PT-BR
- **THEN** the content check fails and names the entry and the missing locale

#### Scenario: Drafted entries are present

- **WHEN** the compendium registry is read
- **THEN** it contains every entry id from `docs/campaign/compendium/entries/`, including `miguel-costa` and `isidoro-dias-lopes`

## ADDED Requirements

### Requirement: Bibliography

The project SHALL keep one bibliography with a row for every source cited by
a chapter, an entry, a quotation or an image caption. Each row SHALL hold:

- a short form ("Macaulay 1974");
- the full reference: author, title, edition, place, publisher and year;
- its tier;
- its rights;
- its consultation status.

The reference SHALL be identical in both locales. The tier, rights and status
labels SHALL be localized. The bibliography SHALL agree with
`docs/history/SOURCES.md`.

The content check SHALL fail when:

- a cited source has no row;
- a row's reference or rights disagree with `SOURCES.md`;
- a row lists a source that nothing cites.

The bibliography SHALL include *Grande sertão: veredas* (`rosa-1956`, 36th ed.,
Nova Fronteira, 1986), cited through `mozzer-2009` and `starling-1999`.

#### Scenario: Every cited source is listed

- **WHEN** chapter 6 cites `rosa-1956`
- **THEN** the bibliography has a row for it with author, title, edition, publisher, year, tier, rights and status

#### Scenario: Missing row fails

- **WHEN** an entry cites a source key that has no bibliography row
- **THEN** the content check fails and names the key and the entry

#### Scenario: Uncited source is not printed

- **WHEN** a source is registered in `SOURCES.md` but cited nowhere
- **THEN** the content check fails until it is cited or removed from the bibliography table

### Requirement: Finished book texts

Every chapter of the campaign book and every compendium entry SHALL be
finished in both PT-BR and EN. Finished means:

- no provisional phrasing;
- every date checked against `docs/history/TIMELINE.md`;
- at least one dated fact and one cited source per chapter page set.

Each chapter SHALL contain at least one approved quotation, and SHALL show a
sources line in short form.

The content check SHALL fail when player text in either book or in the
locale catalogs contains a provisional phrase. In EN these are "still to be
checked", "still to be confirmed", "to be confirmed", "TBD", "TODO" and
"placeholder". In PT-BR they are "ainda precisa ser", "ainda precisam ser",
"a confirmar", "a conferir" and "provisório". The confidence legend is
exempt.

These corrections SHALL hold (sources: Macaulay 1974, pp. 122–125 and
230–234; Blanc 2024, pp. 126–142):

- **Chapter 5 (Verdinho):**
  - Klinger's trucks reach the bridge at 4 p.m. on 27 June 1925;
  - the rearguard burns the bridge and wades the river on the 28th;
  - the action costs the rebels one dead and one wounded.
- **Chapter 7 and entry `exile-1927`:**
  - the column enters the Pantanal in January 1927;
  - the main body crosses into Bolivia on 3 February 1927 and gives up its
    arms at San Matías on 4 February;
  - Siqueira Campos's group crosses into Paraguay on 23 or 24 March 1927,
    with the divergence logged in `TIMELINE.md`.
- **Entry `la-gaiba-1927`:**
  - it cites Blanc 2024 (ch. 7, fig. 7.5) and the *Correio da Manhã* of
    22 July 1927, not Macaulay;
  - it dates the monument and Moreira Lima's speech to 5 July 1927.

#### Scenario: Provisional phrase fails

- **WHEN** a compendium body contains "still to be checked"
- **THEN** the content check fails and names the key and the phrase

#### Scenario: Pantanal dates are right

- **WHEN** the player reads chapter 7 in either language
- **THEN** the column enters the Pantanal in January 1927 and crosses into Bolivia on 3 February 1927

#### Scenario: Every chapter has a quotation

- **WHEN** the campaign registry is validated
- **THEN** each of the eight chapters has at least one approved quotation in both locales

#### Scenario: Chapters stay unplayable

- **WHEN** this change is applied
- **THEN** every chapter's playable flag is unchanged and no map file is modified
