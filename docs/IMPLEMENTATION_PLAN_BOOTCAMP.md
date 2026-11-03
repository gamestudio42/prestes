# Plano de Implantação — Bootcamp Jogável

> Próxima grande virada do Prestes  
> Snapshot inicial: 2026-11-03  
> Change OpenSpec proposta: `add-playable-bootcamp-exercise`  
> Base: `docs/PROJECT_ANALYSIS.md`

---

## 1. Objetivo

Transformar o tutorial atual — uma sequência de 27 passos com ações e waypoints — em uma **missão jogável de três fases**, com:

- objetivos de missão;
- pressão de combate não letal;
- decisões táticas reais;
- vitória;
- derrota;
- repetição de fase;
- debrief final.

O bootcamp deixa de ser um checklist de interface e passa a ser a primeira experiência completa do jogo.

---

## 2. Definição de pronto

A entrega só é considerada concluída quando um jogador conseguir:

1. iniciar o bootcamp;
2. entender o objetivo da fase 1 pelo painel e pelo instrutor;
3. selecionar a tropa, mover até a zona de reunião e concluir a fase;
4. entrar na fase 2, receber fogo não letal e usar supressão + flanco para tomar a trincheira;
5. entrar na fase 3 e segurar a trincheira por 60 segundos;
6. falhar a defesa de propósito e conseguir repetir apenas a fase;
7. concluir o exercício e ver um debrief;
8. jogar tudo em PT-BR e EN;
9. não sofrer fogo automático ao entrar;
10. rodar `pnpm check`, `pnpm build`, `pnpm e2e` e `pnpm sim` sem regressões.

---

## 3. Por que esta é a próxima grande virada

O projeto já tem motor, HUD, mapa, combate, cobertura e localização. O gargalo atual não é técnico; é de produto.

Hoje:

- o tutorial ensina botões, não decisões;
- não há objetivo com consequência;
- não há falha;
- não há razão para usar supressão, flanco ou defesa;
- o jogador não fecha o ciclo “decidir → agir → ler o resultado → tentar de novo”.

Essa entrega cria o primeiro ciclo completo de jogo.

---

## 4. Escopo

### Dentro do escopo

- Uma missão de bootcamp em três fases.
- Fogo de treino não letal.
- Papéis (`role`) para tropas de treino.
- Objetivos `reach`, `suppress`, `secure`, `hold` e `protect-officer`.
- HUD de objetivos por fase.
- Marcadores de zona, aproximação e defesa.
- Falha e repetição da fase.
- Persistência de fase concluída.
- Debrief final.
- Testes unitários e E2E.
- Atualização de specs e documentação.
- Remoção/isolamento do tutorial legado morto.

### Fora do escopo

- Campanha histórica completa.
- Dez missões antigas.
- Save/load de campanha.
- Novos mapas, veículos, cavalaria, artilharia ou aviação.
- Arte final, modelos Blender finais, voz ou música.
- Multiplayer, Electron, novos idiomas.
- Refatoração profunda do engine antes da fatia estar jogável.
- Mudanças de balance global fora do necessário para o bootcamp.

---

## 5. Experiência alvo

### Fase 1 — Formar a tropa

**Objetivo:** reunir a seção na zona de assembleia.

Jogador aprende:

- câmera;
- seleção de tropa;
- movimento;
- formação;
- leitura de objetivo no mapa.

Conteúdo:

- instrutor no posto de comando;
- zona de reunião marcada;
- nenhum inimigo atirando;
- tropa de treino visível ao longe, em espera.

Condição de conclusão:

- pelo menos 6 soldados dentro do raio da zona de reunião;
- opcional: formação em linha;
- tempo máximo generoso ou nenhum limite.

Falha:

- não há falha nesta fase.

Feedback:

- instrutor confirma a formação;
- objetivo muda para a fase 2.

### Fase 2 — Tomar a linha

**Objetivo:** neutralizar a resistência e ocupar a trincheira de treino.

Jogador aprende:

- fogo não letal;
- supressão;
- flanco;
- cobertura;
- leitura de inimigo suprimido.

Conteúdo:

- tropa de treino ocupa a trincheira;
- a tropa abre fogo não letal ao iniciar a fase;
- inimigos suprimem, forçam cobertura e reduzem moral, mas não matam;
- jogador pode matar ou forçar a rendição dos inimigos de treino.

Condições de conclusão:

