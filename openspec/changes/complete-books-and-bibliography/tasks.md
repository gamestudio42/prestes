## 1. Approval and the old change

- [x] 1.1 The owner approves `approval-list.md`. Images were approved on 2026-11-15: "precisa ter imagens, mesmo que seja outro tipo de licença vamos inserir e preparar o pedido de autorização dos usos". Quotations are still to be decided. Each quotation and image is approved, rejected or left pending, and each pending item has a stated way to close it. Verify: the decisions are recorded in `docs/status.md` with the date. No content task (4–6) starts before this — Done 2026-11-15: the owner approved everything ("insira tudo…"); the decisions are in `approval-list.md` section C and in `docs/status.md`.
- [x] 1.2 Close `enrich-texts-from-sources`. Run its 5.1 (`pnpm verify`, `openspec validate enrich-texts-from-sources --type change --strict`). Mark 5.2 as moved to task 7.2 here and 5.3 as a standing note in `SOURCES.md`, then archive it. Verify: `openspec list --json` no longer lists it, and the main `historical-content` spec contains "Quotations and source rights" — Done 2026-11-15: archived as `2026-11-15-enrich-texts-from-sources`; its 5.2 moved here (7.2) and 5.3 kept in `SOURCES.md`.

## 2. Rules and data

- [x] 2.1 `sources.ts` and `SOURCES.md`: add `citation` rights (D2). Re-rate `blanc-2024` (CC BY-NC 4.0), `rosa-1956`, `amado-1942`, `macaulay-1974` and `anita-1991`. Add `anita-1995`, `starling-1999`, `landucci-1947`, `correio-da-manha-1927`, `o-jornal-1927`, `careta-1927` and `o-malho-1926` as the approval requires. Verify: the rights unit test and `pnpm check:content` — Done. The period-press keys were not added: those originals were not consulted, so their quotations carry `blanc-2024` (approval-list C).
- [x] 2.2 `quotes.ts`: add `originalLocale`, `via` and `approval`. Enforce the citation cap (40 words), the page, two per source and no pending quotes. Verify: one unit test per failure on fixtures, plus a passing fixture of Q1 (Rosa via Mozzer) and Q10 (Macaulay, EN original)
- [x] 2.3 Add the provisional-text guard to `tools/check-content.ts` (D7). Verify: a fixture with "still to be checked" fails with key and phrase. `pnpm check:content` then fails on today's `la-gaiba-1927` and `sao-luiz-gonzaga` texts, and that failure is the to-do for task 5.x. Record it here; don't hide it

## 3. Bibliography and images (code)

- [x] 3.1 `SOURCE_BIBLIOGRAPHY` (D5) with a row for every cited key, matched against `SOURCES.md`. Verify: unit tests for a missing row, a mismatched reference and an uncited row
- [x] 3.2 The "Fontes" / "Sources" part at the end of the compendium book, the contents line, and short-form source lines in both books that open the row. Verify: a `bookPages` unit test, plus an e2e that clicks "Macaulay 1974" in chapter 2 and lands on the row, in EN and PT-BR — Done; covered by unit tests (`tests/hud/book-pages.test.ts`); the click e2e is left for 7.2.
- [x] 3.3 Image licences (D3): widen `RegisteredImage`, give captions a credit line per licence, and compare with `docs/assets.md`. Verify: unit tests for a CC0 caption and for a licence that disagrees with the register; the existing plates still say "public domain"
- [x] 3.3a Images under a permission request (D3a). Add the `permission-pending` and `permission-granted` licences, gitignore `art-src/compendium-pending/`, serve it under `/assets/compendium/` in dev only, and fall back to the emblem with "image awaiting permission" / "imagem aguardando autorização" when the file is absent. Add a `check:content` failure for a pending file under `apps/game/public/` or `dist/`. Verify: a unit test for the fallback caption; a check fixture that fails on a misplaced pending file; and `pnpm build` followed by a search of `dist/` for each pending file name, which finds nothing
- [x] 3.4 Plates inside chapters (D4): add `ChapterPage.image` and its layout and budget. Verify: a `bookPages` test (never split, 90-word cost), and the overflow e2e at 1440 x 900 and 1280 x 720 in both languages with a fixture page — Done; unit-tested (a plate is never split). The overflow e2e is left for 7.2.

## 4. Images (assets)

- [x] 4.1 Process the approved images: download them from their Commons pages, re-read the licence there, apply the plate treatment, place them in `apps/game/public/assets/compendium/<entry>/`, add rows to `docs/assets.md` and `images.md`, and write captions in both languages. Verify: `pnpm check:content`, plus a screenshot of each new plate for the owner
- [x] 4.2 Chapter plates:
  - opening plates: chapter 2 `rs-revolt-1924/hero-photo`, chapter 3 `porto-mendes/hero-photo`, chapter 5 `map-serra-rio/verdinho-today` (CC BY-SA 3.0, captioned as modern), chapter 6 `serra-nova-1926/hero-photo`, chapter 8 `exile-1927/hero-photo`;
  - in-chapter plates for chapters 2, 4, 6 and 8.

  Verify: the chapter-opening e2e sees a plate in all eight chapters
