# Image survey for the campaign book and the compendium

> **Status:** research report. No asset, caption, registry or code was changed.
> Date: 2026-11-12. Scope: the eight campaign chapters and the 66 runtime
> compendium entries. Rights are a starting point, not a clearance: verify every
> image against the institution, author, catalogue number, source URL and licence
> before it ships.

This survey answers three questions:

1. What images does the game already have, and where do they appear?
2. Which public-domain images can be added now, and to which chapter or entry?
3. Where must the books use a modern map or an original illustration instead of a
   photograph that does not exist?

The working manifest remains [`images.md`](images.md). The asset register remains
[`docs/assets.md`](../../assets.md). This file is the audit and candidate list
between the two.

## 1. Current numbers

| Area | Total | With images | Without images |
| --- | ---: | ---: | ---: |
| Campaign chapters | 8 | 4 | 4 |
| Compendium entries | 66 | 8 | 58 |

- The campaign book shows **one plate per chapter**, on the chapter's opening
  spread. It cannot show a second plate inside the chapter today.
- The compendium shows **the first image as the opening plate** and can use
  further images on continuation spreads. Multiple images per entry are already
  supported by [`bookPages.ts`](../../../apps/game/src/ui/menu/bookPages.ts).
- The runtime image register currently accepts **public-domain only**
  (`RegisteredImage.licence` is `'public-domain'`). Original illustrations marked
  CC-BY-4.0 need a code change before they can render with the correct licence.
- The book plate caption always appends the localized "public domain" line. A
  CC-BY-4.0 or CC-BY-SA image would be mislabelled until that changes.

## 2. Campaign chapters

| # | Chapter | Current plate | Recommended plate | Candidate | Rights | Note |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Os Dezoito do Forte | `revolt-1922/hero-photo` | `siqueira-campos/portrait` or a new `revolt-1922/group-1922` | Os 18 do Forte (cropped) | public domain | The book markdown shows `beach-illustration`, but the runtime uses `hero-photo`; align them. |
| 02 | O Anel de Ferro | none | new `rs-revolt-1924/hero-photo` or `sao-luiz-1924/hero-photo` | Saída dos rebeldes de Santo Ângelo | public domain | Shows the 1st Railway Battalion leaving Santo Ângelo for São Luiz Gonzaga, 1924. |
| 03 | A Divisão | `foz-do-iguacu/group-photo` | new `porto-mendes/hero-photo` | Porto Mendes ocupado pelo 10º BC | public domain | The current plate is a Foz group portrait, not the Porto Mendes crossing. Keep the group photo in the Foz entry. |
| 04 | A Frente do Paraná | `map-fazenda/hero-photo` | keep | Catanduvas trenches | public domain | Good. Add the Patriotic Battalion photo to the compendium, not the chapter. |
| 05 | A Ponte de Verdinho | none | original map or illustration | no confirmed period photo | CC-BY-4.0 | No public-domain bridge photo found. Use the modern Verdinho photos only as reference. |
| 06 | Serra Nova | none | new `serra-nova-1926/hero-photo` | A Coluna Prestes, O Malho, 25 Sep 1926 | public domain | Period press cover; not a Serra Nova place photo. Caption must say so. |
| 07 | O Pantanal | `luis-carlos-prestes/column-photo` | keep or new `pantanal/map` | Trajeto da Coluna Prestes em Mato Grosso | public domain | The current plate is a command portrait; the map is 1977 and covers May-June 1925, not 1927. |
| 08 | La Gaiba | none | new `exile-1927/hero-photo` | Coluna Miguel Costa-Prestes, last photo, 1927 | public domain | The last photograph of the revolutionary chiefs; strong for the exile, not the monument. |

### Chapter notes

- **01:** `Os 18 do Forte (cropped)` identifies Eduardo Gomes, Siqueira Campos,
  Nílton Prado and Otávio Correia. It is a better opening plate than a generic
  beach photograph, and it also fills the `siqueira-campos` entry.
- **02:** The Santo Ângelo photograph is the best public-domain image of the
  southern rising on the move. It is not Ramada and not the Uruguay crossing;
  the caption must say it shows the column's movement, not the battle.
- **03:** The Thomaz Luiz Reis series is the strongest discovery of this survey:
  Porto Mendes and Foz do Iguaçu under legalist occupation, 1924-1925. Use one
  Porto Mendes photo for the chapter and keep the Foz photos for the Foz entry.
- **04:** Keep the Catanduvas trench photograph. The new `134` photo of the
  Geraldo Rocha Patriotic Battalion in the trenches belongs in the forces and
  place entries.
- **05:** Do not use a modern Verdinho tourist photo as a 1925 photograph. An
  original map of the bridge, ford and road, or an original low-poly
  illustration, is the honest plate.
- **06:** The O Malho cover is a period image of the column in 1926. It is a
  caricature/press cover, not a photograph of Serra Nova. Use it as atmosphere.
- **07:** The current command portrait is acceptable if the caption says "the
  column's command, not the Pantanal". The 1977 route map is useful as a map
  plate, but it is modern and covers 1925.
- **08:** The last photo of the chiefs (1927) is the best public-domain plate for
  the exile. The 1928 Careta caricature is a strong second image for the
  compendium's exile entry, not the chapter.

## 3. Compendium entries that already have images

| Entry | Images | Files | Note |
| --- | --- | ---: | --- |
| `revolt-1922` | `hero-photo`, `beach-illustration` | 2 | Good coverage; add a newspaper page or the group crop if desired. |
| `forte-copacabana` | `hero-photo`, `fort-plan`, `gate-photo` | 3 | Best-covered entry. |
| `luis-carlos-prestes` | `portrait-1922`, `column-photo` | 2 | Add an exile image and a 1927 group photo if the biography expands. |
| `miguel-costa` | `portrait` | 1 | Add `Isidoro Dias Lopes e Miguel Costa` or the 1927 group photo. |
| `isidoro-dias-lopes` | `portrait` | 1 | Add the Foz do Iguaçu photos or the 1920s group portrait. |
| `sao-paulo-1924` | `hero-photo` | 1 | Many public-domain Prugner photos are available. |
| `foz-do-iguacu` | `hero-photo`, `group-photo` | 2 | Add the legalist occupation photos (173, 174, 176). |
| `map-fazenda` | `hero-photo`, `map` | 2 | Add the `134` Patriotic Battalion photo. |

Total: 8 entries, 14 registered files.

## 4. Quick wins: public-domain candidates ready to process

These are the highest-value, lowest-risk additions. "Use" means the image is a
candidate for the normal plate treatment; it still needs the rights checklist and
a caption in both locales.

