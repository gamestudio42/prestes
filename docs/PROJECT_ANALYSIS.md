# Prestes â€” AnÃ¡lise do Projeto na Fase Atual

> Snapshot: 2026-11-03  
> Update: the playable three-phase bootcamp exercise described as the next milestone is now implemented; current validation is 182 tests, 18 E2E, 952.85 kB build, hash `206ab124` and 15 durable specs. See `docs/status.md`.  
> MÃ©todo: inspeÃ§Ã£o read-only do cÃ³digo, conteÃºdo, specs, docs, testes e configuraÃ§Ã£o.
> NÃ£o foram executados build, testes ou alteraÃ§Ãµes nesta anÃ¡lise; os nÃºmeros de validaÃ§Ã£o sÃ£o os Ãºltimos registrados no projeto.  
> `openspec validate --specs` foi executado e passou 15/15 apÃ³s a implementaÃ§Ã£o.

---

## 1. Veredito executivo

O Prestes estÃ¡ em uma fase de **protÃ³tipo vertical jogÃ¡vel em formaÃ§Ã£o**, nÃ£o de jogo completo.

O que jÃ¡ Ã© sÃ³lido:

- fundaÃ§Ã£o determinÃ­stica bem pensada;
- simulaÃ§Ã£o de infantaria acima da mÃ©dia para um protÃ³tipo;
- combate, cobertura, moral, supressÃ£o, ferimentos, resgate e recuperaÃ§Ã£o;
- comandos tÃ¡ticos, formaÃ§Ãµes, pathfinding, visÃ£o e LOD;
- HUD React completo e localizado;
- cÃ¢mera ortogrÃ¡fica, pÃ³s-processamento pixel e identidade visual prÃ³pria;
- mapa grande com ambiente procedural, cobertura e cadÃ¡ver distinto de deitado;
- suÃ­te expressiva de testes unitÃ¡rios e E2E;
- processo OpenSpec jÃ¡ usado em 23 changes arquivadas.

O que ainda impede chamar isso de â€œjogoâ€:

- o tutorial Ã© uma **lista de 27 passos**, nÃ£o uma missÃ£o com objetivos, pressÃ£o, vitÃ³ria e derrota;
- nÃ£o hÃ¡ loop de campanha nem save/load de missÃ£o;
- os inimigos de treino sÃ£o inertes; nÃ£o existe fogo nÃ£o letal;
- a progressÃ£o Ã© uma sequÃªncia de aÃ§Ãµes e waypoints, sem consequÃªncia tÃ¡tica;
- existem **trÃªs pilhas de tutorial** no cÃ³digo, das quais duas estÃ£o mortas;
- documentaÃ§Ã£o e specs se contradizem sobre bootcamp Ãºnico vs campanha de 10 missÃµes;
- o workspace aberto **nÃ£o tem diretÃ³rio `.git`**;
- o CI nÃ£o roda E2E, nÃ£o roda `openspec validate`, nÃ£o roda `pnpm sim` e nÃ£o tem budget de performance;
- arte e Ã¡udio continuam placeholders procedurais.

Resumo em uma frase:

> A base tÃ©cnica e a direÃ§Ã£o visual estÃ£o boas; o produto, o conteÃºdo e a governanÃ§a do projeto estÃ£o atrasados em relaÃ§Ã£o ao motor.

---

## 2. O que o jogador encontra hoje

### Entrada

- Uma Ãºnica tela inicial.
- AÃ§Ã£o principal: **Start bootcamp**.
- Seletor de idioma PT-BR/EN.
- Codex histÃ³rico.
- NÃ£o hÃ¡ seleÃ§Ã£o de campanha, missÃ£o ou skirmish.
- O F1 abre o laboratÃ³rio sandbox.

### Bootcamp

- Mapa de treinamento de 240 Ã— 240 m.
- 11 soldados jogÃ¡veis.
- 1 instrutor NPC nÃ£o selecionÃ¡vel.
- 11 alvos de treino.
- 27 passos ordenados.
- 4 waypoints de marcha.
- 1 estaÃ§Ã£o de cobertura.
- AÃ§Ãµes ensinadas: cÃ¢mera, seleÃ§Ã£o, mover, segurar, virar, formaÃ§Ã£o, postura, Hold Fire, ataque, supressÃ£o, defesa, emboscada, recon, flanco, perseguiÃ§Ã£o, recuo, resgate, proteger oficial, movimento alternado.
- ProgressÃ£o por aÃ§Ã£o executada ou proximidade de waypoint.
- ConclusÃ£o no Ãºltimo waypoint; nÃ£o hÃ¡ objetivo de missÃ£o com vitÃ³ria/derrota.
- O painel mostra a lista de 27 passos.
- O instrutor escreve texto contextual.
- O progresso dos passos persiste em `prestes.bootcamp.steps.v1`.

### Sandbox / laboratÃ³rio