- pelo menos 2 inimigos de treino suprimidos simultaneamente por um curto período;
- trincheira ocupada por pelo menos 3 soldados;
- nenhum inimigo de treino vivo dentro da trincheira.

Falha:

- não há falha permanente nesta fase;
- se a tropa se dispersar, o instrutor pede regroup e o objetivo continua.

Feedback:

- instrutor confirma a tomada da linha;
- objetivo muda para a fase 3.

### Fase 3 — Segurar a trincheira

**Objetivo:** resistir ao contra-ataque por 60 segundos.

Jogador aprende:

- defesa;
- emboscada;
- proteger oficial;
- resgate;
- leitura de pressão e prioridade.

Conteúdo:

- onda de tropa de treino ataca pela lateral;
- fogo não letal;
- 60 segundos de hold;
- oficial precisa permanecer vivo, não incapacitado e não pinado por tempo demais.

Condições de vitória:

- 60 segundos completos;
- pelo menos 3 soldados dentro da zona;
- oficial dentro de 12 m da zona e não pinado.

Condições de derrota:

- a trincheira fica sem soldados por 8 segundos;
- o oficial fica pinado por 5 segundos;
- a zona é ocupada por inimigo de treino por 6 segundos.

Falha:

- pausa;
- mensagem do instrutor;
- “Repetir fase”;
- “Reiniciar exercício”.

Sucesso:

- debrief com tempo, munição, supressão máxima, soldados fora de ação e avaliação do instrutor.

---

## 6. Princípios de implementação

1. **Não criar um segundo estado de combate.** O diretor lê frames e emite comandos.
2. **Tudo que muda o mundo entra por comando.** Spawn, fase, limpeza de onda e hold fire passam pelo protocolo.
3. **Determinismo primeiro.** Nada de `Date`, `performance` ou aleatoriedade fora do RNG no simulation.
4. **Fatia vertical por fase.** Fase 1 jogável antes da fase 2; fase 2 antes da fase 3.
5. **Placeholders nomeados.** Nada de chamar arte procedural de final.
6. **Sem novas dependências.** React, Three, Vitest e Playwright já bastam.
7. **Sem refatoração ampla antes da fatia fechar.** Limpeza depois.
8. **Cada tarefa tem verificação.** Não marcar “done” por intenção.

---

## 7. Arquitetura da solução

### 7.1 Modelo de conteúdo

Criar `packages/content/src/bootcamp-exercise.ts` com:

```ts
type ExercisePhaseId = 'assembly' | 'assault' | 'hold';

interface BootcampExercise {
  id: 'bootcamp';
  phases: readonly ExercisePhase[];
}

interface ExercisePhase {
  id: ExercisePhaseId;
  titleKey: MessageKey;
  objectiveKey: MessageKey;
  briefingKey: MessageKey;
  hintKey: MessageKey;
  instructorKey: MessageKey;
  objectives: readonly ExerciseObjective[];
  markers: readonly ExerciseMarker[];
  drills: readonly ExerciseDrill[];
  setup: ExerciseSetup;
}

type ExerciseObjective =
  | { kind: 'reach'; id: string; labelKey: MessageKey; point: Vec2; radius: number; minUnits: number }
  | { kind: 'suppress'; id: string; labelKey: MessageKey; count: number; ticks: number }
  | { kind: 'secure'; id: string; labelKey: MessageKey; point: Vec2; radius: number; minUnits: number; clearEnemies: boolean }
  | { kind: 'hold'; id: string; labelKey: MessageKey; point: Vec2; radius: number; ticks: number; minUnits: number }
  | { kind: 'protect-officer'; id: string; labelKey: MessageKey; point: Vec2; radius: number };

interface ExerciseSetup {
  spawnTrainingEnemy?: { point: Vec2; count: number; nonLethal: true; role: 'training-enemy' };
  playerStart?: { point: Vec2; formation?: FormationKind };
  releaseTrainingFire?: boolean;
  wave?: { point: Vec2; count: number; delayTicks?: number };
}
```

Regras:

- `role: 'training-enemy'` identifica todas as tropas de treino.
- `nonLethal: true` é obrigatório em inimigo de treino.
- Nenhum texto player-facing fora dos locales.
- Não reutilizar a campanha antiga de 10 missões.
- `BOOTCAMP_MISSION` pode ser substituído por `BOOTCAMP_EXERCISE` depois que o novo fluxo estiver verde.