| Candidate | Date | Licence | Shows | Best for | Decision |
| --- | --- | --- | --- | --- | --- |
| [Os 18 do Forte (cropped)](https://commons.wikimedia.org/wiki/File:Os_18_do_Forte_(cropped).jpg) | 1922 | Public domain | Eduardo Gomes, Siqueira Campos, Nílton Prado, Otávio Correia | chapter 01; `siqueira-campos` | use |
| [Os 18 do Forte](https://commons.wikimedia.org/wiki/File:Os_18_do_Forte.jpg) | 1922 | Public domain | Full group on the beachfront | `revolt-1922`; chapter 01 alternative | use |
| [Revolta do Forte de Copacabana](https://commons.wikimedia.org/wiki/File:Revolta_do_Forte_de_Copacabana.jpg) | 1922 | CC0 | Atmospheric group image | `tenentismo`; `revolt-1922` | use |
| [Gazeta de Notícias, 6 July 1922](https://commons.wikimedia.org/wiki/File:Gazeta_de_Not%C3%ADcias_6_de_julho_de_1922.jpg) | 1922 | Public domain | Newspaper page; wounded by artillery | `revolt-1922`; `tenentismo` | use |
| [Mapa Vila Militar 1922](https://commons.wikimedia.org/wiki/File:Mapa_Vila_Militar_1922.jpg) | 1922 | Public domain | Vila Militar and surroundings | `vila-militar`; `tenentismo` | use |
| [Saída dos rebeldes de Santo Ângelo](https://commons.wikimedia.org/wiki/File:Sa%C3%ADda_dos_rebeldes_de_Santo_%C3%82ngelo.jpg) | 1924 | Public domain | 1st Railway Battalion leaving for São Luiz Gonzaga | chapter 02; `rs-revolt-1924`; `sao-luiz-1924` | use |
| [Brigada Militar do Rio Grande do Sul em São Paulo](https://commons.wikimedia.org/wiki/File:Brigada_Militar_do_Rio_Grande_do_Sul_em_S%C3%A3o_Paulo.jpg) | 1924 | Public domain | Brigada Militar contingent, O Malho | `army-legalista`; `section-brigada-militar` | use |
| [134 - Batalhão Patriótico Geraldo Rocha](https://commons.wikimedia.org/wiki/File:134_Comandante_Paes_Leme_e_oficiais_do_Batalh%C3%A3o_Patri%C3%B3tico_Geraldo_Rocha_no_seu_PC_nas_trincheiras_contra_Catanduvas.jpg) | 1924-25 | Public domain | Officers in the trenches before Catanduvas | `army-patriotico`; `batalhoes-patrioticos-bahia`; chapter 04 | use |
| [HMBatalhão Chapada Diamantina](https://commons.wikimedia.org/wiki/File:HMBatalh%C3%A3o_Chapada_Diamantina.jpg) | c.1930 | Public domain | Officers of the Chapada Diamantina battalion | `batalhoes-patrioticos-bahia` | use with caveat |
| [Batalhão de Patriotas em Boa Vista PE](https://commons.wikimedia.org/wiki/File:Batalh%C3%A3o_de_Patriotas_para_combater_a_Coluna-Prestes_em_Boa_Vista_PE.jpg) | 1926 | Public domain | Volunteer battalion raised against the column | chapter 06; `army-patriotico` | use |
| [Em Foz do Iguaçu, durante a ocupação](https://commons.wikimedia.org/wiki/File:174_-_Em_Foz_do_Igua%C3%A7u,_durante_a_ocupa%C3%A7%C3%A3o_pelas_for%C3%A7as_legais.jpg) | 1924-25 | Public domain | Legalist occupation of Foz | `foz-do-iguacu`; chapter 03 alternative | use |
| [Porto Mendes ocupado pelo 10º BC](https://commons.wikimedia.org/wiki/File:186_-_Porto_Mendes_ocupado_pelo_10%C2%BA_BC.jpg) | 1924-25 | Public domain | Porto Mendes under legalist occupation | chapter 03; `porto-mendes` | use |
| [O general Rondon em Porto Mendes](https://commons.wikimedia.org/wiki/File:187_-_O_general_Rondon_visita_o_10%C2%BA_BC_em_Porto_Mendes.jpg) | 1924-25 | Public domain | Rondon visiting the 10th BC | `porto-mendes` | use |
| [A Coluna Prestes, O Malho](https://commons.wikimedia.org/wiki/File:A_Columna_Prestes_(O_Malho_25_de_setembro_de_1926).jpg) | 1926 | Public domain | Period magazine cover/caricature | chapter 06; `serra-nova-1926`; `coluna-no-grande-sertao` | use with caption |
| [Coluna Miguel Costa-Prestes, last photo](https://commons.wikimedia.org/wiki/File:Coluna_Miguel_Costa-Prestes_chefes_revolucion%C3%A1rios.png) | 1927 | Public domain | The last photograph of the revolutionary chiefs | chapter 08; `exile-1927`; `army-coluna` | use |
| [Lourenço Moreira Lima, 1927](https://commons.wikimedia.org/wiki/File:Louren%C3%A7o_Moreira_Lima_1927.png) | 1927 | Public domain | Captain Moreira Lima | `lourenco-moreira-lima` | use |
| [Prestes exilado, Careta, 1928](https://commons.wikimedia.org/wiki/File:Prestes_exilado_caricatura_1928.png) | 1928 | Public domain | Caricature of Prestes in exile | `exile-1927`; chapter 08 alternative | use with caption |
| [Vista satelital de la laguna La Gaiba](https://commons.wikimedia.org/wiki/File:Vista_satelital_de_la_laguna_La_Gaiba_Bolivia_Brasil.png) | modern | Public domain | Satellite view of the lagoon | `la-gaiba` map | use as modern map |
| [SE 21-6 La Gaiba](https://commons.wikimedia.org/wiki/File:SE_21-6_La_Gaiba,_Bolivia;_Brazil_(PDF)_-_PCL_Map_Collection_-_se-21-6-la_gaiba-bolivia-brazil-1994.pdf) | 1994 | Public domain | Topographic sheet | `la-gaiba` map alternative | use as modern map |
| [Trajeto da Coluna Prestes em Mato Grosso](https://commons.wikimedia.org/wiki/File:Trajeto_da_Coluna_Prestes_em_Mato_Grosso.jpg) | 1977 | Public domain | Route map, May-June 1925 | `pantanal`; `exile-1927` | use as modern map |

## 5. Candidate catalog by period

### 5.1 1922 and the prologue

| Candidate | Licence | Use | Decision |
| --- | --- | --- | --- |
| [Os 18 do Forte (cropped)](https://commons.wikimedia.org/wiki/File:Os_18_do_Forte_(cropped).jpg) | public domain | `siqueira-campos/portrait`; chapter 01 | use |
| [Os 18 do Forte](https://commons.wikimedia.org/wiki/File:Os_18_do_Forte.jpg) | public domain | `revolt-1922/group-1922`; chapter 01 alternative | use |
| [Revolta do Forte de Copacabana](https://commons.wikimedia.org/wiki/File:Revolta_do_Forte_de_Copacabana.jpg) | CC0 | `tenentismo/hero-photo` | use |
| [Gazeta de Notícias, 6 July 1922](https://commons.wikimedia.org/wiki/File:Gazeta_de_Not%C3%ADcias_6_de_julho_de_1922.jpg) | public domain | `revolt-1922/press` | use |
| [Gazeta de Notícias, 29 July 1922](https://commons.wikimedia.org/wiki/File:Gazeta_de_Not%C3%ADcias_29_de_julho_de_1922.jpg) | public domain | `revolt-1922/press-2` | use |
| [Mapa Copacabana 1922](https://commons.wikimedia.org/wiki/File:Mapa_Copacabana_1922.jpg) | public domain | `forte-copacabana/fort-plan` | already used |
| [Mapa Vila Militar 1922](https://commons.wikimedia.org/wiki/File:Mapa_Vila_Militar_1922.jpg) | public domain | `vila-militar/map`; `tenentismo/map` | use |
| [Revolução de 1922](https://commons.wikimedia.org/wiki/File:Revolu%C3%A7%C3%A3o_de_1922.png) | public domain | `tenentismo/map` alternative | use |
| [Sala de aula na Escola Militar do Realengo](https://commons.wikimedia.org/wiki/File:Sala_de_aula_na_Escola_Militar_do_Realengo.jpg) | public domain | `positivismo-militar/hero-photo` | use with caveat: 1937, not 1922 |

### 5.2 1924: the south and São Paulo

| Candidate | Licence | Use | Decision |
| --- | --- | --- | --- |
| [Saída dos rebeldes de Santo Ângelo](https://commons.wikimedia.org/wiki/File:Sa%C3%ADda_dos_rebeldes_de_Santo_%C3%82ngelo.jpg) | public domain | chapter 02; `rs-revolt-1924`; `sao-luiz-1924` | use |
| [Revolta no Rio Grande do Sul 1924](https://commons.wikimedia.org/wiki/File:Revolta_no_Rio_Grande_do_Sul_1924.png) | CC BY-SA 4.0 | modern map of the southern rising | reference only |
| [Coluna Prestes de São Luiz a Benjamim](https://commons.wikimedia.org/wiki/File:Coluna_Prestes_de_S%C3%A3o_Luiz_a_Benjamim.png) | CC BY-SA 4.0 | modern map of the early column | reference only |
| [Brigada Militar do Rio Grande do Sul em São Paulo](https://commons.wikimedia.org/wiki/File:Brigada_Militar_do_Rio_Grande_do_Sul_em_S%C3%A3o_Paulo.jpg) | public domain | `army-legalista`; `section-brigada-militar` | use |
| [6th Auxiliary Corps, 48](https://commons.wikimedia.org/wiki/File:48_-_Oficais_e_comandante_tenente-coronel_Edmundo_de_Oliveira,_do_6%C2%BA_Corpo_Auxiliar_da_Pol%C3%ADcia_do_Rio_Grande_do_Sul,_acampados_em_caminho_para_a_frente.jpg) | public domain | `army-legalista`; `section-brigada-militar` | use one of 48/49/59 |
| [6th Auxiliary Corps, 49](https://commons.wikimedia.org/wiki/File:49_-_O_6%C2%BA_Corpo_Auxiliar_da_Pol%C3%ADcia_do_Rio_Grande_do_Sul_marchando_para_a_frente_na_altura_da_serra_da_Esperan%C3%A7a.jpg) | public domain | `army-legalista` | use one of 48/49/59 |
| [6th Auxiliary Corps, 59](https://commons.wikimedia.org/wiki/File:59_-_O_general_Rondon_passa_em_revista_o_6%C2%BA_Corpo_Auxiliar_da_Pol%C3%ADcia_do_Rio_Grande_do_Sul_em_Guarapuava.jpg) | public domain | `army-legalista` | use one of 48/49/59 |
| [Batalhão legalista, Prugner 27](https://commons.wikimedia.org/wiki/File:Batalh%C3%A3o_legalista_-_Efeitos_da_revolu%C3%A7%C3%A3o_em_S%C3%A3o_Paulo_(27).jpg) | public domain | `sao-paulo-retaken-1924` | use |
| [Tropas legalistas, Prugner 20](https://commons.wikimedia.org/wiki/File:Tropas_legalistas_-_Efeitos_da_revolu%C3%A7%C3%A3o_em_S%C3%A3o_Paulo_(20).jpg) | public domain | `sao-paulo-1924`; `sao-paulo-retaken-1924` | use |
| [Aspecto de trincheira, São Paulo](https://commons.wikimedia.org/wiki/File:Aspecto_de_trincheira_durante_a_Revolta_de_1924_em_S%C3%A3o_Paulo.jpg) | public domain | `sao-paulo-1924`; chapter 04 alternative | use |
| [Antiga fortaleza do Carmo](https://commons.wikimedia.org/wiki/File:Antiga_fortaleza_do_Carmo_durante_a_Revolta_de_1924_em_S%C3%A3o_Paulo.jpg) | public domain | `sao-paulo-1924` | use |
| [Estação da Luz, 1924](https://commons.wikimedia.org/wiki/File:Aspecto_da_Esta%C3%A7%C3%A3o_da_Luz_durante_a_Revolta_de_1924.jpg) | public domain | `sao-paulo-1924` | use |
| [Incêndio durante a revolta](https://commons.wikimedia.org/wiki/File:Aspecto_de_inc%C3%AAndio_durante_a_Revolta_de_1924_em_S%C3%A3o_Paulo.jpg) | public domain | `sao-paulo-retaken-1924` | use |
| [Locomotiva durante a revolta](https://commons.wikimedia.org/wiki/File:Locomotiva_durante_a_Revolta_de_1924_em_S%C3%A3o_Paulo.jpg) | public domain | `sao-paulo-1924` | use |
| [Renault FT, São Paulo 1924](https://commons.wikimedia.org/wiki/File:Renault_FT_-_Revolu%C3%A7%C3%A3o_de_1924_em_S%C3%A3o_Paulo1.jpg) | public domain | `sao-paulo-1924`; not the column | use with caveat |
| [HMBatalhão Chapada Diamantina](https://commons.wikimedia.org/wiki/File:HMBatalh%C3%A3o_Chapada_Diamantina.jpg) | public domain | `batalhoes-patrioticos-bahia` | use with caveat: c.1930 |
| [Batalhão de Patriotas, Boa Vista PE](https://commons.wikimedia.org/wiki/File:Batalh%C3%A3o_de_Patriotas_para_combater_a_Coluna-Prestes_em_Boa_Vista_PE.jpg) | public domain | `army-patriotico`; 1926 | use |
| [Jagunços](https://commons.wikimedia.org/wiki/File:Jagun%C3%A7os.jpg) | public domain | `section-jaguncos`; `irregular-arms` | use with caveat: c.1914, Juazeiro |
| [Prisão de jagunços pela cavalaria](https://commons.wikimedia.org/wiki/File:Pris%C3%A3o_de_jagun%C3%A7os_pela_cavalaria.jpg) | public domain | none | avoid: 1897, Canudos reconstruction |

### 5.3 1925: Paraná, the division and the bridge

| Candidate | Licence | Use | Decision |
| --- | --- | --- | --- |
| [168 - Vista de Lopei, caminho de Porto Mendes](https://commons.wikimedia.org/wiki/File:168_-_Vista_de_Lopei,_caminho_de_Porto_Mendes.jpg) | public domain | `porto-mendes`; chapter 03 | use |
| [186 - Porto Mendes ocupado pelo 10º BC](https://commons.wikimedia.org/wiki/File:186_-_Porto_Mendes_ocupado_pelo_10%C2%BA_BC.jpg) | public domain | chapter 03; `porto-mendes` | use |
| [187 - Rondon em Porto Mendes](https://commons.wikimedia.org/wiki/File:187_-_O_general_Rondon_visita_o_10%C2%BA_BC_em_Porto_Mendes.jpg) | public domain | `porto-mendes` | use |
| [173 - Coronel Primo e oficiais em Foz](https://commons.wikimedia.org/wiki/File:173_-_Coronel_Primo_e_oficiais_do_7%C2%BA_RI_de_ocupa%C3%A7%C3%A3o_na_Foz_do_Igua%C3%A7u.jpg) | public domain | `foz-do-iguacu` | use |
| [174 - Em Foz do Iguaçu](https://commons.wikimedia.org/wiki/File:174_-_Em_Foz_do_Igua%C3%A7u,_durante_a_ocupa%C3%A7%C3%A3o_pelas_for%C3%A7as_legais.jpg) | public domain | `foz-do-iguacu`; chapter 03 alternative | use |
| [176 - O 7º RI deixando Foz](https://commons.wikimedia.org/wiki/File:176_-_O_7%C2%BA_RI_deixando_Foz_do_Igua%C3%A7u_em_marcha_de_regresso.jpg) | public domain | `foz-do-iguacu` | use |
| [Batista Luzardo e Isidoro em Foz](https://commons.wikimedia.org/wiki/File:Batista_Luzardo_e_Isidoro_em_Foz_do_Igua%C3%A7u.jpg) | public domain | `foz-do-iguacu/hero-photo` | already used |
| [Isidoro Dias Lopes e Miguel Costa](https://commons.wikimedia.org/wiki/File:Isidoro_Dias_Lopes_e_Miguel_Costa.jpg) | public domain | `miguel-costa`; `isidoro-dias-lopes` | use |
| [RIO VERDINHO, modern](https://commons.wikimedia.org/wiki/File:RIO_VERDINHO_-_panoramio.jpg) | CC BY-SA 3.0 | modern reference | reference only |
| [Usina no Rio Verdinho, modern](https://commons.wikimedia.org/wiki/File:Usina_no_Rio_Verdinho,_Goias_-_panoramio.jpg) | CC BY-SA 3.0 | modern reference | reference only |

### 5.4 1926: the sertão and Serra Nova

| Candidate | Licence | Use | Decision |
| --- | --- | --- | --- |
| [A Coluna Prestes, O Malho, 25 Sep 1926](https://commons.wikimedia.org/wiki/File:A_Columna_Prestes_(O_Malho_25_de_setembro_de_1926).jpg) | public domain | chapter 06; `serra-nova-1926`; `coluna-no-grande-sertao` | use with caption |
| [A Coluna Prestes, O Malho, variant](https://commons.wikimedia.org/wiki/File:A_Columna_Prestes_(O_Malho_25_de_setembro_de_1926)_(4).jpg) | public domain | second image for the same entry | optional |
| [Batalhão de Patriotas, Boa Vista PE](https://commons.wikimedia.org/wiki/File:Batalh%C3%A3o_de_Patriotas_para_combater_a_Coluna-Prestes_em_Boa_Vista_PE.jpg) | public domain | chapter 06; `army-patriotico` | use |
| [Jagunços](https://commons.wikimedia.org/wiki/File:Jagun%C3%A7os.jpg) | public domain | `section-jaguncos` | use with caveat |

### 5.5 1927: Pantanal, exile and La Gaiba

| Candidate | Licence | Use | Decision |
| --- | --- | --- | --- |
| [Coluna Miguel Costa-Prestes, last photo](https://commons.wikimedia.org/wiki/File:Coluna_Miguel_Costa-Prestes_chefes_revolucion%C3%A1rios.png) | public domain | chapter 08; `exile-1927`; `army-coluna` | use |
| [Prestes exilado, Careta, 1928](https://commons.wikimedia.org/wiki/File:Prestes_exilado_caricatura_1928.png) | public domain | `exile-1927`; `luis-carlos-prestes` | use with caption |
| [Trajeto da Coluna Prestes em Mato Grosso](https://commons.wikimedia.org/wiki/File:Trajeto_da_Coluna_Prestes_em_Mato_Grosso.jpg) | public domain | `pantanal`; modern map | use with caption |
| [Vista satelital de la laguna La Gaiba](https://commons.wikimedia.org/wiki/File:Vista_satelital_de_la_laguna_La_Gaiba_Bolivia_Brasil.png) | public domain | `la-gaiba` map | use as modern map |
| [SE 21-6 La Gaiba](https://commons.wikimedia.org/wiki/File:SE_21-6_La_Gaiba,_Bolivia;_Brazil_(PDF)_-_PCL_Map_Collection_-_se-21-6-la_gaiba-bolivia-brazil-1994.pdf) | public domain | `la-gaiba` map alternative | use as modern map |

### 5.6 Forces, weapons, maps and the state of siege

| Candidate | Licence | Use | Decision |
| --- | --- | --- | --- |
| [Mauser-1908](https://commons.wikimedia.org/wiki/File:Mauser-1908.jpg) | CC BY-SA 3.0 | exact Brazilian Mauser 1908 | reference only, or seek permission |
| [Mauser 1889](https://commons.wikimedia.org/wiki/File:Mauser_1889.jpg) | check | Mauser-pattern museum rifle | reference only; wrong model risk |
| [Ammunition 7x57](https://commons.wikimedia.org/wiki/File:Ammunition_7x57.jpg) | public domain | modern 7x57 cartridges | reference for an original diagram |
| [7mm Mauser cartridges](https://commons.wikimedia.org/wiki/File:7mm_Mauser,_8mm_Mauser_round_nose,_8mm_Mauser_military_ball.JPG) | public domain | modern cartridge comparison | reference for an original diagram |
| [Madsen LMG schematic](https://commons.wikimedia.org/wiki/File:Madsen_LMG.png) | public domain | 7mm machine-gun schematic | reference only; model not named by the source |
| [Winchester 92](https://commons.wikimedia.org/wiki/File:Winchester_92_short_rifle_transparent.png) | CC0 | lever-action rifle reference | reference only; later model |
| [Renault FT, São Paulo](https://commons.wikimedia.org/wiki/File:Renault_FT_-_Revolu%C3%A7%C3%A3o_de_1924_em_S%C3%A3o_Paulo1.jpg) | public domain | 1924 armoured car | `sao-paulo-1924`; not the column |
| [Estado de sítio no Brasil, 1922-1926](https://commons.wikimedia.org/wiki/File:Estado_de_s%C3%ADtio_no_Brasil_de_1922_a_1926.jpg) | public domain | modern map of the states of siege | `historical-borders`; chapter 02 context |

## 6. Compendium priority list

### 6.1 Priority A: public-domain image available

| Entry | Slot | Candidate | Note |
| --- | --- | --- | --- |
| `siqueira-campos` | `portrait` | Os 18 do Forte (cropped) | Crop Siqueira Campos; credit Zenóbio Couto. |
| `lourenco-moreira-lima` | `portrait` | Lourenço Moreira Lima 1927 | Direct portrait. |
| `tenentismo` | `hero-photo` | Revolta do Forte de Copacabana | CC0; atmospheric. |
| `vila-militar` | `map` | Mapa Vila Militar 1922 | Public-domain map. |
| `rs-revolt-1924` | `hero-photo` | Saída dos rebeldes de Santo Ângelo | Movement to São Luiz, not a battle. |
| `sao-luiz-1924` | `hero-photo` | Saída dos rebeldes de Santo Ângelo | Reuse with a different caption; or use the map. |
| `sao-paulo-retaken-1924` | `hero-photo` | Prugner legalist battalion or Estação da Luz | Many choices. |
| `iguacu-1925` | `hero-photo` | 174 - Em Foz do Iguaçu | Legalist occupation. |
| `parana-crossing-1925` | `hero-photo` | 186 - Porto Mendes | Legalist occupation, not the crossing itself. |
| `serra-nova-1926` | `hero-photo` | A Coluna Prestes, O Malho | Period press. |
| `exile-1927` | `hero-photo` | Coluna Miguel Costa-Prestes, last photo | 1927. |
| `la-gaiba-1927` | `map` | Vista satelital / SE 21-6 | Modern map, clearly labelled. |
| `coluna-no-grande-sertao` | `hero-photo` | O Malho / Jagunços | Period press or earlier jagunços. |
| `army-coluna` | `hero-photo` | Coluna Miguel Costa-Prestes | Also `Comando da Coluna`. |
| `army-legalista` | `hero-photo` | Brigada Militar em São Paulo | O Malho. |
| `army-patriotico` | `hero-photo` | 134 - Batalhão Geraldo Rocha | Catanduvas. |
| `batalhoes-patrioticos-bahia` | `hero-photo` | HMBatalhão Chapada Diamantina | c.1930; caption. |
| `section-jaguncos` | `hero-photo` | Jagunços | c.1914; caption. |
| `irregular-arms` | `hero-photo` | Jagunços | Same caveat. |
| `porto-mendes` | `hero-photo` | 186/187/168 | Three choices. |
| `foz-do-iguacu` | extra | 173/174/176 | Add one or two. |
| `sao-luiz-gonzaga` | `hero-photo` | Saída dos rebeldes | Movement, not the town. |

### 6.2 Priority B: modern map or original illustration

| Entry | Slot | Plan | Note |
| --- | --- | --- | --- |
| `pantanal` | `map` | Trajeto da Coluna Prestes em Mato Grosso | 1977; May-June 1925, not 1927. Caption. |
| `la-gaiba` | `map` | Satellite or PCL sheet | Modern; caption. |
| `map-serra-rio` | `map` | Original map of the Verdinho bridge/ford | Modern photos are CC BY-SA only; use as reference. |
| `map-bairro` | `hero-photo` | 1924 São Paulo photo + original map | The entry is a fictional battlefield. |
| `ramada-1925` | `map` | Original map of Ramada | No confirmed period photo found. |
| `o-libertador-1924` | `plate` | Original typeset plate | No scan found; search Hemeroteca. |
| `manifesto-porto-nacional-1925` | `plate` | Original typeset plate | No scan found; the transcription is text, not an image. |
| `porto-nacional` | `hero-photo` | O Malho or original illustration | No 1925 place photo found. |
| `serra-nova` | `hero-photo` | O Malho or original illustration | No place photo found. |
| `ponte-de-verdinho` | `hero-photo` | Original illustration | No period photo found. |
| `mauser-7mm` | `diagram` | Original Mauser-pattern diagram | The source does not name the model. |
| `machine-guns-7mm` | `diagram` | Original generic 7mm machine-gun diagram | Do not imply a Madsen unless sourced. |
| `winchester-44` | `diagram` | Original lever-action diagram | Do not use a later Winchester 92 as the exact model. |
| `field-gun-75mm` | `diagram` | Original 75mm field-gun diagram | No exact period photo found. |
| `howitzer-105mm` | `diagram` | Original 105mm howitzer diagram | Do not use a WWII photo. |
| `vivandeiras` | `illustration` | Original illustration of the camp followers | No period photo found. |

### 6.3 Priority C: keep the emblem

These entries are game organizations, corrections or abstractions. A generic
photo would suggest a specific real unit, model or event that the source does not
support. The emblem is more honest than a misleading plate.

- Section types: `section-comando`, `section-fuzileiros`, `section-esquadra-4`,
  `section-esquadra-5`, `section-fuzil-metralhador`, `section-metralhadora`,
  `section-irregulares`, `section-veteranos-gauchos`, `section-comando-companhia`,
  `section-infantaria-exercito`, `section-brigada-militar`, `section-provisorios`,
  `section-metralhadora-legalista`, `section-fuzil-metralhador-legalista`,
  `section-chefe-capangas`, `section-jaguncos-mauser`, `section-voluntarios`,
  `section-cangaceiros`.
- `skirmish-forces`.
- Corrections: `sao-paulo-separate`, `miguel-costa-command`,
  `historical-borders`, `macaulay-perspective`.
- `rs-civil-war-1923` if no source image is found; an original map is better.

Exception: `section-brigada-militar` can use the Brigada photo because the name is
a period term; keep the caption "Brigada Militar, 1924" and do not imply the
game's section is the whole unit.

## 7. Gaps and next research actions

| Gap | Search terms | Where to search | Fallback |
| --- | --- | --- | --- |
| Verdinho bridge, 1925 | `"Ponte do Verdinho"`, `"Rio Verdinho" 1925`, `Mineiros 1925` | Hemeroteca Digital, CPDOC, regional Goiás archives | Original map/illustration. |
| Serra Nova, 1926 | `"Serra Nova" 1926`, `"Taiobeiras" 1926`, `"Coluna Prestes" Serra Nova` | Hemeroteca, CPDOC, ALMG, regional Minas archives | O Malho cover; original map. |
| Pantanal, 1927 | `"Pantanal" 1927`, `"Coluna Prestes" Pantanal`, `"San Matias" 1927` | Hemeroteca, CPDOC, Mato Grosso archives | Modern satellite/map; original illustration. |
| La Gaiba, 1927 | `"La Gaiba" 1927`, `"monumento" "La Gaiba"`, `"Bandeirantes da Liberdade"` | Blanc's cited archive, Bolivian archives, CPDOC | Modern satellite/topo; original illustration. |
| Ramada, 1925 | `"Ramada" 1925`, `"Palmeiras" 1925`, `"Coluna Prestes" Ramada` | Hemeroteca, CPDOC, regional RS archives | Original map; Santo Ângelo photo with caption. |
| Uruguaiana, 1924 | `"Uruguaiana" 1924`, `"revolta" 1924 Uruguaiana` | Hemeroteca, CPDOC, RS archives | Original map; no photo. |
| Porto Nacional, 1925 | `"Porto Nacional" 1925`, `"Coluna Prestes" Porto Nacional` | Hemeroteca, CPDOC, Goiás archives | O Malho; original plate. |
| O Libertador, 1924-25 | `"O Libertador" São Luiz Gonzaga`, `"O Libertador" 1924` | Hemeroteca Digital, CPDOC | Original typeset plate. |
| Manifesto de Porto Nacional, 1925 | `"Manifesto" "Porto Nacional" 1925` | Hemeroteca, Marxists archive, CPDOC | Original typeset plate. |
| Mauser 1908 exact model | `"Mauser 1908" Brasil`, `"fuzil Mauser" 1908` | AHEx, Museu Histórico do Exército, Wikimedia Commons | Original diagram; no exact photo. |
| 7mm machine gun | `"metralhadora" 7mm 1920`, `"Madsen" Brasil 1920` | AHEx, museum collections | Original generic diagram; model not named. |
| 75mm field gun | `"canhão 75mm" Brasil 1920`, `"Krupp 75" Brasil` | AHEx, museum collections | Original diagram. |
| 105mm howitzer | `"obus 105mm" Brasil 1920`, `"105mm howitzer" Brazil 1920` | AHEx, museum collections | Original diagram. |
| Vivandeiras | `"vivandeiras" Coluna Prestes`, `"mulheres" Coluna Prestes` | CPDOC, Blanc, Anita Prestes | Original illustration. |

The results of the 2026-11-12 search for these gaps are in section 12: new public-domain maps and portraits, CPDOC references for the exile, and the remaining original-art decisions.

## 8. Rights and production workflow

### 8.1 Rights

- Commons metadata is a lead, not a clearance. Record the institution, author,
  catalogue number, source URL, licence and public-domain basis before shipping.
- The project owner's determination of public domain (2026-11-06) covers the
  supplied period photographs; do not extend it to new images without a record.
- Do not use a CC BY-SA image as a shipped asset under the current runtime. Use it
  as a reference for an original map or illustration, or add licence support
  first.
- Do not present a modern photograph, satellite image or map as a 1920s
  photograph. The caption must say "modern map" or "modern reference".
- Do not use a generated image as a historical photograph.

### 8.2 Treatment and registration

- Photographs: 320x180, 320x240, 240x320 or 320x220, 20-colour sepia palette,
  Bayer 4x4 dithering, nearest filtering.
- Maps: 640x480 or 640x754, RGB, no dithering, labels legible.
- Register the file in `docs/assets.md` and `COMPENDIUM_IMAGE_REGISTER`.
- Add the slot to the entry in `docs/campaign/compendium/entries/<id>.md` and
  `packages/content/src/compendium-docs.ts`.
- Add the caption and credit in `packages/content/src/compendium-notes/en.ts` and
  `pt-BR.ts`. Both locales are required.
- Some runtime entries (`serra-nova-1926`, `exile-1927`, `iguacu-1925`, `parana-crossing-1925`, `vila-militar`, `map-bairro`, and the section and correction entries) have no file under `docs/campaign/compendium/entries/`. Add the entry file, or edit `compendium-docs.ts` directly and keep the docs and runtime in sync.
- A chapter plate points at an entry slot in `packages/content/src/campaign/chapters.ts`.
  Adding a new chapter plate means adding or changing an entry slot, not editing
  the book renderer.

### 8.3 What needs code

| Change | Code needed? | Note |
| --- | --- | --- |
| Add a public-domain image to an existing entry | no UI code | Docs + content metadata + captions. |
| Add a second/third image to a compendium entry | no UI code | Continuation plates already work. |
| Change a chapter's plate to another existing slot | no UI code | Update `chapters.ts`. |
| Add a second plate inside a campaign chapter | yes | The chapter renderer has one plate. |
| Ship a CC-BY-4.0 illustration | yes | The register and plate caption assume public domain. |
| Ship a CC BY-SA image | yes | Needs licence support and a different credit line. |

## 9. Recommended production order

### Phase 1: the four missing chapter plates and the strongest entries (about 18 images)

1. Chapter 02: Santo Ângelo photo.
2. Chapter 03: Porto Mendes 186 or 187.
3. Chapter 06: O Malho 1926.
4. Chapter 08: last photo of the chiefs, 1927.
5. `siqueira-campos`: Os 18 crop.
6. `lourenco-moreira-lima`: 1927 portrait.
7. `rs-revolt-1924`: Santo Ângelo.
8. `sao-luiz-1924`: Santo Ângelo or map.
9. `porto-mendes`: 186/187.
10. `foz-do-iguacu`: 174/176.
11. `army-legalista`: Brigada Militar.
12. `army-patriotico`: 134.
13. `batalhoes-patrioticos-bahia`: HMBatalhão.
14. `serra-nova-1926`: O Malho.
15. `exile-1927`: last photo of the chiefs.
16. `la-gaiba`: satellite map.
17. `pantanal`: Trajeto map.
18. `vila-militar`: Vila Militar map.

### Phase 2: the 1924 and 1925 context (about 12 images)

São Paulo retaken, Foz, Porto Mendes, Brigada, Patriotic Battalions, Jagunços,
and the São Paulo street/trench photos. Prefer one strong image per entry, not a
gallery.

### Phase 3: original maps and illustrations (about 10 images)

Verdinho, Ramada, Serra Nova, Pantanal, La Gaiba, O Libertador, the Manifesto,
and the weapon diagrams. These are the honest answer where no period photograph
exists.

### Phase 4: leave the emblem

Section types, game organizations, corrections and entries without a sourced
image. The emblem is better than a generic or misleading plate.

## 10. Open questions for the owner

1. Does the project accept CC BY-SA/CC BY images, or stay public-domain only?
   Accepting them needs a licence field and a different caption line in both
   books.
2. Do we want original CC-BY-4.0 illustrations for the gaps, and when?
3. Is one plate per chapter enough, or should the campaign book support a second
   plate?
4. Can the same photograph appear in two entries if the captions explain the
   reuse?
5. Should modern maps and satellite images appear in the books, clearly marked,
   or stay in the compendium as reference only?
6. Which comes first: filling all eight chapter plates, or deepening the most
   visited compendium entries?

## 11. Search log

Commons API searches used for this survey included:

- `Coluna Prestes`, `Prestes Column`, `Luís Carlos Prestes`, `Miguel Costa`,
  `Isidoro Dias Lopes`, `Siqueira Campos`.
- `Forte de Copacabana 1922`, `Revolta de 1922`, `Revolta de 1924`,
  `Revolução de 1924 São Paulo`, `Catanduvas`.
- `Porto Mendes`, `Foz do Iguaçu 1925`, `Verdinho`, `Pantanal 1927`,
  `La Gaiba`, `Serra Nova Minas Gerais 1926`.
- `Brigada Militar`, `Batalhão Patriótico`, `Jagunços`, `Cangaceiros`,
  `Vivandeiras`.
- `Mauser 1908`, `Winchester 1892`, `Madsen machine gun`, `7mm Mauser cartridges`.
- `O Malho 1926 Coluna Prestes`, `Trajeto da Coluna Prestes em Mato Grosso`.

Archives to search next:

- Hemeroteca Digital Brasileira: <https://memoria.bn.gov.br/>
- CPDOC/FGV: <https://cpdoc.fgv.br/>
- Arquivo Nacional: <https://www.gov.br/arquivonacional/>
- Brasiliana Fotográfica: <https://brasilianafotografica.bn.gov.br/>
- Biblioteca Nacional: <https://www.bn.gov.br/>
- Instituto Moreira Salles: <https://ims.com.br/>
- Library of Congress: <https://www.loc.gov/>
- Wikimedia Commons: <https://commons.wikimedia.org/>

The strongest single source found in this pass is the **Thomaz Luiz Reis**
series of legalist operations in western Paraná, 1924-1925: Catanduvas, Porto
Mendes and Foz do Iguaçu, all public domain on Commons. It should anchor the
visual language of chapters 03 and 04 and of the places around them.
## 12. Gap search results (2026-11-12)

This second pass looked for the gaps named in section 7. It searched the
Wikimedia Commons categories, the CPDOC Accessus catalogue, the Hemeroteca
Digital Brasileira, and the Internet Archive. It found new public-domain
material for the southern and Paraná chapters, and CPDOC references for the
exile. It did **not** find a period photograph of the Verdinho bridge, the Serra
Nova fight, the 1927 Pantanal crossing, the La Gaiba monument, the newspaper
`O Libertador`, or the Manifesto of Porto Nacional.

Two access notes matter:

- The Hemeroteca Digital now requires a CAPTCHA before opening the document
  reader. Automated search stops there; those titles must be searched manually.
- CPDOC item pages carry a rights notice: the images are protected by national
  and international copyright law and are for research assistance only; any use
  requires prior formal consultation with CPDOC/FGV. Treat CPDOC images as
  **reference only** until written permission is recorded.

### 12.1 New public-domain candidates

| Candidate | Date | Licence | Shows | Best for | Decision |
| --- | --- | --- | --- | --- | --- |
| [Croquis 18](https://commons.wikimedia.org/wiki/File:Croquis_18_-_Marchas_e_a%C3%A7%C3%B5es_da_Divis%C3%A3o_Rio_Grande_de_Santo_%C3%82ngelo_at%C3%A9_Barrac%C3%A3o.jpg) | 1962 | Public domain | Marchas da Divisão Rio Grande, Santo Ângelo to Barracão, Dec 1924-Feb 1925 | chapter 02; `rs-revolt-1924`; `sao-luiz-1924` | use as historical map |
| [Croquis 23](https://commons.wikimedia.org/wiki/File:Croquis_23_-_Divis%C3%A3o_Rio_Grande_-_a%C3%A7%C3%A3o_em_Pato_Branco,_em_Barrac%C3%A3o_e_retirada_para_o_norte.jpg) | 1962 | Public domain | Divisão Rio Grande in Pato Branco and Barracão, Feb-Mar 1925 | chapter 02/03; `porto-mendes` | use as historical map |
| [Croquis 25](https://commons.wikimedia.org/wiki/File:Croquis_25_-_Retirada_da_Brigada_Miguel_Costa_e_explora%C3%A7%C3%A3o_do_%C3%AAxito_pelo_1o_Grupo_de_Destacamentos.jpg) | 1962 | Public domain | Retreat of Miguel Costa's brigade, Mar-Apr 1925 | chapter 03; `foz-do-iguacu` | use as historical map |
| [Croquis 26](https://commons.wikimedia.org/wiki/File:Croquis_26_-_Fase_final_das_opera%C3%A7%C3%B5es_no_Paran%C3%A1.jpg) | 1962 | Public domain | Final phase of the Paraná operations, Apr 1925 | chapter 03/04; `map-fazenda` | use as historical map |
| [Gazeta de Notícias, 19 Jan 1927](https://commons.wikimedia.org/wiki/File:Gazeta_de_Not%C3%ADcias_19_de_janeiro_de_1927.jpg) | 1927 | Public domain | "Prestes, greater than Hannibal"; route comparison map | chapter 07/08; `exile-1927`; `pantanal` | use with caption |
| [Legalistas de Ijuí](https://commons.wikimedia.org/wiki/File:Legalistas_de_Iju%C3%AD.jpg) | 1924 | Public domain | Civilians and police who repelled the assault on Ijuí | chapter 02; `rs-revolt-1924`; `army-legalista` | use |
| [Abílio Wolney](https://commons.wikimedia.org/wiki/File:Ab%C3%ADlio_Wolney.png) | 1900s | Public domain | Portrait of the Bahia jagunço leader | `serra-nova-1926`; `section-jaguncos` | use with caveat: early portrait |
| [Horácio de Mattos](https://commons.wikimedia.org/wiki/File:Hor%C3%A1cio_de_Mattos.jpg) | undated | Public domain | Portrait of the Bahia leader | `serra-nova-1926`; `batalhoes-patrioticos-bahia` | use with caveat: date unknown |
| [Comissão de desarmamento das Lavras Diamantinas](https://commons.wikimedia.org/wiki/File:HMComiss%C3%A3o_desarmamento.jpg) | c.1930 | Public domain | Horácio de Matos at the centre of the commission | `serra-nova-1926`; `batalhoes-patrioticos-bahia` | use with caveat: after 1926 |
| [Mapa do Brasil, 1922](https://commons.wikimedia.org/wiki/File:Mapa_do_Brasil_-_1922.jpg) | 1922 | Public domain | Political map of Brazil in 1922 | `historical-borders`; chapter 02 context | use |
| [Artur Bernardes e ministros](https://commons.wikimedia.org/wiki/File:Presidente_Artur_Bernardes_e_ministros_de_Estado.tif) | 1922 | Public domain | The president and his ministers | `tenentismo`; `revolt-1922`; government side | use |
| [Lampião e seu grupo, 1927](https://commons.wikimedia.org/wiki/File:Lampi%C3%A3o_e_seu_grupo_em_Limoeiro_do_Norte,_CE,_1927.jpg) | 1927 | Public domain | Lampião's group in Limoeiro do Norte | `section-cangaceiros` | use with caveat: not the column |
| [139 - Roncador, 3º GIAP contra Catanduvas](https://commons.wikimedia.org/wiki/File:139_-_Roncador,_se%C3%A7%C3%A3o_do_3%C2%BA_GIAP_em_a%C3%A7%C3%A3o_contra_Catanduvas.jpg) | 1924-25 | Public domain | Government artillery section in action at Roncador | chapter 04; `map-fazenda` | use |
| [140 - Abrigo para munições, Roncador](https://commons.wikimedia.org/wiki/File:140_-_Abrigo_para_muni%C3%A7%C3%B5es_de_artilharia,_Roncador.jpg) | 1924-25 | Public domain | Artillery ammunition shelter | chapter 04; `map-fazenda` | use |
| [144 - Trincheiras do 13º BC, Catanduvas](https://commons.wikimedia.org/wiki/File:144_-_Trincheiras_do_13%C2%BA_BC,_Catanduvas.jpg) | 1924-25 | Public domain | Trenches of the 13th BC at Catanduvas | chapter 04; `map-fazenda` | use |
| [156 - Prisioneiros vindos de Catanduvas](https://commons.wikimedia.org/wiki/File:156_-_Prisioneiros_escoltados_pelo_13%C2%BA_BC_vindos_de_Catanduvas_depois_da_rendi%C3%A7%C3%A3o,_campos_de_Guarapuava.jpg) | 1924-25 | Public domain | Prisoners after the surrender, Guarapuava | chapter 04; `sao-paulo-1924` | use |
| [90 - Descendo a serra de Medeiros](https://commons.wikimedia.org/wiki/File:90_-_Descendo_a_serra_de_Medeiros.jpg) | 1924-25 | Public domain | Descent of the Serra de Medeiros | chapter 04; `map-fazenda` | use |
| [Lanceiros de Honório Lemes](https://commons.wikimedia.org/wiki/File:Lanceiros_de_Hon%C3%B3rio_Lemes.jpg) | 1923 | Public domain | Lancers of Honório Lemes | chapter 02; `rs-revolt-1924`; `section-veteranos-gauchos` | use |
| [Trincheira legalista em Itaqui](https://commons.wikimedia.org/wiki/File:Trincheira_legalista_em_Itaqui_1924.jpg) | 1924 | Public domain | Legalist trench at Itaqui | chapter 02; `army-legalista` | use |
| [Gazeta de Notícias, 27 July 1922](https://commons.wikimedia.org/wiki/File:Gazeta_de_Not%C3%ADcias_27_de_julho_de_1922_(cropped).jpg) | 1922 | Public domain | Legalist 3rd Infantry against the 18 do Forte | chapter 01; `revolt-1922` | use |
| [Corumbá by Garmendia](https://commons.wikimedia.org/wiki/File:Corumb%C3%A1_by_Garmendia.jpg) | 1925 | Public domain | Watercolour of the Paraguay River at Corumbá, after an 1850s engraving | `pantanal`; visual reference | use with caveat: not the 1927 crossing |

The four Croquis are the best new material for chapters 02-04. They are
historical maps (1962 imprint, public domain on Commons), not photographs; they
should be presented as maps, not as 1920s reconnaissance.

`Gazeta de Notícias, 19 Jan 1927` is the best new material for the exile and the
long march: it is a period newspaper front page with a route comparison map. It
is not a Pantanal photograph, and the caption must say so.

### 12.2 CPDOC Accessus references (permission required)

| Code | Title | Date/place | Best for | Rights |
| --- | --- | --- | --- | --- |
| [TBC foto 003](https://www18.fgv.br/CPDOC/acervo/arquivo-pessoal/TBC/audiovisual/luis-carlos-prestes-por-ocasiao-do-exilio-da-coluna-na-bolivia) | Luís Carlos Prestes in the exile of the Column | 28 Feb 1928, Porto Soares, Bolivia | chapter 08; `exile-1927`; `luis-carlos-prestes` | CPDOC permission required |
| [AAP foto 005](https://www18.fgv.br/CPDOC/acervo/arquivo-pessoal/AAP/audiovisual/aspectos-do-local-de-exilio-da-coluna-prestes-na-bolivia) | Aspects of the place of exile in Bolivia | undated | chapter 08; `la-gaiba`; `pantanal` | CPDOC permission required |
| [PEB foto 014](https://www18.fgv.br/CPDOC/acervo/arquivo-pessoal/PEB/audiovisual/membros-da-coluna-prestes-exilados-na-bolivia) | Members of the Column exiled in Bolivia | undated | chapter 08; `exile-1927` | CPDOC permission required |
| [ILA foto 011](https://www18.fgv.br/CPDOC/acervo/arquivo-pessoal/ILA/audiovisual/membros-da-coluna-prestes-durante-o-exilio-na-bolivia) | Members of the Column during the exile in Bolivia | undated | chapter 08; `exile-1927` | CPDOC permission required |
| [SVM foto 011](https://www18.fgv.br/CPDOC/acervo/arquivo-pessoal/SVM/audiovisual/exilio-de-membros-da-coluna-prestes-na-bolivia) | Exile of members of the Column in Bolivia | undated | chapter 08; `exile-1927` | CPDOC permission required |
| [TBC c 1928.02.01](https://www18.fgv.br/CPDOC/acervo/arquivo-pessoal/TBC/textual/cartao-de-luiz-carlos-prestes-a-temistocles-brandao-cavalcanti-agradecendo-e-reafirmando-amizade-gaiba) | Card from Prestes to Temistocles Brandão Cavalcanti | Gaiba, 1 Feb 1928 | `la-gaiba`; chapter 08 | CPDOC permission required |
| [SVM foto 004](https://www18.fgv.br/CPDOC/acervo/arquivo-pessoal/SVM/audiovisual/sadi-vale-machado-luis-carlos-prestes-o-outros-por-ocasiao-dos-levantes-nas-cidades-de-sao-luis-santo-angelo-e-sao-borja) | Sadi Vale Machado, Prestes and others at the risings | São Luís, Santo Ângelo, São Borja, 1924 | chapter 02; `rs-revolt-1924` | CPDOC permission required |
| [SVM foto 003](https://www18.fgv.br/CPDOC/acervo/arquivo-pessoal/SVM/audiovisual/revolucionarios-da-coluna-prestes-no-parana) | Revolutionaries of the Column in Paraná | undated | chapter 03/04; `map-fazenda` | CPDOC permission required |
| [FSC foto 005](https://www18.fgv.br/CPDOC/acervo/arquivo-pessoal/FSC/audiovisual/aspectos-de-manobras-das-forcas-federais-em-combate-a-coluna-prestes-durante-a-campanha-do-parana) | Federal forces in the Paraná campaign | undated | chapter 04; `army-legalista` | CPDOC permission required |
| [SVM foto 007](https://www18.fgv.br/CPDOC/acervo/arquivo-pessoal/SVM/audiovisual/mapa-com-tracado-da-marcha-da-coluna-prestes) | Map with the route of the Column | undated | chapter 02/07; overview | CPDOC permission required |
| [CFa foto 515](https://www18.fgv.br/CPDOC/acervo/arquivo-pessoal/CFa/audiovisual/mapa-acompanhado-de-transparencia-retratando-a-marcha-e-a-contra-marcha-da-coluna-prestes) | Map of the march and counter-march | undated | chapter 06; `serra-nova-1926` | CPDOC permission required |
| [PEB foto 010](https://www18.fgv.br/CPDOC/acervo/arquivo-pessoal/PEB/audiovisual/mapas-do-brasil-mostrando-a-marcha-da-coluna-prestes) | Maps of Brazil showing the march | undated | overview; `historical-borders` | CPDOC permission required |

CPDOC item pages state that the images are protected and are for research only;
any use requires prior formal consultation. Do not add them to
`COMPENDIUM_IMAGE_REGISTER` without written permission. If permission is
granted, the credit line must name CPDOC/FGV and the fund (TBC, AAP, PEB, ILA,
SVM, CFa).

### 12.3 Hemeroteca and the two publications

The Hemeroteca Digital has `O Libertador` only for Santa Catarina and Sergipe,
not the Rio Grande do Sul paper printed at São Luiz Gonzaga. The document reader
also requires a CAPTCHA, so automated search cannot verify the remaining titles.

A web reproduction of **no. 1** was found on Brasil Cultura: [Coluna Prestes](https://www.brasilcultura.com.br/coluna-prestes/),
direct image [jornal-da-coluna-prestes.jpg](https://www.brasilcultura.com.br/wp-content/uploads/2009/05/jornal-da-coluna-prestes.jpg).
It shows the masthead "O LIBERTADOR",
"Órgão da Revolução", "São Luiz Gonzaga, 5 de Novembro de 1924". The image is
only 374 x 503 px, and the page does not state the scan's provenance or licence.
The page also says ten numbers were published; the project's sources give six,
seven or nine (see `docs/history/TIMELINE.md`). Record the discrepancy and do
not repeat the "ten" count as fact.

The underlying 1924 newspaper is public domain in Brazil, but this reproduction
is too small for a book plate and is not a library scan. Use it as a reference
and as proof that the page exists. For a plate, request a high-resolution scan
from the Biblioteca Nacional, CPDOC/FGV or a library holding the 1931 Moreira
Lima edition (p. 25 has a facsimile), or make an original typeset reconstruction
clearly labelled as such.

The Manifesto of Porto Nacional still needs a manual Hemeroteca search, or a
facsimile from a library that holds the original. Until then, use an original
typeset plate (CC-BY-4.0) rather than a misleading photograph of another
newspaper.

### 12.4 Gap-by-gap conclusion

| Gap | What was found | Rights | Decision |
| --- | --- | --- | --- |
| Verdinho bridge | No period image in Commons, CPDOC or the open Hemeroteca search; modern Verdinho photos exist | modern photos CC BY-SA 3.0 | Original map/illustration; modern photos as reference only |
| Serra Nova | No place photo; O Malho 1926 cover; portraits of Horácio de Matos and Abílio Wolney | public domain | Use the portraits and the O Malho cover; original map/illustration for the place |
| Pantanal 1927 | No 1927 landscape; CPDOC exile photos in Bolivia; `Trajeto` map; modern satellite | CPDOC restricted; map/satellite public domain | Use the map/satellite with a modern caption; CPDOC exile photos only with permission |
| La Gaiba 1927 | No monument photo; CPDOC card from Gaiba (1928) and exile photos; modern satellite/topo | CPDOC restricted; maps public domain | Original illustration or CPDOC card with permission; modern map as reference |
| `O Libertador` | Low-resolution web scan of no. 1 found at Brasil Cultura; no library scan yet | scan provenance unstated; 1924 newspaper public domain | Request high-resolution scan or use an original typeset plate |
| Manifesto of Porto Nacional | No scan found; CPDOC search did not return a facsimile | unknown | Original typeset plate; manual archive search |
| Mauser 7 mm exact model | `Mauser-1908.jpg` is the exact Brazilian model but CC BY-SA 3.0 | not public domain | Reference only; original diagram, or permission |
| 7 mm machine gun | Madsen schematic is public domain, but the source does not name the model | public domain schematic | Original generic diagram; do not imply Madsen |
| 75 mm gun / 105 mm howitzer | No exact public-domain period photo found | unknown | Original diagrams; do not use WWII photos |
| Winchester .44 | Modern Winchester 92 illustration is CC0, but it is a later model | CC0 | Reference only; original generic lever-action diagram |
| Vivandeiras | No period photo found | unknown | Original illustration |

### 12.5 Next actions

1. Request written permission from CPDOC/FGV for the exile and Paraná images
   listed in 12.2, starting with TBC foto 003, AAP foto 005 and the Gaiba card.
2. Manually search the Hemeroteca (CAPTCHA) for `O Libertador`, `Manifesto`,
   `Verdinho`, `Serra Nova`, `Pantanal` and `La Gaiba`; record the issue, page and
   catalogue link.
3. Process the new public-domain Croquis 18/23/25/26, the 1927 Gazeta page,
   Legalistas de Ijuí, and the Horácio de Matos/Abílio Wolney portraits.
4. Commission original maps for Verdinho, Serra Nova and Ramada, and original
   illustrations for Pantanal, La Gaiba, `O Libertador`, the Manifesto,
   vivandeiras and the weapon diagrams.
5. Verify the Commons public-domain basis for the 1962 Croquis and the 1927
   Gazeta page before shipping; record the source page and credit.

## 13. `O Libertador` and international sources (2026-11-12)

`O Libertador` was the column's newspaper: first printed at São Luiz Gonzaga
(RS) at the end of 1924, later at Porto Nacional, Carolina and Floriano. The
editors named in the sources are Lourenço Moreira Lima, José D. Pinheiro Machado
and Manoel de Macedo. The number of issues is disputed (six at São Luiz plus
later issues, or nine or ten in all); see `docs/history/TIMELINE.md`.

No library-digitized issue of the Rio Grande do Sul paper was found. A low-resolution web reproduction of no. 1 is noted below. The searches
separate what is in Brazil from what is abroad.

### 13.1 Brazilian repositories

| Repository | Query or route | Result | Access |
| --- | --- | --- | --- |
| Brasil Cultura (web reproduction) | article "Coluna Prestes" | First page of no. 1, São Luiz Gonzaga, 5 Nov 1924; 374 x 503 px | Scan provenance unstated; underlying 1924 paper public domain |
| Hemeroteca Digital Brasileira | title list `O Libertador` | Only `O Libertador (SC)` and `O Libertador (SE)`; not the Rio Grande do Sul paper printed at São Luiz Gonzaga | Document reader requires CAPTCHA |
| CPDOC/FGV Accessus | `O Libertador`, all collections | No 1924-25 issues; the closest item is `AM ap cared 1934.12.22`, about a later newspaper's quotas and closing | Item pages restricted |
| CPDOC/FGV Accessus | `Coluna Prestes`, audiovisual | Exile and Paraná photographs; no newspaper scan | Permission required |
| Biblioteca Nacional | catalogue | Site blocks automated access (Cloudflare); manual catalogue search required | Manual |
| Arquivo Nacional | SIAN and thematic sites | Automated query rejected; manual search of police/political funds required | Manual |
| IHGB, Museu da Comunicação Hipólito José da Costa, APERS, Museu Julio de Castilhos | local periodicals and 1924 collections | Not searched online; these are the likeliest Brazilian holders of a physical issue | Visit or email |

The Hemeroteca result matters: the title list has homonyms from Santa Catarina
and Sergipe, not the column's paper. A search that stops at the title list can
mistake them for the paper.

### 13.2 International repositories

| Repository | Route | Result | Access |
| --- | --- | --- | --- |
| Readex, *Latin American Newspapers* Series 1 and 2 | product catalogue | Series 1 covers 1805-1922; Series 2 covers 1822-1922. `O Libertador` (1924-25) falls outside both | Subscription |
| Library of Congress | `loc.gov` search | Cloudflare challenge to automated access; no result read | Manual |
| WorldCat / OCLC | title search | Rate-limited to automated access; no result read | Manual |
| Center for Research Libraries (CRL) | Latin American newspaper holdings | Site did not return a searchable result to this session | Manual |
| Nettie Lee Benson Latin American Collection (UT Austin) | catalogue and microfilm | Site reachable; no direct title hit read | Contact the Benson |
| Ibero-American Institute (Berlin) | IberoSearch, digital collections, newspaper clippings | Site reachable; no direct title hit read | Manual |
| Oliveira Lima Library (Catholic University) | Brazilian history collection | Site did not resolve to a search page | Contact the library |
| International Institute of Social History (Amsterdam) | catalogue | Bot protection (Anubis) blocked automated access | Manual |
| British Library | newspaper collection | Site recovering from a cyber-attack; limited digital content | Manual |
| BNF Gallica | SRU/search | 403 to automated access | Manual |
| Archivo General de la Nación (Argentina) | ATOM/KOHA catalogues | Site reachable; no direct title hit read | Manual |
| Biblioteca Nacional Mariano Moreno (Argentina) | catalogue | Site reachable; catalogue route did not resolve | Manual |
| Biblioteca Nacional / Archivo Nacional de Bolivia | La Gaiba and exile press | Not searched online; relevant for the 1927 exile | Contact |
| Biblioteca Nacional / Archivo Nacional del Paraguay | Siqueira Campos group, 1927 | Not searched online | Contact |

### 13.3 What this means

- **A low-resolution web reproduction of `O Libertador` no. 1 exists.** Brasil
  Cultura reproduces it, but the scan is small and its provenance is unstated.
  The paper is still a physical or microfilm problem for a library plate.
- **Readex does not cover it.** The Latin American Newspapers series stop in
  1922, before the column's paper.
- **The best first requests** are the Biblioteca Nacional (Rio de Janeiro), the
  Arquivo Nacional, the Museu da Comunicação Hipólito José da Costa, APERS and
  the CPDOC/FGV archives. The CPDOC `Luís Carlos Prestes`, `Juarez Távora` and
  `Cordeiro de Farias` funds may hold issues or references even though the
  catalogue search found no scan.
- **Abroad**, ask the Benson, CRL, IAI, Oliveira Lima Library and IISH for
  microfilm or holdings; ask the Argentine and Bolivian national libraries for
  local press coverage of the column and the exile.
- **Until a library scan is found**, use an original typeset plate for the
  `o-libertador-1924` entry, clearly marked as a reconstruction. Do not use a
  photograph of a different newspaper.

### 13.4 Search strings to send to a library

- `"O Libertador" São Luiz Gonzaga 1924`
- `"O Libertador" Coluna Prestes`
- `"O Libertador" Porto Nacional 1925`
- `"O Libertador" Carolina Maranhão 1926`
- `"O Libertador" Floriano Piauí 1926`
- `"Coluna Prestes" newspapers 1924-1927`
- `"Coluna Prestes" photograph collection`
- `"La Gaiba" 1927 photograph`
- `"Panthanal" 1927 Prestes` (the period spelling appears in some sources)

## 14. Local reference downloads (2026-11-13)

The candidate images were downloaded for visual reference to
`referencias imagens/`, which is gitignored. The folder contains 85 image and PDF files, plus an `index.html` gallery, the
Wikimedia thumbnails, the Brasil Cultura scan of `O Libertador` no. 1 and
65-100 px CPDOC thumbnails. Its `LEIA-ME.md` repeats the rights warning and
lists what was not downloaded.

This folder is **not** an asset library. Do not commit it, ship it, publish it,
or copy files from it into `apps/game/public/assets/` without the normal rights
check and registration.
