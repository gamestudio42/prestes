// Imported from docs/campaign/book and docs/campaign/missions; keep in step with the docs.
// The prose is the project's own dramatization; no source text is reproduced, apart from
// attributed quotations of free texts (enrich-texts-from-sources D2).
import type { ChapterText } from '../chapters';

export const CHAPTER_TEXT_PT_BR: Readonly<Record<string, ChapterText>> = {
  'prologue-18-do-forte': {
    title: 'Os Dezoito do Forte',
    place: 'Praia de Copacabana, Rio de Janeiro',
    perspective: 'Siqueira Campos, no comando dos 18 na praia; o fim é certo.',
    pages: [
      {
        heading: 'O Ausente',
        paragraphs: [
          'Na noite de 4 de julho de 1922, Luís Carlos Prestes tentou se vestir para o levante e desabou. O tifo o manteve na casa da mãe enquanto a conspiração seguia sem ele. Era um jovem oficial engenheiro, ainda não o nome que a coluna carregaria; não estava no Forte de Copacabana, e não estava na praia. A revolta que entrou na lenda como os 18 do Forte aconteceu sem o homem que se tornaria o líder mais visível da coluna. A febre foi um acidente da história. A ausência virou parte da história. O prólogo é de Siqueira Campos. A coluna será de Prestes.',
        ],
      },
      {
        heading: 'Os Dezoito',
        paragraphs: [
          'No forte, a lenda dá a Siqueira Campos dezoito homens e uma decisão. O registro dá vinte e nove no forte depois que o comandante foi preso, e vinte e oito saindo na tarde de 6 de julho. O levante fracassara em outros pontos; o governo fechava o cerco; a rendição acabaria com tudo sem deixar história. Na lenda, ele divide os homens em quatro grupos — cinco, cinco, quatro, quatro — e os leva pelo portão até a praia. O mar ficava de um lado, o governo do outro, e a areia não oferecia nada. Lutaram do portão pela Avenida Atlântica, das obras da avenida ao último trecho de areia diante da Rua Barroso, e a linha encurtava a cada posição. Os quatro grupos não eram uma vitória à espera de acontecer. Eram uma demora, medida em minutos e em sangue. A lenda diz que os dezoito morreram ali. O registro diz que Siqueira Campos e outros dois sobreviveram, e que sete rebeldes morreram. As duas coisas fazem parte da história.',
        ],
      },
      {
        heading: 'O Registro',
        paragraphs: [
          'A praia não acabou com o levante; deu ao levante um mito. Os 18 do Forte viraram o nome de uma geração que tentaria de novo em São Paulo, no Rio Grande do Sul e na coluna. Siqueira Campos levou a praia consigo. Prestes levou a febre, os mapas e o nome que a coluna faria. A coluna não começa aqui. Começa no sul, anos depois, com os homens que sairiam do cerco e seguiriam em frente. Mas é na praia que a lenda aprende a morrer, e é ali que a campanha aprende quanto custa uma derrota certa.',
        ],
      },
    ],
    briefing: {
      pitch:
        'O forte à noite. O levante fracassou nos outros pontos; o governo está fechando o cerco. Siqueira Campos diz aos 18 que não haverá rendição: eles sairão marchando pela avenida e farão o governo pagar por cada metro. Prestes está ausente, com febre. Não há reforço nem vitória; a tarefa é fazer cada metro da avenida custar tempo e sangue ao governo.',
      objectives: [
        'Sair do forte e chegar aos barcos dos pescadores.',
        'Segurar as obras da avenida enquanto o governo empenha seção após seção.',
        'Resistir até o fim na areia diante da Rua Barroso.',
      ],
    },
  },
  'anel-de-ferro': {
    title: 'O Anel de Ferro',
    place: 'Santo Ângelo, São Borja, Uruguaiana; Ramada; rio Uruguai',
    perspective:
      'Luís Carlos Prestes, chefe do estado-maior dos rebeldes do sul, dentro do Anel de Ferro.',
    pages: [
      {
        heading: 'O Cerco',
        paragraphs: [
          'O governo chamava aquilo de cerco. No mapa parecia um: colunas vindas do sul e do leste, o rio atrás, as cidades já tomadas. Prestes olhou o mesmo mapa e viu uma linha. Um cerco é só uma linha até se fechar.',
          'O levante tinha tomado Santo Ângelo, São Borja e Uruguaiana. Não tinha tomado as estradas. Em dezembro, o governo convergiu sobre São Luiz Gonzaga, certo de que os rebeldes esperariam para serem cercados. Prestes não esperou. A coluna marcharia para o norte, à noite, com as carroças, os cavalos e os feridos. A retaguarda seguraria Ramada o tempo necessário para o resto passar.',
          'Não era uma vitória. Era a decisão de continuar andando.',
        ],
      },
      {
        heading: 'Ramada',
        paragraphs: [
          'Ramada era um lugar para fazer o governo pagar por cada hora. A retaguarda segurou a linha enquanto as carroças rangiam para o norte. Os cavalos foram o primeiro custo. Bebiam, tropeçavam, atrasavam a coluna; o governo tinha mais. Quando a coluna chegou ao Uruguai, a maior parte dos cavalos tinha se perdido ou precisou ser deixada para trás.',
          'O rio era o portão. O vau era estreito, e o governo sabia. A retaguarda segurou a margem enquanto a coluna atravessava. Os homens contaram o que podiam levar e o que tinham de abandonar. A coluna cruzou o Uruguai e seguiu a pé por Santa Catarina.',
        ],
      },
      {
        heading: 'A Coluna',
        paragraphs: [
          'O cerco ficou para trás. A coluna não. Ela já tinha um nome, ou o começo de um: a coluna que não se deixaria cercar. Em abril, encontrou os rebeldes paulistas no oeste do Paraná; Prestes e Miguel Costa se encontraram em Benjamin Constant em 3 de abril, e a Primeira Divisão Revolucionária foi formalmente organizada em Porto Santa Helena em 14 de abril. Miguel Costa era o comandante formal. Prestes era chefe do estado-maior e o líder mais visível da coluna. A marcha tinha começado.',
          'A coluna não venceu em Ramada. Sobreviveu. Na história da campanha, essa é a diferença que importa.',
        ],
      },
    ],
    briefing: {
      pitch:
        'São Luiz Gonzaga, dezembro de 1924. O governo está fechando o anel. Prestes se recusa a esperar o cerco: a coluna marchará para o norte à noite, a retaguarda segurará Ramada, e o Uruguai é o portão. A cidade não é o objetivo; a coluna é.',
      objectives: [
        'Cobrir a saída da coluna de São Luiz Gonzaga.',
        'Segurar a retaguarda em Ramada até os carroções chegarem ao rio.',
        'Atravessar o Uruguai com Prestes e pelo menos uma seção.',
        'Manter aberta a rota para o norte.',
      ],
    },
  },
  'a-divisao': {
    title: 'A Divisão',
    place: 'Benjamin Constant, Porto Santa Helena, de Porto Mendes a Puerto Adela',
    perspective:
      'Miguel Costa, comandante formal da Primeira Divisão Revolucionária, no oeste do Paraná e na travessia do Paraná.',
    pages: [
      {
        heading: 'A Junção',
        paragraphs: [
          'Oeste do Paraná, abril de 1925. Duas colunas chegaram de derrotas diferentes: os rebeldes do sul que haviam rompido o cerco em Ramada, e os remanescentes paulistas que haviam deixado a cidade e a frente do Paraná. Ainda não eram um exército. Eram duas forças com duas histórias, dois estados-maiores e um governo atrás delas. Prestes e Miguel Costa se encontraram em Benjamin Constant em 3 de abril; em Foz do Iguaçu conferenciaram com Isidoro, que mantinha o quartel-general político.',
          'Miguel Costa assumiu o comando formal da Primeira Divisão Revolucionária. Prestes tornou-se chefe do estado-maior. A divisão tinha cerca de mil e quinhentos homens, seiscentos cavalos e mulas, e três canhões de 75 mm. Os números não eram uma vitória; eram o que restava. A junção foi o momento em que a coluna deixou de ser uma retirada e passou a ser um comando.',
        ],
      },
      {
        heading: 'A Travessia',
        paragraphs: [
          'A divisão cruzou de Porto Mendes para Puerto Adela: o desembarque começou em 27 de abril e a travessia foi concluída em 29 de abril. O rio era o portão. Os cavalos, os canhões e os feridos tinham de passar primeiro; a retaguarda tinha de segurar a margem até a última unidade atravessar. O governo estava vindo. A travessia não era um desfile; era uma corrida entre a divisão e a fronteira.',
          'As duas brigadas atravessaram como uma divisão. Os homens do Rio Grande e os paulistas mantiveram suas histórias, mas compartilhavam o mesmo comando, o mesmo rio e a mesma marcha. A divisão estava do outro lado. O custo seria contado depois.',
        ],
      },
      {
        heading: 'O Comando',
        paragraphs: [
          'Miguel Costa era o comandante formal. Prestes era chefe do estado-maior e o líder mais visível da divisão. A campanha precisa manter os dois fatos: a coluna não era um só homem, e a estrutura de comando fazia parte da história. A divisão que cruzou o Paraná era a coluna que marcharia para o norte.',
          'A junção não acabou com a retirada. Deu um comando à retirada. A marcha continuou.',
        ],
      },
    ],
    briefing: {
      pitch:
        'Oeste do Paraná, abril de 1925. A coluna do sul e a coluna paulista se encontram; Prestes e Miguel Costa se entendem em Benjamin Constant. Miguel Costa assume o comando formal; Prestes torna-se chefe do estado-maior. O governo está chegando. As duas brigadas precisam virar uma divisão e atravessar o Paraná antes que a fronteira se feche.',
      objectives: [
        'Unir as forças do sul e de São Paulo.',
        'Organizar as duas brigadas numa só divisão.',
        'Atravessar o Paraná com os homens, os cavalos e os canhões da divisão.',
        'Impedir que o governo corte a travessia.',
      ],
    },
  },
  'frente-do-parana': {
    title: 'A Frente do Paraná',
    place: 'Catanduvas e o planalto do Paraná',
    perspective:
      'Isidoro Dias Lopes em Foz do Iguaçu, dirigindo a frente paulista; em campo, uma seção sob Estilac Leal em Catanduvas.',
    pages: [
      {
        heading: 'A Frente',
        paragraphs: [
          'A cidade estava perdida. A revolta paulista tomou as ruas em julho de 1924 e as perdeu no fim do mês. Isidoro Dias Lopes levou o remanescente para o interior e para o Paraná. O governo seguiu com a artilharia.',
          'A frente não era uma vitória à espera de acontecer. Era um lugar para segurar tempo suficiente para salvar os homens que se tornariam a coluna.',
        ],
      },
      {
        heading: 'As Trincheiras',
        paragraphs: [
          'A frente do Paraná eram trincheiras na mata e na lavoura, fileiras de café e bosques, uma casa e uma estrada. Isidoro comandava de Foz; a brigada de Estilac Leal segurava Catanduvas. O governo tinha os canhões; os rebeldes tinham o terreno e o hábito de não se deixar cercar. A retaguarda segurou a linha enquanto os feridos e os suprimentos recuavam.',
          'A linha foi trocada pela estrada. A frente caiu, mas os homens saíram.',
        ],
      },
      {
        heading: 'A Retirada',
        paragraphs: [
          'O remanescente paulista recuou para o Paraná. Em abril de 1925, encontraria a coluna do sul no oeste do Paraná e faria parte da Primeira Divisão Revolucionária. A frente é, portanto, um começo visto do lado perdedor: os homens que saem dela são os homens que marcharão com a coluna.',
          'A frente foi perdida. A coluna ainda não tinha nascido.',
        ],
      },
    ],
    briefing: {
      pitch:
        'A cidade está perdida. A frente está perdida. As ordens de Isidoro chegam à frente vindas de Foz; a brigada de Estilac Leal segura Catanduvas. A retaguarda precisa manter a linha de trincheiras até os feridos e os suprimentos passarem, e então recuar em ordem. A frente não é o objetivo; os homens são.',
      objectives: [
        'Manter a linha de trincheiras até os feridos e os suprimentos saírem.',
        'Evacuar os feridos.',
        'Destruir ou abandonar o que não puder ser levado.',
        'Recuar a retaguarda em ordem.',
      ],
    },
  },
  'ponte-de-verdinho': {
    title: 'A Ponte de Verdinho',
    place: 'Ponte do Verdinho, Mineiros, Goiás',
    perspective:
      'Luís Carlos Prestes, chefe do estado-maior, dirigindo a retaguarda na ponte do Verdinho.',
    pages: [
      {
        heading: 'A Ponte',
        paragraphs: [
          'O Verdinho era uma ponte de estrada sobre um rio raso e, por algumas horas, foi o pedaço de chão mais importante da marcha da coluna. As carroças ainda atravessavam. O governo estava na estrada atrás delas. Prestes disse à retaguarda que segurasse a ponte até a coluna passar, depois a queimasse e saísse pelo vau.',
          'A ponte não era uma posição para manter. Era uma posição para entregar no momento certo. Segurar demais prenderia a retaguarda na margem de cá; queimar cedo demais cortaria a coluna.',
        ],
      },
      {
        heading: 'O Vau',
        paragraphs: [
          'O rio era raso. O vau era a saída, mas a margem era aberta e o governo conhecia a ponte. A retaguarda segurou a ponte enquanto as carroças atravessavam, depois ateou fogo e se deslocou para o vau. O fogo era o sinal de que a coluna tinha passado e a ponte já não era passagem.',
          'Os perseguidores chegaram à ponte em chamas e começaram a abrir um vau com as próprias madeiras da ponte. A coluna tinha comprado tempo, não segurança. A retaguarda vadeou o rio sob fogo e seguiu para o norte.',
        ],
      },
      {
        heading: 'A Perseguição',
        paragraphs: [
          'A ponte caiu. A coluna estava do outro lado. A perseguição foi atrasada, não detida. As madeiras que sustentavam a ponte agora ajudavam o governo a atravessar o rio. A coluna contou o custo e continuou.',
          'Verdinho é uma ação pequena numa marcha longa, e é isso que importa: a coluna sobreviveu cedendo terreno no momento certo, não segurando-o.',
        ],
      },
    ],
    briefing: {
      pitch:
        'A coluna atravessou o Verdinho. A ponte é a única passagem a seco. Prestes manda a retaguarda resistir até os carroções passarem, depois incendiar a ponte e sair pelo vau. A ponte não é uma posição para manter; é uma posição para entregar na hora certa.',
      objectives: [
        'Segurar a ponte até os carroções da coluna passarem.',
        'Preparar e incendiar a ponte.',
        'Recuar a retaguarda pelo vau.',
        'Impedir que o governo atravesse pela ponte.',
      ],
    },
  },
  'serra-nova': {
    title: 'Serra Nova',
    place: 'Serra Nova e Taiobeiras, Minas Gerais',
    perspective:
      'Luís Carlos Prestes, chefe do estado-maior, cobrindo a coluna pelo planalto de Minas Gerais.',
    pages: [
      {
        heading: "Porto Nacional",
        paragraphs: [
          "Outubro de 1925. Seis meses depois do Paraná e quinze depois de São Paulo, a coluna chegou a Porto Nacional, à beira do Tocantins. Os moradores fugiram para o mato; os frades ficaram. No convento dominicano, os chefes tiveram tempo, pela primeira vez, de pôr por escrito pelo que marchavam. Em 19 de outubro, Miguel Costa, Prestes e Juarez Távora assinaram um manifesto à nação. Pedia liberdade e Constituição, e ainda não falava da terra. Seis meses depois, os mesmos homens estavam em Minas, com o cerco se fechando.",
        ],
        quote: {
          text: "E o povo pode ficar certo de que os soldados revolucionários não enrolarão a bandeira da Liberdade enquanto se não modificar esse ambiente de despotismo e intolerância que asfixia, num delírio de opressão, os melhores anseios da consciência nacional!",
          sourceKey: "manifesto-1925",
          cite: "Manifesto of Porto Nacional, 19 Oct. 1925 (Marxists Internet Archive)",
          attribution: "Miguel Costa, Luís Carlos Prestes e Juarez Távora, Porto Nacional, 19 de outubro de 1925",
        },
      },
      {
        heading: 'A Retaguarda',
        paragraphs: [
          'Abril de 1926. A coluna descera da Chapada Diamantina para o norte de Minas Gerais. Os homens estavam cansados de um jeito que o sono não curava. Os jagunços de Horácio de Matos e Abílio Wolney estavam na retaguarda, e as tropas federais tentavam fechar as estradas à frente.',
          'Em 22 de abril, a retaguarda foi atacada em Serra Nova. A coluna não parou para uma batalha campal. Rompeu o contato, virou e fez os perseguidores procurarem por ela onde ela não estava.',
        ],
      },
      {
        heading: 'O Laço',
        paragraphs: [
          'A fuga ficou lembrada como o “laço húngaro”: uma série de movimentos circulares que confundiu os perseguidores e tirou a coluna do cerco que se fechava. As tropas federais tinham mandado os moradores deixarem suas casas; a coluna passou por um país esvaziado para a armadilha.',
          'A coluna chegou a Taiobeiras em 26 de abril. Ainda estava viva. Era o único fato que importava.',
        ],
      },
      {
        heading: 'A Próxima Marcha',
        paragraphs: [
          'Serra Nova não foi uma vitória. Foi o momento em que a coluna escolheu continuar andando quando o cerco quase se fechou. A decisão de emigrar já se formava no alto comando; a marcha para o norte se tornaria uma marcha para a fronteira.',
          'A marcha não era um triunfo. Era uma decisão repetida todos os dias.',
          "Trinta anos depois, Guimarães Rosa deu à marcha uma linha num romance. Seu velho jagunço lembra os soldados de Prestes passando pelos gerais de Minas, e um roceiro que, anos depois, racha um tronco e encontra balas na madeira. É ficção, e não diz que foi aqui. Mas o sertão guardou a marcha como a árvore guardou o chumbo.",
        ],
      },
    ],
    briefing: {
      pitch:
        'Serra Nova, abril de 1926. A retaguarda é atacada; a coluna precisa mudar de rumo. Prestes manda a retaguarda resistir o bastante para a coluna romper o contato e depois segui-la rumo a Taiobeiras.',
      objectives: [
        'Segurar a retaguarda o bastante para a coluna mudar de rumo.',
        'Romper o contato com os jagunços.',
        'Cobrir a mudança de direção da coluna.',
        'Chegar a Taiobeiras em 26 de abril.',
      ],
    },
  },
  pantanal: {
    title: 'O Pantanal',
    place: 'O Pantanal; Bolívia e Paraguai',
    perspective: 'Luís Carlos Prestes, chefe do estado-maior, conduzindo a coluna pelo Pantanal.',
    pages: [
      {
        heading: 'O Pantanal',
        paragraphs: [
          'Fevereiro de 1927. A coluna entrou no Pantanal. A água estava em todo lugar; o chão era uma sugestão. Os homens estavam exaustos, os animais falhando, e a fronteira era o único objetivo que restava. Não havia terreno que valesse a pena segurar nem inimigo que valesse uma batalha. A própria marcha era o inimigo.',
        ],
      },
      {
        heading: 'A Travessia',
        paragraphs: [
          'A coluna seguiu por pantanal, água e trilhas de gado. Os feridos e os animais de carga ficaram para trás; a retaguarda decidiu o que levar e o que deixar. As patrulhas do governo eram uma ameaça, mas o calor e a água estavam mais perto. A coluna continuou andando porque parar era o fim.',
        ],
      },
      {
        heading: 'A Fronteira',
        paragraphs: [
          'O corpo principal chegou à fronteira e entrou na Bolívia; o grupo de Siqueira entrou no Paraguai. A marcha se dissolveu no exílio. Os homens que haviam cruzado o sul, o Paraná e o interior agora eram exilados. A coluna ainda estava junta, mas a marcha tinha acabado.',
        ],
      },
    ],
    briefing: {
      pitch:
        'O Pantanal, fevereiro de 1927. A coluna está exausta; a fronteira está à frente. Prestes manda a retaguarda manter a coluna unida, levar os feridos e chegar à fronteira. Não há batalha a vencer; a marcha é o objetivo.',
      objectives: [
        'Atravessar o alagado e as águas.',
        'Manter a coluna unida.',
        'Levar os feridos.',
        'Chegar à fronteira.',
      ],
    },
  },
  'la-gaiba': {
    title: 'La Gaiba',
    place: 'La Gaiba, Bolívia',
    perspective: 'Luís Carlos Prestes e os exilados em La Gaiba, depois da marcha.',
    pages: [
      {
        heading: 'O Exílio',
        paragraphs: [
          'La Gaiba, Bolívia, julho de 1927. A marcha tinha acabado. A coluna cruzara o Pantanal e entrara no exílio; os homens que caminharam desde o sul estavam agora espalhados por uma fronteira estrangeira. Não havia inimigo a enfrentar nem chão a segurar. Havia apenas a memória da marcha.',
        ],
      },
      {
        heading: 'O Monumento',
        paragraphs: [
          'Os exilados dedicaram um monumento. Não era um monumento de vitória; era uma pedra para a marcha, para os mortos, para as cidades e os rios e os homens que não vieram. No granito, gravaram: “Glória aos Bandeirantes da Liberdade, 1924–1927.” A cerimônia foi pequena, e as palavras importavam porque não havia mais nada para construir.',
        ],
        quote: {
          text: "Soldados da Liberdade! Dormi tranqüilos na terra estrangeira que vos acolheu com tanta nobreza, porque os vossos nomes e os vossos feitos serão eternos no coração generoso do Brasil.",
          sourceKey: "lima-1931",
          cite: "Marchas e combates, 3rd ed. (1979), p. 523, via Mozzer 2009, p. 257",
          attribution: "Lourenço Moreira Lima, La Gaiba, Bolívia, 1927",
        },
      },
      {
        heading: 'A Memória',
        paragraphs: [
          'A campanha termina aqui. A coluna é memória. O registro deve dizer quanto a marcha custou e o que ela foi: uma marcha política que sobreviveu ao governo e não se tornou vitória. O monumento só pode guardar tanta coisa. O resto é o registro.',
        ],
      },
    ],
    briefing: {
      pitch:
        'La Gaiba, julho de 1927. A marcha acabou. Os exilados estão aqui para inaugurar um monumento. Prestes lhes diz o que a coluna foi e o que não foi.',
      objectives: [
        'Chegar a La Gaiba.',
        'Inaugurar o monumento.',
        'Escolher o que a coluna deixa para trás.',
      ],
    },
  },
};