- F1 abre inspetor de unidade, step de tick, reset, placeholders de cobertura, dummies, controle dos dois lados, reforÃ§os, resgate e batalha 3v3.
- O 3v3 lab tem 66 unidades e serve como teste de performance e AI.
- Ã‰ uma ferramenta de desenvolvimento, nÃ£o a experiÃªncia principal do jogador.

### O que nÃ£o existe

- Campanha jogÃ¡vel.
- Save/load de estado de missÃ£o.
- VitÃ³ria/derrota do tutorial.
- Combate de treino com pressÃ£o real.
- Retry de estaÃ§Ã£o/fase.
- Briefing e debrief de fase.
- ProgressÃ£o de roster entre missÃµes.
- Final art, animaÃ§Ãµes finais e mix de Ã¡udio.

---

## 3. Arquitetura e fluxo

```text
apps/game
  Vite + React 19 + HUD + worker host + i18n + storage
        â”‚
        â”œâ”€â”€ packages/kernel
        â”‚     RNG xoshiro128**, FNV-1a, tick fixo
        â”‚
        â”œâ”€â”€ packages/shared
        â”‚     protocolo, mundo, terreno, visÃ£o, armas,
        â”‚     pathfinding, preview, targeting, mirror
        â”‚
        â”œâ”€â”€ packages/simulation
        â”‚     engine autoritativa, order manager, tactical helpers
        â”‚
        â”œâ”€â”€ packages/view3d
        â”‚     Three.js, cÃ¢mera, post, personagens,
        â”‚     cenÃ¡rio, cobertura, preview, tracers
        â”‚
        â””â”€â”€ packages/content
              figuras, fontes, locales, bootcamp, campanha,
              catÃ¡logo de ordens
```

### DireÃ§Ã£o de dependÃªncia

- `kernel -> shared -> simulation`
- `shared -> view3d`
- `apps/game` compÃµe tudo
- `simulation` nÃ£o pode importar Three.js, React, DOM ou Node APIs
- O ESLint aplica essa regra e proÃ­be `Math.random`, `Date`, `performance`, `window`, `document`, `localStorage`, `Math.sin/cos/atan2`, etc. no kernel/simulation.

### Fluxo de execuÃ§Ã£o

1. O React monta `GameClient`.
2. `GameClient` cria o Web Worker.
3. O worker instancia `SimulationEngine`.
4. O worker envia `ready` e depois `frame` a cada `step`.
5. `ClientMirror` guarda o Ãºltimo frame read-only.
6. O React lÃª frames e envia comandos.
7. O HUD nunca muta o estado da simulaÃ§Ã£o diretamente.

Esse desenho Ã© correto e Ã© um dos pontos mais fortes do projeto.

---

## 4. Estado por camada

### 4.1 Kernel e shared

**Kernel**

- xoshiro128** semeado.
- Hash FNV-1a.
- Tick fixo de 100 ms.
- Helpers de tempo.
- 7 testes prÃ³prios.

**Shared**

- Protocolo de comandos, eventos, frames e snapshots.
- World/covers/LOS.
- Terreno determinÃ­stico.
- Pathfinding A*.
- Preview de ordens.
- Target groups.
- Vision cone.
- Armas.
- Client mirror.
- Placement/rotaÃ§Ã£o.
- 9 arquivos de teste, aproximadamente 42 testes.

**Pontos fortes**

- Fronteira bem definida.
- Determinismo testÃ¡vel.
- Pathfinding, preview e simulaÃ§Ã£o compartilham a mesma geometria.
- Sem dependÃªncia de DOM/Three no shared.

**Pontos de atenÃ§Ã£o**

- `preview.ts` tem 537 linhas e concentra muita lÃ³gica de apresentaÃ§Ã£o e planejamento.
- `protocol.ts` tem 233 linhas e cresce a cada feature; ainda Ã© controlÃ¡vel.
- A API de preview jÃ¡ recebeu otimizaÃ§Ãµes, mas ainda Ã© um ponto de acoplamento entre simulaÃ§Ã£o e HUD.

---

### 4.2 Simulation

Arquivo principal:

- `packages/simulation/src/engine.ts` â€” **4.085 linhas**.

Outros:

- `order-manager.ts` â€” 2 testes.
- `tactical.ts` â€” 53 linhas, helpers de score e flanco.
- `worker-host.ts` â€” adapter do worker.

Cobertura:

- 75 testes em `engine.test.ts`.
- 5 em `tactical.test.ts`.
- 2 em `order-manager.test.ts`.

O que a simulaÃ§Ã£o jÃ¡ faz:

