## 1. Sources and rules

- [x] 1.1 `docs/history/SOURCES.md`: register `manifesto-1925`, `libertador-1924`, `mozzer-2009`, `rosa-1956`, `historiafm-2024` and `superoitocine-2012`, each with tier, a "Status:" line (full / partial / citation-only / not consulted) and a "Rights:" line. Mark `lima-1931` public domain (author died 1940). Record where the manifesto's GNU FDL claim comes from, and the finding-level pages for *O Libertador*. Verify: `pnpm check:content` fails until the keys are in `SOURCE_KEYS`, then passes
- [x] 1.2 `packages/content/src/sources.ts`: add the new keys and `SOURCE_RIGHTS` (D1) for every key. Verify with a unit test that every key has rights and status, and that `check:content` compares them with the "Rights:" and "Status:" lines of `SOURCES.md`
- [x] 1.3 `docs/history/TIMELINE.md`: log the divergences on *O Libertador* (nine against ten issues; the first issue in November or December 1924) on the march (thirteen against fifteen states), and on the column's start (São Luiz Gonzaga, 27 Dec. 1924, against Paraná, April 1925, with Macaulay as the baseline). `CHAPTER_SOURCES.md`: add the new claims under chapters 6 and 8. Check Macaulay ch. VI–VII for the manifesto and for Porto Nacional, and record what he says or that he does not mention it (D4). Verify: the matrices for chapters 6 and 8 each list at least two independent sources

## 2. Quotation path

- [x] 2.1 `quote` on `NoteSection` and `ChapterPage` (D2), plus `validateQuotes`: unknown key, non-free rights, locale mismatch, missing `translated`. Also fail when a not-consulted source is cited by any entry or chapter (D3). Verify with unit tests of each failure on fixtures, plus `pnpm check:content`
- [x] 2.2 `bookPages.ts` and the book components: a `quote` text item, indented and italic, followed by its attribution line and never split across pages. Verify with a `bookPages` unit test using the longest quote, and with the book overflow e2e at 1440 x 900 and 1280 x 720 in EN and PT-BR

## 3. Compendium

- [x] 3.1 Write the entry docs in `docs/campaign/compendium/entries/` for the nine entries of D4, working from `research-notes.md`. Check the podcast's proper names against a written source first, in EN and PT-BR. Paraphrase Mozzer, Rosa, Amado and Anita. Quote only the manifesto (`manifesto-porto-nacional-1925`) and Lima's eulogy (`lourenco-moreira-lima`). Verify: the owner reads and approves the drafts before they go into code; the approval is recorded in `docs/status.md`
- [x] 3.2 Import the nine entries into `compendium.ts`, `compendium-notes/{en,pt-BR}.ts` and the locale titles and bodies, with labels, confidence and cites as in D4. Verify with `pnpm check:content`, `pnpm check:locales`, and a unit test that the nine ids exist and that `coluna-no-grande-sertao` is `dramatized` and has no `quote`
- [x] 3.3 Enrich the `army-coluna` note with a section, "Viver da terra" / "Living off the land". It covers requisitions and their cost to the poor, punished abuses and government looting, tax books and prisoners freed, the real strength against rumour, and the Black rank and file with no count. Its sources are `historiafm-2024`, `mozzer-2009` and `blanc-2024`, and it is drafted in the entry doc first. Verify with a unit test that the note cites those sources and contains no number of Black soldiers, plus `pnpm check:content`
- [x] 3.4 Enrich two existing notes. Luís Carlos Prestes's note gains the march remembered as "a maior marcha revolucionária do mundo", framed as memory (D6), with the doc entry `luis-carlos-prestes.md` updated first. Serra Nova's note gains the patriotic battalions and links to `batalhoes-patrioticos-bahia`. Verify with a unit test that the PT-BR Prestes note contains the phrase after "lembrada", plus `pnpm check:content`

## 4. Campaign book

- [x] 4.1 `docs/campaign/book/06-serra-nova.md`: the "Porto Nacional" opening page with the manifesto quote, and the closing paraphrase of the bullets found in a tree (D5). Then `campaign/text/{en,pt-BR}.ts`, `chapters.ts` (sources `manifesto-1925` and `mozzer-2009`; links to the three entries; and the prologue link to `tenentismo` and the chapter 4 link to `positivismo-militar`) and the text-header comments. Verify with a unit test that chapter 6's first page heading is Porto Nacional and its date is still `1926-04-22`, plus `pnpm check:content`
- [x] 4.2 `docs/campaign/book/08-la-gaiba.md`: Moreira Lima's farewell as a `quote` in "O Monumento". Then the chapter text, with `lima-1931` among the sources and a link to `lourenco-moreira-lima`. Verify with a unit test of the quote's source and cite, plus an e2e that opens chapter 8 and finds the attribution line
- [x] 4.3 `menu.campaign.epigraph`: "A maior marcha revolucionária do mundo." / "The greatest revolutionary march in the world." Verify with `pnpm check:locales` and an e2e that reads the epigraph on the title spread in both languages

## 5. Gates

- [x] 5.1 `pnpm verify` and `openspec validate enrich-texts-from-sources --type change --strict`. Verify: all pass, and the result is noted in `docs/status.md` — Done 2026-11-15 under complete-books-and-bibliography 1.2 (`pnpm check` and validate pass).
- [x] 5.2 Hand check by the owner: read the nine entries, the enriched notes and chapters 6 and 8 in both languages in the game. Findings go in `docs/status.md` — Moved to complete-books-and-bibliography 7.2, which reads both books in full.
- [x] 5.3 Placeholder kept on purpose: `superoitocine-2012` stays "not consulted" until the owner watches the documentary or gives notes. No task here claims its content — Kept as a standing note in `docs/history/SOURCES.md` (`superoitocine-2012`: not consulted).
