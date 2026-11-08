---
id: la-gaiba
status: draft
playerText: applied
runtimeId: la-gaiba
commanderId: luis-carlos-prestes
perspective: Luís Carlos Prestes and the exiles at La Gaiba, Bolivia, after the march.
historicalDate: 1927-07-05
label: dramatized
sourceRefs:
  - macaulay-1974
  - anita-1991
  - blanc-2024
---

# 08 - La Gaiba

## Pitch

La Gaiba, Bolivia, 5 July 1927. The column is over. The survivors are exiles, and
they dedicate a monument to the march. The player is Prestes among the exiles:
there is no battle, no ground to hold and no enemy to defeat. The mission is an
epilogue of memory, choosing what the column leaves behind and what it refuses to
forget.

Target length: 10-15 minutes, largely narrative, in one sitting.

## Player text

Shown in the campaign book. Keep it in step with the sections above.

### English

**Place:** La Gaiba, Bolivia

**Perspective:** Luís Carlos Prestes and the exiles at La Gaiba, after the march.

**Briefing:**

La Gaiba, July 1927. The march is over. The exiles are here to dedicate a
monument. Prestes tells them what the column was and what it was not.

**Objectives:**

- Reach La Gaiba.
- Dedicate the monument.
- Choose what the column leaves behind.

### Português (BR)

**Lugar:** La Gaiba, Bolívia

**Perspectiva:** Luís Carlos Prestes e os exilados em La Gaiba, depois da marcha.

**Briefing:**

La Gaiba, julho de 1927. A marcha acabou. Os exilados estão aqui para
inaugurar um monumento. Prestes lhes diz o que a coluna foi e o que não foi.

**Objetivos:**

- Chegar a La Gaiba.
- Inaugurar o monumento.
- Escolher o que a coluna deixa para trás.

## Historical frame

The exiles built a small monument at La Gaiba, Bolivia: a block of granite
inscribed “Glory to the Bandeirantes of Freedom, 1924–1927” (Blanc, ch. 7, fig.
7.5). The column had crossed the Pantanal and entered Paraguay and Bolivia; the
march dissolved into exile. Macaulay covers the road to exile in ch. IX,
pp. 230–234, but does not mention La Gaiba. The monument is confirmed by Blanc;
the 5 July 1927 dedication date remains a secondary tradition. The mission is an
epilogue, not a reconstruction.

### Sources

| Role     | Source key      | Reference                        | Confidence |
| -------- | --------------- | -------------------------------- | ---------- |
| Monument | `blanc-2024`    | ch. 7, fig. 7.5; inscription     | high       |
| Exile    | `cpdoc-coluna`  | La Gaiba–Libres split            | medium     |
| Memoir   | `anita-1991`    | citation-only                    | low        |
| Road     | `macaulay-1974` | ch. IX, pp. 230-234; no La Gaiba | high       |

### Historical, dramatized, fictional

- **Historical:** the column's exile in Bolivia in 1927; the exiles' monument at
  La Gaiba, inscribed “Glory to the Bandeirantes of Freedom, 1924–1927”; the end
  of the march.
- **Dramatized:** the ceremony, the speeches and the choices. The 5 July 1927
  date is a secondary tradition; the mission does not present it as certain.
- **Fictional:** the individual exiles and the exact words.

## Perspective

Luís Carlos Prestes among the exiles. The player sees the end of the campaign
from the losing side: no victory, no surrender, only the memory of the march and
the question of what it meant.

## Player fantasy and pillar

- **Fantasy:** Close the campaign by deciding what the column leaves behind.
- **Pillar:** 3, the march costs more than the battle; 4, history with receipts.
- **Loop beat:** Remember. The mission leaves the Read/Command/Sustain/Decide
  loop and becomes a scene of memory.

## Objectives

### Primary

- Reach La Gaiba.
- Dedicate the monument.
- Choose what the column leaves behind.
- Close the campaign.

### Optional

- Name the dead.
- Preserve the column's records.
- Speak to the exiles.
- Refuse a heroic version of the march.

### Failure

- There is no tactical failure. The scene ends when the player closes it.

## Map and terrain

- La Gaiba, Bolivia, July 1927. A remote border place, a clearing, the monument
  and the exiles. No battle.
- The landscape is the Chaco/Bolivian border: dry ground, scrub, a river or a
  track, and the distance behind it.
- The map is a scene, not a battlefield. It teaches nothing about cover; it asks
  what the march cost.

## Forces

