# Historical Figures

The game uses the term **historical figure**, not hero. Playability is a design
role, not a moral judgement.

## Antônio de Siqueira Campos

- **Id:** `siqueira-campos`
- **Role:** Lieutenant; one of the 18 of the Forte de Copacabana; later a column
  leader.
- **Playable:** yes — Prologue commander.
- **Labels:** historical.
- **Sources:** `macaulay-1974`, `helio-1922`, `castro-2022`.
- **Game note:** the Prologue is his, not Prestes'. Prestes was absent with
  typhoid on 4–5 July 1922.

## Luís Carlos Prestes

- **Id:** `luis-carlos-prestes`
- **Role:** Captain; chief of staff of the First Revolutionary Division; the
  column's most visible leader, while Miguel Costa was the formal commander.
- **Playable:** yes — “O Anel de Ferro” commander.
- **Labels:** historical.
- **Sources:** `macaulay-1974`, `blanc-2024`, `amado-1942`, `anita-1991`,
  `cpdoc-prestes`.
- **Game note:** do not erase Miguel Costa's command or reduce the column to one
  man. Amado supplies tone, not chronology.

## Miguel Costa

- **Id:** `miguel-costa`
- **Role:** Major in the São Paulo state militia; formal commander of the First
  Revolutionary Division from April 1925; the column’s political-military
  counterpart to Prestes.
- **Playable:** yes — mission 03, “A Divisão”, on the field (add-historical-commander).
- **Labels:** historical.
- **Sources:** `macaulay-1974`, ch. III, pp. 86–89; `castro-2016`;
  `tavora-1928` (citation-only).
- **Game note:** he is the formal commander; Prestes is chief of staff. He was
  not present at Ramada; the mission keeps him off-stage until the division.

## Isidoro Dias Lopes

- **Id:** `isidoro-dias-lopes`
- **Role:** Retired colonel, promoted general by the São Paulo rebels in 1924;
  overall commander of the São Paulo revolt and the Paraná front, based at Foz
  do Iguaçu.
- **Playable:** yes — mission 04, “A Frente do Paraná”, as the command voice only (add-historical-commander).
- **Labels:** historical.
- **Sources:** `macaulay-1974`, ch. I, pp. 4–6; ch. III, pp. 80–89;
  `castro-2022`.
- **Game note:** he was at Foz, not in the Catanduvas trenches. Estilac Leal’s
  brigade held Catanduvas; the mission must not put Isidoro in the front line.

## Adding figures

Add the entry here, add the id to `packages/content/src/figures.ts`, and make
sure every `sourceRef` exists in `SOURCES.md` and `packages/content/src/sources.ts`.
Every figure here is `playable: true` in the runtime registry: each commands
a campaign map (add-historical-commander), on the field or as a voice.
