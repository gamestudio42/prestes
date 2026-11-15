## Context

The compendium and campaign texts live in `packages/content`:

- the entry metadata is in `compendium.ts` (`BASE`);
- the long notes are in `compendium-notes/{en,pt-BR}.ts`, as `NoteSection`
  objects with a heading and paragraphs;
- the chapter prose is in `campaign/text/{en,pt-BR}.ts`, as `ChapterPage`
  objects with a heading and paragraphs;
- the short titles and bodies are in `locales/{en,pt-BR}.ts`.

`apps/game/src/ui/menu/bookPages.ts` lays all of this out as `TextItem`s
(`heading`, `para`, `list`, `sources`, `related`). `tools/check-content.ts`
checks two things: that every `SOURCE_KEYS` entry is in `SOURCES.md`, and
that compendium entries, chapters and both locales agree. Source keys carry
no rights information today. The chapter text header says "no source text
is reproduced".

Two sources are in hand as full text. The manifesto was read from the Wayback
Machine copy of the marxists.org page, which itself blocks this machine. It
is under the GNU FDL. Mozzer's PDF is in the owner's Downloads folder; it
stays out of the repository and only notes are kept. *O Libertador* is known
only from secondary pages. The documentary's page gave only its title,
channel, date (16 Nov. 2012), length (17:56) and keywords (Santo Ângelo,
Palmas, Tocantins). Its automatic captions could not be downloaded. The
História FM episode was read in full from YouTube's transcript panel in the
in-app browser. The findings from all sources are paraphrased in
`research-notes.md`.

This change touches no simulation, kernel, view or worker code. The
simulation/presentation boundary, the deterministic kernel and the low-poly
pipeline are unaffected. The only presentation change is how a quotation is
drawn in the books.

## Goals / Non-Goals

**Goals:**

- Register the new sources with their consultation status and their rights.
- Add a machine-checked quotation path that only free and public-domain
  texts can use.
- Add nine compendium entries, enrich three notes and add three chapter
  passages, all in PT-BR and EN.
- Make the campaign motto the book's epigraph.

**Non-Goals:**

- A new chapter, or an interlude type in the chapter registry.
- Images or facsimiles of *O Libertador* or of the manifesto.
- Using the documentary before it is watched.
- Quoting Rosa, Amado, Mozzer or Anita Prestes.

## Decisions

**D1. Rights live next to the source keys.** `sources.ts` gains
`SOURCE_RIGHTS: Record<SourceKey, { rights: 'public-domain' | 'free-licence'
| 'copyrighted' | 'unknown'; licence?: string; consulted: 'full' | 'partial'
| 'citation-only' | 'not-consulted' }>`. TypeScript makes every key declare
its rights. `SOURCES.md` mirrors the same fields in a "Rights and
consultation register" table (key, rights, licence, consulted), and the
content check compares the two. The prose entries keep their own status
wording. The consultation enum adds `pending` for the sources already marked
"pending" (Lima, Campoi, Carvalho). Only `not-consulted` blocks citation.

Alternative considered: parsing rights out of `SOURCES.md`. That is fragile,
because the file is prose for people to read.

Existing keys default to `copyrighted` and their current status, except
`lima-1931`, which becomes `public-domain`: Moreira Lima died on 5 Sep.
1940, and Brazilian copyright runs for 70 years from the following 1
January.

**D2. Quotations are a typed block, not a paragraph convention.**
`NoteSection` and `ChapterPage` gain an optional
`quote?: { text: string; sourceKey: SourceKey; cite: string; attribution:
string; translated?: boolean }`. It is rendered after the section's
paragraphs. `bookPages.ts` gets a `TextItem` of kind `quote`. It is drawn
indented and in italics, followed by the attribution line, and it is never
split across pages. Each quote is at most about 60 words so that it fits on
one page.

A check (`validateQuotes`) walks every compendium note and chapter page in
both locales and fails when:

- the source key is unknown;
- the source's rights are not free;
- the PT-BR and EN versions disagree on `sourceKey` or `cite`;
- the EN version lacks `translated: true` while the PT-BR version is the
  original.

Alternative considered: quotation marks inside paragraphs. These cannot be
checked, and they would let a Rosa sentence slip in unnoticed.

**D3. The documentary is registered but gated.** `superoitocine-2012` has
`consulted: 'not-consulted'`. The check fails if any entry's `sourceRefs`, or
any chapter's `sourceRefs`, includes a not-consulted key. When the owner
watches it, a later edit changes the status and its material can be used.

**D4. Entry shapes and placement.**

| id | section | date | label | sources | confidence |
| --- | --- | --- | --- | --- | --- |
| `manifesto-porto-nacional-1925` | events | 1925-10-19 | historical | manifesto-1925, macaulay-1974 | high |
| `o-libertador-1924` | events | 1924-11 | historical | libertador-1924, anita-1991, lima-1931 | medium |
| `coluna-no-grande-sertao` | events | 1956 | dramatized | mozzer-2009, rosa-1956 | low |
| `porto-nacional` | places | — | historical | manifesto-1925, macaulay-1974 | high |
| `lourenco-moreira-lima` | figures | — | historical | lima-1931, mozzer-2009, amado-1942 | medium |
| `batalhoes-patrioticos-bahia` | forces | — | historical | anita-1991, mozzer-2009, macaulay-1974 | medium |
| `vivandeiras` | forces | — | historical | historiafm-2024, mozzer-2009, carvalho-2001 | medium |
| `tenentismo` | events | 1922-07-05 | historical | macaulay-1974, historiafm-2024, anita-1991 | high |
| `positivismo-militar` | events | 1889-11-15 | historical | macaulay-1974, historiafm-2024 | high |