### 7.2 Protocolo

Arquivos:

- `packages/shared/src/protocol.ts`

Adicionar:

```ts
type UnitRole = 'training-enemy';

interface UnitSnapshot {
  role?: UnitRole;
  nonLethal?: boolean;
}

type Command =
  | {
      type: 'spawn_troop';
      to: Vec2;
      faction: Faction;
      count: number;
      dummy?: boolean;
      rotation?: number;
      nonLethal?: boolean;
      role?: UnitRole;
    }
  | {
      type: 'training_phase';
      phase: ExercisePhaseId;
    }
  | {
      type: 'despawn_role';
      role: UnitRole;
    };
```

Regras:

- `training_phase` e `despawn_role` só são aceitos em modo treino/sandbox.
- `training_phase` não pode ser usado fora do bootcamp.
- Rejeições usam os motivos existentes e/ou `invalid_state`.

### 7.3 Simulação

Arquivo:

- `packages/simulation/src/engine.ts`

Adicionar ao `MutableUnit`:

- `role?: UnitRole`;
- `nonLethal: boolean`.

Adicionar em `spawnTroop`:

- preencher `role` e `nonLethal`.

Adicionar em `resolveHit`/dano:

- se `attacker.nonLethal`:
  - não reduzir HP;
  - não criar ferimento;
  - não incapacitar;
  - não matar;
  - aplicar supressão;
  - aplicar dano de moral reduzido;
  - manter moral com piso de segurança (ex.: 25);
  - não emitir morte nem `unit_incapacitated`.

Adicionar `training_phase`:

- valida que o engine está em treino;
- limpa ordens ativas;
- remove unidades com `role: 'training-enemy'`;
- reposiciona a tropa do jogador no ponto inicial da fase;
- reseta HP, munição, supressão, moral, fadiga e coesão dos soldados da tropa;
- reposiciona o oficial instrutor;
- respawna a tropa de treino da fase;
- libera ou mantém hold fire conforme o setup;
- não altera o tick global;
- registra um evento `training_phase_started` ou reutiliza evento existente.

Adicionar `despawn_role`:

- remove unidades do papel indicado;
- remove ordens e referências de alvo que apontem para elas;
- só permitido em treino.

Testes:

- fogo não letal não mata nem fere;
- fogo não letal aplica supressão;
- moral não entra em pan/rout por fogo não letal;
- tropa de treino ainda pode ser morta pelo jogador;
- `training_phase` reposiciona e respawna;
- `despawn_role` limpa a onda;
- hash determinístico após os novos comandos.

### 7.4 Diretor do exercício

Arquivo novo:

- `apps/game/src/training/exercise.ts`

Funções puras:

```ts
interface ExerciseState {
  missionId: 'bootcamp';
  phaseIndex: number;
  phaseStartedTick: number;
  completedPhases: ExercisePhaseId[];
  completed: boolean;
  failed: boolean;
  failureReason: MessageKey | null;
  objectiveProgress: Record<string, number>;
}

interface ExerciseEvaluation {
  state: ExerciseState;
  phaseCompleted: ExercisePhase | null;
  exerciseCompleted: boolean;
  failure: MessageKey | null;
  commands: Command[];
}

function startExercise(): ExerciseState;
function advanceExercise(state, exercise, frame): ExerciseEvaluation;
function currentPhase(state, exercise): ExercisePhase;
function objectivesForPhase(phase, frame): RuntimeObjective[];
function markersForPhase(phase): TrainingMarker[];
function retryPhase(state, exercise): ExerciseState;
```

Regras:

- Sem React, sem Three, sem DOM.
- Só lê frames e devolve intenções.
- A avaliação de `hold` usa ticks, não tempo de parede.
- O diretor não guarda posição de unidade; só estado de fase e progresso.
- O App envia os `commands` retornados.
- O App pausa ao concluir ou falhar.

### 7.5 Integração com App

Arquivo:

- `apps/game/src/App.tsx`

Mudanças:

- `createClient` do bootcamp usa o novo exercício.
- O spawn global de 11 dummies no início deve ser removido; a tropa de treino passa a ser controlada por fase.
- `trainingState` vira `exerciseState`.
- `trainingStep` deixa de ser o gate principal.
- `trainingActions` continua para drills opcionais e dicas.
- O App envia `training_phase` em:
  - retry;
  - transição de fase;
  - resume de progresso persistido.
