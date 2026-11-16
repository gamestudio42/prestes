# Eventos de batalha no editor

> **Status:** guia de produção para o dono, complemento do
> `GUIA_MAPAS_CAMPANHA.md`. Descreve o que a mudança `add-battle-events`
> entregou em 2026-11-14. Idioma: PT-BR, a pedido do dono; código e specs
> seguem em inglês.

Os eventos contam a história durante a batalha: reforços que chegam pela
estrada, o inimigo que parte para a ofensiva ou recua, um cartão de livro que
pausa o jogo e narra o momento. Eles ficam guardados no próprio mapa
(documento versão 9) e rodam na simulação, sempre do mesmo jeito para a mesma
partida.

## Passo a passo

1. **Lugares primeiro.** No grupo *Jogo* da paleta:
   - **Ponto de entrada**: clique perto de uma borda. O ponto se prende à borda
     mais próxima (4 m para dentro) e aponta para dentro do mapa. Arraste para
     deslizar pela borda. É por ali que entram as tropas de um evento.
   - **Área de gatilho**: clique para pôr um quadrado de 30 m. Arraste um canto
     para mudar a forma; duplo clique numa aresta acrescenta um canto; Delete
     apaga o canto selecionado ou a área. Serve para o gatilho "um lado entra
     numa área" e como destino de um recuo.
2. **Abra o painel.** O botão **Eventos** na barra de cima abre o painel à
   direita (ele também abre sozinho com as duas ferramentas acima). Com o painel
   aberto, os lugares aparecem desenhados e com nome; os do evento selecionado
   ficam destacados.
3. **Acrescentar evento.** Dê um rótulo (só você vê). Os eventos rodam na
   ordem da lista; as setas mudam a ordem e as referências acompanham.
4. **Quando** (um gatilho):
   - *Num tempo de batalha* (m:ss, contado a partir do fim do desdobramento);
   - *Um objetivo muda de mãos* (tomado ou perdido por um lado);
   - *Um lado entra numa área*;
   - *As baixas de um lado passam de uma parcela* (10 a 90%, de 5 em 5);
   - *Depois de outro evento*.
   **Depois esperar** acrescenta até 10:00 de espera depois do gatilho.
5. **Então** (até quatro ações):
   - **Tropas entram**: o lado (Coluna ou legalistas), o ponto de entrada, até
     seis seções do exército daquele lado e a ordem ao chegar: ficar na borda,
     ir até um ponto, ir a um objetivo ou, para os legalistas, seguir o plano
     do comandante inimigo. As seções entram uma atrás da outra, a cada 5 s.
   - **Postura do inimigo**: ofensiva geral, recuar (para uma área de gatilho
     ou para a própria área de desdobramento) ou manter posição, por um tempo
     ou até outro evento. Depois o comandante inimigo volta ao seu plano.
   - **Cartão narrativo**: título e texto em português e em inglês, lado a
     lado. Na batalha o jogo pausa e mostra o cartão até o jogador fechar; a
     velocidade volta à de antes.
   - **Bombardeio de artilharia** (desde 2026-11-15): canhões fora do mapa
     atirando sobre o campo. Escolha:
     - **Canhões de**: Coluna ou legalistas (de quem são os canhões);
     - **Canhão**: de campanha 75 mm (mata até 5 m, fere até 15 m, abala até
       30 m) ou obus 105 mm (7, 22 e 40 m);
     - **Alvo**: uma área de gatilho (os tiros miram o meio dela) ou as
       posições inimigas (cada tiro mira um inimigo que aquele lado vê ou viu
       nos últimos 30 s; sem ninguém à vista, os canhões não atiram);
     - **Tiros por minuto** (1 a 30) e **Dispersão** (5 a 60 m: até onde os
       tiros caem longe do ponto de mira);
     - **Dura**: por um tempo (0:10 a 10:00) ou até outro evento.
     Com o evento selecionado, o mapa mostra a área e o anel da dispersão.
     Na batalha cada tiro assobia 2 s antes de cair; a granada não escolhe
     lado, fere quem estiver perto, deixa crateras (cobertura baixa) e faz a
     tela tremer quando cai perto. Deitado, atrás de muro, guarnecido ou numa
     trincheira o soldado se protege muito mais. O som ainda é provisório
     (sintetizado) até escolhermos gravações CC0.
6. **Verificar mapa.** A verificação aponta evento sem gatilho ou sem ação,
   lugar ou objetivo que não existe, seção do lado errado, cartão sem texto,
   eventos que dependem um do outro em círculo, ponto de entrada fora da borda
   ou na água, destino inalcançável, valores do bombardeio fora da faixa,
   evento que nunca vai acontecer (aviso) e bombardeio sobre a área de
   desdobramento do próprio lado (aviso).
   Clicar num problema abre o painel no evento ou seleciona o lugar.
7. **Testar.** No teste a partir do editor aparece, no alto à direita, a lista
   **Eventos do mapa (teste)**: o estado de cada evento, o tempo em que
   aconteceu e o botão **Disparar agora**, para ver um evento sem esperar o
   gatilho. Na escaramuça e na campanha essa lista não aparece.

## Dicas

- Apagar um lugar ou um evento usado por outros pede confirmação; o que ficou
  sem referência aparece na verificação.
- Tudo entra no Desfazer, um passo por mudança.
- Seções da Coluna que chegam aparecem no painel de tropas e recebem ordens
  como as outras.
- Os eventos não mudam a escaramuça de outros mapas: um mapa sem eventos joga
  exatamente como antes.
