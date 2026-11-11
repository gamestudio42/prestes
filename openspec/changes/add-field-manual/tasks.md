## 1. Content

- [ ] 1.1 `packages/content/src/manual.ts`: the `MANUAL_PAGES` registry (twelve pages: ids, title and paragraph keys, orders, see-also compendium ids), exported from the package index; verify with a unit test that the ids are unique, the order is the spec's and every see-also id is a compendium entry
- [ ] 1.2 Manual text in EN (source) and PT-BR under `manual.*`, two to four paragraphs per page, describing the game as it is on the day of apply (read the order board, the deployment banner, objectives and garrison behaviour first); verify with `pnpm check:locales`
- [ ] 1.3 Coverage check in `tools/check-content.ts`: every `ORDER_CATALOG` id named by a page, no unknown order on a page; verify with a unit test of both failures on a fixture and `pnpm check:content`
- [ ] 1.4 Campaign page message no longer promises a manual and points to the book, EN and PT-BR; verify with `pnpm check:locales` and the start-screen e2e

## 2. Book

- [ ] 2.1 `bookPages.ts`: Manual pages between the last compendium section and the corrections page, with page numbers; verify with a unit test of the page order
- [ ] 2.2 Contents spread: a "Manual" heading and one line per page that opens it; verify with an e2e that opens "Moving" from the contents
- [ ] 2.3 Manual page layout in `CompendiumBook.tsx`: title, paragraphs, the order list with the board's names and tips, see-also links; verify with an e2e that the Fire page lists attack, suppress and flank with the board's labels, and that the weapons page links to the machine gun's entry
- [ ] 2.4 Overflow and language: the overflow e2e runs over every Manual page at 1440 x 900 and 1280 x 720 in EN and PT-BR, and the language switch keeps the page; verify with `pnpm e2e` on the book specs

## 3. Gates

- [ ] 3.1 `pnpm verify` and `openspec validate add-field-manual --type change --strict`; verify: all pass, bundle sizes recorded in `docs/status.md`
- [ ] 3.2 Hand check by the owner: read the Manual in both languages and play one skirmish from it; findings in `docs/status.md`
