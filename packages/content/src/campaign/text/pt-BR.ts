// Importado de docs/campaign/book e docs/campaign/missions; mantenha em dia com os docs.
// A prosa é dramatização do projeto. As citações são atribuídas, com edição e página;
// obras protegidas são citadas brevemente com base no direito de citação
// (complete-books-and-bibliography D2).
import type { ChapterText } from '../chapters';

const BLANC_PT = 'Tradução nossa da versão inglesa de Blanc; o original em português não foi consultado.';
const MACAULAY_PT = 'Tradução nossa da versão inglesa de Macaulay; o original em português não foi consultado.';
const OURS_PT = 'Tradução nossa do inglês.';

export const CHAPTER_TEXT_PT_BR: Readonly<Record<string, ChapterText>> = {
  'prologue-18-do-forte': {
    title: 'Os Dezoito do Forte',
    place: 'Praia de Copacabana, Rio de Janeiro',
    perspective: 'Siqueira Campos, no comando dos 18 na praia; o fim é certo.',
    pages: [
      {
        heading: 'O Ausente',
        paragraphs: [
          'Na noite de 4 de julho de 1922, Luís Carlos Prestes tentou se vestir para o levante e desabou. Tinha pegado tifo em 13 de junho, e a doença o prendeu na casa da mãe enquanto a conspiração seguia sem ele. Era um jovem oficial de engenharia, subcomandante da 1ª Companhia de Engenharia, em Deodoro, ainda não o nome que a coluna carregaria. Não estava no Forte de Copacabana, e não estava na praia.',
          'O plano era que os cadetes marchassem do Realengo enquanto o marechal Hermes da Fonseca assumia o comando na Vila Militar. Os cadetes marcharam e foram recebidos a tiros; os quartéis não se levantaram. Na manhã de 6 de julho só restava o forte. O prólogo é de Siqueira Campos. A coluna será de Prestes.',
        ],
      },
      {
        heading: 'Os Dezoito',
        paragraphs: [
          'A lenda dá a Siqueira Campos dezoito homens e uma decisão. O registro dá vinte e nove no forte depois que o comandante foi preso, e vinte e oito saindo em marcha na tarde de 6 de julho. Quatro se afastaram na avenida. Dezesseis chegaram à linha do governo: onze seguraram a calçada e quatro se abrigaram nos canos das obras da avenida.',
          'Lutaram do portão pela Avenida Atlântica, passando pelos barcos dos pescadores e pelas obras, até o último trecho de areia antes da Rua Barroso, e a linha encurtava a cada posição. Sete rebeldes morreram em combate ou dos ferimentos; o governo contou trinta e cinco mortos ou feridos. Siqueira Campos, outro oficial e um soldado sobreviveram (Macaulay, pp. 26–29). A lenda diz que os dezoito morreram ali. As duas coisas pertencem à história.',
        ],
        image: { entryId: 'revolt-1922', slot: 'press' },
      },
      {
        heading: 'O Registro',
        paragraphs: [
          'A praia não encerrou o levante; deu-lhe uma data e um mito. Os 18 do Forte viraram o nome de uma geração que tentaria de novo em São Paulo em 5 de julho de 1924, no Rio Grande do Sul em outubro, e na coluna. Siqueira Campos levou a praia consigo. Prestes levou a febre, os mapas e o nome que a coluna faria.',
          'A coluna não começa aqui. Começa no sul, dois anos depois, com homens que sairiam marchando de um cerco e continuariam andando. Mas a praia é onde a lenda aprendeu a morrer, e onde a campanha aprende quanto custa uma derrota certa.',
        ],
        quote: {
          text: 'A revolta fracassada gravou o 5 de julho como a data de origem do tenentismo, pondo em marcha os acontecimentos que viriam.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 31',
          attribution: 'Jacob Blanc, historiador',
          originalLocale: 'en',
          translated: true,
          note: OURS_PT,
        },
      },
    ],
    briefing: {
      pitch:
        'O forte, 6 de julho de 1922. O levante fracassou nos outros pontos; o governo está fechando o cerco. Siqueira Campos diz aos 18 que não haverá rendição: eles sairão marchando pela avenida e farão o governo pagar por cada metro. Prestes está ausente, com febre. Não há reforço nem vitória; a tarefa é fazer cada metro da avenida custar tempo e sangue ao governo.',
      objectives: [
        'Sair do forte e chegar aos barcos dos pescadores.',
        'Segurar as obras da avenida enquanto o governo empenha seção após seção.',
        'Resistir até o fim na areia diante da Rua Barroso.',
      ],
    },
  },
  'anel-de-ferro': {
    title: 'O Anel de Ferro',
    place: 'Santo Ângelo, São Luiz Gonzaga, Ramada; rio Uruguai',
    perspective: 'Luís Carlos Prestes, à frente dos rebeldes do sul, dentro do Anel de Ferro.',
    pages: [
      {
        heading: 'O Cerco',
        paragraphs: [
          'Em 28 e 29 de outubro de 1924 o sul se levantou. Prestes, capitão do 1º Batalhão Ferroviário em Santo Ângelo, saiu com seus homens; São Borja e Uruguaiana se levantaram junto. Em novembro seu batalhão ocupava São Luiz Gonzaga, e o jornal dos rebeldes, O Libertador, era impresso ali.',
          'O governo chamou o que veio depois de anel. Em dezembro, sete destacamentos legalistas convergiram sobre a cidade. Prestes deixou um destacamento em contato, para o inimigo crer que toda a força recuava, e reuniu os demais em São Miguel das Missões. À noite os legalistas fecharam o cerco sobre uma posição vazia, enquanto os rebeldes marchavam para nordeste, rumo ao Ijuí (Blanc, p. 37). Um cerco é só uma linha até se fechar.',
        ],
        image: { entryId: 'sao-luiz-1924', slot: 'blanc-map' },
        quote: {
          text: '…uma das operações mais brilhantes desta campanha, à altura de qualquer dos mais célebres atos de gênio militar já realizados em qualquer época da história.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 37',
          attribution: 'General João Francisco, carta a Prestes, dezembro de 1924',
          originalLocale: 'en',
          translated: true,
          note: BLANC_PT,
        },
      },
      {
        heading: 'Ramada',
        paragraphs: [
          'O elogio era hipérbole, e Blanc nota que elogios assim ajudaram a fazer a lenda. A marcha para o norte foi mais dura. Em 3 de janeiro de 1925, perto de Palmeiras, no lugar que a memória local chama de Ramada, a retaguarda travou um dos combates mais sangrentos de toda a rebelião. Macaulay conta cerca de quarenta rebeldes perdidos (p. 61); o monumento que está lá hoje é dos quase cem mortos legalistas (Blanc, p. 237).',
          'Os cavalos foram o custo seguinte. Tinham carregado a coluna e puxado as carroças, e o governo tinha mais deles. Homens desertaram também: dos mais de três mil de novembro, restava pouco mais de mil na beira do rio (Blanc, p. 41).',
        ],
      },
      {
        heading: 'O Rio',
        paragraphs: [
          'A coluna chegou ao Uruguai em 9 de janeiro. Quase duzentos homens tomaram uma balsa para a Argentina em vez de atravessar para Santa Catarina. A travessia começou em 25 de janeiro com um barco que levava três cavalos por vez, depois uma jangada; os últimos passaram em 31 de janeiro (Blanc, p. 41). Prestes mandou que as mulheres ficassem. Seus homens as levaram para o outro lado assim mesmo.',
          'A maioria dos cavalos se perdeu ou ficou na margem, e a coluna seguiu a pé pelas matas de Santa Catarina rumo ao Paraná. Não tinha vencido nada. Tinha continuado andando, e na história da campanha essa é a diferença que importa.',
        ],
        image: { entryId: 'sao-luiz-1924', slot: 'route-map' },
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
    place: 'Benjamin Constant, Foz do Iguaçu, Porto Santa Helena, de Porto Mendes a Puerto Adela',
    perspective:
      'Miguel Costa, comandante formal da Primeira Divisão Revolucionária, no oeste do Paraná e na travessia do Paraná.',
    pages: [
      {
        heading: 'A Junção',
        paragraphs: [
          'Oeste do Paraná, abril de 1925. Catanduvas, o último reduto dos rebeldes paulistas, rendera-se antes do amanhecer de 30 de março. A brigada de Miguel Costa, a última deles ainda em luta, começou a recuar para oeste no dia seguinte. Os homens de Prestes, saídos das matas de Santa Catarina, chegaram à mesma estrada em Benjamin Constant.',
          'Ali, em 3 de abril, Prestes e Miguel Costa se encontraram. Combinaram não descer a Foz do Iguaçu para se render ou emigrar, mas juntar as forças e atravessar o Paraná rumo a Mato Grosso, e mandaram seus homens para Porto Santa Helena antes de consultar quem quer que fosse (Macaulay, p. 86).',
        ],
        image: { entryId: 'foz-do-iguacu', slot: 'group-photo' },
        quote: {
          text: 'A lendária Coluna Prestes surgiu no Alto Paraná. À frente marchava a figura inigualável do heroico Siqueira Campos…',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 47',
          attribution: 'Tabajara de Oliveira, memórias, sobre a chegada dos rebeldes do sul',
          originalLocale: 'en',
          translated: true,
          note: BLANC_PT,
        },
      },
      {
        heading: 'Foz do Iguaçu',
        paragraphs: [
          'Só então foram a Foz do Iguaçu, onde Isidoro tinha seu quartel-general. Em 12 de abril o marechal disse aos oficiais que nada mais se podia fazer no campo militar e que o exílio era a única saída. A maioria dos comandantes paulistas concordou. Prestes e Miguel Costa não, e Isidoro deixou a revolução continuar sem ele, voltando à Argentina como seu chefe nominal (Blanc, p. 47).',
          'Em 14 de abril de 1925, em Porto Santa Helena, formou-se a 1ª Divisão Revolucionária: Miguel Costa no comando, Prestes chefe do estado-maior, uma brigada paulista de cerca de setecentos homens e uma brigada rio-grandense de cerca de oitocentos.',
        ],
      },
      {
        heading: 'A Travessia',
        paragraphs: [
          'A divisão atravessou de Porto Mendes a Puerto Adela, na margem paraguaia: o desembarque começou em 27 de abril e a travessia terminou em 29 de abril. Macaulay conta no máximo mil e quinhentos homens, seiscentos cavalos e mulas e três canhões de 75 mm (pp. 88–89). Os canhões seriam abandonados e escondidos em Mato Grosso.',
          'As duas brigadas atravessaram como uma só divisão. Os homens do Rio Grande e os de São Paulo guardaram suas histórias, mas dividiam um comando, um rio e uma marcha. A coluna não era um homem só, e sua estrutura de comando faz parte da história: Miguel Costa assinava as ordens, e Prestes planejava a marcha.',
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
        heading: 'Antes da Divisão',
        paragraphs: [
          'Este capítulo volta no tempo. Cobre de julho de 1924 a março de 1925, os meses anteriores ao encontro do capítulo 3, e a outra metade dos homens que formaram a divisão.',
          'A revolta paulista ocupou a cidade por três semanas. Às dez da noite de 27 de julho de 1924 o primeiro trem de tropa deixou a estação da Luz; ao amanhecer, treze trens haviam levado uns três mil homens e catorze canhões de campanha, enquanto duas peças deixadas para trás continuavam atirando (Macaulay, pp. 16–17). Os trens foram para oeste e depois para o sul, e a revolta se entrincheirou no Paraná, entre Guaíra, Foz do Iguaçu e Catanduvas.',
        ],
      },
      {
        heading: 'As Trincheiras',
        paragraphs: [
          'A frente do Paraná era feita de trincheiras na mata e na lavoura, fileiras de café e bosques, uma casa de fazenda e uma estrada. Isidoro comandava de Foz; a brigada de Estilac Leal segurava Catanduvas. No fim de fevereiro Isidoro escreveu a Prestes que muitos de seus soldados, e até alguns oficiais, estavam seminus e descalços, e que era preciso resistir pelo menos mais um mês (Blanc, p. 44). O governo tinha os canhões, e os batalhões patrióticos de voluntários se entrincheiravam do outro lado.',
        ],
        image: { entryId: 'army-patriotico', slot: 'hero-photo' },
        quote: {
          text: 'Daquele momento em diante, os rebeldes venceram pouquíssimas batalhas.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 42',
          attribution: 'Jacob Blanc, historiador, sobre a frente do Paraná no início de 1925',
          originalLocale: 'en',
          translated: true,
          note: OURS_PT,
        },
      },
      {
        heading: 'A Queda',
        paragraphs: [
          'Em 26 de março de 1925 o general Rondon começou os ataques que cercaram Catanduvas. Em 29 de março o reduto estava isolado: quatro mil soldados do governo e obuses de 105 mm contra 407 rebeldes. Estilac Leal e dois oficiais escaparam pelas linhas naquela noite; os demais se renderam antes do amanhecer de 30 de março. A campanha custou ao governo 179 mortos, 301 feridos e 60 desaparecidos, suas maiores perdas na revolução (Macaulay, p. 85).',
          'A frente estava perdida. Os homens que saíram dela com Miguel Costa encontrariam Prestes quatro dias depois e virariam a Brigada São Paulo da coluna.',
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
    perspective: 'Luís Carlos Prestes, chefe do estado-maior, com a retaguarda na ponte do Verdinho.',
    pages: [
      {
        heading: 'A Ponte',
        paragraphs: [
          'Em 10 de junho de 1925, em Camapuã, as duas brigadas viraram quatro destacamentos, sob Cordeiro de Farias, João Alberto, Siqueira Campos e Djalma Dutra. Atrás deles vinha uma coisa nova: os milicianos mineiros do major Bertoldo Klinger, de caminhão.',
          'Às quatro da tarde de 27 de junho, o carro de Klinger e cinco caminhões subiram a estrada até a ponte do Verdinho, perto de Mineiros, em Goiás. Prestes e seu estado-maior estavam ali com a retaguarda, o destacamento de Cordeiro. Klinger não esperou o resto da tropa; atacou com o que tinha, menos de cem homens (Macaulay, p. 123).',
        ],
      },
      {
        heading: 'O Vau',
        paragraphs: [
          'Prestes e Cordeiro viram que eram poucos, detiveram o avanço, empurraram-no para longe da ponte e puseram fogo nela. Custou aos rebeldes um morto e um ferido. À noite chegaram os outros caminhões de Klinger: cento e vinte fuzileiros e cinco guarnições de metralhadora. Cedo, em 28 de junho, a retaguarda atravessou o rio raso a vau e recuou para leste.',
          'Klinger não parou. Seus homens cavaram rampas nas duas margens e fizeram um vau com as madeiras da ponte queimada. Ao anoitecer cinco caminhões tinham passado; às sete da manhã seguinte, treze veículos estavam em Mineiros (Macaulay, pp. 123–124).',
        ],
        quote: {
          text: 'Pareciam bandeiras desfraldadas, levando velozmente por aqueles sertões a palavra de ordem, a presença da lei.',
          sourceKey: 'macaulay-1974',
          cite: 'The Prestes Column (1974), p. 124',
          attribution: 'Major Bertoldo Klinger, sobre a poeira de seus caminhões, 29 de junho de 1925',
          originalLocale: 'en',
          translated: true,
          note: MACAULAY_PT,
        },
      },
      {
        heading: 'O Custo',
        paragraphs: [
          'Ao meio-dia de 29 de junho, uns setenta quilômetros a leste, Klinger alcançou a nova retaguarda, o destacamento de Djalma Dutra. Às quatro da tarde o combate era de perto e confuso. Aldo Manenti, tenente de dezoito anos, italiano de São Paulo, subiu na cabine do caminhão da frente de Klinger, talvez tomando-o por um veículo rebelde, e morreu ao volante. Outros quatro rebeldes morreram dentro da linha legalista (p. 124).',
          'Naquela tarde a coluna deixou a estrada por um caminho de carro de boi onde os caminhões não passavam. A ponte comprara uma noite, não a segurança, e suas próprias madeiras levaram a perseguição para o outro lado. Verdinho é uma ação pequena numa marcha longa, e é isso que importa: a coluna sobreviveu entregando o chão na hora certa.',
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
    perspective: 'Luís Carlos Prestes, chefe do estado-maior, cobrindo a coluna pelo planalto de Minas Gerais.',
    pages: [
      {
        heading: 'Porto Nacional',
        paragraphs: [
          'Outubro de 1925. Seis meses depois do Paraná e quinze depois de São Paulo, a coluna chegou a Porto Nacional, à beira do Tocantins, no que era então o norte de Goiás. Os moradores fugiram para o mato; os frades ficaram. No convento dominicano, os chefes tiveram tempo, pela primeira vez, de pôr por escrito pelo que marchavam. Em 19 de outubro, Miguel Costa, Prestes e Juarez Távora assinaram um manifesto à nação. Pedia liberdade e Constituição, e ainda não falava da terra.',
        ],
        quote: {
          text: 'E o povo pode ficar certo de que os soldados revolucionários não enrolarão a bandeira da Liberdade enquanto se não modificar esse ambiente de despotismo e intolerância que asfixia, num delírio de opressão, os melhores anseios da consciência nacional!',
          sourceKey: 'manifesto-1925',
          cite: 'Manifesto of Porto Nacional, 19 Oct. 1925 (Marxists Internet Archive)',
          attribution: 'Miguel Costa, Luís Carlos Prestes e Juarez Távora, Porto Nacional, 19 de outubro de 1925',
        },
      },
      {
        heading: 'A Retaguarda',
        paragraphs: [
          'Abril de 1926. A coluna atravessara o Nordeste e descera da Chapada Diamantina para o norte de Minas Gerais. Os homens estavam cansados de um jeito que o sono não curava. Atrás deles vinham os batalhões patrióticos do sertão: bandos de jagunços sob seus chefes, pagos, fardados e armados pelo governo.',
          'Em 22 de abril, em Serra Nova, os jagunços de Horácio de Matos e Abílio Wolney caíram sobre a retaguarda (Macaulay, pp. 220–221). A coluna não parou para travar uma batalha campal. Rompeu o contato, deu a volta e fez os perseguidores a procurarem onde ela não estava.',
        ],
        image: { entryId: 'batalhoes-patrioticos-bahia', slot: 'hero-photo' },
      },
      {
        heading: 'O Laço',
        paragraphs: [
          'A fuga ficou lembrada como o "laço húngaro": uma série de marchas em círculo que confundiu os perseguidores e tirou a coluna do cerco que se fechava. As tropas federais tinham mandado o povo sair de casa; a coluna passou por uma terra esvaziada para a armadilha e chegou a Taiobeiras em 26 de abril.',
          'O mapa de Macaulay quebra a marcha em Serra Nova, linha cheia atrás e tracejada à frente, mas a quebra é do mapa. O que mudou depois de Serra Nova foi no alto comando, onde a conversa passou a ser deixar o Brasil.',
        ],
        image: { entryId: 'serra-nova', slot: 'blanc-map' },
      },
      {
        heading: 'A Marcha Seguinte',
        paragraphs: [
          'Serra Nova não foi uma vitória. Foi o momento em que a coluna escolheu continuar andando quando o cerco estava quase fechado.',
          'Trinta anos depois, Guimarães Rosa deu à marcha uma linha num romance. Seu velho jagunço lembra os soldados de Prestes passando pelos sertões de Minas. É ficção, e não nomeia este lugar. Mas o sertão guardou a marcha como a árvore guardou o chumbo.',
        ],
        quote: {
          text: 'Os revoltosos depois passaram por aqui, soldados de Prestes, vinham de Goiás, reclamaram posse de todos animais de sela. […] Muitos anos adiante, um roceiro vai lavrar um pau, encontra balas cravadas.',
          sourceKey: 'rosa-1956',
          cite: 'Grande sertão: veredas, 36th ed. (Rio de Janeiro: Nova Fronteira, 1986), p. 82',
          via: { sourceKey: 'mozzer-2009', cite: 'pp. 249–250' },
          attribution: 'João Guimarães Rosa, Grande sertão: veredas (1956), fala de Riobaldo',
        },
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
    place: 'O Pantanal de Mato Grosso; San Matías, Bolívia',
    perspective: 'Luís Carlos Prestes, chefe do estado-maior, conduzindo a coluna pelo Pantanal.',
    pages: [
      {
        heading: 'O Caminho da Fronteira',
        paragraphs: [
          'No fim de outubro de 1926 o alto comando decidiu como a marcha terminaria. Djalma Dutra e Moreira Lima foram para o sul procurar Isidoro. A coluna esperaria do lado brasileiro até o fim de janeiro e, sem notícias deles, entraria na Bolívia no começo de fevereiro (Macaulay, p. 232).',
          'Em 24 de dezembro, perto de Presidente Murtinho, uns quatrocentos milicianos de Mato Grosso, quase todos recrutas, barraram a estrada. João Alberto e Ary Salgado Freire os atacaram pelo flanco e os dispersaram, ao custo de um homem. Era a última força legalista entre a coluna e a fronteira; os jagunços de Franklin de Albuquerque continuavam pressionando a retaguarda (p. 233).',
        ],
      },
      {
        heading: 'O Alagado',
        paragraphs: [
          'A coluna atravessou o Paraguai perto das cabeceiras e virou para o sul. Em 10 de janeiro de 1927 entrou no Pantanal (Blanc, p. 127). Primeiro veio a mata seca, aberta a facão; depois a planície alagada. Os homens perderam quase todos os cavalos. Marcharam às vezes com água pelo peito, dormiram sobre cupinzeiros, o único chão seco, sob nuvens de mosquitos, e comeram palmito quando o gado acabou (Macaulay, p. 234).',
        ],
        quote: {
          text: 'Já não tínhamos uma única peça de roupa seca. Era impossível! Sonhávamos encontrar um pedaço de chão firme, onde pudéssemos fazer fogo…',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 127',
          attribution: 'João Alberto Lins de Barros, memórias, sobre o Pantanal, janeiro de 1927',
          originalLocale: 'en',
          translated: true,
          note: BLANC_PT,
        },
      },
      {
        heading: 'A Fronteira',
        paragraphs: [
          'Em 3 de fevereiro de 1927 a coluna cruzou a fronteira sem marcos e acampou ao norte de San Matías. Ary Salgado Freire foi à cidade boliviana acertar a rendição e encontrou lá Moreira Lima, de volta da Argentina. Em 4 de fevereiro, 620 homens entregaram noventa Mausers, quatro metralhadoras, dois fuzis-metralhadores e oito mil cartuchos (Macaulay, p. 234).',
          'Siqueira Campos não estava com eles. Tinha perdido o contato com a coluna no fim de outubro, soube num telégrafo de Goiás, em 8 de fevereiro, que ela estava na Bolívia, e entrou no Paraguai com sessenta e cinco homens em 23 de março. A marcha tinha acabado.',
        ],
        quote: {
          text: 'Estávamos reduzidos a uns seiscentos homens maltrapilhos, descalços e seminus. . . . A travessia [do Pantanal] foi a mais difícil de toda a nossa campanha.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 127',
          attribution: 'Italo Landucci, memórias (1947)',
          originalLocale: 'en',
          translated: true,
          note: BLANC_PT,
        },
      },
    ],
    briefing: {
      pitch:
        'O Pantanal, janeiro de 1927. A coluna está exausta; a fronteira está à frente. Prestes manda a retaguarda manter a coluna unida, levar os feridos e chegar à fronteira. Não há batalha a vencer; a marcha é o objetivo.',
      objectives: ['Atravessar o alagado e as águas.', 'Manter a coluna unida.', 'Levar os feridos.', 'Chegar à fronteira.'],
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
          'Depois de San Matías, a maioria dos oficiais seguiu para a Argentina. Prestes ficou na Bolívia com um pequeno grupo, entre eles Djalma Dutra e Moreira Lima. Noventa milhas ao sul, em La Gaiba, uma companhia inglesa, a Bolivian Concessions Ltd., tinha direitos sobre trinta milhões de acres. Prestes, engenheiro, negociou um contrato: por um pequeno salário diário, seus homens abriram uma estrada na mata e construíram armazéns. O pagamento mal cobria os remédios contra a malária e a disenteria, e Hermínia, a enfermeira que marchava desde São Paulo, montou um hospital (Blanc, p. 132).',
        ],
        image: { entryId: 'la-gaiba-1927', slot: 'workers' },
      },
      {
        heading: 'O Monumento',
        paragraphs: [
          'Em 5 de julho de 1927, quinto aniversário de Copacabana e terceiro de São Paulo, os exilados inauguraram um monumento aos mortos da coluna. Era um bloco de granito, e nele gravaram: "Glória aos Bandeirantes da Liberdade, 1924–1927" (retradução do inglês). Moreira Lima fez o discurso; o Correio da Manhã o publicou no Rio em 22 de julho (Blanc, p. 142).',
        ],
        image: { entryId: 'la-gaiba-1927', slot: 'monument' },
        quote: {
          text: 'Cheios de emoção e de dor, inauguramos este mausoléu à memória dos bravos soldados da Coluna Prestes.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 142',
          attribution: 'Lourenço Moreira Lima, La Gaiba, 5 de julho de 1927 (Correio da Manhã, 22 de julho de 1927, p. 5)',
          originalLocale: 'en',
          translated: true,
          note: BLANC_PT,
        },
      },
      {
        heading: 'Os Mortos',
        paragraphs: [
          'Alguns mortos da coluna ficaram em La Gaiba, homens que tinham caminhado das Missões até uma mata estrangeira. Moreira Lima, o secretário da coluna, que contara cada légua da marcha, despediu-se deles.',
        ],
        quote: {
          text: 'Soldados da Liberdade! Dormi tranqüilos na terra estrangeira que vos acolheu com tanta nobreza, porque os vossos nomes e os vossos feitos serão eternos no coração generoso do Brasil.',
          sourceKey: 'lima-1931',
          cite: 'Marchas e combates, 3rd ed. (1979), p. 523, via Mozzer 2009, p. 257',
          attribution: 'Lourenço Moreira Lima, La Gaiba, Bolívia, 1927',
        },
      },
      {
        heading: 'A Memória',
        paragraphs: [
          'No mesmo dia, no Brasil, o jornal Vanguarda chamou Prestes de Cavaleiro da Esperança, nome que Isidoro lhe dera. A imprensa que chamara os rebeldes de bandidos agora arrecadava dinheiro para eles. Os "bandeirantes" coletivos ficaram enterrados no estrangeiro; a lenda de um só homem cresceu em casa, e com ela a imagem de um interior selvagem à espera de um herói.',
          'A campanha termina aqui. O registro precisa dizer o que a marcha custou e o que ela foi: vinte e cinco mil quilômetros em vinte e cinco meses, uma marcha política que sobreviveu ao governo e não virou uma vitória.',
        ],
        image: { entryId: 'exile-1927', slot: 'caricature' },
        quote: {
          text: 'Em 1927 o Brasil queria heróis, mas não uma revolução.',
          sourceKey: 'macaulay-1974',
          cite: 'The Prestes Column (1974), p. 234',
          attribution: 'Neill Macaulay, historiador',
          originalLocale: 'en',
          translated: true,
          note: OURS_PT,
        },
      },
    ],
    briefing: {
      pitch:
        'La Gaiba, julho de 1927. A marcha acabou. Os exilados estão aqui para inaugurar um monumento. Prestes lhes diz o que a coluna foi e o que não foi.',
      objectives: ['Chegar a La Gaiba.', 'Inaugurar o monumento.', 'Escolher o que a coluna deixa para trás.'],
    },
  },
};
