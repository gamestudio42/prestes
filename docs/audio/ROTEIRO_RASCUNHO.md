# Roteiro de gravação — rascunho

Rascunho revisado pelo dono, de onde saiu o catálogo `VOICE_LINES`
(`packages/content/src/voice-lines.ts`, 2026-11-16). O catálogo é agora a
fonte: uma fala nova ou trocada entra nele (texto, legenda em inglês e, para
xingamento, o momento), e `pnpm check:audio` gera o roteiro oficial em
`docs/audio/VOICE_SCRIPT.md`, com o que está gravado e o que falta. Este
arquivo fica como registro das fontes dos xingamentos e do que ainda espera
fonte; `tools/voice-ai/` ainda lê dele para gerar as vozes.

## Como gravar

- WAV mono, uma frase por arquivo, ~0,5 s de silêncio antes e depois.
- Nome: `voice/<falante>/<id>-<tomada>.wav` — falantes `comandante`,
  `soldado`, `inimigo`. Ex.: `voice/comandante/attack-1.wav`.
- Depois: `pnpm prepare:audio` (nível, corte, MP3 mono).
- Prioridade: ordens e respostas primeiro; o que faltar fica em silêncio.
- **Inimigo:** outra voz se possível (um amigo), ou a sua num registro
  diferente — mais grave ou mais rouca, sotaque sertanejo, um passo mais
  longe do microfone. O jogo também abafa o inimigo pela distância.

Legenda de fonte: frases com termo de época citam a fonte; "falta a página"
precisa de fonte antes de entrar no jogo.

---

## 1. Ordens — comandante e resposta da seção (3 + 3 tomadas)

Comandante: voz de comando curta e firme, alta sem berrar, para quem está a
dezenas de metros. Resposta: um soldado só, confirmação rápida.

| id | Ordem | Tom | Comandante (`comandante/<id>-1..3`) | Resposta (`soldado/<id>-ack-1..3`) |
|---|---|---|---|---|
| move | Mover | firme, neutro | "Seção, para lá! Andando!" · "Ocupem aquele ponto!" · "Mudem de posição, vamos!" | "Sim, senhor!" · "Lá vamos nós." · "Indo pra lá!" |
| advance | Avançar | decidido, ritmado | "Avançar por lanços!" · "Metade cobre, metade avança!" · "Pra frente, de lanço em lanço!" | "Avançando!" · "Cobrindo! Vai, vai!" · "Pra frente, pessoal!" |
| withdraw | Recuar | urgente, controlado | "Recuar! Pra trás!" · "Saiam daí, recuem!" · "Retirada, devagar e atirando!" | "Recuando!" · "Pra trás, pessoal!" · "Saindo!" |
| hold | Alto | seco, cortante | "Alto! Abriguem-se!" · "Alto aí! Fiquem onde estão!" · "Parem e segurem aí!" | "Alto!" · "Segurando aqui." · "Parados, senhor." |
| attack | Atacar | agressivo, alto | "Fogo naquele grupo!" · "Ataquem! Pra cima deles!" · "Alvo à frente, fogo!" | "Fogo!" · "Pra cima!" · "Vendo o alvo!" |
| suppress | Suprimir | insistente | "Prendam eles no chão! Fogo contínuo!" · "Não deixem levantar a cabeça!" · "Fogo neles sem parar!" | "Mantendo o fogo!" · "Cabeça baixa neles!" · "Fogo contínuo!" |
| area-fire | Fogo na área | desconfiado | "Atirem naquele mato!" · "Fogo na moita, estão lá!" · "Varram aquela área!" | "Atirando no mato!" · "Fogo na área!" · "Gastando bala, senhor!" |
| flank | Flanquear | rápido, explicando | "Metade prende, metade contorna!" · "Peguem eles pelo lado!" · "Flanco! Rodeiem!" | "Contornando!" · "Pelo lado, vamos!" · "Prendendo eles aqui!" |
| aim | Mirar para | calmo, atento | "Olho naquela direção!" · "Frente pra lá!" · "Vigiem aquele lado!" | "Vigiando!" · "Olho lá." · "Frente virada, senhor." |
| defend | Defender | firme, resoluto | "Defendam esta área!" · "Aqui ninguém passa! Abriguem-se!" · "Segurem este terreno!" | "Defendendo!" · "Ninguém passa!" · "Tomando abrigo!" |
| recon | Reconhecer | baixo, quase sussurrado | "Batedores, vão ver o que tem lá!" · "Reconheçam aquele terreno!" · "Vão espiar, sem fazer barulho!" | (sussurrado) "Vou ver." · "Já volto com notícia." · "Calado, indo." |
| enter | Ocupar | prático, rápido | "Ocupem aquela casa!" · "Pra dentro da trincheira!" · "Entrem e guarneçam!" | "Entrando!" · "Ocupando!" · "Pra dentro, pessoal!" |
| exit | Sair | prático | "Saiam da posição!" · "Pra fora, vamos!" · "Deixem isso, saiam!" | "Saindo!" · "Pra fora!" · "Deixando a posição!" |
| assault | Assaltar | grito de arranque | "Assalto! Pra cima deles!" · "Tomem aquela posição!" · "Avante! Tomem a posição!" | "Avante!" · "Pra cima!" · "Tomando!" |