- O App pausa em falha e conclusão.
- O App salva progresso em chave nova.

### 7.6 Persistência

Nova chave:

```text
prestes.bootcamp.exercise.v1
```

Formato:

```json
{
  "phaseIndex": 1,
  "completedPhases": ["assembly"],
  "completed": false,
  "bestTimeTicks": 0
}
```

Migração:

- se `prestes.bootcamp.steps.v1` existir, ignorar os passos antigos e iniciar na fase 1;
- manter a chave antiga intacta por uma versão;
- não apagar dados do jogador sem confirmação explícita.

Resume:

- ao carregar com progresso salvo, iniciar o cliente e enviar `training_phase` para a fase salva;
- se o `training_phase` falhar, cair para a fase 1 e registrar no console;
- nunca restaurar posições por snapshot; a fase é reiniciada do zero pelo comando.

### 7.7 UI

Arquivo:

- `apps/game/src/ui/TrainingMissionPanel.tsx`

Transformar o painel atual em painel de missão:

- fase atual `1/3`;
- nome da fase;
- 1–3 objetivos com progresso;
- linha do instrutor;
- timer na fase 3;
- estado de falha;
- estado de conclusão;
- debrief;
- seção recolhível “Drills” com os comandos ensinados;
- manter `data-testid` existentes:
  - `training-panel`;
  - `training-objective`;
  - `training-dialogue`;
  - `training-complete`;
  - `training-replay`;
  - `training-continue`.

Objetivos com progresso:

- “Chegar à zona” → `4/6 soldados`.
- “Suprimir a linha” → `2/2 inimigos suprimidos`.
- “Ocupar a trincheira” → `0/3 soldados`.
- “Segurar a trincheira” → `00:42 / 01:00`.
- “Oficial protegido” → `OK` / `em risco`.

### 7.8 Marcadores 3D

Arquivo:

- `packages/view3d/src/training-layer.ts`

Estender `TrainingMarker`:

```ts
type TrainingMarkerKind =
  | 'waypoint'
  | 'cover'
  | 'zone'
  | 'approach'
  | 'fallback';
```

Adicionar `radius?: number`.

Renderização:

- `zone`: anel + disco translúcido no chão.
- `approach`: anel/âncora vermelha na direção da onda.
- `fallback`: anel/linha de recuo.
- `waypoint`/`cover`: comportamento atual.

Evitar mais de 3 marcadores ativos ao mesmo tempo.

### 7.9 Localização

Arquivos:

- `packages/content/src/locales/en.ts`
- `packages/content/src/locales/pt-BR.ts`

Adicionar chaves para:

- títulos das fases;
- objetivos;
- briefing;
- instrutor;
- razões de falha;
- debrief;
- botões de retry e restart.

Regras:

- EN é a fonte;
- PT-BR espelha;
- nenhuma string hardcoded;
- `pnpm check:locales` precisa passar.

---

## 8. Estratégia OpenSpec

Antes de qualquer código de implementação:

```bash
openspec new change "add-playable-bootcamp-exercise"
```

Criar:

```text
openspec/changes/add-playable-bootcamp-exercise/
  proposal.md
  design.md
  tasks.md
  specs/bootcamp/spec.md
  specs/simulation/spec.md
  specs/presentation/spec.md
```

### Proposal

Deve conter:

- fantasia do jogador;
- pilar e loop;
- escopo;
- não-objetivos;
- nota de conteúdo fictício;
- critérios de sucesso.

### Delta specs

`bootcamp`:

- substituir a progressão por 27 passos por três fases com objetivos;
- manter a exigência de ensinar todos os comandos, mas via drills contextuais;
- adicionar fogo não letal;
- adicionar falha, retry e debrief;
- manter progresso persistente.

`simulation`:

- `nonLethal` e `role`;
- `training_phase`;
- `despawn_role`;
- garantias de que fogo não letal não mata.

`presentation`:

- painel de objetivos;
- marcadores de zona;
- estados de falha e conclusão;
- remover requisitos de campanha de 10 missões que não correspondem mais ao App.

### Decisão de governança

A spec `openspec/specs/boot-camp/spec.md` está obsoleta em relação ao bootcamp único.

Na mesma change:

- marcar a campanha de 10 missões como substituída; ou
- remover o fluxo do App e deixar a spec apenas como legado explicitamente nomeado.

Não manter duas verdades concorrentes.

---

## 9. Work Breakdown Structure

### Fase 0 — Preparação