- tick determinÃ­stico;
- comandos e eventos;
- facÃ§Ãµes e squads;
- armas, muniÃ§Ã£o, recarga e cadÃªncia;
- cobertura direcional;
- LOS com terreno e obstÃ¡culos;
- visÃ£o em cone de 65Â°;
- aquisiÃ§Ã£o de alvos com score;
- moral, supressÃ£o, pin, panic e rout;
- ferimentos, incapacitaÃ§Ã£o, morte, resgate, evacuaÃ§Ã£o e recuperaÃ§Ã£o;
- fadiga e coesÃ£o;
- pathfinding e rotas;
- formaÃ§Ãµes line/column/wedge/free;
- move, move_line, attaque, suppress, flank, withdraw, hold;
- advance, defend, ambush, disperse, recon, reserve, regroup, protect-officer, pursue, rescue;
- bounding/alternating movement;
- cover-first destinations;
- separaÃ§Ã£o de unidades;
- repair de movimento travado;
- reset/step/headless;
- spawn de tropas e covers em sandbox/treinamento.

**Pontos fortes**

- Ã‰ o nÃºcleo mais maduro do projeto.
- O hash Ã© estÃ¡vel: `f82951fa` nas duas Ãºltimas execuÃ§Ãµes registradas.
- As regras de lint mantÃªm a simulaÃ§Ã£o headless.
- Os testes cobrem muitos estados e transiÃ§Ãµes.

**Pontos de atenÃ§Ã£o**

- `engine.ts` Ã© um monÃ³lito de 4.085 linhas.
- O design doc `INFANTRY_COMMAND_IMPLEMENTATION.md` previa mÃ³dulos como `unit-controller.ts`, `movement.ts`, `casualties.ts` e `rescue.ts`; a implementaÃ§Ã£o real ainda concentra grande parte disso no engine.
- O `OrderManager` atual Ã© fino: valida quem pode receber ordem; nÃ£o Ã© o ownership completo de fila/prioridade descrito no documento.
- HÃ¡ lÃ³gica de apresentaÃ§Ã£o e de combate no mesmo arquivo, embora separadas por mÃ©todos.
- O custo de manutenÃ§Ã£o tende a crescer rÃ¡pido com novas missÃµes, IA e cenÃ¡rios.

---

### 4.3 Content e tutorial

Arquivos relevantes:

- `packages/content/src/training-campaign.ts` â€” 324 linhas.
- `packages/content/src/boot-camp.ts` â€” 208 linhas, **morto**.
- `apps/game/src/training/director.ts` â€” diretor atual.
- `apps/game/src/training/progress.ts` â€” progresso da campanha antiga.
- `apps/game/src/tutorial/director.ts` â€” **morto**.
- `apps/game/src/tutorial/progress.ts` â€” **morto**.
- `apps/game/src/ui/TrainingMissionPanel.tsx` â€” vivo.
- `apps/game/src/ui/TutorialPanel.tsx` â€” **morto**.
- `apps/game/src/ui/TrainingCampaignScreen.tsx` â€” **morto**.

O que existe:

- `BOOTCAMP_MISSION`: missÃ£o Ãºnica de bootcamp com 27 passos, 4 waypoints e 1 cover station.
- `TRAINING_MISSIONS`: campanha antiga de 10 missÃµes, com 2 â€œplayableâ€ e 8 â€œplannedâ€.
- `BOOT_CAMP_CHAPTERS`: tutorial antigo em 6 capÃ­tulos.
- `TrainingAction`/`TrainingStep`: modelo atual de checklist.
- `TrainingState`: passos completados, paused, completed.
- O progresso usa `prestes.bootcamp.steps.v1` para o bootcamp atual e `prestes.training.v1` para a campanha antiga.

Problema central:

- O App usa **somente** `BOOTCAMP_MISSION`.
- `TRAINING_MISSIONS` nÃ£o Ã© exposta ao jogador.
- `BOOT_CAMP_CHAPTERS` nÃ£o Ã© exposta ao jogador.
- `TrainingCampaignScreen` e `TutorialPanel` nÃ£o sÃ£o importados pelo App.
- Ainda assim, existem testes ativos para esses mÃ³dulos mortos.
- O diretor atual de bootcamp transforma o tutorial em uma sequÃªncia de aÃ§Ãµes, nÃ£o em uma missÃ£o.

---

### 4.4 View3D e apresentaÃ§Ã£o

Arquivos:

- `scene-view.ts` â€” 528 linhas.
- `character-layer.ts` â€” 598 linhas.
- `world-layer.ts` â€” 667 linhas.
- `cover-layer.ts` â€” 215 linhas.
- `training-layer.ts` â€” 205 linhas.
- `camera-rig.ts`, `post.ts`, `path-layer.ts`, `preview-layer.ts`, `tracer-layer.ts`.
- `styles.css` â€” 4.221 linhas.

O que jÃ¡ existe:

- cÃ¢mera ortogrÃ¡fica com bandas tÃ¡tica, transiÃ§Ã£o e estratÃ©gica;
- tilt tÃ¡tico e top-down estratÃ©gico;
- pan, zoom, rotaÃ§Ã£o e texel snapping;
- pÃ³s-processamento pixel com outline, bloom, grade, dither e vinheta;
- personagens low-poly procedurais;
- corpo separado para morto, com uniforme dessaturado, sangue e sem anel;
- proxy estratÃ©gico distinto para cadÃ¡ver;
- ambiente procedural: fazenda, celeiro, capela, ruÃ­na, moinho, campos, cercas, postes, fios, Ã¡rvores, pedras, capim e carroÃ§a;
- cobertura detalhada instanciada: sacos, blocos, barris e trincheira;
- preview rÃ¡pido de movimento;
- LOD de personagens por span.