**84 tomadas.**

## 1b. Controle de fogo — comandante e resposta (3 + 3 tomadas)

Do `add-difficulty-levels`: trocar o controle de fogo de uma seção é falado
como uma ordem. A primeira tomada do Econômico é a frase do dono. Rascunho
para revisão: o dono aprova ou troca as frases antes de gravar.

| id | Controle | Tom | Comandante (`comandante/<id>-1..3`) | Resposta (`soldado/<id>-ack-1..3`) |
|---|---|---|---|---|
| fire-free | Fogo livre | solto, alto | "Fogo à vontade!" · "Atirem à vontade!" · "Fogo livre, pessoal!" | "Fogo à vontade!" · "Atirando!" · "Pode deixar!" |
| fire-economy | Econômico | contido, firme | "Só atirem quando virem o branco dos olhos deles!" · "Poupem bala! Cada tiro, um inimigo!" · "Nada de gastar à toa, mirem bem!" | "Poupando bala!" · "Só no certo, senhor." · "Esperando eles chegarem!" |
| fire-contact | Ao contato | baixo, tenso | "Ninguém atira antes da hora!" · "Esperem eles chegarem perto!" · "Fogo só se chegarem em cima!" | "Esperando!" · "Quando chegarem, senhor." · "Dedo fora do gatilho." |
| fire-hold | Segurar fogo | seco, cortante | "Segurem o fogo!" · "Ninguém atira!" · "Cessar fogo!" | "Segurando!" · "Ninguém atira." · "Cessar fogo!" |

A frase "o branco dos olhos" é um dito militar antigo (mais conhecido da
guerra de independência dos Estados Unidos), usado aqui como fala
dramatizada, sem afirmar que a Coluna o usou.

**24 tomadas.**

## 2. Avisos dos nossos soldados (3 tomadas)

Gritados de onde o soldado está, com o fogo por perto.
Arquivo: `soldado/<id>-1..3`.