**Tarefas**

- Confirmar que o workspace tem `.git`; se não, inicializar/conectar antes de começar.
- Criar a change OpenSpec.
- Criar branch de trabalho.
- Registrar baseline:
  - `pnpm check`;
  - `pnpm build`;
  - `pnpm e2e`;
  - `pnpm sim` duas vezes;
  - `openspec validate --specs`.

**Aceite**

- Branch limpa.
- Change criada com `.openspec.yaml`.
- Baseline registrado em `tasks.md` ou `docs/status.md`.
- Nenhuma alteração de código ainda.

---

### Fase 1 — Contrato de conteúdo e protocolo

**Arquivos**

- `packages/content/src/bootcamp-exercise.ts` (novo)
- `packages/content/src/index.ts`
- `packages/shared/src/protocol.ts`

**Tarefas**

- Definir `ExercisePhase`, `ExerciseObjective`, `ExerciseMarker`, `ExerciseSetup`.
- Definir `BOOTCAMP_EXERCISE`.
- Adicionar `role` e `nonLethal` ao snapshot.
- Adicionar campos em `spawn_troop`.
- Adicionar `training_phase` e `despawn_role` ao union de comandos.
- Adicionar validação de tipos e locale keys.

**Testes**

- Typecheck.
- Validação de conteúdo/locales.
- Teste de schema do exercício.

**Aceite**

- O conteúdo declara 3 fases e objetivos.
- Nenhuma lógica de combate ainda alterada.
- `pnpm check` verde.

---

### Fase 2 — Simulação: fogo não letal e setup de fase

**Arquivos**

- `packages/simulation/src/engine.ts`
- testes de engine.

**Tarefas**

- Adicionar `role` e `nonLethal` ao `MutableUnit`.
- Implementar `nonLethal` no dano.
- Implementar `training_phase`.
- Implementar `despawn_role`.
- Garantir que fogo não letal não cria `unit_died`, `unit_incapacitated` ou ferimento.
- Garantir que moral não entra em pan/rout por fogo não letal.
- Garantir que a tropa de treino ainda pode ser morta pelo jogador.

**Testes**

- Fogo não letal não mata.
- Fogo não letal não fere.
- Fogo não letal suprime.
- Moral fica acima do piso.
- `training_phase` reposiciona, limpa e respawna.
- `despawn_role` remove apenas o papel correto.
- Comandos fora de treino são rejeitados.
- Hash e determinismo preservados.

**Aceite**

- Nenhum soldado do jogador morre por fogo de treino.
- A tropa de treino pode ser eliminada normalmente.
- `pnpm check` verde.

---

### Fase 3 — Diretor do exercício

**Arquivos**

- `apps/game/src/training/exercise.ts` (novo)
- `tests/training/exercise.test.ts` (novo)

**Tarefas**

- Implementar `startExercise`.
- Implementar `advanceExercise`.
- Implementar objetivos:
  - reach;
  - suppress;
  - secure;
  - hold;
  - protect-officer.
- Implementar falha da fase 3.
- Implementar `retryPhase`.
- Implementar progresso de fase.
- Implementar markers.

**Testes**

- Fase 1 avança ao chegar na zona.
- Fase 2 exige supressão e tomada.
- Fase 3 completa após 600 ticks.
- Fase 3 falha ao perder a zona.
- Retry reinicia a fase.
- Progresso persiste e reinicia no lugar certo.

**Aceite**

- O diretor é puro e testável sem DOM.
- Nenhum segundo estado de combate.
- Testes verdes.

---

### Fase 4 — Integração com App e fase 1

**Arquivos**

- `apps/game/src/App.tsx`
- `apps/game/src/client/GameClient.ts` se necessário
- `apps/game/src/training/progress.ts` ou novo módulo de progresso

**Tarefas**

- Trocar o uso de `BOOTCAMP_MISSION`/`trainingState` por `exerciseState`.
- Remover o spawn global de dummies do bootcamp.
- Criar o cliente e iniciar a fase 1.
- Enviar comandos do diretor.
- Salvar progresso.
- Pausar em conclusão.
- Manter o sandbox e o 3v3 lab intactos.

**Aceite**

- Jogador entra, vê a fase 1 e conclui ao chegar na zona.
- Nenhum tiro automático.
- Nenhum erro no console.
- E2E de entrada atualizado.

---

### Fase 5 — UI de objetivos e marcadores

