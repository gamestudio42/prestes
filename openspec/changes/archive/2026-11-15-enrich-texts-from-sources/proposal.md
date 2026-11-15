## Why

The game's history text is drawn from Macaulay and Blanc, but it never lets
the column speak in its own words. Its manifesto, its newspaper and its
secretary's eulogy at La Gaiba are missing. So is the column's afterlife in
Brazilian literature. On 2026-11-12 the owner gave four sources to fill this
gap, and asked that the march be presented as "a maior marcha revolucionária
do mundo":

- the Manifesto of Porto Nacional (19 October 1925);
- the column's newspaper *O Libertador*;
- Marcelo Mozzer's article on the Coluna Prestes in Guimarães Rosa's
  *Grande sertão: veredas*;
- the short documentary "Coluna Prestes | DOC" (superoitocine, 2012).

Later the same day the owner added the História FM podcast episode on the
column, with the historian Amilcar Guidolim Vitor. It brings the column's
women, its requisitions and its justice acts, and its Black rank and file.

None of these appears in the game today.

## What Changes

- **New sources in the register** (`docs/history/SOURCES.md`, `SOURCE_KEYS`),
  each with its consultation status and its rights:
  - `manifesto-1925`: the Manifesto of Porto Nacional, signed by Miguel
    Costa, Prestes and Juarez Távora. Read in full, in the marxists.org
    transcription under the GNU FDL.
  - `libertador-1924`: *O Libertador*. Citation-only: no issue was read.
  - `mozzer-2009`: Mozzer, "Presença da Coluna Prestes nas veredas do Grande
    sertão", *Contexto* 15/16 (Ufes, 2008/2009). Read in full. It is a
    literary reading, not a historical authority.
  - `rosa-1956`: Guimarães Rosa, *Grande sertão: veredas*. Citation-only,
    through Mozzer.
  - `superoitocine-2012`: the documentary. Not consulted: no description or
    transcript could be obtained. It is registered so that it can be
    reviewed later. It is cited by no entry until then.
  - `historiafm-2024`: História FM episode 190, "Coluna Prestes: a maior
    marcha militar da história" (Icles Rodrigues, 15 Dec. 2024), with the
    historian Amilcar Guidolim Vitor (`vitor-2011`). Consulted in full
    through YouTube's automatic transcript. Tier 3: a historian's oral
    synthesis, used for detail and counterpoint, not for chronology. Added
    by the owner on 2026-11-12.
- **Research notes** for apply are in `research-notes.md` in this change.
  They are paraphrased and keep only the free quotations.
- **Quotation rule.** A text in the public domain or under a free licence may
  be quoted with attribution: the manifesto, and Moreira Lima, who died in
  1940. Copyrighted works stay paraphrased: Rosa, Amado, Mozzer and Anita
  Prestes. The content check enforces this.
