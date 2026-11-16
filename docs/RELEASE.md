# Publicar o Prestes online

Caminho da branch de trabalho até o jogo publicado no GitHub Pages, no
repositório da GameStudio42 (mudança `prepare-online-release`, D8).

**Regra:** nenhum remote é adicionado, nenhuma branch é enviada e nada é
publicado sem a palavra do dono para **aquele passo**. O Claude pergunta
antes de cada um, toda vez. Uma aprovação não vale para o passo seguinte.

## 1. O repositório

O dono informa o repositório exato da GameStudio42, por exemplo
`gamestudio42/prestes`, e se o site terá domínio próprio. Sem domínio
próprio, o endereço fica `https://gamestudio42.github.io/prestes/`. O
jogo usa caminhos relativos (`base: './'`), então funciona nesse
subcaminho sem mudança.

## 2. O gate local

Na branch de trabalho, com a árvore limpa:

```bash
pnpm verify
```

Ele precisa passar inteiro, incluindo:

- `release check`: nada de imagem com permissão pendente, nada da build
  de revisão, nenhum source map e nenhum link "Editar este mapa"; o
  tamanho da primeira visita e o total dentro do orçamento
  (`tools/release-budget.json`);
- o e2e de rede lenta (`tests/e2e/slow-network.spec.ts`), sobre a build.

Anote o resultado em `docs/status.md`.

## 3. Adicionar o remote (só com a palavra do dono)

```bash
git remote add origin git@github.com:<organização>/<repositório>.git
git remote -v
```

Nada é enviado neste passo.

## 4. Levar o `main` ao commit da versão (só com a palavra do dono)

Primeiro, confirme que o `main` não tem commits próprios. O comando abaixo
precisa sair vazio:

```bash
git log <branch-de-trabalho>..main --oneline
```

Depois, avance o `main` por fast-forward, sem merge e sem rebase:

```bash
git switch main
git merge --ff-only <branch-de-trabalho>
git switch <branch-de-trabalho>
```

Se o fast-forward recusar, pare e pergunte: o `main` tem algo que a
branch não tem.

## 5. O primeiro push (só com a palavra do dono)

```bash
git push -u origin main
```

O push dispara `.github/workflows/pages.yml`, que roda `pnpm check` e
`pnpm build` e publica `apps/game/dist`.

O CI roda sem os arquivos que ficam fora do git (`livros/`,
`art-src/compendium-pending/`). Se um teste depender deles, o CI falha.
Corrija na branch e repita os passos 2, 4 e 5.

## 6. Ligar o Pages (o dono, nas configurações do repositório)

Em **Settings → Pages → Build and deployment → Source**, escolha
**GitHub Actions**. Na primeira vez, rode de novo o workflow, ou faça um
novo push, se o deploy tiver falhado antes de o Pages estar ligado.

## 7. Conferir o endereço publicado

Num navegador de computador, com a rede limitada nas ferramentas do
desenvolvedor ("Fast 4G" ou "Slow 4G"):

- a tela de abertura aparece logo, no idioma do navegador, e some quando a
  mesa do acampamento está pronta;
- o aviso de conteúdo aparece na primeira visita, depois da tela de
  abertura;
- uma escaramuça mostra a tela de carregamento, com o progresso subindo,
  e abre na fase de posicionamento, já com prédios e árvores;
- o prólogo (capítulo 1) mostra o nome do capítulo e o comandante na tela
  de carregamento, e abre;
- o console não mostra erros.

Anote o endereço e o que foi visto em `docs/status.md`.

## Lembretes antes de publicar

- **Licença:** o código é AGPL-3.0-or-later. O repositório publicado
  precisa levar `LICENSE`.
- **Registro de assets:** `docs/assets.md` lista a origem e a licença de
  cada arquivo de arte, som e música. Ele vai junto, e cada asset novo
  entra nele antes da publicação.
- **Imagens com pedido de permissão:** ficam em
  `art-src/compendium-pending/` (fora do git) e nunca entram na build
  publicada. O `release check` garante isso.
- **`livros/`:** os scans nunca entram no git.

## Desfazer

Para voltar o site à versão anterior, leve o `main` ao commit anterior e
envie de novo. O Pages republica. Isso exige a palavra do dono, como
qualquer push. Um push que reescreve o `main` (`--force`) exige
autorização explícita para isso.
