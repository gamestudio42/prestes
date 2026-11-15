# Mission cards: text review (complete-books-and-bibliography, task 4.4)

This review compares the narrative cards, descriptions and epilogues in the authored
maps (`packages/shared/src/maps/authored/*.map.json`) with the rewritten campaign
book (`packages/content/src/campaign/text/`) and its sources. The change does not
edit the maps, so every finding below is a recommendation for whoever edits the
map next (the map editor, or the session that owns the maps). The EN text was
reviewed; each PT-BR card is a translation of its EN card and needs the same fix.

Status key: **fix** means the card contradicts a source; **align** means the card
is correct but says less than the book, or says it differently; **ok** means no change.

## Findings

| Map | Card | Status | Finding | Proposed text (EN / PT-BR) | Source |
| --- | --- | --- | --- | --- | --- |
| pantanal | `description`, `events.0` (opening card) | **fix** | Both say "February 1927". The column entered the Pantanal on 10 January 1927 and crossed into Bolivia on 3 February. | "January 1927: …" / "Janeiro de 1927: …"; "The Pantanal, January 1927." / "O Pantanal, janeiro de 1927." | Blanc 2024, p. 127; Macaulay 1974, p. 234 |
| la-gaiba | `events.0`, `epilogue` | **fix** | Both say the 5 July 1927 date is "a secondary tradition" that the game "does not present as certain". The Correio da Manhã of 22 July 1927 (p. 5) printed Moreira Lima's speech at the monument's inauguration on 5 July. | Drop the hedge: "On 5 July 1927, the anniversary of the 1922 and 1924 risings, …" / "Em 5 de julho de 1927, aniversário dos levantes de 1922 e 1924, …" | Blanc 2024, p. 142 |
| la-gaiba | `events.0` | **align** | "The exiles work at the sawmill, on the roads". Blanc names a road cut through the forest and warehouses for the Bolivian Concessions company, not a sawmill. | "The exiles cut a road through the forest and build warehouses for the English company" / "Os exilados abrem uma estrada na mata e constroem armazéns para a companhia inglesa" | Blanc 2024, p. 132 |
| la-gaiba | `events.2` (inscription) | **align** | The card prints the inscription in English capitals. The Portuguese wording of the granite is not in the sources consulted; the book marks its PT version as a retranslation. | Keep the EN; in PT add "(retradução do inglês)". | Blanc 2024, fig. 7.5 |
| sao-luiz-ramada | `events.0` | **align** | "the papers already call it the Iron Ring": no paper is cited for the name. The book says the government called it a ring. | "the government already calls it a ring" / "o governo já fala em anel" | Blanc 2024, p. 37 |
| sao-luiz-ramada | `events.6` | **align** | "crossed later that month" can be dated. | "…and crossed between 25 and 31 January." / "…e atravessou entre 25 e 31 de janeiro." | Blanc 2024, p. 41 |
| ponte-de-verdinho | `epilogue` | **align** | "The column gained a day's march." Klinger's lorries were in Mineiros by 7 a.m. on the 29th and caught Djalma Dutra's rearguard at midday. | "The column gained a night." / "A coluna ganhou uma noite." | Macaulay 1974, pp. 123–124 |
| catanduvas | all | **ok** | Dates (26–29 March 1925), the 407 who surrendered, and Estilac Leal with two officers match the book. | n/a | Macaulay 1974, p. 85 |
| copacabana | all | **ok** | The 29 / 28 / 16 / 7 figures and the survivors match the book. | n/a | Macaulay 1974, pp. 26–29 |
| porto-mendes | all | **ok** | 3 and 14 April, 27–29 April, 1,500 men, 600 animals, three 75 mm guns. | n/a | Macaulay 1974, pp. 86–89 |
| serra-nova | all | **ok** | 22 April, Horácio de Matos and Abílio Wolney, Taiobeiras on the 26th. | n/a | Macaulay 1974, pp. 220–221 |

## Outside the campaign

`paiolzinho` and `campo-de-provas` are the owner's skirmish and test maps. The only
finding is a typo in `paiolzinho.description`: "Litle" should be "Little". That
map belongs to the owner, so the typo is reported here and left unchanged.