**Pontos fortes**

- A direÃ§Ã£o visual jÃ¡ tem identidade.
- O uso de toon + paleta Ãºnica funciona.
- O cadÃ¡ver agora Ã© claramente distinto do soldado deitado.
- O mapa deixou de ser um graybox vazio.

**Pontos de atenÃ§Ã£o**

- Tudo ainda Ã© procedural/placeholder; nÃ£o hÃ¡ GLB final de personagem em produÃ§Ã£o.
- `styles.css` Ã© um monÃ³lito de 4.221 linhas.
- `world-layer.ts` e `character-layer.ts` cresceram bastante.
- NÃ£o hÃ¡ teste de regressÃ£o visual automatizado.
- O FPS headless medido no modo tÃ¡tico ficou em cerca de 29 FPS; em GPU real ainda nÃ£o foi validado.
- O bundle estÃ¡ em 948,04 kB antes de gzip, com aviso de chunk grande.
- O tempo de inicializaÃ§Ã£o observado ficou em torno de 3 s no ambiente headless.

---

### 4.5 App, HUD e Ã¡udio

Arquivos:

- `App.tsx` â€” 1.421 linhas.
- `Hud.tsx` â€” 935 linhas.
- `GameCanvas.tsx` â€” 351 linhas.
- `SandboxPanel.tsx` â€” 282 linhas.
- `StartScreen.tsx`, `TrainingMissionPanel.tsx`, `CodexPanel.tsx`, `Tooltip.tsx`, `HudIcons.tsx`.

O que jÃ¡ existe:

- React 19.
- Vite 7.
- Worker.
- HUD com cartÃµes de seÃ§Ã£o, arma, moral, cobertura, fadiga, muniÃ§Ã£o e formaÃ§Ã£o.
- Tooltips localizados.
- CÃ³dice.
- Mute/volume persistidos.
- HUD ocultÃ¡vel.
- Preview opcional.
- Sandbox.
- Painel de treinamento.
- Tela inicial.
- LocalizaÃ§Ã£o PT-BR/EN.

**Pontos fortes**

- O HUD Ã© visualmente coerente e funcional.
- Strings player-facing passam pelo catÃ¡logo.
- O lint proÃ­be JSX text hardcoded.
- O catÃ¡logo tem 524 chaves e validaÃ§Ã£o de paridade.

**Pontos de atenÃ§Ã£o**

- `App.tsx` acumula estado de sessÃ£o, treino, sandbox, Ã¡udio, cÃ¢mera, seleÃ§Ã£o, ordens, preview, placement, codex e persistÃªncia.
- `Hud.tsx` tem quase mil linhas.
- NÃ£o hÃ¡ testes de componente React; a cobertura de UI Ã© sÃ³ E2E.
- O Ã¡udio Ã© um Ãºnico tiro procedural; nÃ£o hÃ¡ mÃºsica, voz ou mix.

---

## 5. Estado do tutorial/bootcamp

### O que o jogador faz hoje

- Entra no bootcamp.
- Recebe uma lista de 27 passos.
- Executa cÃ¢mera, seleÃ§Ã£o, movimento, ordens e posturas.
- Marcha por 4 waypoints.
- Ao completar o Ãºltimo waypoint, o bootcamp termina.
- Pode repetir ou continuar.
- â€œContinuarâ€ encerra a sessÃ£o; nÃ£o inicia uma campanha.

### O que Ã© ensinado

- CÃ¢mera: pan, zoom, rotaÃ§Ã£o.
- SeleÃ§Ã£o de tropa.
- Mover, segurar, virar.
- FormaÃ§Ã£o.
- Crouch, prone, stand.
- Cobertura.
- Hold Fire.
- Attack, suppress, defend, ambush, recon, flank, pursue, withdraw.
- Rescue.
- Protect officer.
- Alternating movement.

### O que falta para ser â€œjogÃ¡velâ€

- Objetivo de missÃ£o com condiÃ§Ã£o de vitÃ³ria.
- CondiÃ§Ã£o de derrota.
- PressÃ£o de combate.
- Inimigo que reage.
- Briefing.
- Debrief.
- Falha e retry.
- Ritmo de 3 fases.
- Feedback de progresso por objetivo, nÃ£o por botÃ£o.

### DiagnÃ³stico

O tutorial atual Ã© um **checklist interativo de comandos**, nÃ£o uma missÃ£o. Ele ensina a interface, mas nÃ£o ensina a tomar decisÃµes sob pressÃ£o.

O prÃ³ximo passo correto Ã© o plano de 3 fases jÃ¡ discutido:

1. formar a tropa;
2. tomar a trincheira com supressÃ£o e flanco;
3. segurar a trincheira contra um contra-ataque.

