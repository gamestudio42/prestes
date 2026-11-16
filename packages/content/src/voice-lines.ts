/**
 * ambient-sound-and-voices 5.1 (D7): what the soldiers say. The commander's
 * line and the section's answer for every spoken order, our call-outs, the
 * curses of each faction, and the enemy's call-outs, with a caption in both
 * languages per take. The Portuguese text is the owner's script
 * (`docs/audio/ROTEIRO_RASCUNHO.md`); this file is written from it by the
 * voice tools, and curses without a sourced page are left out.
 *
 * A take's file is `voice/<speaker>/<key>-<n>` (`<key>-ack-<n>` for an
 * answer), as the sound bank names it: `voiceFile(line, n)`.
 */

export type VoiceFaction = 'column' | 'legalist' | 'cangaceiro';
export type VoiceSpeaker = 'comandante' | 'soldado' | 'inimigo' | `xingamento/${VoiceFaction}`;
/** An order line, its answer, our call-out, a curse, the enemy's call-out. */
export type VoiceKind = 'order' | 'answer' | 'callout' | 'curse' | 'enemy';

/** The orders a commander speaks, by the board's controls. */
export const VOICE_ORDERS = [
  'move', 'advance', 'withdraw', 'hold', 'attack', 'suppress', 'area-fire', 'flank', 'aim',
  'defend', 'recon', 'enter', 'exit', 'assault', 'fire-free', 'fire-economy', 'fire-contact', 'fire-hold',
] as const;
export type VoiceOrder = (typeof VOICE_ORDERS)[number];

/** Our soldiers' call-outs. */
export const VOICE_CALLOUTS = ['contact', 'man-down', 'no-ammo', 'reloading', 'pinned', 'gun-set', 'objective', 'falling-back'] as const;
export type VoiceCallout = (typeof VOICE_CALLOUTS)[number];

/** The enemy's call-outs, heard only when our side sees the speaker. */
export const VOICE_ENEMY_CALLOUTS = ['contact', 'advance', 'hold', 'man-down', 'no-ammo', 'pinned', 'machine-gun', 'falling-back', 'objective'] as const;
export type VoiceEnemyCallout = (typeof VOICE_ENEMY_CALLOUTS)[number];

export interface VoiceTake {
  /** What is said (the recording's text). */
  pt: string;
  /** The English caption. */
  en: string;
}

export interface VoiceLine {
  speaker: VoiceSpeaker;
  kind: VoiceKind;
  /** The order, the call-out, or the curse's number. */
  key: string;
  takes: readonly VoiceTake[];
}