| id | Aviso | Tom | Texto |
|---|---|---|---|
| contact | Primeiro contato | alerta, surpresa | "Inimigo à vista!" · "Lá estão eles!" · "Gente ali na frente!" |
| man-down | Homem ferido | contido, tenso | "Homem ferido!" · "Pegaram um dos nossos!" · "Caiu um aqui!" |
| no-ammo | Sem munição | aflito | "Acabou a munição!" · "Tô sem bala!" · "Cartucho! Alguém tem cartucho?" |
| reloading | Recarregando | apressado | "Carregando!" · "Remuniciando!" · "Cobre aí, tô carregando!" |
| pinned | Imobilizado | ofegante | "Não dá pra levantar a cabeça!" · "Estamos presos aqui!" · "Fogo demais, não dá!" |
| gun-set | Metralhadora pronta | objetivo | "Metralhadora pronta!" · "Peça montada!" · "Pronta pra atirar!" |
| objective | Objetivo tomado | vitorioso | "Posição tomada!" · "É nossa!" · "Tomamos!" |
| falling-back | Recuando | desespero contido | "Pra trás, pra trás!" · "Não segura mais, recua!" · "Vamos embora daqui!" |

**24 tomadas.**

### 2b. Gritos sem palavras dos nossos (3 tomadas)

Sons sem fala, curtos, na voz do soldado. Arquivo: `soldado/<id>-1..3`.
Legenda: só o tipo do grito.

| id | Situação | Tom | Texto |
|---|---|---|---|
| charge | a seção parte para o assalto | grito de arranque, alto | "Êêêêê!" · "Eia, eia!" · "Aaaaah!" |
| pain | um homem é atingido | dor, contido | "Aai!" · "Ugh!" · "Ai, ai!" |
| dying | um homem cai | grito curto, desespero | "Aaaargh!" · "Ahh!" · "Uuh!" |

**9 tomadas.**

## 3. Xingamentos por facção (1 tomada cada)

Esporádicos, só em combate, entre um tiro e outro. O xingamento é da
**facção** de quem fala (`Faction` do jogo: `column`, `legalist`,
`cangaceiro`), não do lado do jogador: um legalista xinga como legalista
seja ele o nosso ou o inimigo. Arquivo: `xingamento/<facção>/<nº>-<n>`.
Voz: Coluna na voz do soldado, legalistas na do inimigo, cangaceiros numa
terceira (entre as duas). Linguagem pesada: o jogo avisa na abertura.

Fonte: "geral" é palavrão comum no português do Brasil; "regional" é fala
da região de quem a facção recrutava (sem termo de época, sem página);
"a confirmar" é um sentido regional que ainda não foi conferido em
dicionário; "falta a página" é termo de época que precisa de fonte. Os dois
últimos não são gerados. Insultos de raça ou de orientação sexual ficam
fora por decisão de projeto.

### Momento de cada xingamento

O jogo sorteia o xingamento, mas só entre os que combinam com o que está
acontecendo com a seção (catálogo `voice-lines.ts`, campo `moment`).
Cerca de dois terços das vezes sai um do momento; o resto, um insulto
geral. Se a facção não tem xingamento daquele momento, sai um insulto.

| Momento | Quando | Coluna | Legalistas | Cangaceiros |
|---|---|---|---|---|
| acertou (`fire`) | o tiro da seção acertou | 05 | 03, 07 | 10, 11, 14 |
| errou (`miss`) | o tiro da seção errou | 09, 10, 12 | — | 09 |
| sob fogo (`under-fire`) | a seção leva tiro, ou é pega de surpresa | 11, 18 | 04, 13, 15 | 07, 08 |
| fuga (`flee`) | um homem do outro lado debanda perto | 06, 17 | 09 | 13 |
| insulto (`insult`) | qualquer momento do combate | os demais | os demais | os demais |

### 3a. Coluna (`column`) — gaúchos e paulistas

