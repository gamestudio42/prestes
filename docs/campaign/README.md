# Campaign Bible

This folder is the design source for the Prestes campaign. It holds the
narrative structure, mission briefs, the campaign book, compendium drafts,
player-facing script drafts and the questions that are still open. It does not
contain executable specifications or game code.

## Relationship to the other sources

- `docs/history/` is the authority for chronology, figures, weapons and
  sources. The campaign cites it and never replaces it.
- `openspec/` is the authority for executable planning. A mission becomes an
  OpenSpec change only after its brief is `locked` here.
- `packages/content/` is runtime content. Campaign drafts must not edit the
  locale catalogs or the figure registry until a change is applied.

## Status

| Status     | Meaning                                         |
| ---------- | ----------------------------------------------- |
| `idea`     | A name and an intention; nothing verified.      |
| `draft`    | Written, but still changing.                    |
| `reviewed` | Checked against sources and the design pillars. |
| `locked`   | Stable enough to become an OpenSpec change.     |

A mission is only as good as its weakest source. `locked` requires at least
two independent sources and a recorded label.

## Rules

1. Write this folder in English. Player-facing strings use English as the
   source language; PT-BR is a translation. A PT-BR scratch draft is allowed
   only when it is clearly marked and translated before it becomes source.
2. Every historical claim cites a source key from
   [`docs/history/SOURCES.md`](../history/SOURCES.md) with page or chapter.
3. Every mission declares its label: `historical`, `dramatized` or `fictional`.
4. Every mission declares its commander. The commander is the historical
   figure who was actually present, not a figure invented for the scene.
5. Do not reproduce book text. Book scans and OCR stay under `livros/`, which
   is gitignored. Amado is a tone reference, not a text source: write original
   prose in that register and cite him.
6. A mission may propose a new mechanic, but must mark it as
   `requires new capability`. Do not describe a future system as if it ships.
7. A certain-defeat mission has no victory condition. State the measure the
   player can influence (time held, delay, casualties) and the scripted
   outcome.
8. The campaign book is `dramatized`; the compendium is `historical`. Do not
   blur the two labels.
9. Every image slot has a type, status, rights and path. No historical photo
   ships without a recorded rights basis; the supplied period photographs are
   public domain by the project owner's determination. Never present a
   generated image as a historical photograph.
10. Keep one mission per file. Add a row to the mission table in
    [`CAMPAIGN.md`](CAMPAIGN.md) for every file.

## Files

| File                                             | Purpose                                            |
| ------------------------------------------------ | -------------------------------------------------- |
| [`CAMPAIGN.md`](CAMPAIGN.md)                     | Pitch, pillars, loop, act structure, mission list. |
| [`progression.md`](progression.md)               | What carries between missions and what does not.   |
| [`open-questions.md`](open-questions.md)         | Historical gaps, figure approvals, mechanics.      |
| [`missions/_template.md`](missions/_template.md) | The brief every mission starts from.               |
| [`book/`](book/)                                 | Long-form dramatized chapters, EN source + PT-BR.  |
| [`compendium/`](compendium/)                     | Historical entries and image placeholders.         |
| [`compendium/images.md`](compendium/images.md)   | The image, photo and illustration manifest.        |
| [`compendium/IMAGE_SURVEY.md`](compendium/IMAGE_SURVEY.md) | Detailed image audit and candidate list for both books. |

## Campaign book and compendium

- `book/` is player-facing and dramatized. English is the source language;
  PT-BR is the translation. No Amado text is reproduced.
- `compendium/` is historical. Each entry has a short in-game body, an extended
  note, source lines and image slots.
- `compendium/images.md` is the working manifest for historical photos,
  illustrations and maps. It tracks status, rights and the next action.
- The drafts are not runtime content. Apply them to `packages/content` only in
  the campaign change.

## Adding a mission

1. Copy `missions/_template.md` to `missions/<order>-<slug>.md`.
2. Fill the brief. Mark anything unverified as an open question instead of
   inventing it.
3. Write the long-form chapter in `book/<order>-<slug>.md`, in English and
   PT-BR.
4. Add or update the compendium entries in `compendium/entries/`. Add every new
   image slot to `compendium/images.md`.
5. Add the row to the mission table in `CAMPAIGN.md`.
6. Add source gaps to `open-questions.md`. When a mission is `reviewed`, add
   its source rows to
   [`docs/history/CHAPTER_SOURCES.md`](../history/CHAPTER_SOURCES.md).
7. Only after the brief is `locked`, create the OpenSpec change.
