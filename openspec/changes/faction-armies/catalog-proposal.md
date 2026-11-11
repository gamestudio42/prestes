# Catalog proposal (task 1.3)

Status: **approved by the owner on 2026-11-11**, with these decisions:

1. The three army names stand.
2. "Fogão" and "Potreada" are the column's rifle section and light group.
3. Among the state forces only the Brigada Militar is a type of its own;
   there is no generic "Milícia estadual".
4. Cangaceiros are a section type of the Patriotic Battalions; the
   hollow-nosed bullets stay out.
5. The column does not start with less ammunition; that waits for a
   difficulty selector, a later change.

Sources are rows of `docs/history/FORCES.md` (Macaulay, book pages). A name
marked *game organization* is not a period term for a unit of that size and
says so in its compendium note.

Names are given in Portuguese, as the roster would show them; the English
catalog keeps the Portuguese term with a gloss in the description.

Values are relative to today's rifle section and use only numbers the
simulation already has. They are a first proposal for the battle report to
test, not a claim about history beyond the "why" column.

## Army names

| Army | Proposed name (PT-BR / EN) | Why |
| --- | --- | --- |
| The player | **Coluna Prestes** / Prestes Column, with "1ª Divisão Revolucionária" in the description | "First Revolutionary Division", soon known to friend and foe as the Prestes Column (p. 113) |
| Enemy regulars | **Forças legalistas** / Legalist forces | Federal army and the state militias together (pp. 71, 90) |
| Enemy irregulars | **Batalhões patrióticos** / Patriotic Battalions | The name the government gave the volunteer units it mustered in (pp. 15, 189) |

## Coluna Prestes

| Today | Proposed type | Men and weapons | Values | Name is | Source / why |
| --- | --- | --- | --- | --- | --- |
| Comando | **Comando do destacamento** | officer (revolver), bugler, 2 riflemen | officer aura as today; limit 1 | period term for the unit it leads ("destacamento"); the four-man group is a game organization | pp. 112–113 |
| Seção de fuzileiros | **Fogão** | chief + 10 riflemen (Mauser 7 mm) | baseline morale; high cohesion (the men chose their chief) | **period term** | the mess group of "a dozen or so", the column's basic unit (p. 151) |
| Esquadra de 4 | **Meio fogão** | 4 riflemen | as the Fogão | game organization (half a fogão) | p. 151 for the fogão; the split is ours |
| Esquadra de 5 | **Fogão com fuzil-metralhador** | 4 riflemen + automatic rifle | as today; counts toward the automatic-rifle limit | game organization | about four serviceable automatic rifles in the whole column (p. 113), so the limit of two stays |
| Fuzil-metralhador | **Guarnição de fuzil-metralhador** | gunner + 2 loaders | as today | game organization | p. 113 |
| Metralhadora 7 mm | **Peça de metralhadora** | gunner + 3 loaders | as today; limit 1 | game organization ("peça" for a gun and its crew) | four 7 mm machine guns in the column (p. 113) |
| Irregulares | **Potreada** | 5 men, Winchester .44, one with a revolver | faster (1.1 as today), lower ammunition, weaker under fire than a fogão | **period term** | foraging parties of five to fifteen, who also took up Winchesters in Goiás (pp. 111, 151–152). They rode; the game has no horses yet, so they are shown on foot |
| new | **Veteranos gaúchos** | 8 riflemen | higher morale and suppression resistance; standard ammunition | game organization | the Rio Grande men were the core that stayed (pp. 88, 112); the red ribbon on the hat marks them (pp. 44, 52) |

The column was short of ammunition (about 20,000 cartridges for some 1,200
men in June 1925, p. 113); the game does not model it yet (decision 5).

## Forças legalistas

| Proposed type | Men and weapons | Values | Name is | Source / why |
| --- | --- | --- | --- | --- |
| **Comando de companhia** | officer (revolver), bugler, 2 riflemen | officer aura; limit 1 | game organization | — |
| **Infantaria do Exército** | 11 riflemen (Mauser 7 mm) | full ammunition; **lower morale** than a fogão | game organization for the section; the force is the federal army | regulars were unreliable against ex-comrades (pp. 91, 178, 192) |
| **Brigada Militar** | 11 riflemen | full ammunition; baseline morale; good discipline | **period term** for the force (Rio Grande do Sul); the section is a game organization | pp. 48, 58, 82 |
| **Provisórios** | 8 men, Mauser and Winchester mixed | faster; good morale; less ammunition | period term in English ("provisionals"); the Portuguese form is an open question | pp. 48, 55, 81, 178 |
| **Peça de metralhadora** | gunner + 3 loaders | as the column's; limit 1, as in every roster | game organization | Klinger's Mineiro militia had eight machine guns (p. 134) |
| **Guarnição de fuzil-metralhador** | gunner + 2 loaders | as the column's | game organization | assumed from the army's standard arms (`WEAPONS.md`); no page of its own |

## Batalhões patrióticos

| Proposed type | Men and weapons | Values | Name is | Source / why |
| --- | --- | --- | --- | --- |
| **Chefe e capangas** | chief (revolver, Winchester), 3 men with Winchesters | an aura like the officer's, on his own men only; limit 1 | game organization ("capangas" needs a source) | battalions were led by regional bosses, "caudillos" without combat theory (pp. 189, 218, 228) |
| **Jagunços** | 6 men, Winchester .44, one with a revolver | fast; **high suppression resistance in cover**, low cohesion; less ammunition | **period term** ("jagunços") | bands of jagunços operating as Patriotic Battalions, more effective than regulars against the column (pp. 192, 228) |
| **Jagunços com Mauser** | 6 men, Mauser 7 mm | as Jagunços, with the rifle's reach | game organization | federal arms were issued to them (pp. 189, 205) |
| **Voluntários** | 10 men, Mauser 7 mm | full ammunition; **low morale**, break early | period term in English ("volunteers") | the São Paulo battalions of 1924 performed badly in the pursuit (pp. 70–71) |
| **Cangaceiros** | 6 men, Mauser 7 mm, each with a revolver | fast; high morale; good shots; low cohesion; limit 1 | **period term**; their fighting the column is **dramatized** | Lampião and forty-nine men were commissioned into a Patriotic Battalion at Juazeiro in March 1926 and traded their Winchesters for army Mausers, but by Macaulay's account never fought the column (p. 191). The type names no person |

Left out:

- **Hollow-nosed bullets** for the jagunços (p. 228): sourced, but the owner
  left the harsher wound rule out.
- **A generic state militia type**: only the Brigada Militar, whose name the
  source gives.
- **Cavalry and lancers** (the gaúchos of 1924, pp. 52, 54; the federal
  cavalry regiments): the game has no horses.
- **Less ammunition for the column**: waits for a difficulty selector.