The book does not sort entries: it shows them in `BASE` order. So
`positivismo-militar` goes first among the events, and `tenentismo`, which
shares its date with `revolt-1922`, the revolt that began the movement, goes
just before it. The other new events go where their dates fall:
`o-libertador-1924` after `rs-revolt-1924`, `manifesto-porto-nacional-1925`
after `parana-crossing-1925`, and `coluna-no-grande-sertao` last. The prologue links
to `tenentismo`; chapter 4 links to `positivismo-militar`, through Rondon on
the Paraná front. Prestes's note links to both: his father was a positivist,
and he was a tenente who broke with the movement.

`o-libertador-1924` also cites `historiafm-2024`. The `army-coluna` note
gains a section, "Viver da terra" / "Living off the land", sourced to
`historiafm-2024`, `mozzer-2009` and `blanc-2024`. Blanc remains the
authority for civilians and legitimacy, as the social-claim rule requires.
`carvalho-2001` is still "pending". If it has not been read by apply, the
`vivandeiras` entry lists it as a further reading, and the claims rest on
the podcast and Mozzer/Veiga.

`coluna-no-grande-sertao` takes the novel's publication year as its date, so
it sorts after the march in the Events tab. Its note opens with the 1926
passage it remembers. `lourenco-moreira-lima` is a compendium figure only.
He is not added to the playable-figure registry (`figures.ts`), so the
multi-perspective roster is unchanged. Before the new entries are added,
Macaulay will be checked for the date of the manifesto and for Porto
Nacional (ch. VI–VII). If Macaulay does not mention the manifesto, its
`cite` will point to the manifesto alone, and `macaulay-1974` covers only
the passage through Porto Nacional.

**D5. Chapter additions.**

- **Chapter 6** gains a first page, "Porto Nacional", set in October 1925.
  Its prose is the project's own: the column on the Tocantins, fifteen
  months out, saying in writing what it marches for. It carries one `quote`
  of the manifesto, about 50 words: the passage refusing to furl the flag of
  Liberty and asking for a peace grounded in justice. The existing pages
  follow.
- **Chapter 6** gains a short closing passage, "As Balas no Pau", appended
  to "A Próxima Marcha". It paraphrases Riobaldo: years later a farmer
  splitting a tree finds bullets lodged in it. The passage is set in Minas
  and does not claim that Serra Nova was the place.
- **Chapter 8** gains a `quote` in "O Monumento": the opening of Moreira
  Lima's farewell ("Soldados da Liberdade! …"), cut to about 50 words. Its
  source is `lima-1931`, with cite "Lima, *A Coluna Prestes (marchas e
  combates)*, 3rd ed. 1979, p. 523, via Mozzer 2009, p. 257".

The EN versions are the project's translations, marked as translated. The
chapter text headers change to say that the prose is original apart from
attributed quotations of free texts. `docs/campaign/book/06-serra-nova.md`
and `08-la-gaiba.md` are updated first, because they are the authoring
source, and the code follows them.

**D6. The motto.** `menu.campaign.epigraph` becomes "A maior marcha
revolucionária do mundo." in PT-BR and "The greatest revolutionary march in
the world." in EN. In Prestes's extended note the phrase appears inside a
sentence that attributes it to memory ("lembrada como…" / "remembered
as…"). Anita Prestes's more careful wording, "uma das maiores", is cited as
the source of that memory.

**Historical research method.** The tiers are unchanged:

- `manifesto-1925` and `lima-1931` are Tier 2 primary texts.
- `mozzer-2009` is Tier 3, a literary-critical reading.
- `rosa-1956` is fiction, cited only for what the novel says.
- `libertador-1924` is citation-only.
- `historiafm-2024` is Tier 3, an oral synthesis by a historian of the
  column's origin. It was consulted through an auto-transcript, so proper
  names in it (for example the Dominican friar at Porto Nacional) are
  checked against a written source before use. It is never the only source
  for a date.
- The Brasil de Fato and Brasil Cultura pages are finding-level evidence for
  the issue count, recorded in `TIMELINE.md` and not cited as authority.

Every new claim is listed in `CHAPTER_SOURCES.md` under chapters 6 and 8,
and each chapter keeps at least two independent sources.

## Risks / Trade-offs

- **The manifesto's licence rests on the marxists.org notice.** If that
  notice is wrong, the manifesto is still under copyright: its signatories
  died in 1959 (Miguel Costa), 1975 (Juarez Távora) and 1990 (Prestes). In
  that case the fallback is a paraphrase. The `quote` blocks make the switch a
  one-field edit. The rights note in `SOURCES.md` records where the licence
  claim comes from.
- **The eulogy is quoted at second hand.** It comes through Mozzer's
  citation of the 1979 edition, not from a reading of Lima. The `cite` says
  so, and the consultation status stays "partial".
- **Rosa as history.** Mozzer's link is speculative, and he says so ("intuo").
  The `dramatized` label, `low` confidence and the wording "one critic's
  reading" keep the novel from being read as evidence.
- **Page budget.** A quote that never splits could overflow a page. The
  limit of about 60 words and a `bookPages` test with the longest quote
  guard this.
- **The motto overstates.** It is kept as the owner's chosen epigraph, and
  the compendium frames it as memory, so the factual layer stays honest.
