// Imported from docs/campaign/book and docs/campaign/missions; keep in step with the docs.
// The prose is the project's own dramatization. Quotations are attributed, with edition
// and page; protected works are quoted briefly under the right of quotation
// (complete-books-and-bibliography D2). Facts carry their source in the docs.
import type { ChapterText } from '../chapters';

const BLANC_EN = "Blanc's translation from the Portuguese.";
const MACAULAY_EN = "Macaulay's translation from the Portuguese.";

export const CHAPTER_TEXT_EN: Readonly<Record<string, ChapterText>> = {
  'prologue-18-do-forte': {
    title: 'The Beach at Copacabana',
    place: 'Copacabana beach, Rio de Janeiro',
    perspective: 'Siqueira Campos, commanding the 18 on the beach; the end is certain.',
    pages: [
      {
        heading: 'The Absent One',
        paragraphs: [
          "On the night of 4 July 1922, Luís Carlos Prestes tried to dress for the rising and collapsed. He had caught typhoid on 13 June, and it kept him in his mother's house while the conspiracy moved without him. He was a young engineering officer, second in command of the First Engineer Company at Deodoro, not yet the name the column would carry. He was not at the Forte de Copacabana, and he was not on the beach.",
          'The plan had the cadets march from Realengo while Marshal Hermes da Fonseca took command at Vila Militar. The cadets marched and were fired on; the garrisons did not rise. By the morning of 6 July only the fort was left. The prologue is Siqueira Campos\'s. The column will be Prestes\'s.',
        ],
      },
      {
        heading: 'The Eighteen',
        paragraphs: [
          'The legend gives Siqueira Campos eighteen men and a decision. The record gives twenty-nine in the fort after its commander was taken prisoner, and twenty-eight marching out on the afternoon of 6 July. Four slipped away on the avenue. Sixteen met the government line: eleven held the sidewalk and four took cover in the pipes of the avenue works.',
          'They fought from the gate up the Avenida Atlântica, past the fishermen\'s boats and the works, to the last stretch of sand before Rua Barroso, and the line grew shorter with every position. Seven rebels were killed or died of their wounds; the government counted thirty-five killed or wounded. Siqueira Campos, one other officer and one soldier survived (Macaulay, pp. 26–29). The legend says the eighteen died there. Both belong to the story.',
        ],
        image: { entryId: 'revolt-1922', slot: 'press' },
      },
      {
        heading: 'The Record',
        paragraphs: [
          'The beach did not end the rising; it gave it a date and a myth. The 18 do Forte became a name for a generation that would try again in São Paulo on 5 July 1924, in Rio Grande do Sul that October, and in the column. Siqueira Campos carried the beach with him. Prestes carried the fever, the maps and the name the column would make.',
          'The column does not begin here. It begins in the south, two years later, with men who would march out of an encirclement and keep going. But the beach is where the legend learned to die, and where the campaign learns what a certain defeat costs.',
        ],
        quote: {
          text: 'The abortive revolt etched July 5 as the origin date of tenentismo, setting into motion further events on the horizon.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 31',
          attribution: 'Jacob Blanc, historian',
          originalLocale: 'en',
        },
      },
    ],
    briefing: {
      pitch:
        'The fort, 6 July 1922. The rising has failed elsewhere; the government is closing in. Siqueira Campos tells the 18 that there will be no surrender: they will march out along the avenue and make the government pay for every metre. Prestes is absent with fever. There is no relief and no victory; the task is to make every metre of the avenue cost the government time and blood.',
      objectives: [
        "Leave the fort and reach the fishermen's boats.",
        'Hold the avenue works while the government commits section after section.',
        'Make the last stand on the sand before Rua Barroso.',
      ],
    },
  },
  'anel-de-ferro': {
    title: 'The Iron Ring',
    place: 'Santo Ângelo, São Luiz Gonzaga, Ramada; the Uruguay River',
    perspective: 'Luís Carlos Prestes, leading the southern rebels, inside the Iron Ring.',
    pages: [
      {
        heading: 'The Ring',
        paragraphs: [
          'On 28 and 29 October 1924 the south rose. Prestes, a captain with the 1st Railway Battalion at Santo Ângelo, took his men out; São Borja and Uruguaiana rose with them. By November his battalion held São Luiz Gonzaga, and the rebels\' newspaper, O Libertador, was being printed there.',
          'The government called what came next a ring. In December seven loyalist detachments converged on the town. Prestes left one detachment in contact to make the enemy believe the whole force was retreating, and gathered the rest at São Miguel das Missões. In the night the loyalists closed on an empty position while the rebels marched north-east toward the Ijuí (Blanc, p. 37). A ring is only a line until it closes.',
        ],
        image: { entryId: 'sao-luiz-1924', slot: 'blanc-map' },
        quote: {
          text: '…one of the most brilliant operations of this campaign and it is even on par with any of the most celebrated acts of military genius carried out at any other time in history.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 37',
          attribution: 'General João Francisco, letter to Prestes, December 1924',
          originalLocale: 'en',
          note: BLANC_EN,
        },
      },
      {
        heading: 'Ramada',
        paragraphs: [
          'The praise was hyperbole, and Blanc notes that such praise helped make the legend. The march north was harder. On 3 January 1925, near Palmeiras, at the place local memory calls Ramada, the rearguard fought one of the bloodiest actions of the whole rebellion. Macaulay counts about forty rebels lost (p. 61); the monument there today stands for nearly a hundred loyalist dead (Blanc, p. 237).',
          'The horses were the next cost. They had carried the column and pulled the wagons, and the government had more of them. Men deserted, too: of more than three thousand in November, a little over a thousand were left at the river (Blanc, p. 41).',
        ],
      },
      {
        heading: 'The River',
        paragraphs: [
          'The column reached the Uruguay on 9 January. Almost two hundred men took a ferry into Argentina instead of crossing into Santa Catarina. The crossing began on 25 January with a boat that held three horses at a time, then a raft; the last men were across on 31 January (Blanc, p. 41). Prestes ordered the women to stay behind. His men ferried them across anyway.',
          'Most of the horses were lost or left on the bank, and the column went on foot through the forests of Santa Catarina toward Paraná. It had not won anything. It had kept moving, and in the history of the campaign that is the difference that matters.',
        ],
        image: { entryId: 'sao-luiz-1924', slot: 'route-map' },
      },
    ],
    briefing: {
      pitch:
        'São Luiz Gonzaga, December 1924. The government is closing the ring. Prestes refuses to wait for the encirclement: the column will march north at night, the rearguard will hold Ramada, and the Uruguay is the gate. The town is not the objective; the column is.',
      objectives: [
        "Screen the column's departure from São Luiz Gonzaga.",
        'Hold the Ramada rearguard until the wagons reach the river.',
        'Cross the Uruguay with Prestes and at least one section.',
        'Keep the route north open.',
      ],
    },
  },
  'a-divisao': {
    title: 'The Division',
    place: 'Benjamin Constant, Foz do Iguaçu, Porto Santa Helena, Porto Mendes to Puerto Adela',
    perspective:
      'Miguel Costa, formal commander of the First Revolutionary Division, in western Paraná and at the Paraná crossing.',
    pages: [
      {
        heading: 'The Junction',
        paragraphs: [
          'Western Paraná, April 1925. Catanduvas, the last stronghold of the São Paulo rebels, had surrendered before dawn on 30 March. Miguel Costa\'s brigade, the last of them still fighting, began to withdraw west the next day. Prestes\'s men, out of the forests of Santa Catarina, reached the same road at Benjamin Constant.',
          'There, on 3 April, Prestes and Miguel Costa met. They agreed not to go down to Foz do Iguaçu to surrender or emigrate, but to combine and cross the Paraná into Mato Grosso, and they sent their men toward Porto Santa Helena before they had asked anyone (Macaulay, p. 86).',
        ],
        image: { entryId: 'foz-do-iguacu', slot: 'group-photo' },
        quote: {
          text: 'The legendary Prestes Column appeared in the Alto Paraná. At the front marched the unmatched figure of the heroic Siqueira Campos…',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 47',
          attribution: 'Tabajara de Oliveira, memoir, on the arrival of the southern rebels',
          originalLocale: 'en',
          note: BLANC_EN,
        },
      },
      {
        heading: 'Foz do Iguaçu',
        paragraphs: [
          'Only then did they go to Foz do Iguaçu, where Isidoro kept his headquarters. On 12 April the marshal told his officers that nothing more could be done in the field and that exile was the only choice. Most of the São Paulo commanders agreed. Prestes and Miguel Costa did not, and Isidoro let the revolution go on without him, returning to Argentina as its nominal chief (Blanc, p. 47).',
          'On 14 April 1925, at Porto Santa Helena, the First Revolutionary Division was formed: Miguel Costa in command, Prestes chief of staff, a São Paulo brigade of about seven hundred men and a Rio Grande brigade of about eight hundred.',
        ],
      },
      {
        heading: 'The Crossing',
        paragraphs: [
          'The division crossed from Porto Mendes to Puerto Adela, on the Paraguayan bank: the landing began on 27 April and the crossing was complete on 29 April. Macaulay counts no more than fifteen hundred men, six hundred horses and mules and three 75 mm guns (pp. 88–89). The guns would be abandoned and hidden in Mato Grosso.',
          'The two brigades crossed as one division. The Rio Grande men and the São Paulo men kept their own histories, but they shared a command, a river and a march. The column was not one man, and its command structure is part of the story: Miguel Costa signed the orders, and Prestes planned the march.',
        ],
      },
    ],
    briefing: {
      pitch:
        'Western Paraná, April 1925. The southern column and the São Paulo column meet; Prestes and Miguel Costa agree at Benjamin Constant. Miguel Costa takes formal command; Prestes becomes chief of staff. The government is coming. The two brigades must become one division and cross the Paraná before the border closes.',
      objectives: [
        'Combine the southern and São Paulo forces.',
        'Organize the two brigades under one division.',
        "Cross the Paraná with the division's men, horses and guns.",
        'Keep the government from cutting the crossing.',
      ],
    },
  },
  'frente-do-parana': {
    title: 'The Paraná Front',
    place: 'Catanduvas and the Paraná plateau',
    perspective:
      'Isidoro Dias Lopes at Foz do Iguaçu, directing the São Paulo front; in the field, a section under Estilac Leal at Catanduvas.',
    pages: [
      {
        heading: 'Before the Division',
        paragraphs: [
          'This chapter steps back. It covers July 1924 to March 1925, the months before the meeting of chapter 3, and the other half of the men who formed the division.',
          'The São Paulo revolt had held the city for three weeks. At ten on the night of 27 July 1924 the first troop train left the Luz station; by dawn thirteen trains had carried away some three thousand men and fourteen field guns, while two guns left behind kept firing (Macaulay, pp. 16–17). The trains went west and then south, and the revolt dug in on the Paraná, between Guaíra, Foz do Iguaçu and Catanduvas.',
        ],
      },
      {
        heading: 'The Trenches',
        paragraphs: [
          'The Paraná front was trenches in the forest and farmland, coffee rows and woods, a farmhouse and a road. Isidoro commanded from Foz; Estilac Leal\'s brigade held Catanduvas. At the end of February Isidoro wrote to Prestes that many of his soldiers, even some officers, were half-naked and barefoot, and that they must hold out at least another month (Blanc, p. 44). The government had the guns, and the Patriotic Battalions of volunteers dug in opposite.',
        ],
        image: { entryId: 'army-patriotico', slot: 'hero-photo' },
        quote: {
          text: 'From this period forward, the rebels won very few battles.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 42',
          attribution: 'Jacob Blanc, historian, on the Paraná front in early 1925',
          originalLocale: 'en',
        },
      },
      {
        heading: 'The Fall',
        paragraphs: [
          'On 26 March 1925 General Rondon began the attacks that encircled Catanduvas. By 29 March the stronghold was cut off: four thousand government soldiers and 105 mm howitzers against 407 rebels. Estilac Leal and two officers slipped through the lines that night; the rest surrendered before dawn on 30 March. The campaign cost the government 179 dead, 301 wounded and 60 missing, its heaviest losses of the revolution (Macaulay, p. 85).',
          'The front was lost. The men who left it with Miguel Costa would meet Prestes four days later and become the São Paulo Brigade of the column.',
        ],
      },
    ],
    briefing: {
      pitch:
        "The city is lost. The front is lost. Isidoro's orders reach the front from Foz; Estilac Leal's brigade holds Catanduvas. The rearguard must hold the trench line until the wounded and supplies are through, then withdraw in order. The front is not the objective; the men are.",
      objectives: [
        'Hold the trench line until the wounded and supplies are withdrawn.',
        'Evacuate the wounded.',
        'Destroy or abandon what cannot be carried.',
        'Withdraw the rearguard in order.',
      ],
    },
  },
  'ponte-de-verdinho': {
    title: 'The Bridge',
    place: 'The Verdinho bridge, Mineiros, Goiás',
    perspective: 'Luís Carlos Prestes, chief of staff, with the rearguard at the Verdinho bridge.',
    pages: [
      {
        heading: 'The Bridge',
        paragraphs: [
          'On 10 June 1925, at Camapuã, the two brigades became four detachments under Cordeiro de Farias, João Alberto, Siqueira Campos and Djalma Dutra. Behind them came something new: Major Bertoldo Klinger\'s Mineiro militiamen, in trucks.',
          'At four in the afternoon of 27 June, Klinger\'s touring car and five trucks came up the road to the Verdinho bridge outside Mineiros, Goiás. Prestes and his staff were there with the rearguard, Cordeiro\'s detachment. Klinger had not waited for the rest of his force; he attacked with what he had, fewer than a hundred men (Macaulay, p. 123).',
        ],
      },
      {
        heading: 'The Ford',
        paragraphs: [
          'Prestes and Cordeiro saw how few they were, stopped the advance, pushed it back from the bridge and set the bridge on fire. It cost the rebels one dead and one wounded. In the night the rest of Klinger\'s trucks came up: a hundred and twenty riflemen and five machine-gun crews. Early on 28 June the rearguard waded the shallow river and withdrew east.',
          'Klinger did not stop. His men dug cuts into both banks and laid a ford with timbers from the burned bridge. By nightfall five trucks were across; by seven the next morning thirteen vehicles were in Mineiros (Macaulay, pp. 123–124).',
        ],
        quote: {
          text: 'They seemed to be unfurled banners, swiftly conveying throughout those backlands the word of order, the presence of the law.',
          sourceKey: 'macaulay-1974',
          cite: 'The Prestes Column (1974), p. 124',
          attribution: 'Major Bertoldo Klinger, on the dust of his trucks, 29 June 1925',
          originalLocale: 'en',
          note: MACAULAY_EN,
        },
      },
      {
        heading: 'The Cost',
        paragraphs: [
          'At noon on 29 June, some seventy kilometres east, Klinger overtook the new rearguard, Djalma Dutra\'s detachment. At four in the afternoon the fighting was close and confused. Aldo Manenti, an eighteen-year-old lieutenant, an Italian from São Paulo, climbed onto the cab of Klinger\'s lead truck, perhaps taking it for a rebel vehicle, and was killed at the wheel. Four other rebels died inside the loyalist line (p. 124).',
          'That evening the column left the road for an ox-cart trail the trucks could not follow. The bridge had bought a night, not safety, and its own timbers had carried the pursuit across. Verdinho is a small action in a long march, and that is the point: the column survived by giving up ground at the right moment.',
        ],
      },
    ],
    briefing: {
      pitch:
        'The column has crossed the Verdinho. The bridge is the only dry crossing. Prestes tells the rearguard to hold until the wagons are through, then burn the bridge and leave by the ford. The bridge is not a position to keep; it is a position to give up at the right time.',
      objectives: [
        "Hold the bridge until the column's wagons are across.",
        'Prepare and burn the bridge.',
        'Withdraw the rearguard through the ford.',
        'Keep the government from crossing on the bridge.',
      ],
    },
  },
  'serra-nova': {
    title: 'Serra Nova',
    place: 'Serra Nova and Taiobeiras, Minas Gerais',
    perspective: 'Luís Carlos Prestes, chief of staff, screening the column through the Minas Gerais highlands.',
    pages: [
      {
        heading: 'Porto Nacional',
        paragraphs: [
          'October 1925. Six months after the Paraná and fifteen after São Paulo, the column reached Porto Nacional, on the Tocantins, in what was then northern Goiás. The townspeople fled into the bush; the friars stayed. In the Dominican monastery the chiefs had time, for once, to put in writing what they were marching for. On 19 October Miguel Costa, Prestes and Juarez Távora signed a manifesto to the nation. It asked for liberty and the Constitution, and it did not yet speak of the land.',
        ],
        quote: {
          text: 'And the people may be sure that the revolutionary soldiers will not furl the flag of Liberty until this climate of despotism and intolerance changes, which in a delirium of oppression stifles the best hopes of the national conscience!',
          sourceKey: 'manifesto-1925',
          cite: 'Manifesto of Porto Nacional, 19 Oct. 1925 (Marxists Internet Archive)',
          attribution: 'Miguel Costa, Luís Carlos Prestes and Juarez Távora, Porto Nacional, 19 October 1925',
          translated: true,
        },
      },
      {
        heading: 'The Rearguard',
        paragraphs: [
          'April 1926. The column had crossed the Northeast and come down from the Chapada Diamantina into northern Minas Gerais. The men were tired in a way that sleep did not fix. Behind them came the Patriotic Battalions of the sertão: bands of jagunços under their chiefs, paid, uniformed and armed by the government.',
          'On 22 April, at Serra Nova, the jagunços of Horácio de Matos and Abílio Wolney fell on the rearguard (Macaulay, pp. 220–221). The column did not stand and fight a pitched battle. It broke contact, turned, and made the pursuers look for it where it was not.',
        ],
        image: { entryId: 'batalhoes-patrioticos-bahia', slot: 'hero-photo' },
      },
      {
        heading: 'The Loop',
        paragraphs: [
          'The escape was remembered as the "laço húngaro": a series of circling marches that confused the pursuers and pulled the column out of the closing ring. Federal troops had ordered people out of their homes; the column passed through a country emptied for the trap, and reached Taiobeiras on 26 April.',
          'Macaulay\'s map breaks the march at Serra Nova, a solid line behind and a dashed line ahead, but the break belongs to the map. What changed after Serra Nova was in the high command, where the talk turned to leaving Brazil.',
        ],
        image: { entryId: 'serra-nova', slot: 'blanc-map' },
      },
      {
        heading: 'The Next March',
        paragraphs: [
          'Serra Nova was not a victory. It was the moment the column chose to keep moving when the ring was almost closed.',
          'Thirty years later, Guimarães Rosa gave the march a line in a novel. His old jagunço remembers Prestes\'s soldiers passing through the Minas backlands. It is fiction, and it does not name this place. But the sertão kept the march the way the tree kept the lead.',
        ],
        quote: {
          text: "The rebels came through here afterwards, Prestes's soldiers, coming from Goiás; they claimed every saddle animal. […] Many years later a farmer goes to hew a tree trunk and finds bullets lodged in it.",
          sourceKey: 'rosa-1956',
          cite: 'Grande sertão: veredas, 36th ed. (Rio de Janeiro: Nova Fronteira, 1986), p. 82',
          via: { sourceKey: 'mozzer-2009', cite: 'pp. 249–250' },
          attribution: 'João Guimarães Rosa, Grande sertão: veredas (1956), Riobaldo speaking',
          translated: true,
          note: 'Our translation from the Portuguese.',
        },
      },
    ],
    briefing: {
      pitch:
        'Serra Nova, April 1926. The rearguard is attacked; the column must turn. Prestes tells the rearguard to hold long enough for the column to break contact, then follow it toward Taiobeiras.',
      objectives: [
        'Hold the rearguard long enough for the column to turn.',
        'Break contact with the jagunços.',
        "Cover the column's change of direction.",
        'Reach Taiobeiras on 26 April.',
      ],
    },
  },
  pantanal: {
    title: 'The Pantanal',
    place: 'The Pantanal of Mato Grosso; San Matías, Bolivia',
    perspective: 'Luís Carlos Prestes, chief of staff, leading the column through the Pantanal.',
    pages: [
      {
        heading: 'The Road to the Border',
        paragraphs: [
          'At the end of October 1926 the high command decided how the march would end. Djalma Dutra and Moreira Lima went south to find Isidoro. The column would wait on the Brazilian side until the end of January and, with no word from them, cross into Bolivia at the beginning of February (Macaulay, p. 232).',
          'On 24 December, near Presidente Murtinho, about four hundred Mato Grosso militiamen, most of them green recruits, blocked the road. João Alberto and Ary Salgado Freire turned their flank and scattered them, at the cost of one man. It was the last loyalist force between the column and the border; the jagunços of Franklin de Albuquerque kept pressing on the rear (p. 233).',
        ],
      },
      {
        heading: 'The Marsh',
        paragraphs: [
          'The column crossed the Paraguay near its headwaters and turned south. On 10 January 1927 it entered the Pantanal (Blanc, p. 127). First came dry forest, cut through by hand; then the floodplain. The men lost almost all their horses. They marched at times in water up to their chests, slept on anthills, the only dry ground, under clouds of mosquitoes, and ate hearts of palm when the cattle gave out (Macaulay, p. 234).',
        ],
        quote: {
          text: 'We no longer had a single dry piece of clothing. It was impossible! We dreamed of finding a bit of solid ground, where we could make a fire…',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 127',
          attribution: 'João Alberto Lins de Barros, memoir, on the Pantanal, January 1927',
          originalLocale: 'en',
          note: BLANC_EN,
        },
      },
      {
        heading: 'The Border',
        paragraphs: [
          'On 3 February 1927 the column crossed the unmarked frontier and camped north of San Matías. Ary Salgado Freire rode into the Bolivian town to arrange the surrender and found Moreira Lima there, back from Argentina. On 4 February 620 men handed over ninety Mausers, four machine guns, two automatic rifles and eight thousand cartridges (Macaulay, p. 234).',
          'Siqueira Campos was not with them. He had lost touch with the column at the end of October, learned at a telegraph office in Goiás on 8 February that it was in Bolivia, and crossed into Paraguay with sixty-five men on 23 March. The march was over.',
        ],
        quote: {
          text: 'We were reduced to about six hundred bedraggled men, without shoes and half-naked. . . . The passage [in the Pantanal] was the most difficult of our whole campaign.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 127',
          attribution: 'Italo Landucci, memoir (1947)',
          originalLocale: 'en',
          note: BLANC_EN,
        },
      },
    ],
    briefing: {
      pitch:
        'The Pantanal, January 1927. The column is exhausted; the border is ahead. Prestes tells the rearguard to keep the column together, bring the wounded and reach the border. There is no battle to win; the march is the objective.',
      objectives: ['Cross the marsh and the water.', 'Keep the column together.', 'Bring the wounded.', 'Reach the border.'],
    },
  },
  'la-gaiba': {
    title: 'La Gaiba',
    place: 'La Gaiba, Bolivia',
    perspective: 'Luís Carlos Prestes and the exiles at La Gaiba, after the march.',
    pages: [
      {
        heading: 'The Exile',
        paragraphs: [
          'After San Matías most of the officers went on to Argentina. Prestes stayed in Bolivia with a small group, Djalma Dutra and Moreira Lima among them. Ninety miles to the south, at La Gaiba, an English company, Bolivian Concessions Ltd., held rights to thirty million acres. Prestes, an engineer, negotiated a contract: for a small daily wage his men opened a road through the forest and built storehouses. The pay barely covered the medicine for malaria and dysentery, and Hermínia, the nurse who had marched since São Paulo, set up a hospital (Blanc, p. 132).',
        ],
        image: { entryId: 'la-gaiba-1927', slot: 'workers' },
      },
      {
        heading: 'The Monument',
        paragraphs: [
          'On 5 July 1927, the fifth anniversary of Copacabana and the third of São Paulo, the exiles dedicated a monument to the column\'s dead. It was a block of granite, and on it they cut: "Glory to the Bandeirantes of Freedom, 1924–1927." Moreira Lima gave the speech; the Correio da Manhã printed it in Rio on 22 July (Blanc, p. 142).',
        ],
        image: { entryId: 'la-gaiba-1927', slot: 'monument' },
        quote: {
          text: 'Filled with emotion and pain, we inaugurate this mausoleum for the memory of the brave soldiers of the Prestes Column.',
          sourceKey: 'blanc-2024',
          cite: 'The Prestes Column (Duke, 2024), p. 142',
          attribution: 'Lourenço Moreira Lima, La Gaiba, 5 July 1927 (Correio da Manhã, 22 July 1927, p. 5)',
          originalLocale: 'en',
          note: BLANC_EN,
        },
      },
      {
        heading: 'The Dead',
        paragraphs: [
          "Some of the column's dead lay at La Gaiba, men who had walked from the Missões to a foreign forest. Moreira Lima, the column's secretary, who had counted every league of the march, said farewell to them.",
        ],
        quote: {
          text: 'Soldiers of Liberty! Sleep in peace in the foreign land that took you in so nobly, for your names and your deeds will live for ever in the generous heart of Brazil.',
          sourceKey: 'lima-1931',
          cite: 'Marchas e combates, 3rd ed. (1979), p. 523, via Mozzer 2009, p. 257',
          attribution: 'Lourenço Moreira Lima, La Gaiba, Bolivia, 1927',
          translated: true,
        },
      },
      {
        heading: 'The Memory',
        paragraphs: [
          'The same day, in Brazil, the newspaper Vanguarda called Prestes the Knight of Hope, a name Isidoro had given him. The press that had called the rebels bandits now raised money for them. The collective "bandeirantes" were buried abroad; one man\'s legend rose at home, and with it the image of a savage interior waiting for a hero.',
          'The campaign ends here. The record must say what the march cost and what it was: twenty-five thousand kilometres in twenty-five months, a political march that outlasted the government and did not become a victory.',
        ],
        image: { entryId: 'exile-1927', slot: 'caricature' },
        quote: {
          text: 'In 1927 Brazil wanted heroes but not a revolution.',
          sourceKey: 'macaulay-1974',
          cite: 'The Prestes Column (1974), p. 234',
          attribution: 'Neill Macaulay, historian',
          originalLocale: 'en',
        },
      },
    ],
    briefing: {
      pitch:
        'La Gaiba, July 1927. The march is over. The exiles are here to dedicate a monument. Prestes tells them what the column was and what it was not.',
      objectives: ['Reach La Gaiba.', 'Dedicate the monument.', 'Choose what the column leaves behind.'],
    },
  },
};