- **New compendium entries**, in PT-BR and EN, each with a label, sources
  and confidence:
  - event `manifesto-porto-nacional-1925`, quoting the manifesto;
  - place `porto-nacional`;
  - event `o-libertador-1924`, with the two counts of issues (nine or ten)
    shown as a recorded divergence;
  - figure `lourenco-moreira-lima`: secretary, the "Bacharel Feroz", editor
    of *O Libertador*, chronicler of the march;
  - force `batalhoes-patrioticos-bahia`: the Bahian patriotic battalions of
    1926 and their sizes as Anita Prestes gives them (via Mozzer);
  - event `coluna-no-grande-sertao`, labelled `dramatized`: Riobaldo's memory
    of the "soldados de Prestes" at the mouth of the Urucuia, and the rivers
    the novel shares with the route. It is presented as one critic's reading;
  - force `vivandeiras`: the fifty or so women of the column. It covers
    their crossing of the Uruguay against orders, their fighting, nursing
    and scouting, and the nicknames that hid their names (Santa Rosa, Tia
    Maria, Hermínia the Austrian nurse). It notes that Moreira Lima's diary
    reduced their role;
  - event `tenentismo` (owner's request, 2026-11-12). It explains who the
    "tenentes" were: young officers of the junior ranks, schooled to serve
    the nation and not the coffee-and-milk oligarchy, while the high
    command stayed loyal. It covers their hatred of Bernardes (the 1922
    deal, the forged letters), and the liberal banners they built over time
    (the secret ballot, political morality, education), which the 1925
    manifesto states. It gives the three ways historians explain the
    movement, and Prestes's break with it in 1930;
  - event `positivismo-militar` (owner's request). It covers Comte's
    positivism at the Praia Vermelha academy under Benjamin Constant:
    "Ordem e Progresso" on the flag, the cadets' abolitionism, and the 1889
    and 1904 risings. It covers Prestes's father as a positivist and the
    "soldado-cidadão". It ends on the irony that the doctrine forbade
    revolution, and that Rondon, its most orthodox follower, led the
    government's forces against the rebels in Paraná.
- **Richer existing texts:**
  - Prestes's extended note gains the march as it is remembered ("a maior
    marcha revolucionária do mundo"), stated as memory, not as a measured
    record, next to the 25,000 km and thirteen states already there.
  - Serra Nova's note gains the patriotic battalions.
  - The column's force note (`army-coluna`) gains how it lived off the
    land. It requisitioned with written notes, and a requisition could ruin
    a poor family. The command punished abuses, but government troops
    looted too. It burned tax books and freed prisoners in collars and
    stocks. It never exceeded about 1,500 people while rumour made it ten
    thousand. Many of its rank and file were Black, a fact long left
    unnamed.
- **Campaign book:**
  - The campaign epigraph becomes "A maior marcha revolucionária do mundo."
  - Chapter 6 (Serra Nova) opens with a page on Porto Nacional,
    October 1925, built on the manifesto. It covers the six months the
    chapters skip, from June 1925 to April 1926.
  - Chapter 6 ends with the Urucuia echo.
  - Chapter 8 (La Gaiba) gains Moreira Lima's farewell to the dead
    ("Soldados da Liberdade!").
  - Chapter links and source lists are updated.
- **Timeline:** these are logged as conflicts:
  - the issue count and the first issue's date of *O Libertador*;
  - thirteen against fifteen states;
  - the start of the column: São Luiz Gonzaga on 27 Dec. 1924 (Anita
    Prestes, Vitor) against the union in Paraná in April 1925.

Design intent:

- **Player fantasy:** reading the column's own papers at the officer's desk
  before the march.
- **Pillar:** history that is sourced and labelled.
- **Loop beat:** at the desk, in the two books.
- **Hypothesis:** a player who opens chapter 6 learns, without leaving the
  book, what the column said it was fighting for.
- **MVP:** the sources, the quotation rule, the nine entries, the three
  enriched notes, the three chapter additions and the epigraph.
- **Non-goals:**
  - no new campaign chapter (the registry stays at the prologue and
    chapters 2 to 8);
  - no facsimile images of *O Libertador* (that needs a rights check
    first);
  - no content from the documentary until it has been watched;
  - no change to missions, maps or the simulation.

Multi-perspective note: no commander changes. Prestes stays the commander of
chapters 6 and 8. The manifesto page names its three signatories. Miguel
Costa signs first, as the formal commander, and the text keeps that order.
The Rosa entry introduces no playable figure. Riobaldo is fiction and is
labelled as such.

Legal and ethical note:

- The manifesto is quoted from a GNU FDL transcription, with its source and
  licence recorded.
- Moreira Lima's eulogy is quoted as a public-domain text (author died
  1940), cited through the edition Mozzer uses.
- Rosa, Amado, Mozzer and Anita Prestes are paraphrased, with page citations
  and no verbatim passages.
- The column's violence and requisitions are not erased. The `army-coluna`
  note says that requisitions hurt the poor, that abuses happened and were
  punished, and that government troops did the same. Piancó is not
  softened. Race and gender are named as the sources name them, without
  inventing figures. The march is not made heroic.
- "A maior marcha revolucionária do mundo" is presented as how the march is
  remembered, not as fact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `historical-content`: adds a requirement on quotations and source rights,
  and a requirement that the compendium carries the column's own documents,
  its women, its political roots and its literary memory (the nine entries
  and three enriched notes above). The chapter registry links the prologue
  to `tenentismo` and chapter 4 to `positivismo-militar`.
- `presentation`: the campaign book's title spread shows the campaign motto.

## Impact

- `docs/history/SOURCES.md`, `TIMELINE.md`, `CHAPTER_SOURCES.md`,
  `FIGURES.md` (Moreira Lima as a non-playable figure note), `FORCES.md`.
- `docs/campaign/book/06-serra-nova.md`, `08-la-gaiba.md` and
  `docs/campaign/compendium/entries/` (new entry files).
- `packages/content/src/sources.ts`: new keys and a rights map.
- `compendium.ts`, `compendium-notes/{en,pt-BR}.ts`,
  `campaign/chapters.ts`, `campaign/text/{en,pt-BR}.ts` and
  `locales/{en,pt-BR}.ts`.
- `tools/check-content.ts`: the quotation-rights check.
- Tests under `packages/content/test`.
- No change to the simulation, the view or the HUD layout.
