// complete-books-and-bibliography 4.1, 5.1-5.5: notas e legendas acrescentadas
// quando os livros foram concluídos. Mescladas sobre pt-BR.ts por compendium.ts;
// mantenha em dia com books-en.ts e com docs/campaign/compendium/entries.
import type { CompendiumAddition } from '../compendium';

const BLANC_PT = 'Tradução nossa da versão inglesa de Blanc; o original em português não foi consultado.';
const OURS_PT = 'Tradução nossa do inglês.';

export const COMPENDIUM_BOOKS_PT_BR: Readonly<Record<string, CompendiumAddition>> = {
  // --- Legendas de verbetes que já tinham nota ------------------------------
  'rs-revolt-1924': {
    images: {
      'hero-photo': {
        caption:
          'Rebeldes do 1º Batalhão Ferroviário deixam Santo Ângelo rumo a São Luiz Gonzaga em veículos requisitados, 1924. Não é o combate da Ramada.',
        credit: 'Autor desconhecido; AHMACPS, Santo Ângelo, via Wikimedia Commons',
      },
      map: { caption: 'A revolta no Rio Grande do Sul, outubro de 1924: mapa moderno.', credit: 'User:Serraria, via Wikimedia Commons' },
    },
  },
  'porto-mendes': {
    images: {
      'hero-photo': {
        caption: 'Porto Mendes ocupado pelo 10º Batalhão de Caçadores, 1925. A fotografia foi feita para as forças do governo.',
        credit: 'Thomaz Luiz Reis, via Wikimedia Commons',
      },
    },
  },
  'lourenco-moreira-lima': {
    images: {
      portrait: {
        caption: 'Lourenço Moreira Lima, 1927 (atribuída: a procedência da fotografia não está registrada).',
        credit: 'Autor desconhecido, via Wikimedia Commons',
      },
    },
  },
  tenentismo: {
    images: {
      'hero-photo': { caption: 'A revolta do Forte de Copacabana, julho de 1922.', credit: 'Autor desconhecido, via Wikimedia Commons' },
    },
  },
  'revolt-1922': {
    images: {
      press: {
        caption: 'Gazeta de Notícias, 6 de julho de 1922: a imprensa no dia em que o levante foi sufocado.',
        credit: 'Gazeta de Notícias, via Wikimedia Commons',
      },
    },
  },
  'la-gaiba': {
    place: 'Leste da Bolívia, perto da fronteira brasileira',
    note: [
      {
        paragraphs: [
          'La Gaiba é o fim da marcha. A Coluna atravessou o Pantanal e entrou na Bolívia por San Matías em 3 de fevereiro de 1927; noventa milhas ao sul, em La Gaiba, uma companhia inglesa, a Bolivian Concessions Ltd., deu trabalho aos exilados (Blanc, p. 132). Em 5 de julho de 1927 eles ergueram ali um pequeno monumento sobre um bloco de granito, com a inscrição "Glória aos Bandeirantes da Liberdade, 1924–1927" (Blanc, p. 142, fig. 7.5; retradução do inglês, a pedra não foi consultada).',
          'A La Gaiba do jogo é uma clareira junto à lagoa, com o monumento, o acampamento e a água: um cenário com fontes, não um levantamento. A campanha termina aqui com a memória, não com uma batalha nem com uma vitória.',
        ],
      },
    ],
    images: {
      map: {
        caption: 'A lagoa de La Gaiba, na fronteira boliviana: imagem de satélite moderna.',
        credit: 'NASA, via Wikimedia Commons',
      },
    },
  },
  'map-serra-rio': {
    images: {
      'verdinho-today': {
        caption: 'O rio Verdinho hoje. Não se conhece fotografia da ponte de 1925.',
        credit: 'Paulo Roberto, via Wikimedia Commons (Panoramio)',
      },
    },
  },
  'sao-luiz-1924': {
    images: {
      'route-map': {
        caption: 'O trajeto da Coluna de São Luiz Gonzaga a Benjamin Constant, de dezembro de 1924 a abril de 1925: mapa moderno.',
        credit: 'User:Serraria, via Wikimedia Commons',
      },
      'blanc-map': {
        caption: 'Os rebeldes escapam do cerco de São Luiz Gonzaga, dezembro de 1924.',
        credit: 'Mapa de Gabe Moss, em Blanc 2024 (Duke University Press), mapa 2.1',
      },
    },
  },
  'sao-luiz-gonzaga': {
    place: 'Noroeste do Rio Grande do Sul',
    note: [
      {
        paragraphs: [
          'São Luiz Gonzaga fica na paisagem missioneira do noroeste do Rio Grande do Sul. Depois do levante de 28 e 29 de outubro de 1924, tornou-se a base dos rebeldes: os homens de Prestes ocuparam a cidade por algumas semanas, e ali se imprimiram os primeiros números de O Libertador (Macaulay, p. 165).',
          'Em dezembro o governo lançou sete destacamentos legalistas contra a cidade. Prestes deixou um destacamento em contato, simulando a retirada completa, e reuniu os demais em São Miguel das Missões; à noite os legalistas fecharam o cerco sobre uma posição vazia, enquanto os rebeldes marchavam para nordeste, rumo ao Ijuí (Blanc, p. 37). A cidade é um lugar de partida, não de vitória.',
          'Anita Prestes e os historiadores das Missões datam a Coluna dessa partida, em 27 de dezembro de 1924; o jogo segue Macaulay, que a data da divisão formada em abril de 1925, e o compêndio registra as duas leituras.',
        ],
      },
    ],
  },
  'mauser-7mm': {
    images: {
      'hero-photo': {
        caption: 'Um Mauser Modelo 1908, o fuzil 7 mm adotado pelo Exército brasileiro naquele ano. As fontes não dizem qual modelo a Coluna usava.',
        credit: 'Wikimedia Commons',
      },
    },
  },
  'siqueira-campos': {
    images: {
      'portrait-1922': { caption: 'Antônio de Siqueira Campos, início dos anos 1920.', credit: 'Autor desconhecido' },
    },
  },
  'army-coluna': {
    note: [
      {
        heading: 'Viver da terra',
        paragraphs: [
          'Ninguém abastecia a Coluna. Ela tomava comida, cavalos e roupas da terra que atravessava. O comando dava recibos de requisição e, a partir de Mato Grosso, pequenos grupos a cavalo, as potreadas, saíam pelos flancos para recolher cavalos. Para uma família pobre, um boi ou um cavalo levado podia ser a ruína, e o comando acabou por saber disso. O custo para os pobres foi uma das razões do exílio em 1927.',
          'Houve abusos, sobretudo nos primeiros meses. O comando proibiu o saque indiscriminado, expulsou quem desobedecia e puniu os piores crimes, às vezes com a morte. As tropas do governo também saquearam e estupraram, mas a propaganda oficial chamava os rebeldes de bandidos, e em muitos lugares o povo fugia antes de eles chegarem.',
        ],
      },
      {
        heading: 'As marcas que deixou',
        paragraphs: [
          'A Coluna deixou também marcas de outro tipo. Queimou livros de impostos, como em Carolina, abriu as cadeias e destruiu troncos, gargalheiras e palmatórias. Nunca teve mais de cerca de 1.500 homens, embora o boato em Teresina falasse em cinco ou dez mil. Muitos de seus soldados eram negros, escondidos nos registros sob palavras como "caboclo" e "pelo-duro". Ninguém os contou.',
          'Em San Matías, em 4 de fevereiro de 1927, 620 homens entregaram noventa Mausers, quatro metralhadoras, dois fuzis-metralhadores e oito mil cartuchos (Macaulay, p. 234).',
        ],
        quote: {
          text: 'A Coluna, em sua marcha pelo Brasil, tentava fazer justiça, queimando os livros e listas de cobranças de impostos, soltando os prisioneiros e destruindo instrumentos de tortura que encontrava.',
          sourceKey: 'anita-1995',
          cite: 'Uma epopéia brasileira: a Coluna Prestes (São Paulo: Moderna, 1995), p. 81',
          via: { sourceKey: 'mozzer-2009', cite: 'p. 255' },
          attribution: 'Anita Leocádia Prestes, historiadora, 1995',
        },
      },
    ],
    images: {
      'hero-photo': { caption: 'Homens da Coluna numa travessia de rio. O lugar e a data não estão identificados.', credit: 'Autor desconhecido' },
      portinari: { caption: 'Candido Portinari, Coluna Prestes.', credit: 'Projeto Portinari' },
    },
  },
  'ramada-1925': {
    note: [
      {
        paragraphs: [
          'A Ramada foi o preço do rompimento do cerco. Macaulay situa o combate de 3 de janeiro de 1925 perto de Palmeiras, onde a Coluna perdeu cerca de quarenta homens (p. 61); a memória local o chama de Ramada, nome de uma fazenda próxima. A retaguarda resistiu o bastante para a Coluna chegar ao Uruguai em 9 de janeiro, e a travessia veio mais tarde naquele mês.',
          'Os cavalos foram o custo mais visível. Tinham carregado a Coluna e puxado as carroças; na travessia, a maioria estava perdida ou teve de ser deixada. A Coluna seguiu a pé por Santa Catarina. O que sobreviveu não foi um exército vitorioso, mas uma coluna capaz de continuar andando.',
        ],
      },
      {
        heading: 'De quem é o monumento',
        paragraphs: [
          'O lugar é lembrado pelos dois lados. Santo Ângelo ergueu um monumento à marcha; na Ramada, perto do cruzamento chamado Esquina Urma, a pedra é dos outros mortos.',
        ],
        quote: {
          text: 'Mas o monumento não era para os rebeldes: homenageava os quase cem soldados legalistas mortos pelos homens de Prestes.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 237',
          attribution: 'Jacob Blanc, historiador, em sua visita à Ramada',
          originalLocale: 'en',
          translated: true,
          note: OURS_PT,
        },
      },
    ],
  },
  'luis-carlos-prestes': {
    addSections: [
      {
        heading: 'Como se fez a lenda',
        paragraphs: [
          'No exílio, Prestes virou uma figura que os jornais disputavam. Jornalistas viajaram à Bolívia para entrevistá-lo, e a imprensa foi buscar suas virtudes na infância: O Jornal mandou um repórter falar com sua mãe, Leocádia (Blanc, p. 135). O retrato do chefe brando e correto foi o começo do Cavaleiro da Esperança.',
        ],
        quote: {
          text: 'Ele era bondoso demais. Não havia como alguém com tanta bondade lutar numa rebelião que podia tirar a vida de sua própria gente.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 135',
          attribution: 'Leocádia Prestes, sua mãe, a O Jornal, 1927',
          originalLocale: 'en',
          translated: true,
          note: BLANC_PT,
        },
      },
    ],
  },
  pantanal: {
    place: 'Mato Grosso, rumo à Bolívia e ao Paraguai',
    note: [
      {
        paragraphs: [
          'O Pantanal foi a última grande travessia da marcha. A Coluna deixou a zona dos diamantes no fim de dezembro de 1926, atravessou o Paraguai perto das cabeceiras e desceu para o sul, para dentro do alagado, com os jagunços de Franklin de Albuquerque no encalço. Blanc data a entrada de 10 de janeiro de 1927 (p. 127).',
          'A travessia não foi uma batalha. Os rebeldes perderam quase todos os cavalos, marcharam às vezes com água pelo peito, dormiram sobre cupinzeiros, o único chão seco, e comeram palmito quando o gado acabou (Macaulay, p. 234). O grosso da Coluna entrou na Bolívia por San Matías em 3 de fevereiro de 1927.',
          'O Pantanal do jogo é uma abstração da travessia, não um levantamento do alagado.',
        ],
      },
    ],
    images: {
      'route-map-1977': {
        caption: 'O trajeto da Coluna em Mato Grosso em maio e junho de 1925, como Malan o desenhou em 1977: a primeira travessia do estado, não o Pantanal de 1927.',
        credit: 'Malan, Uma escolha, um destino (BIBLIEx, 1977), p. 249',
      },
    },
  },
  'serra-nova': {
    images: {
      'blanc-map': {
        caption: 'A Coluna Prestes na Bahia, abril a julho de 1926.',
        credit: 'Mapa de Gabe Moss, em Blanc 2024 (Duke University Press), mapa 5.1',
      },
    },
  },
  'o-libertador-1924': {
    images: {
      'front-page': { caption: 'O Libertador, nº 1, São Luiz Gonzaga, 5 de novembro de 1924.', credit: 'Fundação Biblioteca Nacional' },
    },
  },
  'coluna-no-grande-sertao': {
    note: [
      {
        heading: 'O que Riobaldo lembra',
        paragraphs: [
          'Riobaldo, o velho jagunço que narra o romance, menciona a Coluna só de passagem. Os revoltosos vieram de Goiás e tomaram todos os cavalos de sela. Houve tiroteio na barra do Urucuia, em São Romão, onde um vapor do governo desembarcou tropa da Bahia. Anos depois, conta ele, um roceiro racha um tronco e encontra balas cravadas na madeira.',
          'A cena combina com o que a história registra: a fome de cavalos da Coluna, os batalhões patrióticos da Bahia e os rios do norte de Minas. Continua sendo ficção, contada por um homem de ficção.',
        ],
        quote: {
          text: 'Os revoltosos depois passaram por aqui, soldados de Prestes, vinham de Goiás, reclamaram posse de todos animais de sela. […] Muitos anos adiante, um roceiro vai lavrar um pau, encontra balas cravadas.',
          sourceKey: 'rosa-1956',
          cite: 'Grande sertão: veredas, 36th ed. (Rio de Janeiro: Nova Fronteira, 1986), p. 82',
          via: { sourceKey: 'mozzer-2009', cite: 'pp. 249–250' },
          attribution: 'João Guimarães Rosa, Grande sertão: veredas (1956), fala de Riobaldo',
        },
      },
      {
        heading: 'A leitura de um crítico',
        paragraphs: [
          'Marcelo Mozzer (2008/2009) vai além. Ele nota que os rios das guerras de Riobaldo incluem o Urucuia, o Carinhanha, o Preto, o Paracatu e o São Francisco, os mesmos que Jorge Amado e Abguar Bastos citam para a passagem da Coluna por Minas. Põe os bandos e chefes do romance ao lado dos destacamentos e comandantes da Coluna. Compara as regras do romance contra o saque com as punições da Coluna para ele. E pergunta se um "Dr. Meigo de Lima" do romance ecoa Lourenço Moreira Lima.',
          'O próprio Mozzer chama isso de intuição. Rosa lia muito, e a Coluna foi o grande acontecimento militar de sua juventude em Minas, mas nenhum documento mostra que ele se valeu dela. O livro guarda a ligação como possibilidade. O certo é menor: a marcha entrou na memória do sertão, em cantigas, em cordel e num grande romance.',
        ],
        quote: {
          text: 'Em Minas a Coluna marcha sobre os chapadões limitados pelos rios, Preto, Urucuia, Carinhanha.',
          sourceKey: 'amado-1942',
          cite: 'O cavaleiro da esperança, 32nd ed. (Rio de Janeiro: Record, 1985), p. 131',
          via: { sourceKey: 'mozzer-2009', cite: 'p. 255' },
          attribution: 'Jorge Amado, O cavaleiro da esperança (1942)',
        },
      },
    ],
  },
  'batalhoes-patrioticos-bahia': {
    images: {
      'hero-photo': {
        caption: 'Batalhão de patriotas para combater a Coluna Prestes em Boa Vista, datado de 24 de dezembro de 1926. É de Pernambuco, não da Bahia.',
        credit: 'Autor desconhecido, via Wikimedia Commons',
      },
    },
  },

  // --- Acontecimentos ---------------------------------------------------------
  'rs-civil-war-1923': {
    place: 'Rio Grande do Sul',
    note: [
      {
        heading: 'Chimangos e maragatos',
        paragraphs: [
          'O Rio Grande do Sul era o único estado que permitia a reeleição do governador, e Borges de Medeiros ocupava o cargo pela quinta vez desde 1898. Seus inimigos, divididos desde a década de 1890, uniram-se em 1922 na Aliança Libertadora, os maragatos, e pegaram em armas em janeiro de 1923, à espera de que o presidente Artur Bernardes interviesse a seu favor. Os partidários de Borges eram os chimangos, nome de uma ave que os caricaturistas lhe deram pelo nariz comprido e pela magreza (Macaulay, p. 7).',
          'Bernardes ficou de fora enquanto os dois lados se desgastavam. No fim de 1923 um mediador federal obteve uma trégua e impôs um acordo: Borges cumpriria o quinto mandato, mas não poderia se reeleger, e os libertadores ganhariam cadeiras na Assembleia e no Congresso (Macaulay, pp. 7–8).',
        ],
      },
      {
        heading: 'O que deixou para 1924',
        paragraphs: [
          'O acordo fez do presidente o único vencedor. Os libertadores foram desarmados, e seu chefe político, Assis Brasil, passou para o lado dos inimigos de Bernardes: os tenentes de 1924 o nomearam chefe civil de sua revolução (Macaulay, p. 8). A guerra deixou também homens que sabiam lutar: a fita vermelha no chapéu dos rebeldes gaúchos de 1924 era a cor dos maragatos, e muitos dos provisórios que os combateram eram veteranos do lado chimango.',
        ],
      },
    ],
  },
  'sao-paulo-retaken-1924': {
    place: 'São Paulo',
    note: [
      {
        heading: 'Três semanas de bombardeio',
        paragraphs: [
          'Os rebeldes ocupavam São Paulo desde 5 de julho de 1924. A partir de 11 de julho a artilharia e a aviação legalistas bombardearam a cidade, e as granadas mataram sobretudo civis dos bairros operários (Macaulay, p. 16). Isidoro ofereceu render-se em troca de anistia para todos os envolvidos nos levantes desde 1922; o comandante do governo, com cem canhões ao alcance, respondeu que os aniquilaria se não se rendessem sem condições.',
        ],
      },
      {
        heading: 'A noite de 27 de julho',
        paragraphs: [
          'O que decidiu os rebeldes foi a ameaça à sua única saída, a oeste. Às dez da noite de 27 de julho o primeiro trem de tropa deixou a estação da Luz; ao amanhecer, treze trens haviam levado uns três mil homens e catorze canhões de campanha. Duas peças ficaram para trás, ainda atirando quando partiu o último trem, e o comando do governo só soube da retirada na manhã seguinte (Macaulay, pp. 16–17).',
          'Os legalistas entraram numa cidade que os rebeldes já tinham deixado. Os trens seguiram para oeste até Bauru e depois para o sul, rumo ao Paraná, onde a revolta virou a frente do Paraná.',
        ],
      },
    ],
    images: {
      'hero-photo': { caption: 'Tropas legalistas em São Paulo, 1924.', credit: 'Gustavo Prugner, via Wikimedia Commons' },
    },
  },
  'iguacu-1925': {
    place: 'Oeste do Paraná',
    note: [
      {
        heading: 'Não foi em Foz',
        paragraphs: [
          'A frente do Paraná caiu no fim de março de 1925. Em 26 de março o general Rondon começou os ataques que isolaram Catanduvas, e antes do amanhecer de 30 de março os 407 rebeldes de lá se renderam a quatro mil soldados do governo (Macaulay, p. 85). A brigada de Miguel Costa começou a retirar-se para oeste em 31 de março.',
          'Os homens de Prestes, vindos do sul, tinham alcançado a mesma estrada em Benjamin Constant. Ali, em 3 de abril de 1925, Prestes e Miguel Costa se encontraram. Combinaram não descer a Foz do Iguaçu para se render ou emigrar, mas juntar as forças e atravessar o Paraná rumo a Mato Grosso, e mandaram as tropas para Porto Santa Helena sem consultar Isidoro (Macaulay, p. 86).',
        ],
      },
      {
        heading: 'A divisão',
        paragraphs: [
          'Só então foram a Foz do Iguaçu, onde Isidoro tinha seu quartel-general. Em 12 de abril o marechal disse aos oficiais que nada mais se podia fazer no campo militar e que o exílio era a única saída; a maioria concordou, Prestes não. Em 14 de abril de 1925, em Porto Santa Helena, formou-se a 1ª Divisão Revolucionária: Miguel Costa no comando, Prestes chefe do estado-maior, uma brigada paulista e uma brigada rio-grandense (Macaulay, pp. 86–89).',
        ],
      },
    ],
  },
  'parana-crossing-1925': {
    place: 'De Porto Mendes, no Paraná, a Puerto Adela, no Paraguai',
    note: [
      {
        paragraphs: [
          'O desembarque na margem paraguaia começou em 27 de abril de 1925 e a travessia terminou em 29 de abril. Macaulay conta no máximo 1.500 homens, 600 cavalos e mulas e três canhões de 75 mm; a Brigada Rio Grande tinha cerca de 800 homens, a Brigada São Paulo cerca de 700 (Macaulay, pp. 88–89, 93).',
          'A divisão atravessou um canto do Paraguai e voltou ao Brasil pelo sul de Mato Grosso. Os canhões não foram longe: foram abandonados e escondidos em Mato Grosso (p. 95), e dali em diante a Coluna lutou com fuzis e um punhado de armas automáticas.',
        ],
      },
    ],
  },
  'serra-nova-1926': {
    place: 'Norte de Minas Gerais',
    note: [
      {
        heading: 'A retaguarda',
        paragraphs: [
          'Em 22 de abril de 1926, em Serra Nova, os jagunços de Horácio de Matos e Abílio Wolney caíram sobre a retaguarda da Coluna (Macaulay, pp. 220–221). Eram batalhões patrióticos, alistados e armados pelo governo, e conheciam a terra melhor que a Coluna.',
          'Tropas federais tentaram fechar um cerco. A Coluna rompeu o contato e confundiu os perseguidores com marchas em círculo, o "laço húngaro", e passou por Taiobeiras em 26 de abril (Nascimento 2026; ALMG).',
        ],
      },
      {
        heading: 'Uma linha num mapa',
        paragraphs: [
          'O mapa de Macaulay divide a marcha em Serra Nova: linha cheia desde São Luiz Gonzaga, linha tracejada até San Matías. A divisão é uma conveniência do mapa, não uma segunda fase que ali começou. O que começou no alto comando depois de Serra Nova foi a conversa sobre deixar o Brasil.',
        ],
      },
    ],
    images: {
      'hero-photo': {
        caption: '"A Columna Prestes": capa de O Malho, nº 1254, 25 de setembro de 1926. Imagem de imprensa, não uma fotografia de Serra Nova.',
        credit: 'O Malho; Hemeroteca Digital Brasileira (BN), via Wikimedia Commons',
      },
    },
  },
  'exile-1927': {
    place: 'San Matías, Bolívia, e Bella Vista, Paraguai',
    note: [
      {
        heading: 'O plano',
        paragraphs: [
          'No fim de outubro de 1926 o alto comando mandou Djalma Dutra e Moreira Lima ao sul, à procura de Isidoro. A Coluna ficaria do lado brasileiro da fronteira até o fim de janeiro de 1927 e, sem notícias deles, entraria na Bolívia no começo de fevereiro (Macaulay, p. 232). Em 24 de dezembro, perto de Presidente Murtinho, dispersou uns quatrocentos milicianos de Mato Grosso, a última força legalista entre ela e a fronteira, ao custo de um homem (p. 233).',
        ],
      },
      {
        heading: 'Duas fronteiras',
        paragraphs: [
          'Em 3 de fevereiro de 1927 o grosso da Coluna cruzou a fronteira sem marcos e acampou ao norte de San Matías, onde Moreira Lima, de volta da Argentina, foi ao seu encontro. Em 4 de fevereiro, 620 homens entregaram à guarnição boliviana noventa Mausers, quatro metralhadoras, dois fuzis-metralhadores e oito mil cartuchos, e se puseram sob a proteção da Bolívia (Macaulay, p. 234; o livro imprime 1926).',
          'Siqueira Campos tinha perdido o contato com a Coluna depois de uma finta rumo a Campo Grande no fim de outubro de 1926. Soube no telégrafo de Cristianópolis, em Goiás, em 8 de fevereiro, que ela entrara na Bolívia; voltou-se para o sul e entrou no Paraguai por Bella Vista com sessenta e cinco homens em 23 de março de 1927; no dia seguinte entregaram vinte Mausers e mil cartuchos (pp. 233–234; o livro erra o ano). A Coluna marchara cerca de 25.000 quilômetros em vinte e cinco meses.',
        ],
      },
      {
        heading: 'Heróis no exílio',
        paragraphs: [
          'A maioria dos oficiais seguiu para a Argentina; Prestes ficou na Bolívia com um pequeno grupo, entre eles Dutra e Moreira Lima (Blanc, p. 132). No Brasil, a imprensa que os chamara de bandidos agora arrecadava dinheiro para eles, quase cinquenta contos de réis, e o nome que Isidoro deu a Prestes, Cavaleiro da Esperança, chegou aos jornais em julho de 1927 (Blanc, pp. 139–142). O elogio tinha um avesso: a lenda do herói civilizador precisava de um interior selvagem.',
        ],
        quote: {
          text: '…mostrando ao índio selvagem de nossas matas toda a generosidade e a bondade que há no coração dos brancos do litoral.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), pp. 142–143',
          attribution: 'Correio da Manhã, 16 de dezembro de 1927, p. 2',
          originalLocale: 'en',
          translated: true,
          note: BLANC_PT,
        },
      },
    ],
    images: {
      'hero-photo': {
        caption: '"A última photographia dos chefes revolucionários": Careta, nº 978, 19 de março de 1927. Entre eles, Djalma Dutra, Siqueira Campos, Prestes, Miguel Costa e Juarez Távora.',
        credit: 'Careta, via Wikimedia Commons',
      },
      interview: {
        caption: 'La Gaiba, Bolívia, 1927: o jornalista Rafael Correia de Oliveira (sentado, à esquerda) entrevista Prestes (sentado, ao centro).',
        credit: 'CPDOC/FGV, ILA foto 011-9 (Blanc 2024, fig. 7.2)',
      },
      caricature: { caption: 'Prestes no exílio, caricatura em Careta, nº 1063, 3 de novembro de 1928.', credit: 'Careta, via Wikimedia Commons' },
    },
  },
  'la-gaiba-1927': {
    place: 'La Gaiba, Bolívia',
    note: [
      {
        heading: 'Trabalho no exílio',
        paragraphs: [
          'No ano anterior à chegada da Coluna, uma companhia inglesa, a Bolivian Concessions Ltd., obtivera direitos sobre trinta milhões de acres do leste boliviano, com sede em La Gaiba, noventa milhas ao sul de San Matías. Prestes, engenheiro, negociou um contrato: por um pequeno salário diário, seus homens abriram uma estrada na mata e construíram armazéns para café e outras colheitas. O pagamento mal cobria os remédios contra a malária e a disenteria; Hermínia, a enfermeira que marchava desde São Paulo, montou um hospital improvisado (Blanc, p. 132).',
        ],
      },
      {
        heading: '5 de julho de 1927',
        paragraphs: [
          'No quinto aniversário do levante de Copacabana e no terceiro da revolta de São Paulo, os exilados inauguraram um pequeno monumento aos mortos da Coluna: um bloco de granito com a inscrição "Glória aos Bandeirantes da Liberdade, 1924–1927" (retradução do inglês). Moreira Lima fez o discurso, que o Correio da Manhã publicou em 22 de julho (Blanc, p. 142, n. 29).',
          'No mesmo dia, no Brasil, o jornal Vanguarda chamou Prestes de Cavaleiro da Esperança. Blanc lê a data como uma dobradiça: os "bandeirantes" coletivos enterrados no estrangeiro, a lenda de um só homem crescendo em casa.',
        ],
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
    ],
    images: {
      monument: {
        caption: 'O monumento aos "Bandeirantes da Liberdade", La Gaiba, Bolívia, fotografado entre julho e novembro de 1927.',
        credit: 'CPDOC/FGV, ILA foto 011-8 (Blanc 2024, fig. 7.5)',
      },
      workers: {
        caption: 'Rebeldes exilados trabalhando para a Bolivian Concessions Ltd., La Gaiba, 1927.',
        credit: 'CPDOC/FGV, ILA foto 011-7 (Blanc 2024, fig. 7.1)',
      },
    },
  },

  // --- Lugares ------------------------------------------------------------------
  'vila-militar': {
    place: 'Deodoro e Realengo, a oeste do Rio de Janeiro',
    note: [
      {
        paragraphs: [
          'A Vila Militar era o grande distrito de quartéis do Exército na zona oeste do Rio, ao lado da Escola Militar do Realengo. Em 1922 Prestes era o subcomandante da 1ª Companhia de Engenharia, em Deodoro. O plano do levante previa cortar as linhas de telégrafo e telefone da cidade enquanto os cadetes marchavam do Realengo e o marechal Hermes da Fonseca assumia o comando na Vila Militar (Macaulay, pp. 37–38).',
          'Prestes pegou tifo em 13 de junho e ainda estava de cama na noite de 4 de julho. Os cadetes marcharam e foram recebidos a tiros na Vila Militar; o distrito não se levantou. O campo de instrução do jogo é um terreno fictício ali perto, não um lugar dos registros.',
        ],
      },
    ],
    images: {
      map: { caption: 'Mapa da Vila Militar, 1922.', credit: 'Serviço Geográfico Militar, via Wikimedia Commons' },
    },
  },
  'map-bairro': {
    place: 'Um bairro de São Paulo, julho de 1924 (campo de batalha fictício)',
    note: [
      {
        paragraphs: [
          'O bombardeio de julho de 1924 caiu sobre a Mooca, o Brás, o Cambuci, o Belenzinho, o Ipiranga, a Penha, Perdizes e a região da Sé, os bairros de fábricas e de operários de uma cidade de quase seiscentos mil habitantes, um terço deles nascidos no estrangeiro (Macaulay, pp. 8, 16; Cohen 2007).',
          'O campo de batalha do Bairro toma emprestado esse cenário: ruas, uma fábrica, uma linha de bonde. É um lugar fictício, e não foi uma batalha da Coluna. O jogo não põe civis nele e não recompensa a destruição, porque quem morreu naquelas ruas não era soldado.',
        ],
      },
    ],
  },

  // --- Armas --------------------------------------------------------------------
  'machine-guns-7mm': {
    note: [
      {
        paragraphs: [
          'Quando a Coluna se reorganizou em destacamentos, em junho de 1925, tinha quatro metralhadoras 7 mm (Macaulay, p. 113). Ainda as tinha no fim: quatro metralhadoras estavam entre as armas entregues em San Matías em 4 de fevereiro de 1927 (p. 234).',
          'A fonte não diz o modelo. No jogo, a Peça de metralhadora leva uma, e cada força pode ter só uma: nunca houve muitas.',
        ],
      },
    ],
  },
  'automatic-rifles-7mm': {
    note: [
      {
        paragraphs: [
          'Em junho de 1925 a Coluna tinha mais ou menos tantos fuzis-metralhadores em condições quanto metralhadoras, uns quatro (Macaulay, p. 113); dois foram entregues em San Matías (p. 234). A fonte dá o calibre, 7 mm, mas não o modelo.',
          'No jogo, um fuzil-metralhador arma o Fogão com fuzil-metralhador e a Guarnição de fuzil-metralhador, no máximo dois por força.',
        ],
      },
    ],
  },
  'winchester-44': {
    note: [
      {
        paragraphs: [
          'Em Goiás, as Winchesters de caça dos fazendeiros cobraram seu preço dos forrageadores da Coluna, que por sua vez tomaram Winchesters, em parte porque seus Mausers já não tinham munição. A munição militar 7 mm era rara no sertão; cartuchos .44 se compravam em quase toda parte (Macaulay, p. 152).',
          'O governo armava seus irregulares do mesmo jeito: uma remessa para um batalhão patriótico na Paraíba, em fevereiro de 1926, levava quarenta Mausers, uma caixa de munição 7 mm e dois mil cartuchos de Winchester (p. 205).',
        ],
      },
    ],
  },
  'irregular-arms': {
    note: [
      {
        paragraphs: [
          'No acampamento do Ibirocaí, no Rio Grande do Sul, no fim de 1924, Macaulay conta uns três mil homens e cinco mil cavalos. Só cerca de mil estavam bem armados; os demais levavam revólveres, carabinas, lanças e armas velhas. O contingente regular de uns duzentos homens sob o major Távora tinha Mausers e instrução de tiro (Macaulay, p. 54).',
          'Os rebeldes gaúchos lutavam a cavalo, com cavalhada de reserva, e usavam no chapéu a fita vermelha dos libertadores (pp. 44, 52). O jogo dá revólver ao oficial do Comando e ao chefe da Potreada; carabinas e lanças não estão no jogo.',
        ],
      },
    ],
  },
  'field-gun-75mm': {
    note: [
      {
        paragraphs: [
          'Três canhões de campanha de 75 mm atravessaram o Paraná com a divisão em abril de 1925 (Macaulay, p. 93). Atrasavam uma força que vivia de se mover e foram abandonados e escondidos em Mato Grosso (p. 95). Em junho a Coluna já não tinha artilharia nenhuma (p. 113).',
          'Em Catanduvas, um mês antes, os rebeldes que se renderam haviam entregado dois canhões de 75 mm com o resto do material (p. 85). A artilharia ainda não está no jogo.',
        ],
      },
    ],
  },
  'howitzer-105mm': {
    note: [
      {
        paragraphs: [
          'As forças do general Rondon martelaram Catanduvas com obuses de 105 mm em março de 1925. Os 407 rebeldes de lá se renderam antes do amanhecer de 30 de março e entregaram, entre outras coisas, um obus de 105 mm deles, dois canhões de 75 mm, 50 granadas, 398 fuzis e metralhadoras e mais de dez mil cartuchos (Macaulay, p. 85).',
          'A campanha de Belarmino e Catanduvas custou ao governo 179 mortos, 301 feridos e 60 desaparecidos, suas maiores perdas na revolução (p. 85). O obus fica para uma etapa futura do jogo.',
        ],
      },
    ],
  },
  cartridges: {
    note: [
      {
        paragraphs: [
          'Em junho de 1925 a Coluna tinha cerca de vinte mil cartuchos para todos os seus fuzis, metralhadoras e fuzis-metralhadores: uns dezesseis por homem, antes das capturas (Macaulay, p. 113). Em San Matías, vinte meses depois, foram entregues oito mil (p. 234).',
          'A falta moldou o jeito de lutar da Coluna: emboscada, disciplina de fogo, romper o contato. No jogo, cada Mauser começa com vinte tiros, perto dessa média, e a seção que fica sem munição tem de recuar.',
        ],
      },
    ],
  },
  'skirmish-forces': {
    note: [
      {
        paragraphs: [
          'A escaramuça deixa o jogador pôr em campo forças que a história nomeia. Alguns tipos de seção têm nomes da época, e cada nota em Forças dá a página: o fogão, a potreada, a Brigada Militar, os provisórios, os jagunços. Os outros são agrupamentos nossos, e suas notas dizem isso.',
          'As armas seguem os registros: Mausers para quase todos, poucas metralhadoras e fuzis-metralhadores, as Winchesters e os revólveres dos irregulares. Os números das cartas, alcance, precisão e dano, são valores de jogo, não história.',
        ],
      },
    ],
  },

  // --- Forças -------------------------------------------------------------------
  'army-legalista': {
    note: [
      {
        heading: 'O Exército e os estados',
        paragraphs: [
          'O Exército federal encolheu de 39.764 homens em 1924 para 34.244 em 1925, por causa dos levantes. As forças dos próprios estados, que eram polícia e exército ao mesmo tempo, cresceram de 31.988 para 34.651 e o superaram; o general Rondon as preferia na linha de frente (Macaulay, pp. 71, 90–91).',
          'Os soldados federais não eram confiáveis contra os antigos companheiros: "deixa passar" era o estado de espírito de boa parte do Exército diante de Prestes (pp. 178, 192). As forças estaduais fizeram a maior parte da luta: a Brigada Militar do Rio Grande do Sul no sul e no Paraná, os milicianos mineiros de Klinger em Goiás, as milícias de São Paulo, da Bahia e do Piauí mais ao norte.',
        ],
      },
    ],
    images: {
      'hero-photo': { caption: 'A Brigada Militar do Rio Grande do Sul em São Paulo, O Malho, 1924.', credit: 'O Malho, via Wikimedia Commons' },
    },
  },
  'army-patriotico': {
    note: [
      {
        heading: 'Voluntários e jagunços',
        paragraphs: [
          'Os batalhões patrióticos eram unidades civis incorporadas ao serviço federal. Em São Paulo, em 1924, eram voluntários e se saíram mal na perseguição (Macaulay, pp. 15, 70–71). No sertão, em 1925 e 1926, eram bandos de jagunços sob seus chefes, com farda, armas e soldo federais: os de Franklin de Albuquerque no São Francisco, o Batalhão das Lavras Diamantinas de Horácio de Matos a partir de março de 1926 (pp. 189, 218–219).',
          'O comandante do teatro admitiu que quase não tinha controle sobre eles. Siqueira Campos os julgava chefiados sem teoria nenhuma, mas mais eficazes que a tropa regular contra a Coluna; eles escavavam as balas para fazer ferimentos piores (pp. 192–193, 228).',
        ],
      },
    ],
    images: {
      'hero-photo': {
        caption: 'O Batalhão Patriótico Geraldo Rocha nas trincheiras diante de Catanduvas, 1924–1925.',
        credit: 'Thomaz Luiz Reis, via Wikimedia Commons',
      },
    },
  },
  'section-comando': {
    note: [
      {
        paragraphs: [
          'Em 10 de junho de 1925, em Camapuã, as duas brigadas viraram quatro destacamentos, sob Cordeiro de Farias, João Alberto, Siqueira Campos e Djalma Dutra, no máximo 1.200 homens ao todo (Macaulay, pp. 112–113). O comandante e seus poucos oficiais comandavam do meio dos homens. O grupo de comando de quatro é nosso. Parte da Coluna Prestes.',
        ],
      },
    ],
  },
  'section-fuzileiros': {
    note: [
      {
        paragraphs: [
          'O fogão era o grupo de rancho da Coluna: uma dúzia de companheiros, tantos quantos comiam um boi antes que a carne estragasse. Tornou-se a unidade básica, com um chefe eleito que tratava direto com o comandante do destacamento e um despenseiro, dispensado do combate, que guardava a comida, as panelas e os animais de carga (Macaulay, p. 151). Parte da Coluna Prestes.',
        ],
      },
    ],
  },
  'section-esquadra-4': {
    note: [
      {
        paragraphs: [
          'Meio fogão, para os combates pequenos da escaramuça. O agrupamento é nosso; o fogão é história (Macaulay, p. 151). Parte da Coluna Prestes.',
        ],
      },
    ],
  },
  'section-esquadra-5': {
    note: [
      {
        paragraphs: [
          'Um fogão em torno de um dos poucos fuzis-metralhadores da Coluna. Com uns quatro em condições em junho de 1925 (Macaulay, p. 113), cada força pode ter no máximo dois. O agrupamento é nosso. Parte da Coluna Prestes.',
        ],
      },
    ],
  },
  'section-fuzil-metralhador': {
    note: [
      {
        paragraphs: [
          'A guarnição de um fuzil-metralhador sozinha, para segurar um flanco ou cobrir uma passagem. A Coluna tinha uns quatro (Macaulay, p. 113); dois ainda estavam com ela em San Matías. O agrupamento é nosso. Parte da Coluna Prestes.',
        ],
      },
    ],
  },
  'section-metralhadora': {
    note: [
      {
        paragraphs: [
          'Uma "peça" é a arma e sua guarnição. A Coluna tinha quatro metralhadoras 7 mm (Macaulay, p. 113) e as levou de Mato Grosso até a fronteira boliviana. A seção é nossa; uma por força. Parte da Coluna Prestes.',
        ],
      },
    ],
  },
  'section-irregulares': {
    note: [
      {
        paragraphs: [
          'De Mato Grosso em diante, potreadas de cinco a quinze homens a cavalo saíam pelos flancos da Coluna com licença escrita para requisitar cavalos e mantimentos; algumas ficavam fora por meses. Em Goiás tomavam Winchesters das fazendas, por segurança e para substituir Mausers sem munição (Macaulay, pp. 111, 151–152). Andavam a cavalo; o jogo as mostra a pé. Parte da Coluna Prestes.',
        ],
      },
    ],
  },
  'section-veteranos-gauchos': {
    note: [
      {
        paragraphs: [
          'Os homens do Rio Grande do Sul foram o núcleo que acompanhou a Coluna das Missões à Bolívia. Em 1924 os rebeldes gaúchos usavam uma fita vermelha em volta da copa do chapéu, com as pontas caindo no ombro, e lutavam a cavalo (Macaulay, pp. 44, 52, 88, 112). A seção é nossa. Parte da Coluna Prestes.',
        ],
      },
    ],
  },
  'section-comando-companhia': {
    note: [
      {
        paragraphs: [
          'O grupo de comando de uma companhia legalista. Macaulay dá unidades e totais, não quadros de pequenas frações, e o agrupamento é nosso. Parte das forças legalistas.',
        ],
      },
    ],
  },
  'section-infantaria-exercito': {
    note: [
      {
        paragraphs: [
          'Infantaria federal. O Exército era a força regular do governo, mas encolheu com os levantes e seus soldados não eram confiáveis contra os antigos companheiros; serviu pouco no Nordeste (Macaulay, pp. 90–91, 178, 192). A seção é nossa. Parte das forças legalistas.',
        ],
      },
    ],
  },
  'section-brigada-militar': {
    note: [
      {
        paragraphs: [
          'A Brigada Militar era a força estadual do Rio Grande do Sul, com batalhões e regimentos de cavalaria regulares. Combateu os rebeldes no estado em 1924, seguiu-os ao Paraná e a Santa Catarina em 1925 e mandou 150 homens com Klinger para Goiás (Macaulay, pp. 48, 58, 82, 134). O nome é da época; a seção é nossa. Parte das forças legalistas.',
        ],
      },
    ],
  },
  'section-provisorios': {
    note: [
      {
        paragraphs: [
          'Os "provisionals" de Macaulay eram civis chamados às armas pelo governo do estado, em geral seus funcionários e agregados, muitos veteranos da guerra de 1923; seguravam a linha até a Brigada chegar, e 780 deles foram mandados até o Piauí (Macaulay, pp. 48, 55, 81, 178). "Provisórios" é a nossa forma portuguesa para o inglês da fonte. Parte das forças legalistas.',
        ],
      },
    ],
  },
  'section-metralhadora-legalista': {
    note: [
      {
        paragraphs: [
          'A milícia mineira do major Klinger tinha oito metralhadoras em Anápolis em 1925 (Macaulay, p. 134), o dobro do que a Coluna inteira levava. A seção é nossa. Parte das forças legalistas.',
        ],
      },
    ],
  },
  'section-fuzil-metralhador-legalista': {
    note: [
      {
        paragraphs: [
          'A guarnição de um fuzil-metralhador legalista. O Exército tinha essas armas, mas a fonte não dá página para esta guarnição, e a seção é uma suposição nossa. Parte das forças legalistas.',
        ],
      },
    ],
  },
  'section-chefe-capangas': {
    note: [
      {
        paragraphs: [
          'Os batalhões patrióticos do sertão eram chefiados por mandões regionais, os "coronéis", sem formação militar, à frente de seus próprios homens (Macaulay, pp. 189, 218, 228). Um chefe e seus capangas é agrupamento nosso. Parte dos batalhões patrióticos.',
        ],
      },
    ],
  },
  'section-jaguncos': {
    note: [
      {
        paragraphs: [
          'O jagunço era um pistoleiro de ocasião, chamado às armas por seu patrão; Macaulay o distingue do cangaceiro, bandido de ofício. Bandos de jagunços serviram como batalhões patrióticos, e Siqueira Campos os julgava mais eficazes que a tropa regular contra a Coluna (Macaulay, pp. 192, 228). Parte dos batalhões patrióticos.',
        ],
      },
    ],
    images: {
      'hero-photo': {
        caption: 'Jagunços em Juazeiro, por volta de 1914: uma década antes da Coluna.',
        credit: 'Autor desconhecido, via Wikimedia Commons',
      },
    },
  },
  'section-jaguncos-mauser': {
    note: [
      {
        paragraphs: [
          'Jagunços com armas federais. Os homens de Franklin de Albuquerque receberam farda, armas e soldo (Macaulay, p. 189), e uma remessa levava quarenta Mausers (p. 205). O fuzil-metralhador da seção é nosso; a fonte fala em fuzis. Parte dos batalhões patrióticos.',
        ],
      },
    ],
  },
  'section-voluntarios': {
    note: [
      {
        paragraphs: [
          'Os batalhões patrióticos de São Paulo, em 1924, eram voluntários civis. Saíram-se mal na perseguição até o Paraná, embora um tenha segurado uma linha entrincheirada nos morros de Medeiros (Macaulay, pp. 15, 70–71). "Voluntários" traduz o inglês da fonte. Parte dos batalhões patrióticos.',
        ],
      },
    ],
  },
  'section-cangaceiros': {
    note: [
      {
        paragraphs: [
          'Dramatizado. Lampião chegou a Juazeiro com quarenta e nove homens em 4 de março de 1926, recebeu um papel que o nomeava capitão da reserva do Exército, trocou as Winchesters de seus homens por Mausers do Exército e partiu em 7 de março, em tese contra a Coluna. Segundo Macaulay, os cangaceiros logo voltaram ao banditismo e nunca a enfrentaram (pp. 191–192). A seção não nomeia ninguém. Parte dos batalhões patrióticos.',
        ],
      },
    ],
  },

  // --- Correções ----------------------------------------------------------------
  'sao-paulo-separate': {
    note: [
      {
        paragraphs: [
          'A Coluna não lutou em São Paulo. A revolta de julho de 1924 ocupou a cidade por três semanas e a deixou de trem na noite de 27 de julho (Macaulay, pp. 16–17). Seus remanescentes continuaram lutando no oeste do Paraná e se juntaram aos rebeldes do sul em abril de 1925, como a Brigada São Paulo da divisão. O campo de batalha do Bairro é esse cenário, identificado como tal, não uma batalha da marcha.',
        ],
      },
    ],
  },
  'miguel-costa-command': {
    note: [
      {
        paragraphs: [
          'A partir de 14 de abril de 1925 a 1ª Divisão Revolucionária foi comandada por Miguel Costa, ex-major da milícia estadual de São Paulo; Prestes era o chefe do estado-maior (Macaulay, pp. 85–89). A imprensa deu à Coluna o nome de Prestes, e é por ele que ela é lembrada, mas as ordens saíam em nome de Miguel Costa, e os livros e briefings dizem isso.',
        ],
      },
    ],
  },
  'historical-borders': {
    note: [
      {
        paragraphs: [
          'Os mapas e textos usam as fronteiras dos anos 1920. O Tocantins não existia: Porto Nacional e Dianópolis ficavam no norte de Goiás. Mato Grosso não tinha sido dividido, e o Pantanal que a Coluna atravessou em 1927 ficava todo nele. Quando um lugar mudou de nome, o texto dá primeiro o nome da época.',
        ],
      },
    ],
  },
  'macaulay-perspective': {
    note: [
      {
        paragraphs: [
          'Neill Macaulay escreveu em 1974, como historiador norte-americano, a partir dos arquivos do governo e dos rebeldes. Seu livro é a cronologia do jogo porque é cuidadoso com datas e números. Não é a única leitura: Anita Prestes data a Coluna de São Luiz Gonzaga, Blanc escreve a partir do interior que a Coluna atravessou, e as memórias falam pelos homens que marcharam. Onde divergem, o compêndio dá cada uma, com sua fonte.',
        ],
      },
    ],
  },
};