Isso transforma o bootcamp em uma experiÃªncia com objetivo, falha e leitura tÃ¡tica.

---

## 6. OpenSpec e documentaÃ§Ã£o

### Estado do OpenSpec

- 23 changes arquivadas.
- Nenhuma change ativa no momento.
- 16 specs durÃ¡veis.
- 189 requirements.
- 439 scenarios.
- `openspec validate --specs` passou 16/16.

Specs atuais:

| Spec | Requirements |
|---|---:|
| simulation | 42 |
| presentation | 45 |
| orders | 11 |
| sandbox | 19 |
| boot-camp | 10 |
| bootcamp | 6 |
| casualties | 6 |
| formations | 7 |
| tactical-preview | 7 |
| historical-content | 8 |
| localization | 6 |
| delivery | 7 |
| battle-lab | 4 |
| weapons | 5 |
| audio | 3 |
| terrain | 3 |

### Conflito crÃ­tico de specs

Existem duas specs de bootcamp:

- `openspec/specs/bootcamp/spec.md`
  - bootcamp Ãºnico;
  - 11 soldados;
  - instrutor NPC;
  - 27 passos;
  - sem campanha de 10 missÃµes;
  - sem select-all;
  - progressÃ£o por estaÃ§Ãµes.

- `openspec/specs/boot-camp/spec.md`
  - campanha de 10 missÃµes;
  - missÃ£o 1 ensina select-all;
  - missÃµes 1â€“2 jogÃ¡veis;
  - missions 3â€“10 bloqueadas.

Elas se contradizem diretamente. A validaÃ§Ã£o estrutural passa, mas a verdade semÃ¢ntica estÃ¡ quebrada.

AlÃ©m disso, `presentation/spec.md` ainda contÃ©m requisitos de:
- tela de campanha de treinamento;
- boot camp separado do start;
- shell de tutorial por capÃ­tulo.

Parte disso nÃ£o corresponde ao App atual.

### DocumentaÃ§Ã£o desatualizada

- `README.md` diz â€œfirst playable skirmishâ€ e â€œcampaign and save/load are not implemented yetâ€.
- `docs/status.md` diz que â€œCampo de InstruÃ§Ã£o is now a ten-mission training campaignâ€.
- `docs/architecture.md` tambÃ©m descreve a campanha de 10 missÃµes.
- O App atual usa bootcamp Ãºnico.
- `docs/status.md` mistura o estado antigo com o atual e lista features que nÃ£o estÃ£o mais expostas.

ConsequÃªncia:

> Um novo desenvolvedor ou agente nÃ£o consegue saber, sÃ³ pela documentaÃ§Ã£o, qual Ã© a experiÃªncia canÃ´nica.

---

## 7. Qualidade e testes

### UnitÃ¡rios

- 28 arquivos.
- 192 testes.
- Foco muito forte em simulation (75 testes).
- Cobertura relevante de shared, content e view3d helpers.

DistribuiÃ§Ã£o aproximada:

| Ãrea | Testes |
|---|---:|
| simulation/engine | 75 |
| shared | ~40 |
| content | ~30 |
| view3d | 11 |
| app/training/tutorial | ~16 |
| kernel | 7 |
| audio | 4 |

### E2E

- 17 testes Playwright.
- 1 worker.
- Cobre bootcamp, sandbox, both sides, preview/HUD, seleÃ§Ã£o, ordens tÃ¡ticas e formaÃ§Ã£o.
- Alguns testes sÃ£o sensÃ­veis a tempo e ao custo de inicializaÃ§Ã£o.
- O tempo total da suÃ­te ficou em 3â€“5 minutos nas Ãºltimas execuÃ§Ãµes.
- HÃ¡ testes que precisaram de espera explÃ­cita por frame e de hold fire para nÃ£o morrerem no setup.

### O que estÃ¡ bom

- Determinismo tem teste real via hash.
- Comandos invÃ¡lidos tÃªm testes.
- Casualidades, resgate, recuperaÃ§Ã£o e fila tÃªm testes.
- FormaÃ§Ãµes, pathfinding, preview e visÃ£o tÃªm testes.
- E2E cobre fluxos de UI importantes.
- O projeto usa validaÃ§Ãµes de locale e conteÃºdo.

### O que falta

- CI nÃ£o roda `pnpm e2e`.
- CI nÃ£o roda `pnpm sim`.
- CI nÃ£o roda `openspec validate`.
- NÃ£o hÃ¡ coverage threshold.
- NÃ£o hÃ¡ teste de acessibilidade (axe).
- NÃ£o hÃ¡ teste de regressÃ£o visual.
- NÃ£o hÃ¡ budget de performance.
- NÃ£o hÃ¡ teste de componente React.
- Testes de mÃ³dulos mortos continuam rodando.

---

## 8. Performance

Ãšltimos nÃºmeros registrados:

