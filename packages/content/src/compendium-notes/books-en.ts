// complete-books-and-bibliography 4.1, 5.1-5.5: the notes and captions added
// when the books were finished. Merged over en.ts by compendium.ts: a `note`
// here replaces the entry's note, `images` are added to its captions. The
// drafts are in docs/campaign/compendium/entries; keep them in step.
import type { CompendiumAddition } from '../compendium';

const BLANC_EN = "Blanc's translation from the Portuguese.";
const OURS_EN = 'Our translation from the Portuguese.';

export const COMPENDIUM_BOOKS_EN: Readonly<Record<string, CompendiumAddition>> = {
  // --- Captions for entries that already had a note -----------------------
  'rs-revolt-1924': {
    images: {
      'hero-photo': {
        caption:
          'Rebels of the 1st Railway Battalion leave Santo Ângelo for São Luiz Gonzaga in requisitioned vehicles, 1924. This is not the fight at Ramada.',
        credit: 'Unknown author; AHMACPS, Santo Ângelo, via Wikimedia Commons',
      },
      map: { caption: 'The revolt in Rio Grande do Sul, October 1924: a modern map.', credit: 'User:Serraria, via Wikimedia Commons' },
    },
  },
  'porto-mendes': {
    images: {
      'hero-photo': {
        caption: 'Porto Mendes occupied by the 10th Battalion of Caçadores, 1925. The photograph was taken for the government forces.',
        credit: 'Thomaz Luiz Reis, via Wikimedia Commons',
      },
    },
  },
  'lourenco-moreira-lima': {
    images: {
      portrait: {
        caption: 'Lourenço Moreira Lima, 1927 (attributed: the provenance of the photograph is not recorded).',
        credit: 'Unknown author, via Wikimedia Commons',
      },
    },
  },
  tenentismo: {
    images: {
      'hero-photo': { caption: 'The revolt of the Forte de Copacabana, July 1922.', credit: 'Unknown author, via Wikimedia Commons' },
    },
  },
  'revolt-1922': {
    images: {
      press: {
        caption: 'Gazeta de Notícias, 6 July 1922: the press on the day the rising was put down.',
        credit: 'Gazeta de Notícias, via Wikimedia Commons',
      },
    },
  },
  'la-gaiba': {
    place: 'Eastern Bolivia, near the Brazilian border',
    note: [
      {
        paragraphs: [
          'La Gaiba is the end of the march. The column crossed the Pantanal and entered Bolivia at San Matías on 3 February 1927; ninety miles to the south, at La Gaiba, an English company, Bolivian Concessions Ltd., gave the exiles work (Blanc, p. 132). On 5 July 1927 they built a small monument there on a block of granite, inscribed "Glory to the Bandeirantes of Freedom, 1924–1927" (Blanc, p. 142, fig. 7.5).',
          "The game's La Gaiba is a clearing by the lagoon with the monument, the camp and the water: a sourced setting, not a survey. The campaign ends here with memory, not with a battle or a victory.",
        ],
      },
    ],
    images: {
      map: {
        caption: 'The La Gaiba lagoon on the Bolivian border: a modern satellite view.',
        credit: 'NASA, via Wikimedia Commons',
      },
    },
  },
  'map-serra-rio': {
    images: {
      'verdinho-today': {
        caption: 'The Verdinho river today. No photograph of the 1925 bridge is known.',
        credit: 'Paulo Roberto, via Wikimedia Commons (Panoramio)',
      },
    },
  },
  'sao-luiz-1924': {
    images: {
      'route-map': {
        caption: "The column's route from São Luiz Gonzaga to Benjamin Constant, December 1924 to April 1925: a modern map.",
        credit: 'User:Serraria, via Wikimedia Commons',
      },
      'blanc-map': {
        caption: 'The rebels slip out of the siege of São Luiz Gonzaga, December 1924.',
        credit: 'Map by Gabe Moss, in Blanc 2024 (Duke University Press), map 2.1',
      },
    },
  },
  'sao-luiz-gonzaga': {
    place: 'North-western Rio Grande do Sul',
    note: [
      {
        paragraphs: [
          'São Luiz Gonzaga sits in the mission landscape of north-western Rio Grande do Sul. After the rising of 28–29 October 1924 it became the rebels\' base: Prestes\'s men held the town for some weeks, and the first numbers of O Libertador were printed there (Macaulay, p. 165).',
          'In December the government brought seven loyalist detachments against the town. Prestes left one detachment in contact to feign a full retreat and gathered the rest at São Miguel das Missões; in the night the loyalists closed on an empty position while the rebels marched north-east toward the Ijuí (Blanc, p. 37). The town is a place of departure, not of victory.',
          'Anita Prestes and the historians of the Missões date the column from that departure, on 27 December 1924; the game follows Macaulay, who dates it from the division formed in April 1925, and the compendium gives both.',
        ],
      },
    ],
  },
  'mauser-7mm': {
    images: {
      'hero-photo': {
        caption: 'A Mauser Model 1908, the 7 mm rifle the Brazilian army adopted that year. The sources do not name the column\'s model.',
        credit: 'Wikimedia Commons',
      },
    },
  },
  'siqueira-campos': {
    images: {
      'portrait-1922': { caption: 'Antônio de Siqueira Campos, early 1920s.', credit: 'Unknown author' },
    },
  },
  'army-coluna': {
    note: [
      {
        heading: 'Living off the land',
        paragraphs: [
          'No one supplied the column. It took food, horses and clothing from the country it crossed. The command gave written requisition notes, and from Mato Grosso on small mounted parties, the potreadas, rode off the flanks to round up horses. For a poor family, one ox or horse taken could mean ruin, and the command came to know it. The cost to the poor was one of the reasons for the exile in 1927.',
          "There were abuses, above all in the first months. The command banned indiscriminate looting, expelled men who disobeyed and punished the worst crimes, at times with death. Government troops looted and raped as well, but the government's propaganda called the rebels bandits, and in many places people fled before they came.",
        ],
      },
      {
        heading: 'The marks it left',
        paragraphs: [
          'The column also left marks of another kind. It burned tax registers, as at Carolina, opened the jails and destroyed stocks, iron collars and school paddles. It never had more than about 1,500 men, though rumour at Teresina put it at five or ten thousand. Many of its rank and file were Black, hidden in the records under words like "caboclo" and "pelo-duro". No one counted them.',
          'At San Matías, on 4 February 1927, 620 men laid down ninety Mausers, four machine guns, two automatic rifles and eight thousand cartridges (Macaulay, p. 234).',
        ],
        quote: {
          text: 'The Column, on its march across Brazil, tried to do justice, burning the tax books and lists of debts, freeing the prisoners and destroying the instruments of torture it found.',
          sourceKey: 'anita-1995',
          cite: 'Uma epopéia brasileira: a Coluna Prestes (São Paulo: Moderna, 1995), p. 81',
          via: { sourceKey: 'mozzer-2009', cite: 'p. 255' },
          attribution: 'Anita Leocádia Prestes, historian, 1995',
          translated: true,
          note: OURS_EN,
        },
      },
    ],
    images: {
      'hero-photo': { caption: 'Men of the column at a river crossing. The place and the date are not identified.', credit: 'Unknown author' },
      portinari: { caption: 'Candido Portinari, Coluna Prestes.', credit: 'Projeto Portinari' },
    },
  },
  'ramada-1925': {
    note: [
      {
        paragraphs: [
          'Ramada was the price of the breakout. Macaulay places the 3 January 1925 fight near Palmeiras, where the column lost about forty men (p. 61); local memory calls it Ramada, after a farm nearby. The rearguard held long enough for the column to reach the Uruguay on 9 January, and the crossing came later in the month.',
          'The horses were the clearest cost. They had carried the column and pulled the wagons; by the crossing, most were lost or had to be left behind. The column continued on foot through Santa Catarina. What survived was not a victorious army but a column that could keep moving.',
        ],
      },
      {
        heading: 'Whose monument',
        paragraphs: [
          'The place is remembered on both sides. Santo Ângelo raised a monument to the march; at Ramada, near the crossroads called Esquina Urma, the stone stands for the other dead.',
        ],
        quote: {
          text: 'But the monument was not for the rebels—it honored the nearly one hundred loyalist soldiers killed by Prestes\'s men.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 237',
          attribution: 'Jacob Blanc, historian, on his visit to Ramada',
          originalLocale: 'en',
        },
      },
    ],
  },
  'luis-carlos-prestes': {
    addSections: [
      {
        heading: 'How the legend was built',
        paragraphs: [
          'In exile Prestes became a figure the newspapers competed for. Journalists travelled to Bolivia to interview him, and the papers traced his virtues back to his childhood: O Jornal sent a reporter to his mother, Leocádia (Blanc, p. 135). The portrait of the gentle, upright chief was the start of the Knight of Hope.',
        ],
        quote: {
          text: 'He was too kind. There was no way that somebody with so much kindness could fight in a rebellion that could take the lives of his own people.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 135',
          attribution: 'Leocádia Prestes, his mother, to O Jornal, 1927',
          originalLocale: 'en',
          note: BLANC_EN,
        },
      },
    ],
  },
  pantanal: {
    place: 'Mato Grosso, toward Bolivia and Paraguay',
    note: [
      {
        paragraphs: [
          'The Pantanal was the last great crossing of the march. The column left the diamond country in late December 1926, crossed the Paraguay near its headwaters and swung south into the wetland, with the jagunços of Franklin de Albuquerque behind it. Blanc dates the entry to 10 January 1927 (p. 127).',
          'The crossing was not a battle. The rebels lost almost all their horses, marched at times in water up to their chests, slept on anthills, the only dry ground, and ate hearts of palm when the cattle gave out (Macaulay, p. 234). The main body entered Bolivia at San Matías on 3 February 1927.',
          "The game's Pantanal is an abstraction of the crossing, not a survey of the wetland.",
        ],
      },
    ],
    images: {
      'route-map-1977': {
        caption: "The column's route in Mato Grosso in May and June 1925, as Malan drew it in 1977: the first crossing of the state, not the Pantanal of 1927.",
        credit: 'Malan, Uma escolha, um destino (BIBLIEx, 1977), p. 249',
      },
    },
  },
  'serra-nova': {
    images: {
      'blanc-map': {
        caption: 'The Prestes Column in Bahia, April–July 1926.',
        credit: 'Map by Gabe Moss, in Blanc 2024 (Duke University Press), map 5.1',
      },
    },
  },
  'o-libertador-1924': {
    images: {
      'front-page': { caption: 'O Libertador, no. 1, São Luiz Gonzaga, 5 November 1924.', credit: 'Fundação Biblioteca Nacional' },
    },
  },
  'coluna-no-grande-sertao': {
    note: [
      {
        heading: 'What Riobaldo remembers',
        paragraphs: [
          'Riobaldo, the old jagunço who narrates the novel, mentions the column only in passing. The revolutionaries came through from Goiás and took every saddle horse. There was shooting at the mouth of the Urucuia, at São Romão, where a government steamer landed troops from Bahia. Years later, he says, a farmer splitting a tree trunk finds bullets lodged in the wood.',
          'The scene fits what the history records: the column\'s hunger for horses, the patriotic battalions of Bahia, and the rivers of northern Minas. It is still fiction, told by a fictional man.',
        ],
        quote: {
          text: "The rebels came through here afterwards, Prestes's soldiers, coming from Goiás; they claimed every saddle animal. […] Many years later a farmer goes to hew a tree trunk and finds bullets lodged in it.",
          sourceKey: 'rosa-1956',
          cite: 'Grande sertão: veredas, 36th ed. (Rio de Janeiro: Nova Fronteira, 1986), p. 82',
          via: { sourceKey: 'mozzer-2009', cite: 'pp. 249–250' },
          attribution: 'João Guimarães Rosa, Grande sertão: veredas (1956), Riobaldo speaking',
          translated: true,
          note: OURS_EN,
        },
      },
      {
        heading: "One critic's reading",
        paragraphs: [
          'Marcelo Mozzer (2008/2009) goes further. He notes that the rivers of Riobaldo\'s wars include the Urucuia, the Carinhanha, the Preto, the Paracatu and the São Francisco. These are the rivers that Jorge Amado and Abguar Bastos name for the column\'s passage through Minas. He sets the novel\'s bands and chiefs beside the column\'s detachments and commanders. He compares the novel\'s rules against looting with the column\'s punishments for it. He wonders whether a "Dr. Meigo de Lima" in the novel echoes Lourenço Moreira Lima.',
          'Mozzer himself calls this an intuition. Rosa read widely, and the column was the great military event of his youth in Minas, but no document shows that he drew on it. The book keeps the link as a possibility. What is certain is smaller: the march passed into the memory of the sertão, in songs, in cordel and in a great novel.',
        ],
        quote: {
          text: 'In Minas the Column marches over the plateaus bounded by the rivers, Preto, Urucuia, Carinhanha.',
          sourceKey: 'amado-1942',
          cite: 'O cavaleiro da esperança, 32nd ed. (Rio de Janeiro: Record, 1985), p. 131',
          via: { sourceKey: 'mozzer-2009', cite: 'p. 255' },
          attribution: 'Jorge Amado, O cavaleiro da esperança (1942)',
          translated: true,
          note: OURS_EN,
        },
      },
    ],
  },
  'batalhoes-patrioticos-bahia': {
    images: {
      'hero-photo': {
        caption: 'A battalion of patriots raised to fight the Prestes Column at Boa Vista, dated 24 December 1926. It is from Pernambuco, not Bahia.',
        credit: 'Unknown author, via Wikimedia Commons',
      },
    },
  },

  // --- Events ---------------------------------------------------------------
  'rs-civil-war-1923': {
    place: 'Rio Grande do Sul',
    note: [
      {
        heading: 'Chimangos and maragatos',
        paragraphs: [
          'Rio Grande do Sul was the only state that let its governor be re-elected, and Borges de Medeiros had won the post five times since 1898. His enemies, divided since the 1890s, united in 1922 as the Liberator Alliance, the maragatos, and took the field in January 1923, hoping that President Artur Bernardes would intervene on their side. Borges\'s followers were the chimangos, after a bird the cartoonists gave him for his long nose and thin frame (Macaulay, p. 7).',
          'Bernardes held back while the two sides wore each other out. Toward the end of 1923 a federal mediator arranged a truce and imposed a settlement: Borges would serve out his fifth term but not run again, and the Liberators would get seats in the state and federal legislatures (Macaulay, pp. 7–8).',
        ],
      },
      {
        heading: 'What it left for 1924',
        paragraphs: [
          'The settlement made the president the only winner. The Liberators were disarmed, and their political chief, Assis Brasil, went over to Bernardes\'s enemies: the tenentes of 1924 named him the civilian chief of their revolution (Macaulay, p. 8). The war also left men who knew how to fight: the red ribbon on the hat of the gaúcho rebels of 1924 was the maragatos\' colour, and many of the provisionals who fought them were veterans of the chimango side.',
        ],
      },
    ],
  },
  'sao-paulo-retaken-1924': {
    place: 'São Paulo',
    note: [
      {
        heading: 'Three weeks of bombardment',
        paragraphs: [
          'The rebels had held São Paulo since 5 July 1924. From 11 July legalist artillery and aircraft shelled the city, and the shells killed mainly civilians in the working-class quarters (Macaulay, p. 16). Isidoro offered to yield in exchange for an amnesty for everyone involved in the risings since 1922; the government commander, with a hundred guns within range, answered that he would annihilate them unless they surrendered without conditions.',
        ],
      },
      {
        heading: 'The night of 27 July',
        paragraphs: [
          'What decided the rebels was the threat to their only way out, to the west. At ten o\'clock on the night of 27 July the first troop train left the Luz station; by dawn thirteen trains had carried away some three thousand men and fourteen field guns. Two guns stayed behind, still firing as the last train pulled out, so the government command knew nothing of the evacuation until the next morning (Macaulay, pp. 16–17).',
          'The legalists entered a city the rebels had already left. The trains went west to Bauru and then south toward the Paraná, where the revolt became the Paraná front.',
        ],
      },
    ],
    images: {
      'hero-photo': { caption: 'Legalist troops in São Paulo, 1924.', credit: 'Gustavo Prugner, via Wikimedia Commons' },
    },
  },
  'iguacu-1925': {
    place: 'Western Paraná',
    note: [
      {
        heading: 'Not at Foz',
        paragraphs: [
          'The Paraná front fell at the end of March 1925. On 26 March General Rondon began the attacks that isolated Catanduvas, and before dawn on 30 March the 407 rebels there surrendered to four thousand government soldiers (Macaulay, p. 85). Miguel Costa\'s brigade began to withdraw west on 31 March.',
          'Prestes\'s men, coming up from the south, had reached the same road at Benjamin Constant. There, on 3 April 1925, Prestes and Miguel Costa met. They agreed not to go down to Foz do Iguaçu to surrender or emigrate, but to combine and cross the Paraná into Mato Grosso, and they sent their troops toward Porto Santa Helena without consulting Isidoro (Macaulay, p. 86).',
        ],
      },
      {
        heading: 'The division',
        paragraphs: [
          'Only then did they go to Foz do Iguaçu, where Isidoro had his headquarters. On 12 April the marshal told his officers that nothing more could be done in the field and that exile was the only choice; most agreed, Prestes did not. On 14 April 1925, at Porto Santa Helena, the First Revolutionary Division was formed: Miguel Costa in command, Prestes chief of staff, a São Paulo brigade and a Rio Grande brigade (Macaulay, pp. 86–89).',
        ],
      },
    ],
  },
  'parana-crossing-1925': {
    place: 'Porto Mendes, on the Paraná, to Puerto Adela, Paraguay',
    note: [
      {
        paragraphs: [
          'The landing on the Paraguayan bank began on 27 April 1925 and the crossing was complete on 29 April. Macaulay counts no more than 1,500 men, 600 horses and mules and three 75 mm guns; the Rio Grande Brigade had about 800 men, the São Paulo Brigade about 700 (Macaulay, pp. 88–89, 93).',
          'The division marched across a corner of Paraguay and re-entered Brazil in southern Mato Grosso. The guns did not go far: they were abandoned and hidden in Mato Grosso (p. 95), and from then on the column fought with rifles and a handful of automatic weapons.',
        ],
      },
    ],
  },
  'serra-nova-1926': {
    place: 'Northern Minas Gerais',
    note: [
      {
        heading: 'The rearguard',
        paragraphs: [
          'On 22 April 1926, at Serra Nova, the jagunços of Horácio de Matos and Abílio Wolney fell on the column\'s rearguard (Macaulay, pp. 220–221). They were Patriotic Battalions, mustered and armed by the government, and they knew the country better than the column did.',
          'Federal troops tried to close a ring around the column. It broke contact and confused its pursuers with circling marches, the "laço húngaro", and passed through Taiobeiras on 26 April (Nascimento 2026; ALMG).',
        ],
      },
      {
        heading: 'A line on a map',
        paragraphs: [
          'Macaulay\'s map divides the march at Serra Nova: a solid line from São Luiz Gonzaga, a dashed line on to San Matías. The division is a convenience of the map, not a second phase that began there. What did begin in the high command after Serra Nova was talk of leaving Brazil.',
        ],
      },
    ],
    images: {
      'hero-photo': {
        caption: '"A Columna Prestes": the cover of O Malho, no. 1254, 25 September 1926. A press image, not a photograph of Serra Nova.',
        credit: 'O Malho; Hemeroteca Digital Brasileira (BN), via Wikimedia Commons',
      },
    },
  },
  'exile-1927': {
    place: 'San Matías, Bolivia, and Bella Vista, Paraguay',
    note: [
      {
        heading: 'The plan',
        paragraphs: [
          'At the end of October 1926 the high command sent Djalma Dutra and Moreira Lima south to find Isidoro. The column would stay on the Brazilian side of the border until the end of January 1927 and, with no word from them, cross into Bolivia at the beginning of February (Macaulay, p. 232). On 24 December, near Presidente Murtinho, it scattered some four hundred Mato Grosso militiamen, the last loyalist force between it and the border, at the cost of one man (p. 233).',
        ],
      },
      {
        heading: 'Two borders',
        paragraphs: [
          'On 3 February 1927 the main body crossed the unmarked frontier and camped north of San Matías, where Moreira Lima, back from Argentina, met them. On 4 February 620 men handed the Bolivian garrison ninety Mausers, four machine guns, two automatic rifles and eight thousand cartridges, and placed themselves under Bolivia\'s protection (Macaulay, p. 234; the book prints 1926).',
          'Siqueira Campos had lost touch with the column after a feint toward Campo Grande at the end of October 1926. He learned at the telegraph office of Cristianópolis, Goiás, on 8 February that it had entered Bolivia, turned south, and crossed into Paraguay at Bella Vista with sixty-five men on 23 March 1927; the next day they gave up twenty Mausers and a thousand cartridges (pp. 233–234; the book misprints the year). The column had marched about 25,000 kilometres in twenty-five months.',
        ],
      },
      {
        heading: 'Heroes in exile',
        paragraphs: [
          'Most of the officers went on to Argentina; Prestes stayed in Bolivia with a small group, Dutra and Moreira Lima among them (Blanc, p. 132). In Brazil the press that had called them bandits now raised money for them, nearly fifty million réis, and Isidoro\'s name for Prestes, the Knight of Hope, reached the newspapers in July 1927 (Blanc, pp. 139–142). The praise had a reverse side: the legend of the civilizing hero needed a savage interior.',
        ],
        quote: {
          text: '…demonstrating to the savage Indian of our forests all the generosity and kindness held in the hearts of the white people from the coast.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), pp. 142–143',
          attribution: 'Correio da Manhã, 16 December 1927, p. 2',
          originalLocale: 'en',
          note: BLANC_EN,
        },
      },
    ],
    images: {
      'hero-photo': {
        caption: '"The last photograph of the revolutionary chiefs": Careta, no. 978, 19 March 1927. Among them are Djalma Dutra, Siqueira Campos, Prestes, Miguel Costa and Juarez Távora.',
        credit: 'Careta, via Wikimedia Commons',
      },
      interview: {
        caption: 'La Gaiba, Bolivia, 1927: the journalist Rafael Correia de Oliveira (seated, far left) interviews Prestes (seated, centre).',
        credit: 'CPDOC/FGV, ILA foto 011-9 (Blanc 2024, fig. 7.2)',
      },
      caricature: { caption: 'Prestes in exile, a caricature in Careta, no. 1063, 3 November 1928.', credit: 'Careta, via Wikimedia Commons' },
    },
  },
  'la-gaiba-1927': {
    place: 'La Gaiba, Bolivia',
    note: [
      {
        heading: 'Work in exile',
        paragraphs: [
          'The year before the column arrived, an English company, Bolivian Concessions Ltd., had won rights to thirty million acres of eastern Bolivia, with its base at La Gaiba, ninety miles south of San Matías. Prestes, an engineer, negotiated a contract: for a small daily wage his men opened a road through the forest and built storehouses for coffee and other crops. The pay barely covered the medicine for malaria and dysentery; Hermínia, the nurse who had marched since São Paulo, set up a makeshift hospital (Blanc, p. 132).',
        ],
      },
      {
        heading: '5 July 1927',
        paragraphs: [
          'On the fifth anniversary of the Copacabana rising and the third of the São Paulo revolt, the exiles dedicated a small monument to the column\'s dead: a block of granite inscribed "Glory to the Bandeirantes of Freedom, 1924–1927". Moreira Lima gave the speech, which the Correio da Manhã printed on 22 July (Blanc, p. 142, n. 29). The photograph of the monument was taken between July and November 1927 (fig. 7.5).',
          'The same day, in Brazil, the newspaper Vanguarda named Prestes the Knight of Hope. Blanc reads the date as a hinge: the collective "bandeirantes" buried abroad, one man\'s legend rising at home.',
        ],
        quote: {
          text: 'Filled with emotion and pain, we inaugurate this mausoleum for the memory of the brave soldiers of the Prestes Column.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 142',
          attribution: 'Lourenço Moreira Lima, La Gaiba, 5 July 1927 (Correio da Manhã, 22 July 1927, p. 5)',
          originalLocale: 'en',
          note: BLANC_EN,
        },
      },
    ],
    images: {
      monument: {
        caption: 'The monument to the "Bandeirantes of Freedom", La Gaiba, Bolivia, photographed between July and November 1927.',
        credit: 'CPDOC/FGV, ILA foto 011-8 (Blanc 2024, fig. 7.5)',
      },
      workers: {
        caption: 'Exiled rebels working for Bolivian Concessions Ltd., La Gaiba, 1927.',
        credit: 'CPDOC/FGV, ILA foto 011-7 (Blanc 2024, fig. 7.1)',
      },
    },
  },

  // --- Places ---------------------------------------------------------------
  'vila-militar': {
    place: 'Deodoro and Realengo, west of Rio de Janeiro',
    note: [
      {
        paragraphs: [
          'Vila Militar was the army\'s great garrison district on the western edge of Rio, beside the military school at Realengo. In 1922 Prestes was second in command of the First Engineer Company at Deodoro. The plan for the rising had the telegraph and telephone lines into the city cut while the cadets marched from Realengo and Marshal Hermes da Fonseca took command at Vila Militar (Macaulay, pp. 37–38).',
          'Prestes caught typhoid on 13 June and was still in bed on the night of 4 July. The cadets marched and were fired on at Vila Militar; the district did not rise. The game\'s training field is a fictional ground nearby, not a place in the record.',
        ],
      },
    ],
    images: {
      map: { caption: 'Map of Vila Militar, 1922.', credit: 'Serviço Geográfico Militar, via Wikimedia Commons' },
    },
  },
  'map-bairro': {
    place: 'A São Paulo quarter, July 1924 (fictional battlefield)',
    note: [
      {
        paragraphs: [
          'The bombardment of July 1924 fell on Mooca, Brás, Cambuci, Belenzinho, Ipiranga, Penha, Perdizes and the area of the Sé, the factory and working-class quarters of a city of nearly six hundred thousand people, a third of them born abroad (Macaulay, pp. 8, 16; Cohen 2007).',
          'The Bairro battlefield borrows that setting: streets, a factory, a tram line. It is a fictional place, and it was not a battle of the column. The game shows no civilians on it and gives no reward for destruction, because the people who died in those streets were not soldiers.',
        ],
      },
    ],
  },

  // --- Weapons --------------------------------------------------------------
  'machine-guns-7mm': {
    note: [
      {
        paragraphs: [
          'When the column reorganized into detachments in June 1925 it had four 7 mm machine guns (Macaulay, p. 113). It had them still at the end: four machine guns were among the arms handed over at San Matías on 4 February 1927 (p. 234).',
          'The source does not name the model. In the game the Peça de metralhadora carries one, and a roster may field only one: there were never many to go round.',
        ],
      },
    ],
  },
  'automatic-rifles-7mm': {
    note: [
      {
        paragraphs: [
          'In June 1925 the column had about as many serviceable automatic rifles as machine guns, some four (Macaulay, p. 113); two were handed over at San Matías (p. 234). The source gives the calibre, 7 mm, but not the model.',
          'In the game an automatic rifle arms the Fogão com fuzil-metralhador and the Guarnição de fuzil-metralhador, at most two in a roster.',
        ],
      },
    ],
  },
  'winchester-44': {
    note: [
      {
        paragraphs: [
          'In Goiás the Winchester hunting rifles of the property owners took a toll on the column\'s foragers, and the foragers took Winchesters in turn, partly because their Mausers had no ammunition left. Military 7 mm rounds were rare in the backlands; .44 cartridges could be bought almost everywhere (Macaulay, p. 152).',
          'The government armed its own irregulars the same way: a shipment for a Patriotic Battalion in Paraíba in February 1926 held forty Mausers, a case of 7 mm ammunition and two thousand Winchester cartridges (p. 205).',
        ],
      },
    ],
  },
  'irregular-arms': {
    note: [
      {
        paragraphs: [
          'At the Ibirocaí camp in Rio Grande do Sul, late in 1924, Macaulay counts some three thousand men and five thousand horses. Only about a thousand were well armed; the rest carried revolvers, carbines, lances and older weapons. The regular contingent of about two hundred under Major Távora had Mausers and marksmanship training (Macaulay, p. 54).',
          'The gaúcho rebels fought mounted, with a pool of remounts, and wore the red ribbon of the Liberators round the hat (pp. 44, 52). The game arms the Comando\'s officer and the Potreada\'s leader with revolvers; carbines and lances are not modelled.',
        ],
      },
    ],
  },
  'field-gun-75mm': {
    note: [
      {
        paragraphs: [
          'Three 75 mm field guns crossed the Paraná with the division in April 1925 (Macaulay, p. 93). They slowed a force that lived by moving, and were abandoned and hidden in Mato Grosso (p. 95). By June the column had no artillery at all (p. 113).',
          'At Catanduvas, a month earlier, the surrendering rebels had given up two 75 mm guns with the rest of their material (p. 85). Artillery is not part of the game yet.',
        ],
      },
    ],
  },
  'howitzer-105mm': {
    note: [
      {
        paragraphs: [
          'General Rondon\'s forces battered Catanduvas with 105 mm howitzers in March 1925. The 407 rebels there surrendered before dawn on 30 March and turned over, among other things, a 105 mm howitzer of their own, two 75 mm guns, 50 artillery rounds, 398 rifles and machine guns and more than ten thousand cartridges (Macaulay, p. 85).',
          'The campaign of Belarmino and Catanduvas cost the government 179 dead, 301 wounded and 60 missing, its heaviest losses of the revolution (p. 85). The howitzer belongs to a later slice of the game.',
        ],
      },
    ],
  },
  cartridges: {
    note: [
      {
        paragraphs: [
          'In June 1925 the column had about twenty thousand cartridges for all its rifles, machine guns and automatic rifles: some sixteen a man, before captures (Macaulay, p. 113). At San Matías, twenty months later, eight thousand were handed over (p. 234).',
          'The shortage shaped how the column fought: ambush, fire discipline, breaking contact. In the game each Mauser starts with twenty rounds, close to that average, and a section that runs dry must fall back.',
        ],
      },
    ],
  },
  'skirmish-forces': {
    note: [
      {
        paragraphs: [
          'The skirmish lets a player field forces the history names. Some section types carry period names, and each note under Forces gives the page: the fogão, the potreada, the Brigada Militar, the provisionals, the jagunços. The others are groupings of ours, and their notes say so.',
          'The arms follow the record: Mausers for almost everyone, a few machine guns and automatic rifles, the irregulars\' Winchesters and revolvers. The numbers on the cards, range, accuracy and damage, are playability values, not history.',
        ],
      },
    ],
  },

  // --- Forces ---------------------------------------------------------------
  'army-legalista': {
    note: [
      {
        heading: 'The army and the states',
        paragraphs: [
          'The federal army shrank from 39,764 men in 1924 to 34,244 in 1925, because of the mutinies. The states\' own forces, which were police and army at once, grew from 31,988 to 34,651 and outnumbered it; General Rondon preferred them in his front line (Macaulay, pp. 71, 90–91).',
          'Federal regulars were unreliable against their former comrades: "let him pass" was the mood of much of the army toward Prestes (pp. 178, 192). The state forces did most of the fighting: the Brigada Militar of Rio Grande do Sul in the south and the Paraná, Klinger\'s Mineiro militiamen in Goiás, the militias of São Paulo, Bahia and Piauí further north.',
        ],
      },
    ],
    images: {
      'hero-photo': { caption: 'The Brigada Militar of Rio Grande do Sul in São Paulo, O Malho, 1924.', credit: 'O Malho, via Wikimedia Commons' },
    },
  },
  'army-patriotico': {
    note: [
      {
        heading: 'Volunteers and gunmen',
        paragraphs: [
          'Patriotic Battalions were civilian units mustered into federal service. In São Paulo in 1924 they were volunteers and did badly in the pursuit (Macaulay, pp. 15, 70–71). In the sertão in 1925 and 1926 they were bands of jagunços under their bosses, given federal uniforms, arms and pay: Franklin de Albuquerque\'s on the São Francisco, Horácio de Matos\'s Diamond Mines Battalion from March 1926 (pp. 189, 218–219).',
          'The theatre commander admitted he had almost no control over them. Siqueira Campos judged them led without any theory but more effective than regular troops against the column; they hollowed their bullets to make worse wounds (pp. 192–193, 228).',
        ],
      },
    ],
    images: {
      'hero-photo': {
        caption: 'The Geraldo Rocha Patriotic Battalion in the trenches facing Catanduvas, 1924–1925.',
        credit: 'Thomaz Luiz Reis, via Wikimedia Commons',
      },
    },
  },
  'section-comando': {
    note: [
      {
        paragraphs: [
          'On 10 June 1925, at Camapuã, the two brigades became four detachments under Cordeiro de Farias, João Alberto, Siqueira Campos and Djalma Dutra, no more than 1,200 men in all (Macaulay, pp. 112–113). The commander and his few officers led from among their men. The four-man command group is ours. Part of the Coluna Prestes.',
        ],
      },
    ],
  },
  'section-fuzileiros': {
    note: [
      {
        paragraphs: [
          'The fogão was the column\'s mess group: a dozen or so comrades, as many as could eat one steer before it spoiled. It became the basic unit, with an elected chief who dealt directly with the detachment commander and a steward, excused from combat, who kept the food, pots and pack animals (Macaulay, p. 151). Part of the Coluna Prestes.',
        ],
      },
    ],
  },
  'section-esquadra-4': {
    note: [
      {
        paragraphs: [
          'Half a fogão, for the small fights of the skirmish. The grouping is ours; the fogão itself is history (Macaulay, p. 151). Part of the Coluna Prestes.',
        ],
      },
    ],
  },
  'section-esquadra-5': {
    note: [
      {
        paragraphs: [
          'A fogão around one of the column\'s few automatic rifles. With about four serviceable ones in June 1925 (Macaulay, p. 113), a roster may field at most two. The grouping is ours. Part of the Coluna Prestes.',
        ],
      },
    ],
  },
  'section-fuzil-metralhador': {
    note: [
      {
        paragraphs: [
          'The crew of an automatic rifle on its own, to hold a flank or cover a crossing. The column had about four (Macaulay, p. 113); two were still with it at San Matías. The grouping is ours. Part of the Coluna Prestes.',
        ],
      },
    ],
  },
  'section-metralhadora': {
    note: [
      {
        paragraphs: [
          'A "peça" is a gun and its crew. The column had four 7 mm machine guns (Macaulay, p. 113) and carried them from Mato Grosso to the Bolivian border. The section is ours; one per roster. Part of the Coluna Prestes.',
        ],
      },
    ],
  },
  'section-irregulares': {
    note: [
      {
        paragraphs: [
          'From Mato Grosso on, potreadas of five to fifteen mounted men rode off the column\'s flanks with written leave to requisition horses and goods; some stayed away for months. In Goiás they took Winchesters from the farmhouses, for safety and to replace Mausers without ammunition (Macaulay, pp. 111, 151–152). They rode; the game shows them on foot. Part of the Coluna Prestes.',
        ],
      },
    ],
  },
  'section-veteranos-gauchos': {
    note: [
      {
        paragraphs: [
          'The men of Rio Grande do Sul were the core that stayed with the column from the Missões to Bolivia. In 1924 the gaúcho rebels wore a red ribbon round the hatband, its ends falling to the shoulder, and fought mounted (Macaulay, pp. 44, 52, 88, 112). The section is ours. Part of the Coluna Prestes.',
        ],
      },
    ],
  },
  'section-comando-companhia': {
    note: [
      {
        paragraphs: [
          'The command group of a legalist company. Macaulay gives units and totals, not small-unit tables, so the grouping is ours. Part of the legalist forces.',
        ],
      },
    ],
  },
  'section-infantaria-exercito': {
    note: [
      {
        paragraphs: [
          'Federal infantry. The army was the government\'s regular force, but it shrank in the mutinies and its men were unreliable against their former comrades; it was of little use in the Northeast (Macaulay, pp. 90–91, 178, 192). The section is ours. Part of the legalist forces.',
        ],
      },
    ],
  },
  'section-brigada-militar': {
    note: [
      {
        paragraphs: [
          'The Brigada Militar was Rio Grande do Sul\'s state force, with regular battalions and cavalry regiments. It fought the rebels at home in 1924, followed them into Paraná and Santa Catarina in 1925, and sent 150 men with Klinger into Goiás (Macaulay, pp. 48, 58, 82, 134). The name is the period\'s; the section is ours. Part of the legalist forces.',
        ],
      },
    ],
  },
  'section-provisorios': {
    note: [
      {
        paragraphs: [
          'Macaulay\'s "provisionals" were civilians called to arms by the state government, mostly its employees and their retainers, many of them veterans of the 1923 civil war; they held the line until the Brigada arrived, and 780 of them were sent as far as Piauí (Macaulay, pp. 48, 55, 81, 178). "Provisórios" is our Portuguese for the source\'s English. Part of the legalist forces.',
        ],
      },
    ],
  },
  'section-metralhadora-legalista': {
    note: [
      {
        paragraphs: [
          'Major Klinger\'s Mineiro militia had eight machine guns at Anápolis in 1925 (Macaulay, p. 134), twice what the whole column carried. The section is ours. Part of the legalist forces.',
        ],
      },
    ],
  },
  'section-fuzil-metralhador-legalista': {
    note: [
      {
        paragraphs: [
          'The crew of a legalist automatic rifle. The army had such weapons, but the source gives this crew no page of its own, so the section is an assumption of ours. Part of the legalist forces.',
        ],
      },
    ],
  },
  'section-chefe-capangas': {
    note: [
      {
        paragraphs: [
          'The Patriotic Battalions of the sertão were led by regional bosses, the "colonels", without military training, at the head of their own men (Macaulay, pp. 189, 218, 228). A chief and his gunmen is our grouping. Part of the Patriotic Battalions.',
        ],
      },
    ],
  },
  'section-jaguncos': {
    note: [
      {
        paragraphs: [
          'The jagunço was a part-time gunman called to arms by his patron; Macaulay sets him apart from the cangaceiro, the full-time bandit. Bands of jagunços served as Patriotic Battalions, and Siqueira Campos judged them more effective than regulars against the column (Macaulay, pp. 192, 228). Part of the Patriotic Battalions.',
        ],
      },
    ],
    images: {
      'hero-photo': {
        caption: 'Jagunços at Juazeiro, about 1914: a decade before the column.',
        credit: 'Unknown author, via Wikimedia Commons',
      },
    },
  },
  'section-jaguncos-mauser': {
    note: [
      {
        paragraphs: [
          'Jagunços issued federal arms. Franklin de Albuquerque\'s men received uniforms, arms and pay (Macaulay, p. 189), and one shipment held forty Mausers (p. 205). The automatic rifle in the section is ours; the source names rifles. Part of the Patriotic Battalions.',
        ],
      },
    ],
  },
  'section-voluntarios': {
    note: [
      {
        paragraphs: [
          'The Patriotic Battalions of São Paulo in 1924 were civilian volunteers. They did badly in the pursuit to the Paraná, though one held a dug-in line in the Medeiros hills (Macaulay, pp. 15, 70–71). "Voluntários" renders the source\'s English. Part of the Patriotic Battalions.',
        ],
      },
    ],
  },
  'section-cangaceiros': {
    note: [
      {
        paragraphs: [
          'Dramatized. Lampião reached Juazeiro with forty-nine men on 4 March 1926, was given a paper commissioning him a captain of the army reserve, exchanged his men\'s Winchesters for army Mausers and rode out on 7 March, supposedly against the column. By Macaulay\'s account the cangaceiros soon went back to banditry and never fought it (pp. 191–192). The section names no person. Part of the Patriotic Battalions.',
        ],
      },
    ],
  },

  // --- Corrections ------------------------------------------------------------
  'sao-paulo-separate': {
    note: [
      {
        paragraphs: [
          'The column did not fight in São Paulo. The revolt of July 1924 held the city for three weeks and left it by train on the night of 27 July (Macaulay, pp. 16–17). Its remnant fought on in western Paraná and joined the southern rebels in April 1925 as the São Paulo Brigade of the division. The Bairro battlefield is that setting, labelled as such, not a battle of the march.',
        ],
      },
    ],
  },
  'miguel-costa-command': {
    note: [
      {
        paragraphs: [
          'From 14 April 1925 the First Revolutionary Division was commanded by Miguel Costa, a former major of the São Paulo militia; Prestes was chief of staff (Macaulay, pp. 85–89). The press named the column after Prestes, and it is remembered by his name, but orders went out in Miguel Costa\'s, and the books and briefings say so.',
        ],
      },
    ],
  },
  'historical-borders': {
    note: [
      {
        paragraphs: [
          'The maps and texts use the borders of the 1920s. Tocantins did not exist: Porto Nacional and Dianópolis were in northern Goiás. Mato Grosso had not been divided, and the Pantanal the column crossed in 1927 lay wholly in it. Where a place has changed its name, the text gives the name of the time first.',
        ],
      },
    ],
  },
  'macaulay-perspective': {
    note: [
      {
        paragraphs: [
          'Neill Macaulay wrote in 1974, as an American historian, from the archives of the government and of the rebels. His book is the game\'s timeline because it is careful with dates and numbers. It is not the only reading: Anita Prestes dates the column from São Luiz Gonzaga, Blanc writes from the interior the column crossed, and the memoirs speak for the men who marched. Where they differ, the compendium gives each, with its source.',
        ],
      },
    ],
  },
};
