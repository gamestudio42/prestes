# Roteiro de gravação — rascunho

Rascunho para revisão do dono, antes do catálogo `VOICE_LINES`
(`ambient-sound-and-voices` 5.1). Quando o catálogo existir, o roteiro
oficial passa a ser gerado em `docs/audio/VOICE_SCRIPT.md` e este arquivo
sai.

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

## 3. Xingamentos dos nossos no tiroteio (1 tomada cada)

Esporádicos, só em combate, resmungados entre um tiro e outro.
Arquivo: `soldado/curse-<nº>-1`.

| nº | Tom | Texto | Lado / fonte |
|---|---|---|---|
| 01 | raiva, dentes cerrados | "Com mil diabos!" | qualquer |
| 02 | irritado | "Diacho!" | qualquer |
| 03 | explosivo | "Raios os partam!" | qualquer |
| 04 | cansado | "Arre, que não acaba!" | qualquer |
| 05 | assustado | "Valha-me Deus!" | qualquer |
| 06 | espantado | "Cruz-credo, essa passou raspando!" | qualquer |
| 07 | frustrado | "Peste! Errei o desgraçado." | qualquer |
| 08 | ofegante | "Esse sol do diabo…" | qualquer |
| 09 | desdém | "Cambada!" | qualquer |
| 10 | raiva | "Corja de cachorros!" | qualquer |
| 11 | provocando, alto | "Vem, cabra safado!" | qualquer |
| 12 | escárnio | "Atira direito, sem-vergonha!" | qualquer |
| 13 | ódio | "Canalhas!" | qualquer |
| 14 | ao mirar | "Toma, filho da mãe!" | qualquer |
| 15 | ameaça baixa | "Espera que tu vai ver, desgraçado." | qualquer |
| 16 | desprezo | "Chimangos!" · "Lá vêm os chimangos!" | Coluna — macaulay-1974 p. 48 |
| 17 | zombando | "Corre, provisório!" | Coluna — macaulay-1974 pp. 48, 55 |
| 18 | desprezo | "Revoltosos de uma figa!" | Legalistas — falta a página |
| 19 | raiva | "Bandidos!" | Legalistas — falta a página |

**20 tomadas** (16 tem duas).

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

### 4b. Xingamentos do inimigo

| nº | Tom | Texto | Quem / fonte |
|---|---|---|---|
| 01 | provocando | "Vem, revoltoso!" | contra a Coluna — falta a página |
| 02 | desprezo | "Bando de bandidos!" | contra a Coluna — falta a página |
| 03 | escárnio, alto | "Cadê o tal do Prestes?" | contra a Coluna |
| 04 | ganancioso | "Atira, que o coronel paga!" | jagunços dos batalhões patrióticos — macaulay-1974 p. 189 (pagos e armados pelo governo) |
| 05 | raiva | "Cachorros!" | qualquer |
| 06 | ameaça | "Daqui vocês não saem!" | qualquer |
| 07 | escárnio | "Corre, frouxo!" | qualquer |
| 08 | raiva | "Com mil diabos, de onde vem esse tiro?" | qualquer |
| 09 | desafio | "Aparece, covarde!" | qualquer |
| 10 | contra legalistas | "Morra o governo!" | inimigo da Coluna quando o jogador é legalista — falta a página |

**10 tomadas.**

### 4c. Gritos sem palavras (inimigo)

5 tomadas, `inimigo/shout-1..5`: urros curtos de carga ("êêê!", "eia!",
"uuuh!"), um grito de dor contido, um "ô!" de chamada.

---

## Total

| Bloco | Tomadas |
|---|---|
| Ordens e respostas | 84 |
| Avisos dos nossos | 24 |
| Xingamentos dos nossos | 20 |
| Avisos do inimigo | 21 |
| Xingamentos do inimigo | 10 |
| Gritos do inimigo | 5 |
| **Total** | **164** |

## Pendências antes do catálogo

- O plano `ambient-sound-and-voices` hoje diz que o inimigo só grita sem
  palavras e lista a fala inteligível do inimigo como fora do escopo; a
  fala do inimigo (4a, 4b) pede atualizar proposal, design e o requisito
  "Soldiers call out what happens", e os xingamentos (3, 4b) pedem um novo
  tipo de aviso com quiet time próprio (~25 s) e chance de tocar.
- Fontes das frases marcadas "falta a página".
- "Sim, senhor" para a Coluna, ou um tratamento mais camarada.