- Build: **948,04 kB** JS antes de gzip.
- Aviso de chunk > 500 kB.
- SimulaÃ§Ã£o headless: hash estÃ¡vel `f82951fa`.
- Benchmark anterior de 66 unidades no 3v3: ~1,85 ms/tick.
- Browser headless em modo tÃ¡tico: ~29 FPS.
- InicializaÃ§Ã£o observada: ~3 s.
- 3v3 lab: 66 unidades, AI ativa, cobertura e navegaÃ§Ã£o.

### Leitura

- A simulaÃ§Ã£o em si estÃ¡ rÃ¡pida.
- O gargalo provÃ¡vel estÃ¡ em render, quantidade de draw calls, geraÃ§Ã£o procedural e startup do Three.js.
- 29 FPS headless nÃ£o Ã© necessariamente 29 FPS em GPU real, mas Ã© um sinal de que o orÃ§amento visual ainda nÃ£o foi medido.
- O bundle de ~948 kB Ã© aceitÃ¡vel para um game prototype, mas nÃ£o estÃ¡ code-split.
- O custo de inicializaÃ§Ã£o pode piorar com o novo mapa e com o bootcamp jogÃ¡vel.

### RecomendaÃ§Ã£o

Antes de aumentar muito o conteÃºdo:

- medir FPS em GPU real;
- medir tempo de boot;
- definir budget de draw calls e triÃ¢ngulos;
- adicionar um teste de fumaÃ§a de performance no CI ou num job noturno;
- considerar code splitting do HUD/codex/sandbox.

---

## 9. DÃ­vida tÃ©cnica e cÃ³digo morto

### MonÃ³litos

| Arquivo | Linhas | Risco |
|---|---:|---|
| `packages/simulation/src/engine.ts` | 4.085 | alto |
| `apps/game/src/styles.css` | 4.221 | alto |
| `apps/game/src/App.tsx` | 1.421 | alto |
| `apps/game/src/ui/Hud.tsx` | 935 | mÃ©dio-alto |
| `packages/content/src/training-campaign.ts` | 324 | mÃ©dio |

O tamanho nÃ£o Ã© um problema por si sÃ³, mas o custo de navegaÃ§Ã£o, revisÃ£o e merge cresce muito.

### CÃ³digo morto confirmado

- `packages/content/src/boot-camp.ts`
- `apps/game/src/tutorial/director.ts`
- `apps/game/src/tutorial/progress.ts`
- `apps/game/src/ui/TutorialPanel.tsx`
- `apps/game/src/ui/TrainingCampaignScreen.tsx`
- `TRAINING_MISSIONS` dentro de `training-campaign.ts`

### Testes que sustentam cÃ³digo morto

- `packages/content/test/boot-camp.test.ts` â€” 3 testes
- `tests/tutorial/director.test.ts` â€” 4 testes
- `tests/tutorial/progress.test.ts` â€” 3 testes
- `packages/content/test/training-campaign.test.ts` â€” 3 testes focados na campanha antiga

Total aproximado: **10â€“13 testes** que dÃ£o sensaÃ§Ã£o de cobertura, mas protegem cÃ³digo que o jogador nÃ£o usa.

### Outros sinais

- Dois sistemas de progresso (`bootcamp.steps` e `training.v1`).
- Duas specs de bootcamp.
- DocumentaÃ§Ã£o que descreve uma campanha de 10 missÃµes que nÃ£o estÃ¡ no App.
- `README`, `docs/status`, `docs/architecture` e `BOOTCAMP_CHECKLIST` em estados diferentes.
- `docs/design/INFANTRY_COMMAND_IMPLEMENTATION.md` descreve fases de refatoraÃ§Ã£o que nÃ£o foram concluÃ­das.

---

## 10. Riscos

| Risco | Severidade | Impacto | MitigaÃ§Ã£o |
|---|---|---|---|
| Sem `.git` no workspace | CrÃ­tica | NÃ£o hÃ¡ histÃ³rico, diff confiÃ¡vel, CI real ou rollback | Inicializar/conectar o repositÃ³rio antes de qualquer nova feature |
| Specs de bootcamp conflitantes | Alta | Agentes e devs implementam coisas diferentes | Resolver `bootcamp` vs `boot-camp` e atualizar `presentation` |
| DocumentaÃ§Ã£o desatualizada | Alta | DecisÃµes erradas e retrabalho | Atualizar README/status/architecture junto da prÃ³xima change |
| Tutorial ainda Ã© checklist | Alta | NÃ£o entrega a fantasia de comando | Implementar a missÃ£o de 3 fases |
| CÃ³digo morto de tutorial | MÃ©dia | ConfusÃ£o, testes falsos, manutenÃ§Ã£o | Remover ou isolar em `legacy/` com testes desativados |
| Engine monolÃ­tico | MÃ©dia | Custo crescente de features e bugs | Refatorar depois do slice jogÃ¡vel, nÃ£o antes |
| CI nÃ£o roda E2E/sim | MÃ©dia | RegressÃµes passam no PR | Adicionar jobs noturnos ou bloquear PR com E2E |
| Performance real nÃ£o medida | MÃ©dia | Risco de o mapa ficar pesado em GPU fraca | Budget + benchmark real |
| Direito da imagem do menu | MÃ©dia | Risco legal na publicaÃ§Ã£o | Resolvido em 2026-11-03: dominio publico, verificado pelo dono do projeto |
| Assets finais ausentes | MÃ©dia | Visual ainda nÃ£o Ã© â€œfinalâ€ | Pipeline `pnpm models` e arte final |
| Sem save/load de missÃ£o | Baixa/MÃ©dia | SessÃµes longas nÃ£o persistem | Planejar com a campanha |
| Sem acessibilidade automatizada | Baixa/MÃ©dia | Barreiras de uso | Adicionar axe em E2E |