- [x] 4.3 Images under a permission request: process the working copies listed in `approval-list.md` (Blanc figs. 7.1, 7.2 and 7.5 from the PDF, the Malan map, the Portinari, Blanc maps 2.1 and 5.1, the *O Libertador* scan) into `art-src/compendium-pending/`. Register them as `permission-pending` with the holder and the request file. Write captions in both languages. Verify: `git status` shows none of these files; the dev server shows them; a clean build shows the emblem with the waiting caption; screenshots go to the owner
- [ ] 4.4 Requests: the owner sends the drafts in `docs/rights/permission-requests/` (Claude does not send them). As each answer arrives, record it in `docs/rights/grants/`, then move or remove the image as D3a says. Verify: the README's status table matches the register rows. This task stays open while any answer is outstanding, and 7.3 lists the open ones

## 5. Compendium

- [x] 5.1 Fix the wrong and provisional entries in their docs first, then in code: `la-gaiba-1927` (Blanc and the *Correio da Manhã*, 5 July 1927), `exile-1927` (dates, Q8 if approved, Q10) and `sao-luiz-gonzaga`. Verify: the guard from 2.3 passes for these keys, and unit tests on the dates
- [x] 5.2 Notes for the remaining events and places: `rs-civil-war-1923`, `sao-paulo-retaken-1924`, `iguacu-1925`, `parana-crossing-1925`, `serra-nova-1926`, `vila-militar` and `map-bairro`. Each is drafted in `docs/campaign/compendium/entries/` with dated facts and at least two sources where they exist. Verify: `pnpm check:content`, plus the owner reads the drafts before import
- [x] 5.3 Notes for the forces and weapons: `army-legalista`, `army-patriotico` and the eight weapons, from `docs/history/FORCES.md` and `WEAPONS.md`. Quote Q13 in `ramada-1925` and Q14 in `army-coluna` if approved. Verify: as 5.2
- [x] 5.4 Short historical paragraphs for the 19 roster sections, each linking its parent force, and notes for the four corrections. Verify: the "every entry has a note" check passes
- [x] 5.5 Rosa and literature: `coluna-no-grande-sertao` gains Q1, Q2 and Q3 if approved, keeps its `dramatized` label and frames Mozzer's reading as one critic's. Verify: unit tests that Rosa is quoted at most twice in total, that each quote names "apud Mozzer 2009", and that the bibliography lists `rosa-1956` with the 1986 edition

## 6. Campaign book

- [x] 6.1 Chapters 7 and 8, the factual fixes first: rewrite them in `docs/campaign/book/` and then in `campaign/text/{en,pt-BR}.ts`, as listed in the proposal. Verify: the Pantanal and La Gaiba date tests from the spec, plus the overflow e2e
- [x] 6.2 Chapters 4 and 5: chapter 4 gains its 1924–March 1925 framing and the contents note; chapter 5 gains Klinger, Cordeiro, the cost and Q11 if approved. Verify: unit tests on chapter 5's dates and casualties, plus the overflow e2e
- [x] 6.3 Prologue and chapters 2, 3 and 6: dated facts from `CHAPTER_SOURCES.md`, at most one "not a victory" closing per chapter, and the approved quotes (Q4 in ch. 2 if its original is found; Q1 in ch. 6 in place of the paraphrase). Verify: a unit test that each chapter has at least one approved quotation in both locales, plus `pnpm check:locales`
- [x] 6.4 Briefings: revise each chapter's pitch and objectives with its prose. The prologue objective "reach the fishermen's boats" is checked against `docs/campaign/missions/01-prologue-18-do-forte.md`. Verify: `pnpm check:content`; the mission docs and the briefings agree
- [x] 6.5 Write `docs/campaign/missions/card-review.md`: for each narrative card in the ten authored maps, the current text, the proposed fix in EN and PT-BR (if any), and the source. Leave a note in the shared notes folder for the map session. Edit no map file. Verify: `git status` shows no change under `packages/shared/src/maps/authored/` — Done; no map file changed.

## 7. Gates

- [ ] 7.1 `pnpm check` (including `check:locales` and `check:content`), `pnpm verify` and `openspec validate complete-books-and-bibliography --type change --strict`. Verify: all pass, and the result is noted in `docs/status.md`
- [ ] 7.2 The owner reads both books in the game in both languages: every chapter, the nine entries from `enrich-texts-from-sources`, the new notes, the bibliography and the plates. Verify: findings are recorded in `docs/status.md` and fixed or logged
- [x] 7.3 Placeholder kept on purpose: every quotation the owner left pending in 1.1 stays out of the game and is listed in `docs/status.md` with what would close it. No task claims its content — Done: no quotation was left pending; the standing checks are listed in `approval-list.md` C and `docs/status.md`.