**Arquivos**

- `apps/game/src/ui/TrainingMissionPanel.tsx`
- `apps/game/src/styles.css`
- `packages/view3d/src/training-layer.ts`
- locales

**Tarefas**

- Substituir a lista de 27 passos por objetivos.
- Mostrar fase `1/3`.
- Mostrar progresso vivo.
- Mostrar timer na fase 3.
- Criar painel de falha e debrief.
- Adicionar zona, aproximação e fallback markers.
- Manter `data-testid` existentes.
- Recolher drills em seção opcional.

**Aceite**

- HUD legível em 1440×900 e em janela estreita.
- Nenhuma string hardcoded.
- Objetivo muda em tempo real.
- Marcadores não obstruem a leitura tática.

---

### Fase 6 — Fase 2 jogável

**Tarefas**

- Spawn da tropa de treino na trincheira.
- Liberar fogo não letal no início da fase.
- Implementar supressão necessária.
- Implementar tomada da trincheira.
- Ajustar instrutor e dicas.
- Ajustar duração e munição.

**Aceite**

- O jogador precisa suprimir e flanquear.
- O jogador pode morrer? **Não.**
- O jogador pode matar a tropa de treino.
- A fase termina com a trincheira ocupada.
- Playtest manual confirma leitura.

---

### Fase 7 — Fase 3 jogável, falha e retry

**Tarefas**

- Spawn da onda de contra-ataque.
- Timer de 60 s.
- Condição de oficial protegido.
- Falha por perda da zona ou oficial pinado.
- Painel de falha.
- Retry via `training_phase`.
- Debrief final.
- Reinício completo do exercício.

**Aceite**

- Vitória em 60 s.
- Derrota clara e atribuível.
- Retry rápido, sem reiniciar o bootcamp inteiro.
- Debrief mostra dados reais.

---

### Fase 8 — Limpeza, documentação e CI

**Tarefas**

- Remover ou isolar:
  - `apps/game/src/tutorial/*`;
  - `apps/game/src/ui/TutorialPanel.tsx`;
  - `apps/game/src/ui/TrainingCampaignScreen.tsx`;
  - `packages/content/src/boot-camp.ts`;
  - `TRAINING_MISSIONS` não usado.
- Atualizar testes que protegiam código morto.
- Atualizar README, `docs/status.md`, `docs/architecture.md` e `docs/BOOTCAMP_CHECKLIST.md`.
- Atualizar `docs/PROJECT_ANALYSIS.md` se necessário.
- Avaliar adicionar `pnpm e2e` e `openspec validate` ao CI.
- Registrar performance e build.

**Aceite**

- Nenhum módulo de tutorial morto no build.
- Nenhum teste inútil.
- Documentação reflete o App.
- CI continua verde.

---

## 10. Mapa de arquivos

### Novos

```text
packages/content/src/bootcamp-exercise.ts
apps/game/src/training/exercise.ts
tests/training/exercise.test.ts
```

### Alterados

```text
packages/shared/src/protocol.ts
packages/simulation/src/engine.ts
packages/simulation/test/engine.test.ts
packages/content/src/index.ts
packages/content/src/locales/en.ts
packages/content/src/locales/pt-BR.ts
apps/game/src/App.tsx
apps/game/src/training/progress.ts
apps/game/src/ui/TrainingMissionPanel.tsx
apps/game/src/styles.css
packages/view3d/src/training-layer.ts
tests/e2e/training-campaign.spec.ts
docs/status.md
docs/architecture.md
docs/BOOTCAMP_CHECKLIST.md
README.md
```

### Removidos ou isolados ao final

```text
apps/game/src/tutorial/director.ts
apps/game/src/tutorial/progress.ts
apps/game/src/ui/TutorialPanel.tsx
apps/game/src/ui/TrainingCampaignScreen.tsx
packages/content/src/boot-camp.ts
packages/content/test/boot-camp.test.ts
tests/tutorial/director.test.ts
tests/tutorial/progress.test.ts
```

---

## 11. Matriz de testes

### Unitários

| Área | Casos |
|---|---|
| nonLethal | não mata, não fere, suprime, respeita piso de moral |
| role/despawn | spawna, limpa, não afeta unidades erradas |
| training_phase | reposiciona, respawna, rejeita fora do treino |
| reach | entra/sai da zona, mínimo de unidades |
| suppress | N inimigos suprimidos pelo tempo certo |
| secure | zona ocupada e sem inimigo |
| hold | completa por ticks, falha por perda |
| protect-officer | oficial dentro/fora, pinado |
| progress | salva, carrega, migra, reinicia |