---

## 11. Lacunas para â€œjogo jogÃ¡velâ€

### Produto

- Uma missÃ£o com objetivo, falha e vitÃ³ria.
- Um tutorial que ensina decisÃ£o, nÃ£o sÃ³ botÃ£o.
- Um final de sessÃ£o com debrief.
- Um prÃ³ximo passo apÃ³s o bootcamp.

### ConteÃºdo

- MissÃ£o de 3 fases.
- Inimigo de treino nÃ£o letal.
- DiÃ¡logo contextual por fase.
- Marcadores de zona, aproximaÃ§Ã£o e defesa.
- CritÃ©rios de falha.

### SimulaÃ§Ã£o

- Flag `nonLethal` para tropas de treino.
- `role` para identificar inimigos de treino.
- Comando de limpeza de onda para retry.
- Objetivos avaliados a partir do frame, sem segundo estado de combate.

### UI

- Painel de objetivos, nÃ£o lista de 27 passos.
- Timer de defesa.
- Painel de falha.
- BotÃ£o de repetir fase.
- Briefing e debrief.

### Processo

- Uma change OpenSpec nova.
- Spec de bootcamp reconciliada.
- Spec antiga `boot-camp` marcada como obsoleta ou removida do fluxo.
- DocumentaÃ§Ã£o atualizada.
- CI com E2E e validaÃ§Ã£o OpenSpec.

---

## 12. Roadmap recomendado

### Fase A â€” Tornar o bootcamp jogÃ¡vel

**Prioridade: P0**

- Criar a change OpenSpec `add-playable-bootcamp-exercise`.
- Modelo de fases e objetivos.
- Fogo nÃ£o letal.
- TrÃªs fases: formaÃ§Ã£o, assalto, defesa.
- HUD de objetivos.
- Marcadores de zona.
- Falha e retry.
- Debrief.
- Testes unitÃ¡rios e E2E.
- ValidaÃ§Ã£o manual.

Essa Ã© a prÃ³xima entrega de produto.

### Fase B â€” Limpeza e coerÃªncia

**Prioridade: P0/P1**

- Resolver `bootcamp` vs `boot-camp`.
- Remover ou isolar:
  - `boot-camp.ts`;
  - `tutorial/*`;
  - `TutorialPanel`;
  - `TrainingCampaignScreen`;
  - `TRAINING_MISSIONS`.
- Unificar progresso do bootcamp.
- Atualizar README, status, architecture e checklist.
- Atualizar a spec de presentation.

### Fase C â€” Qualidade de engenharia

**Prioridade: P1**

- CI com `pnpm e2e`, `pnpm sim` e `openspec validate`.
- Coverage threshold.
- Budget de performance.
- Teste de regressÃ£o visual.
- Acessibilidade com axe.
- MediÃ§Ã£o em GPU real.

### Fase D â€” RefatoraÃ§Ã£o estrutural

**Prioridade: P1/P2**

- Extrair do engine:
  - movimento;
  - formaÃ§Ãµes;
  - casualidades/resgate;
  - defesa/emboscada/recon;
  - controller de unidade.
- Dividir `App.tsx` em hooks/domÃ­nios.
- Dividir `Hud.tsx` em subcomponentes.
- Dividir `styles.css` por domÃ­nio.

### Fase E â€” ConteÃºdo e produÃ§Ã£o

**Prioridade: P2**

- Campanha histÃ³rica.
- Save/load.
- Mais mapas.
- Arte final.
- Ãudio completo.
- Acessibilidade e idiomas adicionais.
- Deployment final.

---

## 13. PrÃ³xima change recomendada

Nome sugerido:

```text
add-playable-bootcamp-exercise
```

Artefatos:

```text
openspec/changes/add-playable-bootcamp-exercise/
  proposal.md
  design.md
  tasks.md
  specs/bootcamp/spec.md
  specs/simulation/spec.md
  specs/presentation/spec.md
```

ConteÃºdo mÃ­nimo:

- 3 fases com objetivos.
- fogo de treino nÃ£o letal.
- `role`/`nonLethal` no protocolo.
- objetivos `reach`, `suppress`, `secure`, `hold`, `protect-officer`.
- HUD de objetivos.
- marcadores de zona.
- falha e retry.
- debrief.
- testes unitÃ¡rios e E2E.