| nº | Tom | Texto | Fonte |
|---|---|---|---|
| 01 | raiva | "Filho da puta!" | geral |
| 02 | explosivo | "Vai pra puta que te pariu!" | geral |
| 03 | raiva, dentes cerrados | "Filho duma égua!" | geral |
| 04 | desprezo | "Corno manso!" | geral |
| 05 | ao mirar | "Toma, chifrudo!" | geral |
| 06 | escárnio, alto | "Corre, cagão!" | geral |
| 07 | raiva | "Cachorro do governo!" | geral |
| 08 | desprezo | "Pau-mandado de coronel!" | geral |
| 09 | frustrado | "Porra, errei o desgraçado!" | geral |
| 10 | frustrado | "Merda de espingarda!" | geral |
| 11 | espantado | "Barbaridade, que tiroteio!" | regional (gaúcho) |
| 12 | irritado | "Bah, mas que porcaria!" | regional (gaúcho) |
| 13 | provocando, alto | "Vem, castelhano de merda!" | a confirmar (gaúcho: "castelhano" como ofensa a quem vem de fora) |
| 14 | raiva | "Vai pros quinto dos inferno, desgraçado!" | regional (caipira paulista) |
| 15 | raiva | "Mardito seja!" | regional (caipira paulista) |
| 16 | desprezo | "Chimangos!" · "Lá vêm os chimangos!" | macaulay-1974 p. 48 |
| 17 | zombando | "Corre, provisório!" | macaulay-1974 pp. 48, 55 |
| 18 | explosivo | "Raios e coriscos!" | geral |
| 19 | ódio | "Canalhas!" | geral |
| 20 | desprezo | "Lá vêm os pica-paus!" | apelido dos legalistas — falta a página |
| 21 | escárnio | "Corre, peludo!" | apelido dos recrutas — falta a página |

**22 tomadas** (16 tem duas); 13, 20 e 21 esperam conferência.

### 3b. Legalistas (`legalist`) — Exército, Força Pública, provisórios

| nº | Tom | Texto | Fonte |
|---|---|---|---|
| 01 | raiva | "Filho da puta!" | geral |
| 02 | ódio | "Bando de filhos da puta!" | geral |
| 03 | ao mirar | "Toma, corno!" | geral |
| 04 | explosivo | "Puta que pariu, de onde vem esse tiro?" | geral |
| 05 | desprezo | "Vagabundos!" | geral |
| 06 | provocando, alto | "Rende, cachorro!" | geral |
| 07 | ameaça | "Hoje tu morre, desgraçado!" | geral |
| 08 | desprezo | "Bando de ladrão de cavalo!" | geral |
| 09 | escárnio | "Foge não, covarde!" | geral |
| 10 | raiva | "Cabra safado!" | geral |
| 11 | ameaça | "Daqui vocês não saem!" | geral |
| 12 | escárnio, alto | "Cadê o tal do Prestes?" | contra a Coluna |
| 13 | frustrado | "Merda, não acaba essa gente!" | geral |
| 14 | raiva, dentes cerrados | "Filho duma égua!" | regional (provisórios gaúchos) |
| 15 | espantado | "Bah, de onde saiu essa gente?" | regional (provisórios gaúchos) |
| 16 | desprezo | "Revoltosos de merda!" | falta a página |
| 17 | raiva | "Bandidos!" | falta a página |
| 18 | desprezo | "Maragatos de uma figa!" | provisórios gaúchos — falta a página |

**18 tomadas**; 16 a 18 esperam fonte.

### 3c. Cangaceiros (`cangaceiro`) — jagunços dos batalhões patrióticos

| nº | Tom | Texto | Fonte |
|---|---|---|---|
| 01 | raiva | "Fi duma rapariga!" | regional (nordeste: rapariga = prostituta) |
| 02 | ódio | "Filho de uma rapariga!" | regional (nordeste) |
| 03 | raiva | "Fela da puta!" | regional (nordeste) |
| 04 | desprezo | "Corno véio!" | regional (nordeste) |
| 05 | raiva | "Cabra da peste!" | regional (nordeste) |
| 06 | provocando, alto | "Arreda, cabra frouxo!" | regional (nordeste) |
| 07 | espantado | "Oxente, de onde vem esse tiro?" | regional (nordeste) |
| 08 | espantado | "Vôte, que tiroteio!" | regional (nordeste) |
| 09 | frustrado | "Eita porra, errei!" | regional (nordeste) |
| 10 | ameaça baixa | "Vou sangrar tu, desgraçado." | regional (sertão: sangrar = matar a faca) |
| 11 | ameaça | "Vou te furar, fi do cão!" | regional (nordeste: o cão = o diabo) |
| 12 | desprezo | "Mizerave!" | regional (nordeste) |
| 13 | escárnio | "Corre, cabra mole!" | regional (nordeste) |
| 14 | ganancioso | "Atira, que o coronel paga!" | macaulay-1974 p. 189 (pagos e armados pelo governo) |
| 15 | raiva | "Peste dos inferno!" | regional (nordeste) |
| 16 | desprezo | "Lá vem os revoltoso!" | falta a página |

