# Compendium Drafts

This folder is the campaign-bible draft of the in-game compendium. It is richer
than the current locale strings: each entry has a short in-game text, an
extended note, source lines and image slots.

Every entry here is applied to the runtime (`status: applied`, `runtimeId`):

- The short body is in `packages/content/src/locales/{en,pt-BR}.ts`.
- The extended note, place and image captions are in
  `packages/content/src/compendium-notes/{en,pt-BR}.ts`.
- The label, confidence, sources and images are in
  `packages/content/src/compendium-docs.ts`.

Edit an entry here and in the runtime together. Register every image in
`docs/assets.md` before it ships; `pnpm check:content` fails otherwise.

## Entry format

Each file under `entries/` uses:

```yaml
---
id: <compendium id>
section: events | figures | places | weapons | corrections
label: historical | dramatized | fictional
confidence: high | medium | low
sourceRefs: [<source key>]
status: draft | reviewed | locked | applied
runtimeId: <compendium id, once applied>
---
```

Then:

- `Short body` - the in-game text, EN source and PT-BR translation, 2-4
  sentences.
- `Extended note` - the player-facing background shown in the compendium book,
  2-4 paragraphs in English.
- `Nota estendida (PT-BR)` - the same note in Portuguese.
- `Design notes` - designer material kept from the draft; not shown to the
  player.
- `Image slots` - one or more slots, each with a type, status, rights, path,
  alt text, caption and a research brief or generation prompt.
- `Player captions` - caption and credit, in both languages, for each shipped
  image slot.
- `Sources` - source keys, page or chapter, confidence.
- `Open questions` - what is still unverified.

## Image slots

Every slot goes in the manifest at [`images.md`](images.md).

| Field     | Values                                                                  |
| --------- | ----------------------------------------------------------------------- |
| `slot`    | kebab-case id, unique inside the entry                                  |
| `type`    | `historical-photo`, `illustration`, `map`, `portrait`, `artifact`       |
| `status`  | `research-needed`, `planned`, `prompted`, `generated`, `approved`       |
| `rights`  | `public-domain`, `public-domain-verify`, `CC-BY-4.0`, `licensed`, `TBD` |
| `path`    | `apps/game/public/assets/compendium/<entry-id>/<slot>.png`              |
| `alt`     | one sentence, describes what is visible, not the interpretation         |
| `caption` | one sentence for the reading page, with the credit when known           |

### Historical photos

- A historical photo is **research**, not generation. Do not generate a fake
  historical photograph and label it as one.
- A period newspaper or document image over 100 years old is public domain when
  the project owner records that basis. Still record the archive, author when
  known, catalogue number and credit line when available.
- Find a public-domain or licensed image, record the institution, the author
  when known, the catalogue number, the source URL and the licence.
- If the rights are not verified, the slot stays `research-needed` and the
  image does not ship.
- Do not crop a copyrighted image into a "new" asset.

### Illustrations and maps

- Original, generated or commissioned. The project owns the result or has a
  licence that allows redistribution.
- Keep the game's visual language: muted sepia and olive, period detail,
  low-poly or pixel-art treatment. The compendium is a pixel book, not a
  photorealistic art book.
- Generated images are illustrations, never presented as historical photos.
- Do not copy the composition of a specific historical photograph.
- Prompts are in English and include a negative prompt.

### Rights and the asset register

- `CC-BY-4.0` is the default for original project illustrations.
- A generated image stays `TBD` until the generator's terms and the project's
  asset policy are checked.
- Before shipping, add the asset to `docs/assets.md` with path, author/source,
  licence and notes.
- The compendium's existing cover photograph is already registered; new
  historical photos follow the same rule.

## Labels and sources

- The compendium is **historical**. The campaign book is **dramatized**.
- Every entry declares a label and at least one source key.
- Amado is a tone reference, not a factual source. No Amado text is reproduced.
- When the legend and the record differ, state both: the legend is what people
  remember; the record is what the source supports.

## Applying an entry

1. Check the id exists in `packages/content/src/compendium.ts`. For a proposed
   entry, first add the id there and in the locale catalogs in the campaign
   change.
2. Copy the short body into the EN and PT-BR locale catalogs.
3. Add or update the entry's title, if needed.
4. Add the image to `apps/game/public/assets/compendium/<entry-id>/` and to
   `docs/assets.md`.
5. Run `pnpm check:locales`, `pnpm check:content` and `pnpm check`.
6. Update the mission's codex unlock link if the entry is new.

## Entries

| Entry                                                   | Section     | Label      | Image slots |
| ------------------------------------------------------- | ----------- | ---------- | ----------- |
| [`revolt-1922`](entries/revolt-1922.md)                 | events      | historical | 3           |
| [`rs-revolt-1924`](entries/rs-revolt-1924.md)           | events      | historical | 1           |
| [`sao-luiz-1924`](entries/sao-luiz-1924.md)             | events      | historical | 1           |
| [`ramada-1925`](entries/ramada-1925.md)                 | events      | historical | 1           |
| [`sao-paulo-1924`](entries/sao-paulo-1924.md)           | events      | historical | 1           |
| [`forte-copacabana`](entries/forte-copacabana.md)       | places      | historical | 4           |
| [`sao-luiz-gonzaga`](entries/sao-luiz-gonzaga.md)       | places      | historical | 1           |
| [`foz-do-iguacu`](entries/foz-do-iguacu.md)             | places      | historical | 2           |
| [`porto-mendes`](entries/porto-mendes.md)               | places      | historical | 1           |
| [`map-serra-rio`](entries/map-serra-rio.md)             | places      | historical | 1           |
| [`map-fazenda`](entries/map-fazenda.md)                 | places      | historical | 2           |
| [`serra-nova`](entries/serra-nova.md)                   | places      | historical | 1           |
| [`pantanal`](entries/pantanal.md)                       | places      | historical | 1           |
| [`la-gaiba`](entries/la-gaiba.md)                       | places      | historical | 2           |
| [`siqueira-campos`](entries/siqueira-campos.md)         | figures     | historical | 3           |
| [`luis-carlos-prestes`](entries/luis-carlos-prestes.md) | figures     | historical | 4           |
| [`mauser-7mm`](entries/mauser-7mm.md)                   | weapons     | historical | 3           |

## Proposed new entries

These entries do not have a runtime id yet. Keep them out of `packages/content`
until the id is registered and validated.

| Entry                                                 | Section | Label      | Image slots | Note                                                          |
| ----------------------------------------------------- | ------- | ---------- | ----------- | ------------------------------------------------------------- |
| [`miguel-costa`](entries/miguel-costa.md)             | figures | historical | 1           | New id; add to `FIGURES.md`, `compendium.ts` and the locales. |
| [`isidoro-dias-lopes`](entries/isidoro-dias-lopes.md) | figures | historical | 1           | New id; add to `FIGURES.md`, `compendium.ts` and the locales. |

## What not to do

- Do not ship a placeholder as finished art.
- Do not use a copyrighted photo without a licence.
- Do not present a generated illustration as a historical photograph.
- Do not reproduce book text.
- Do not apply a proposed entry to the runtime before its id is registered and
  validated.