export const VOICE_LINES: readonly VoiceLine[] = [
  { speaker: 'comandante', kind: 'order', key: 'move', takes: [{ pt: 'Seção, para lá! Andando!', en: 'Section, over there! Move!' }, { pt: 'Ocupem aquele ponto!', en: 'Take that spot!' }, { pt: 'Mudem de posição, vamos!', en: 'Change position, come on!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'move', takes: [{ pt: 'Sim, senhor!', en: 'Yes, sir!' }, { pt: 'Lá vamos nós.', en: 'Here we go.' }, { pt: 'Indo pra lá!', en: 'Heading over!' }] },
  { speaker: 'comandante', kind: 'order', key: 'advance', takes: [{ pt: 'Avançar por lanços!', en: 'Advance by bounds!' }, { pt: 'Metade cobre, metade avança!', en: 'Half cover, half advance!' }, { pt: 'Pra frente, de lanço em lanço!', en: 'Forward, bound by bound!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'advance', takes: [{ pt: 'Avançando!', en: 'Advancing!' }, { pt: 'Cobrindo! Vai, vai!', en: 'Covering! Go, go!' }, { pt: 'Pra frente, pessoal!', en: 'Forward, lads!' }] },
  { speaker: 'comandante', kind: 'order', key: 'withdraw', takes: [{ pt: 'Recuar! Pra trás!', en: 'Fall back! Back!' }, { pt: 'Saiam daí, recuem!', en: 'Get out of there, fall back!' }, { pt: 'Retirada, devagar e atirando!', en: 'Withdraw, slowly, keep firing!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'withdraw', takes: [{ pt: 'Recuando!', en: 'Falling back!' }, { pt: 'Pra trás, pessoal!', en: 'Back, lads!' }, { pt: 'Saindo!', en: 'Getting out!' }] },
  { speaker: 'comandante', kind: 'order', key: 'hold', takes: [{ pt: 'Alto! Abriguem-se!', en: 'Halt! Take cover!' }, { pt: 'Alto aí! Fiquem onde estão!', en: 'Halt there! Stay where you are!' }, { pt: 'Parem e segurem aí!', en: 'Stop and hold there!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'hold', takes: [{ pt: 'Alto!', en: 'Halt!' }, { pt: 'Segurando aqui.', en: 'Holding here.' }, { pt: 'Parados, senhor.', en: 'Halted, sir.' }] },
  { speaker: 'comandante', kind: 'order', key: 'attack', takes: [{ pt: 'Fogo naquele grupo!', en: 'Fire on that group!' }, { pt: 'Ataquem! Pra cima deles!', en: 'Attack! At them!' }, { pt: 'Alvo à frente, fogo!', en: 'Target ahead, fire!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'attack', takes: [{ pt: 'Fogo!', en: 'Fire!' }, { pt: 'Pra cima!', en: 'At them!' }, { pt: 'Vendo o alvo!', en: 'Target seen!' }] },
  { speaker: 'comandante', kind: 'order', key: 'suppress', takes: [{ pt: 'Prendam eles no chão! Fogo contínuo!', en: 'Pin them down! Keep firing!' }, { pt: 'Não deixem levantar a cabeça!', en: "Don't let them raise their heads!" }, { pt: 'Fogo neles sem parar!', en: "Fire on them, don't stop!" }] },
  { speaker: 'soldado', kind: 'answer', key: 'suppress', takes: [{ pt: 'Mantendo o fogo!', en: 'Keeping up the fire!' }, { pt: 'Cabeça baixa neles!', en: 'Keeping their heads down!' }, { pt: 'Fogo contínuo!', en: 'Steady fire!' }] },
  { speaker: 'comandante', kind: 'order', key: 'area-fire', takes: [{ pt: 'Atirem naquele mato!', en: 'Fire into that brush!' }, { pt: 'Fogo na moita, estão lá!', en: "Fire into the thicket, they're in there!" }, { pt: 'Varram aquela área!', en: 'Sweep that area!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'area-fire', takes: [{ pt: 'Atirando no mato!', en: 'Firing into the brush!' }, { pt: 'Fogo na área!', en: 'Fire on the area!' }, { pt: 'Gastando bala, senhor!', en: 'Spending rounds, sir!' }] },
  { speaker: 'comandante', kind: 'order', key: 'flank', takes: [{ pt: 'Metade prende, metade contorna!', en: 'Half pin them, half go round!' }, { pt: 'Peguem eles pelo lado!', en: 'Take them from the side!' }, { pt: 'Flanco! Rodeiem!', en: 'Flank! Go round!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'flank', takes: [{ pt: 'Contornando!', en: 'Going round!' }, { pt: 'Pelo lado, vamos!', en: "By the side, let's go!" }, { pt: 'Prendendo eles aqui!', en: 'Pinning them here!' }] },
  { speaker: 'comandante', kind: 'order', key: 'aim', takes: [{ pt: 'Olho naquela direção!', en: 'Eyes that way!' }, { pt: 'Frente pra lá!', en: 'Face over there!' }, { pt: 'Vigiem aquele lado!', en: 'Watch that side!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'aim', takes: [{ pt: 'Vigiando!', en: 'Watching!' }, { pt: 'Olho lá.', en: 'Eyes on it.' }, { pt: 'Frente virada, senhor.', en: 'Facing round, sir.' }] },
  { speaker: 'comandante', kind: 'order', key: 'defend', takes: [{ pt: 'Defendam esta área!', en: 'Defend this ground!' }, { pt: 'Aqui ninguém passa! Abriguem-se!', en: 'No one gets through here! Take cover!' }, { pt: 'Segurem este terreno!', en: 'Hold this ground!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'defend', takes: [{ pt: 'Defendendo!', en: 'Defending!' }, { pt: 'Ninguém passa!', en: 'No one gets through!' }, { pt: 'Tomando abrigo!', en: 'Taking cover!' }] },
  { speaker: 'comandante', kind: 'order', key: 'recon', takes: [{ pt: 'Batedores, vão ver o que tem lá!', en: "Scouts, go see what's out there!" }, { pt: 'Reconheçam aquele terreno!', en: 'Scout that ground!' }, { pt: 'Vão espiar, sem fazer barulho!', en: 'Go and look, quietly!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'recon', takes: [{ pt: 'Vou ver.', en: "I'll go see." }, { pt: 'Já volto com notícia.', en: 'Back soon with news.' }, { pt: 'Calado, indo.', en: 'Quiet, going.' }] },
  { speaker: 'comandante', kind: 'order', key: 'enter', takes: [{ pt: 'Ocupem aquela casa!', en: 'Take that house!' }, { pt: 'Pra dentro da trincheira!', en: 'Into the trench!' }, { pt: 'Entrem e guarneçam!', en: 'Get in and man it!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'enter', takes: [{ pt: 'Entrando!', en: 'Going in!' }, { pt: 'Ocupando!', en: 'Taking it!' }, { pt: 'Pra dentro, pessoal!', en: 'Inside, lads!' }] },
  { speaker: 'comandante', kind: 'order', key: 'exit', takes: [{ pt: 'Saiam da posição!', en: 'Leave the position!' }, { pt: 'Pra fora, vamos!', en: 'Out, come on!' }, { pt: 'Deixem isso, saiam!', en: 'Leave it, get out!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'exit', takes: [{ pt: 'Saindo!', en: 'Getting out!' }, { pt: 'Pra fora!', en: 'Out!' }, { pt: 'Deixando a posição!', en: 'Leaving the position!' }] },
  { speaker: 'comandante', kind: 'order', key: 'assault', takes: [{ pt: 'Assalto! Pra cima deles!', en: 'Assault! At them!' }, { pt: 'Tomem aquela posição!', en: 'Take that position!' }, { pt: 'Avante! Tomem a posição!', en: 'Forward! Take the position!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'assault', takes: [{ pt: 'Avante!', en: 'Forward!' }, { pt: 'Pra cima!', en: 'At them!' }, { pt: 'Tomando!', en: 'Taking it!' }] },
  { speaker: 'comandante', kind: 'order', key: 'fire-free', takes: [{ pt: 'Fogo à vontade!', en: 'Fire at will!' }, { pt: 'Atirem à vontade!', en: 'Shoot at will!' }, { pt: 'Fogo livre, pessoal!', en: 'Free fire, lads!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'fire-free', takes: [{ pt: 'Fogo à vontade!', en: 'Fire at will!' }, { pt: 'Atirando!', en: 'Firing!' }, { pt: 'Pode deixar!', en: 'Will do!' }] },
  { speaker: 'comandante', kind: 'order', key: 'fire-economy', takes: [{ pt: 'Só atirem quando virem o branco dos olhos deles!', en: "Don't fire till you see the whites of their eyes!" }, { pt: 'Poupem bala! Cada tiro, um inimigo!', en: 'Save your rounds! One shot, one enemy!' }, { pt: 'Nada de gastar à toa, mirem bem!', en: 'No wasting rounds, aim well!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'fire-economy', takes: [{ pt: 'Poupando bala!', en: 'Saving rounds!' }, { pt: 'Só no certo, senhor.', en: 'Only sure shots, sir.' }, { pt: 'Esperando eles chegarem!', en: 'Waiting for them to come!' }] },
  { speaker: 'comandante', kind: 'order', key: 'fire-contact', takes: [{ pt: 'Ninguém atira antes da hora!', en: 'No one fires too soon!' }, { pt: 'Esperem eles chegarem perto!', en: 'Let them come close!' }, { pt: 'Fogo só se chegarem em cima!', en: "Fire only if they're on us!" }] },
  { speaker: 'soldado', kind: 'answer', key: 'fire-contact', takes: [{ pt: 'Esperando!', en: 'Waiting!' }, { pt: 'Quando chegarem, senhor.', en: 'When they come, sir.' }, { pt: 'Dedo fora do gatilho.', en: 'Finger off the trigger.' }] },
  { speaker: 'comandante', kind: 'order', key: 'fire-hold', takes: [{ pt: 'Segurem o fogo!', en: 'Hold your fire!' }, { pt: 'Ninguém atira!', en: 'No one fires!' }, { pt: 'Cessar fogo!', en: 'Cease fire!' }] },
  { speaker: 'soldado', kind: 'answer', key: 'fire-hold', takes: [{ pt: 'Segurando!', en: 'Holding!' }, { pt: 'Ninguém atira.', en: 'No one fires.' }, { pt: 'Cessar fogo!', en: 'Cease fire!' }] },
  { speaker: 'soldado', kind: 'callout', key: 'contact', takes: [{ pt: 'Inimigo à vista!', en: 'Enemy in sight!' }, { pt: 'Lá estão eles!', en: 'There they are!' }, { pt: 'Gente ali na frente!', en: 'Men up ahead!' }] },
  { speaker: 'soldado', kind: 'callout', key: 'man-down', takes: [{ pt: 'Homem ferido!', en: 'Man down!' }, { pt: 'Pegaram um dos nossos!', en: 'They got one of ours!' }, { pt: 'Caiu um aqui!', en: 'One down here!' }] },
  { speaker: 'soldado', kind: 'callout', key: 'no-ammo', takes: [{ pt: 'Acabou a munição!', en: 'Out of ammunition!' }, { pt: 'Tô sem bala!', en: "I'm out of rounds!" }, { pt: 'Cartucho! Alguém tem cartucho?', en: 'Cartridges! Anyone got cartridges?' }] },
  { speaker: 'soldado', kind: 'callout', key: 'reloading', takes: [{ pt: 'Carregando!', en: 'Loading!' }, { pt: 'Remuniciando!', en: 'Reloading!' }, { pt: 'Cobre aí, tô carregando!', en: "Cover me, I'm loading!" }] },
  { speaker: 'soldado', kind: 'callout', key: 'pinned', takes: [{ pt: 'Não dá pra levantar a cabeça!', en: "Can't raise my head!" }, { pt: 'Estamos presos aqui!', en: "We're pinned here!" }, { pt: 'Fogo demais, não dá!', en: "Too much fire, can't do it!" }] },
  { speaker: 'soldado', kind: 'callout', key: 'gun-set', takes: [{ pt: 'Metralhadora pronta!', en: 'Machine gun ready!' }, { pt: 'Peça montada!', en: 'Gun set up!' }, { pt: 'Pronta pra atirar!', en: 'Ready to fire!' }] },
  { speaker: 'soldado', kind: 'callout', key: 'objective', takes: [{ pt: 'Posição tomada!', en: 'Position taken!' }, { pt: 'É nossa!', en: "It's ours!" }, { pt: 'Tomamos!', en: 'We took it!' }] },
  { speaker: 'soldado', kind: 'callout', key: 'falling-back', takes: [{ pt: 'Pra trás, pra trás!', en: 'Back, back!' }, { pt: 'Não segura mais, recua!', en: "Can't hold, fall back!" }, { pt: 'Vamos embora daqui!', en: "Let's get out of here!" }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '01', takes: [{ pt: 'Filho da puta!', en: 'Son of a bitch!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '02', takes: [{ pt: 'Vai pra puta que te pariu!', en: 'Go to hell, you bastard!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '03', takes: [{ pt: 'Filho duma égua!', en: 'Son of a mare!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '04', takes: [{ pt: 'Corno manso!', en: 'Tame cuckold!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '05', takes: [{ pt: 'Toma, chifrudo!', en: 'Take that, cuckold!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '06', takes: [{ pt: 'Corre, cagão!', en: 'Run, coward!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '07', takes: [{ pt: 'Cachorro do governo!', en: 'Government dog!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '08', takes: [{ pt: 'Pau-mandado de coronel!', en: "Colonel's lackey!" }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '09', takes: [{ pt: 'Porra, errei o desgraçado!', en: 'Damn it, missed the bastard!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '10', takes: [{ pt: 'Merda de espingarda!', en: 'Shit rifle!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '11', takes: [{ pt: 'Barbaridade, que tiroteio!', en: 'Good grief, what a firefight!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '12', takes: [{ pt: 'Bah, mas que porcaria!', en: 'Bah, what rubbish!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '14', takes: [{ pt: 'Vai pros quinto dos inferno, desgraçado!', en: 'Go to the pits of hell, you bastard!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '15', takes: [{ pt: 'Mardito seja!', en: 'Damn you!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '16', takes: [{ pt: 'Chimangos!', en: 'Chimangos!' }, { pt: 'Lá vêm os chimangos!', en: 'Here come the chimangos!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '17', takes: [{ pt: 'Corre, provisório!', en: 'Run, provisional!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '18', takes: [{ pt: 'Raios e coriscos!', en: 'Thunder and lightning!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '19', takes: [{ pt: 'Canalhas!', en: 'Scoundrels!' }] },
  { speaker: 'xingamento/legalist', kind: 'curse', key: '01', takes: [{ pt: 'Filho da puta!', en: 'Son of a bitch!' }] },
  { speaker: 'xingamento/legalist', kind: 'curse', key: '02', takes: [{ pt: 'Bando de filhos da puta!', en: 'Pack of sons of bitches!' }] },
  { speaker: 'xingamento/legalist', kind: 'curse', key: '03', takes: [{ pt: 'Toma, corno!', en: 'Take that, cuckold!' }] },
  { speaker: 'xingamento/legalist', kind: 'curse', key: '04', takes: [{ pt: 'Puta que pariu, de onde vem esse tiro?', en: "Damn it, where's that fire coming from?" }] },
  { speaker: 'xingamento/legalist', kind: 'curse', key: '05', takes: [{ pt: 'Vagabundos!', en: 'Bums!' }] },
  { speaker: 'xingamento/legalist', kind: 'curse', key: '06', takes: [{ pt: 'Rende, cachorro!', en: 'Surrender, dog!' }] },
  { speaker: 'xingamento/legalist', kind: 'curse', key: '07', takes: [{ pt: 'Hoje tu morre, desgraçado!', en: 'Today you die, bastard!' }] },
  { speaker: 'xingamento/legalist', kind: 'curse', key: '08', takes: [{ pt: 'Bando de ladrão de cavalo!', en: 'Pack of horse thieves!' }] },
  { speaker: 'xingamento/legalist', kind: 'curse', key: '09', takes: [{ pt: 'Foge não, covarde!', en: "Don't run, coward!" }] },
  { speaker: 'xingamento/legalist', kind: 'curse', key: '10', takes: [{ pt: 'Cabra safado!', en: 'Dirty rogue!' }] },
  { speaker: 'xingamento/legalist', kind: 'curse', key: '11', takes: [{ pt: 'Daqui vocês não saem!', en: "You're not getting out of here!" }] },
  { speaker: 'xingamento/legalist', kind: 'curse', key: '12', takes: [{ pt: 'Cadê o tal do Prestes?', en: "Where's this Prestes, then?" }] },
  { speaker: 'xingamento/legalist', kind: 'curse', key: '13', takes: [{ pt: 'Merda, não acaba essa gente!', en: "Shit, there's no end to them!" }] },
  { speaker: 'xingamento/legalist', kind: 'curse', key: '14', takes: [{ pt: 'Filho duma égua!', en: 'Son of a mare!' }] },
  { speaker: 'xingamento/legalist', kind: 'curse', key: '15', takes: [{ pt: 'Bah, de onde saiu essa gente?', en: 'Bah, where did these men come from?' }] },
  { speaker: 'xingamento/cangaceiro', kind: 'curse', key: '01', takes: [{ pt: 'Fi duma rapariga!', en: 'Son of a whore!' }] },
  { speaker: 'xingamento/cangaceiro', kind: 'curse', key: '02', takes: [{ pt: 'Filho de uma rapariga!', en: 'Son of a whore!' }] },
  { speaker: 'xingamento/cangaceiro', kind: 'curse', key: '03', takes: [{ pt: 'Fela da puta!', en: 'Son of a bitch!' }] },
  { speaker: 'xingamento/cangaceiro', kind: 'curse', key: '04', takes: [{ pt: 'Corno véio!', en: 'Old cuckold!' }] },
  { speaker: 'xingamento/cangaceiro', kind: 'curse', key: '05', takes: [{ pt: 'Cabra da peste!', en: 'Plague of a man!' }] },
  { speaker: 'xingamento/cangaceiro', kind: 'curse', key: '06', takes: [{ pt: 'Arreda, cabra frouxo!', en: 'Out of the way, weakling!' }] },
  { speaker: 'xingamento/cangaceiro', kind: 'curse', key: '07', takes: [{ pt: 'Oxente, de onde vem esse tiro?', en: "Hey, where's that fire coming from?" }] },
  { speaker: 'xingamento/cangaceiro', kind: 'curse', key: '08', takes: [{ pt: 'Vôte, que tiroteio!', en: 'Lord, what a firefight!' }] },
  { speaker: 'xingamento/cangaceiro', kind: 'curse', key: '09', takes: [{ pt: 'Eita porra, errei!', en: 'Damn it, I missed!' }] },
  { speaker: 'xingamento/cangaceiro', kind: 'curse', key: '10', takes: [{ pt: 'Vou sangrar tu, desgraçado.', en: "I'll bleed you, bastard." }] },
  { speaker: 'xingamento/cangaceiro', kind: 'curse', key: '11', takes: [{ pt: 'Vou te furar, fi do cão!', en: "I'll stick you, son of the devil!" }] },
  { speaker: 'xingamento/cangaceiro', kind: 'curse', key: '12', takes: [{ pt: 'Mizerave!', en: 'Wretch!' }] },
  { speaker: 'xingamento/cangaceiro', kind: 'curse', key: '13', takes: [{ pt: 'Corre, cabra mole!', en: 'Run, soft man!' }] },
  { speaker: 'xingamento/cangaceiro', kind: 'curse', key: '14', takes: [{ pt: 'Atira, que o coronel paga!', en: 'Shoot, the colonel pays!' }] },
  { speaker: 'xingamento/cangaceiro', kind: 'curse', key: '15', takes: [{ pt: 'Peste dos inferno!', en: 'Plague from hell!' }] },
  { speaker: 'inimigo', kind: 'enemy', key: 'contact', takes: [{ pt: 'Olha eles ali!', en: 'There they are!' }, { pt: 'Tão lá no mato!', en: "They're in the brush!" }, { pt: 'Gente na frente, cuidado!', en: 'Men ahead, watch out!' }] },
  { speaker: 'inimigo', kind: 'enemy', key: 'advance', takes: [{ pt: 'Pra cima deles!', en: 'At them!' }, { pt: 'Avança, cambada!', en: 'Advance, you lot!' }, { pt: 'Cerca pelo lado!', en: 'Round them by the side!' }] },
  { speaker: 'inimigo', kind: 'enemy', key: 'hold', takes: [{ pt: 'Segura aí!', en: 'Hold there!' }, { pt: 'Ninguém arreda o pé!', en: 'Nobody moves a foot!' }] },
  { speaker: 'inimigo', kind: 'enemy', key: 'man-down', takes: [{ pt: 'Me acertaram!', en: "I'm hit!" }, { pt: 'Tem homem caído aqui!', en: 'Man down here!' }] },
  { speaker: 'inimigo', kind: 'enemy', key: 'no-ammo', takes: [{ pt: 'Cadê a munição?!', en: "Where's the ammunition?!" }, { pt: 'Acabou a bala!', en: 'Out of rounds!' }] },
  { speaker: 'inimigo', kind: 'enemy', key: 'pinned', takes: [{ pt: 'Abaixa, abaixa!', en: 'Get down, get down!' }, { pt: 'Não levanta, que eles atiram!', en: "Stay down, they'll shoot!" }] },
  { speaker: 'inimigo', kind: 'enemy', key: 'machine-gun', takes: [{ pt: 'Cuidado, a metralhadora!', en: 'Watch out, the machine gun!' }, { pt: 'Sai da frente dessa máquina!', en: 'Get away from that gun!' }] },
  { speaker: 'inimigo', kind: 'enemy', key: 'falling-back', takes: [{ pt: 'Corre, corre!', en: 'Run, run!' }, { pt: 'Debanda, pessoal!', en: 'Scatter, lads!' }, { pt: 'Não dá, vamos embora!', en: "It's no good, let's go!" }] },
  { speaker: 'inimigo', kind: 'enemy', key: 'objective', takes: [{ pt: 'Tomamos! É nosso!', en: "We took it! It's ours!" }, { pt: 'Toca eles daqui!', en: 'Drive them out!' }] },
];

/** The sound id of take `n` (from 1) of a line. */
export function voiceFile(line: Pick<VoiceLine, 'speaker' | 'kind' | 'key'>, n: number): string {
  return `${line.speaker}/${line.key}${line.kind === 'answer' ? '-ack' : ''}-${n}`;
}

/** The line of a kind and key (and, for curses, a faction), if the script has it. */
export function voiceLine(kind: VoiceKind, key: string): VoiceLine | undefined {
  return VOICE_LINES.find((line) => line.kind === kind && line.key === key);
}

/** A faction's curses. */
export function curseLines(faction: VoiceFaction): VoiceLine[] {
  return VOICE_LINES.filter((line) => line.kind === 'curse' && line.speaker === `xingamento/${faction}`);
}

/** Problems with the catalogue: every order has its line and answer of three takes, every call-out a line, every take both texts. */
export function validateVoiceLines(lines: readonly VoiceLine[] = VOICE_LINES): string[] {
  const problems: string[] = [];
  const find = (kind: VoiceKind, key: string) => lines.find((line) => line.kind === kind && line.key === key);
  for (const order of VOICE_ORDERS) {
    for (const kind of ['order', 'answer'] as const) {
      const line = find(kind, order);
      if (!line) problems.push(`voice: order "${order}" has no ${kind} line`);
      else if (line.takes.length < 3) problems.push(`voice: order "${order}" ${kind} has ${line.takes.length} takes, needs 3`);
    }
  }
  for (const callout of VOICE_CALLOUTS) if (!find('callout', callout)) problems.push(`voice: call-out "${callout}" has no line`);
  for (const callout of VOICE_ENEMY_CALLOUTS) if (!find('enemy', callout)) problems.push(`voice: enemy call-out "${callout}" has no line`);
  for (const faction of ['column', 'legalist', 'cangaceiro'] as const) {
    if (!lines.some((line) => line.kind === 'curse' && line.speaker === `xingamento/${faction}`)) problems.push(`voice: faction "${faction}" has no curses`);
  }
  const seen = new Set<string>();
  for (const line of lines) {
    const id = `${line.speaker}/${line.kind}/${line.key}`;
    if (seen.has(id)) problems.push(`voice: line ${id} twice`);
    seen.add(id);
    line.takes.forEach((take, index) => {
      if (!take.pt.trim() || !take.en.trim()) problems.push(`voice: ${voiceFile(line, index + 1)} lacks a caption`);
    });
  }
  return problems;
}