CritÃ©rios de aceite:

- entrar no bootcamp e nÃ£o haver fogo automÃ¡tico;
- completar a fase 1 por movimento real;
- fase 2 exigir supressÃ£o e tomada da trincheira;
- fase 3 segurar por 60 s;
- falhar a defesa e conseguir repetir a fase;
- PT-BR e EN;
- `pnpm check`, `pnpm build`, `pnpm e2e`, `pnpm sim` e `openspec validate` verdes.

---

## 14. DecisÃµes pendentes

1. **Remover de vez** o tutorial antigo de 6 capÃ­tulos e a campanha de 10 missÃµes, ou mantÃª-los como arquivo histÃ³rico fora do build?
2. **Retry da fase**: repetir a fase em memÃ³ria (recomendado) ou reiniciar o bootcamp inteiro?
3. **Fogo nÃ£o letal**: sÃ³ supressÃ£o e pin, sem incapacitaÃ§Ã£o (recomendado), ou permitir â€œbaixasâ€ simuladas?
4. **3v3 lab**: continua como ferramenta F1 de desenvolvimento ou vira modo jogÃ¡vel oculto?
5. **RepositÃ³rio**: inicializar/conectar o `.git` antes da prÃ³xima feature?
6. **Imagem do menu**: verificar direitos ou substituir antes de publicaÃ§Ã£o? **Resolvido (2026-11-03):** dominio publico, verificado pelo dono do projeto.

---

## 15. MÃ©tricas e evidÃªncias

| MÃ©trica | Valor atual |
|---|---|
| Specs durÃ¡veis | 16 |
| Requirements | 189 |
| Scenarios | 439 |
| Changes arquivadas | 23 |
| Changes ativas | 0 |
| Arquivos de teste unitÃ¡rio | 28 |
| Testes unitÃ¡rios | 192 |
| Testes E2E | 17 |
| Chaves de locale | 524 |
| Build JS | 948,04 kB |
| Hash determinÃ­stico | `f82951fa` |
| FPS headless tÃ¡tico | ~29 FPS |
| Startup headless | ~3 s |
| Benchmark 66 unidades | ~1,85 ms/tick |
| OpenSpec validate | 16/16 |

ObservaÃ§Ã£o:

- `pnpm check`, `pnpm build`, `pnpm e2e` e `pnpm sim` foram executados na Ãºltima rodada de implementaÃ§Ã£o, antes desta anÃ¡lise.
- `openspec validate --specs` foi executado agora e passou.
- NÃ£o houve playtest humano registrado nesta fase.

---

## 16. InventÃ¡rio resumido

### Apps

- `apps/game`: cliente Vite/React, HUD, worker, Ã¡udio, sandbox, bootcamp.

### Packages

- `packages/kernel`: determinismo.
- `packages/shared`: protocolo e geometria compartilhada.
- `packages/simulation`: motor.
- `packages/view3d`: Three.js e apresentaÃ§Ã£o.
- `packages/content`: conteÃºdo, locales, figuras, sources.

### Tools

- `tools/headless-sim.ts`
- `tools/sim-bench.ts`
- `tools/check-locales.ts`
- `tools/check-content.ts`
- `tools/prepare-models.ts`

### Testes

- 28 arquivos Vitest.
- 7 arquivos Playwright.
- 23 changes OpenSpec arquivadas.

### DocumentaÃ§Ã£o

- `README.md`
- `docs/status.md`
- `docs/architecture.md`
- `docs/BOOTCAMP_CHECKLIST.md`
- `docs/assets.md`
- `docs/decisions/0001-foundation.md`
- `docs/decisions/0002-visual-language.md`
- `docs/design/INFANTRY_COMMAND.md`
- `docs/design/INFANTRY_COMMAND_IMPLEMENTATION.md`
- `docs/history/*`

---

## 17. ConclusÃ£o

O Prestes jÃ¡ tem uma fundaÃ§Ã£o tÃ©cnica sÃ©ria e uma identidade visual em construÃ§Ã£o. O que falta nÃ£o Ã© â€œmais cÃ³digo de simulaÃ§Ã£oâ€; Ã© **produto jogÃ¡vel**.

A prÃ³xima grande virada deve ser:

1. transformar o bootcamp em uma missÃ£o de 3 fases com objetivos, fogo nÃ£o letal, falha e retry;
2. limpar a dÃ­vida de tutoriais duplicados;
3. reconciliar specs e documentaÃ§Ã£o;
4. colocar E2E e validaÃ§Ã£o OpenSpec no CI;
5. sÃ³ entÃ£o expandir para campanha, arte final e Ã¡udio.

Sem esses passos, o projeto corre o risco de acumular features sobre uma experiÃªncia que ainda nÃ£o fecha o ciclo bÃ¡sico de â€œjogar, decidir, vencer ou falhar e tentar de novoâ€.