| Side   | Sections | Soldiers | Weapons | Notes                       |
| ------ | -------- | -------- | ------- | --------------------------- |
| Player | None     | None     | None    | Prestes and the exiles      |
| Enemy  | None     | None     | None    | No enemy; the march is over |

The mission has no combat. Do not add a token enemy.

## Mechanics

### Existing

- Pause, speed and the HUD.
- The codex and the compendium.
- The campaign's narrative text.

### Requires new capability

- A narrative epilogue or choice scene is not implemented.
- Campaign progression and save/load are not implemented.
- A non-combat mission needs its own objective and scene structure; do not fake
  it with a battle.

## Beats

### Briefing

La Gaiba, July 1927. The march is over. The exiles are here to dedicate a
monument. Prestes tells them what the column was and what it was not.

### Opening

The clearing. The monument. The exiles arrive. The player chooses who speaks and
what is remembered.

### Mid-mission

The memories of the march: the dead, the towns, the river crossings, the men who
left. The player chooses what the monument says and what it leaves out.

### Climax

The dedication. The player chooses the column's legacy: a heroic memory, a
critical record, or a silence.

### Debrief

The campaign ends. The column is memory. The codex records the march and the
exile. There is no victory screen.

## Texts

- Campaign book chapter: [`../book/08-la-gaiba.md`](../book/08-la-gaiba.md).
- Compendium entry: [`../compendium/entries/la-gaiba.md`](../compendium/entries/la-gaiba.md).

## Script

| Key                          | EN (source)                                                                                                                                                                     | PT-BR                                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `campaign.la-gaiba.briefing` | La Gaiba, July 1927. The march is over. We are here to dedicate a monument. The column was not a victory. It was a march.                                                       | La Gaiba, julho de 1927. A marcha acabou. Estamos aqui para dedicar um monumento. A coluna não foi uma vitória. Foi uma marcha.                                                  |
| `campaign.la-gaiba.opening`  | The clearing, the stone and the exiles. What do we remember?                                                                                                                    | A clareira, a pedra e os exilados. O que lembramos?                                                                                                                              |
| `campaign.la-gaiba.mid`      | The dead, the towns, the rivers. The monument can hold only so much. Choose.                                                                                                    | Os mortos, as cidades, os rios. O monumento só pode guardar tanta coisa. Escolham.                                                                                               |
| `campaign.la-gaiba.climax`   | The dedication. We can make a heroic memory, a critical record, or a silence.                                                                                                   | A dedicação. Podemos fazer uma memória heroica, um registro crítico ou um silêncio.                                                                                              |
| `campaign.la-gaiba.success`  | The monument is dedicated. The column is memory. The campaign ends here.                                                                                                        | O monumento está dedicado. A coluna é memória. A campanha termina aqui.                                                                                                          |
| `campaign.la-gaiba.failure`  | There is no failure here. The march ended before the monument.                                                                                                                  | Não há fracasso aqui. A marcha terminou antes do monumento.                                                                                                                      |
| `campaign.la-gaiba.epilogue` | The exiles built a monument at La Gaiba, Bolivia: “Glory to the Bandeirantes of Freedom, 1924–1927.” The column had crossed the Pantanal and entered exile. The march was over. | Os exilados ergueram um monumento em La Gaiba, na Bolívia: “Glória aos Bandeirantes da Liberdade, 1924–1927.” A coluna cruzara o Pantanal e entrara no exílio. A marcha acabara. |

## Codex unlocks

- Figure: [`luis-carlos-prestes`](../compendium/entries/luis-carlos-prestes.md).
- Place: [`la-gaiba`](../compendium/entries/la-gaiba.md).
- Correction: the campaign ends in exile, not victory.

## Victory and defeat

- There is no victory and no defeat. The campaign ends with the dedication and
  the player's choice of memory.
- The debrief must not show a victory screen. It shows the monument, the exiles
  and the record.

## Out of scope

- Combat, artillery, cavalry and machine guns.
- The full march and the Pantanal crossing; they belong to missions 06 and 07.
- A full historical reconstruction of La Gaiba; the date and monument are
  low-confidence.
- Campaign progression, save/load and between-mission UI.

## Open questions

- The monument is sourced to Blanc, ch. 7 and fig. 7.5; the inscription is
  “Glory to the Bandeirantes of Freedom, 1924–1927.” Macaulay does not mention
  La Gaiba.
- Is the 5 July 1927 dedication date confirmed by a primary source? The date is
  still a secondary tradition.
- Who were the exiles present, and what happened to the monument?
- Which 1927 photograph of La Gaiba, the monument or the exiles exists?
- What is the non-combat epilogue capability, and when will it be built?