**16 tomadas**; 16 espera fonte.

## 4. Inimigo (1 tomada cada, voz do inimigo)

Ouvidos só quando o nosso lado vê quem fala, e pela regra de proximidade.
Nunca dão vantagem que a vista não daria. Arquivo: `inimigo/<id>-<nº>`.

### 4a. Avisos do inimigo

| id | Situação | Tom | Texto |
|---|---|---|---|
| contact | nos viu | alerta | "Olha eles ali!" · "Tão lá no mato!" · "Gente na frente, cuidado!" |
| advance | avançando | animado, empurrando | "Pra cima deles!" · "Avança, cambada!" · "Cerca pelo lado!" |
| hold | segurando posição | firme | "Segura aí!" · "Ninguém arreda o pé!" |
| man-down | um dos deles caiu | contido | "Me acertaram!" · "Tem homem caído aqui!" |
| no-ammo | sem munição | aflito | "Cadê a munição?!" · "Acabou a bala!" |
| pinned | sob nosso fogo | assustado | "Abaixa, abaixa!" · "Não levanta, que eles atiram!" |
| machine-gun | nossa metralhadora atirando perto | pânico | "Cuidado, a metralhadora!" · "Sai da frente dessa máquina!" |
| falling-back | debandando | desespero | "Corre, corre!" · "Debanda, pessoal!" · "Não dá, vamos embora!" |
| objective | tomaram um ponto | triunfante | "Tomamos! É nosso!" · "Toca eles daqui!" |

**21 tomadas.**

### 4b. Gritos sem palavras (inimigo)

Os mesmos três gritos dos nossos, na voz do inimigo, ouvidos só quando o
nosso lado vê quem grita. Arquivo: `inimigo/<id>-1..3`.

| id | Situação | Tom | Texto |
|---|---|---|---|
| charge | a seção dele parte para o assalto | grito de arranque, alto | "Uuuuh!" · "Êêêê!" · "Hááá!" |
| pain | um dos deles é atingido | dor, contido | "Aaai!" · "Uhn!" · "Ai!" |
| dying | um dos deles cai | grito curto, desespero | "Aaaagh!" · "Ahh!" · "Ugh!" |

**9 tomadas.**

---

## Total

| Bloco | Tomadas |
|---|---|
| Ordens e respostas | 84 |
| Controle de fogo | 24 |
| Avisos dos nossos | 24 |
| Xingamentos por facção | 56 |
| Avisos do inimigo | 21 |
| Gritos sem palavras dos nossos | 9 |
| Gritos sem palavras do inimigo | 9 |
| **Total** | **227** |

## Pendências antes do catálogo

- O plano `ambient-sound-and-voices` hoje diz que o inimigo só grita sem
  palavras e lista a fala inteligível do inimigo como fora do escopo; a
  fala do inimigo (4a) pede atualizar proposal, design e o requisito
  "Soldiers call out what happens", e os xingamentos (3) pedem um novo
  tipo de aviso com quiet time próprio (~25 s) e chance de tocar.
- Fontes das frases marcadas "falta a página".
- "Sim, senhor" para a Coluna, ou um tratamento mais camarada.
