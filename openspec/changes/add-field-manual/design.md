## Context

See proposal.md for the motivation. The compendium book
(`apps/game/src/ui/menu/CompendiumBook.tsx`, paged by `bookPages.ts`) already
has a contents spread, two-page spreads without scrolling, page numbers and
arrow-key turning. Its entries are `CompendiumEntry` records
(`packages/content/src/compendium.ts`) that require sources, a citation and a
confidence, validated by `pnpm check:content`; long text lives in
`compendium-notes/{en,pt-BR}.ts`, short text in the locale catalogs. The
order board's names and tips are locale keys referenced from
`packages/content/src/order-catalog.ts`.

The simulation/presentation boundary, the deterministic kernel and the
low-poly pipeline are not touched: this change is content and menu only. The
content schema gains one registry (D1). No historical research is needed and
the figure roster is unchanged.

## Goals / Non-Goals

**Goals:**

- Reuse the book's paging, so the Manual costs no new layout code.
- One place for each fact: order names and tips come from the order catalog's
  keys, not from manual prose.
- A check that fails when the manual and the order catalog drift apart.

**Non-Goals:**

- A manual reachable from inside a battle (the in-battle codex was removed;
  bringing a panel back is a separate decision).
- Plates or diagrams.

## Decisions

**D1. A separate registry, not a compendium section.** `MANUAL_PAGES` in
`packages/content/src/manual.ts`: an id, a title key, paragraph keys, the
orders the page covers and "see also" compendium ids. Making `manual` a
`CompendiumSection` was considered and rejected: every compendium entry must
carry sources and a confidence, and the "Compendium sections" requirement
fixes four sourced sections; manual pages are game rules and would need
exemptions throughout the validation.

**D2. Text in the locale catalogs.** Manual paragraphs are short (two to four
per page, about 60 words each), so they go in `locales/{en,pt-BR}.ts` under
`manual.<page>.title` and `manual.<page>.p1` to `p4`, where `check:locales`
already compares the key sets. The compendium's long-note files were
considered; they exist to keep long history text out of the catalogs and
have no key-set check of their own.

**D3. The book pages the Manual as it pages entries.** `bookPages.ts` gets
the Manual pages between the last section and the corrections page, and the
contents spread gets a "Manual" heading with one line per page. Each manual
page is one book page: title, paragraphs, then the order list (name and tip
from the `ORDER_CATALOG` keys), then "see also" links that reuse the
compendium's related-entry links.

**D4. Coverage check in `tools/check-content.ts`.** The union of every
page's orders must equal the ids of `ORDER_CATALOG`; unknown ids and
uncovered orders are reported by name. A unit test covers both failures with
a fixture.

**D5. Keys shown as text.** The keys page lists the bindings in prose from
the locale catalog. If apply finds a single binding table in the app, the
page reads from it instead; if the bindings are spread over handlers, the
prose stays. Either way the spec is unchanged.

## Risks / Trade-offs

- [Text goes stale when a rule changes] → the order coverage check catches
  order changes; other rules (deployment, objectives) rely on the hand check
  and on each later change's tasks naming the manual page it affects.
- [Twelve pages overflow at 1280 x 720 in PT-BR, which runs longer] → the
  existing overflow e2e runs over the manual pages in both locales; a page
  that overflows is trimmed at apply.
- [Index bundle grows] → about twelve pages of text in two locales, a few
  KB; the index budget has room (604 KB of 680 KB on 2026-11-11).