### E2E

1. Bootcamp abre sem fogo automático.
2. Fase 1 mostra objetivo e completa por movimento.
3. Fase 2 libera fogo não letal e exige supressão.
4. Fase 2 toma a trincheira.
5. Fase 3 segura 60 s e conclui.
6. Fase 3 falha ao perder a zona.
7. Retry reinicia a fase.
8. Debrief aparece.
9. PT-BR e EN.
10. HUD em 1440×900 e viewport estreita.

### Manual

- Jogar sem instrução externa.
- Falhar de propósito.
- Repetir.
- Confirmar que o instrutor explica o motivo da falha.
- Confirmar que o jogador entende o que fazer em cada fase.

---

## 12. Orçamentos de qualidade

| Métrica | Meta |
|---|---|
| Testes unitários | ≥ 200 |
| Testes E2E | ≥ 20 |
| Bundle JS | < 1 MB antes de gzip |
| Startup headless | < 5 s |
| FPS headless tático | ≥ 25 FPS |
| FPS GPU real | ≥ 60 FPS |
| Novo draw call de marcadores | ≤ 3 |
| Erros de console no bootcamp | 0 |
| Strings hardcoded | 0 |
| Specs conflitantes de bootcamp | 0 |

---

## 13. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Escopo crescer para campanha | Congelar escopo: uma missão, três fases |
| Engine ficar ainda maior | Isolar `training_phase` em um módulo/helper de treino se necessário |
| Retry complexo | `training_phase` determinístico, sem snapshot |
| Fogo não letal virar “sem risco” | Supressão, pin, timer e falha por objetivo |
| Testes E2E lentos | Usar `__prestes` bridge e esperas por frame |
| UI poluída | Máximo de 3 objetivos e 3 marcadores por fase |
| Progresso confuso | Uma chave nova, migração explícita, sem apagar dados |
| Ci não pegar regressões | Adicionar E2E/openspec ao CI depois da fatia |
| Sem `.git` | Resolver antes da Fase 1 |
| Specs conflitantes | A própria change resolve `boot-camp` vs `bootcamp` |

---

## 14. Sequência de marcos

### Marco 1 — Fundação

- Change OpenSpec criada.
- Protocolo e conteúdo definidos.
- Simulação com nonLethal/role.
- `pnpm check` verde.

### Marco 2 — Fase 1 jogável

- App usa o novo exercício.
- Objetivo de reunião funciona.
- UI e marcador de zona.
- E2E de fase 1.

### Marco 3 — Fase 2 jogável

- Fogo não letal.
- Supressão e tomada.
- Playtest manual.

### Marco 4 — Fase 3 jogável

- Hold 60 s.
- Falha e retry.
- Debrief.

### Marco 5 — Limpeza

- Remover legado.
- Atualizar docs/specs.
- Validação completa.

---

## 15. Comandos de validação

```bash
pnpm check
pnpm build
pnpm e2e
pnpm sim
pnpm sim
openspec validate --specs
openspec validate "add-playable-bootcamp-exercise" --type change --strict
```

Verificação manual:

- abrir o jogo;
- iniciar bootcamp;
- confirmar ausência de fogo automático;
- jogar as três fases;
- falhar a fase 3 de propósito;
- repetir;
- concluir;
- alternar PT-BR/EN;
- verificar console do navegador.

---

## 16. Critérios finais de aceite

- Uma missão de três fases.
- Nenhum checklist de 27 passos na interface principal.
- Fogo não letal funcional.
- Jogador pode vencer e perder.
- Retry local da fase.
- Debrief.
- Progresso persistente.
- Nenhum código morto de tutorial no build.
- Specs coerentes.
- Documentação coerente.
- Testes verdes.
- Performance dentro do budget.
- Nenhum commit/push sem autorização explícita.

---

## 17. Primeiro passo operacional

Na próxima sessão de implementação:

```bash
openspec new change "add-playable-bootcamp-exercise"
openspec instructions proposal --change "add-playable-bootcamp-exercise" --json
```

Depois criar `proposal.md`, delta specs, `design.md` e `tasks.md` antes de tocar em código.

Não iniciar a implementação pela UI nem pelo engine. O contrato OpenSpec vem primeiro.

