# Roteiro de vozes

Gerado por `pnpm check:audio` (`tools/voice-script.ts`) a partir do
catálogo `VOICE_LINES` (`packages/content/src/voice-lines.ts`); não edite à
mão. Cada tomada é `voice/<falante>/<id>-<n>`; ✓ gravada, · a gravar.
Uma tomada que o dono grava em `audio-src/voice/` substitui a gerada.

**224 de 224 tomadas gravadas.**

## 1. Ordens — comandante

| id | tomada | texto | legenda (EN) | |
|---|---|---|---|---|
| move | `comandante/move-1` | Seção, para lá! Andando! | Section, over there! Move! | ✓ |
|  | `comandante/move-2` | Ocupem aquele ponto! | Take that spot! | ✓ |
|  | `comandante/move-3` | Mudem de posição, vamos! | Change position, come on! | ✓ |
| advance | `comandante/advance-1` | Avançar por lanços! | Advance by bounds! | ✓ |
|  | `comandante/advance-2` | Metade cobre, metade avança! | Half cover, half advance! | ✓ |
|  | `comandante/advance-3` | Pra frente, de lanço em lanço! | Forward, bound by bound! | ✓ |
| withdraw | `comandante/withdraw-1` | Recuar! Pra trás! | Fall back! Back! | ✓ |
|  | `comandante/withdraw-2` | Saiam daí, recuem! | Get out of there, fall back! | ✓ |
|  | `comandante/withdraw-3` | Retirada, devagar e atirando! | Withdraw, slowly, keep firing! | ✓ |
| hold | `comandante/hold-1` | Alto! Abriguem-se! | Halt! Take cover! | ✓ |
|  | `comandante/hold-2` | Alto aí! Fiquem onde estão! | Halt there! Stay where you are! | ✓ |
|  | `comandante/hold-3` | Parem e segurem aí! | Stop and hold there! | ✓ |
| attack | `comandante/attack-1` | Fogo naquele grupo! | Fire on that group! | ✓ |
|  | `comandante/attack-2` | Ataquem! Pra cima deles! | Attack! At them! | ✓ |
|  | `comandante/attack-3` | Alvo à frente, fogo! | Target ahead, fire! | ✓ |
| suppress | `comandante/suppress-1` | Prendam eles no chão! Fogo contínuo! | Pin them down! Keep firing! | ✓ |
|  | `comandante/suppress-2` | Não deixem levantar a cabeça! | Don't let them raise their heads! | ✓ |
|  | `comandante/suppress-3` | Fogo neles sem parar! | Fire on them, don't stop! | ✓ |
| area-fire | `comandante/area-fire-1` | Atirem naquele mato! | Fire into that brush! | ✓ |
|  | `comandante/area-fire-2` | Fogo na moita, estão lá! | Fire into the thicket, they're in there! | ✓ |
|  | `comandante/area-fire-3` | Varram aquela área! | Sweep that area! | ✓ |
| flank | `comandante/flank-1` | Metade prende, metade contorna! | Half pin them, half go round! | ✓ |
|  | `comandante/flank-2` | Peguem eles pelo lado! | Take them from the side! | ✓ |
|  | `comandante/flank-3` | Flanco! Rodeiem! | Flank! Go round! | ✓ |
| aim | `comandante/aim-1` | Olho naquela direção! | Eyes that way! | ✓ |
|  | `comandante/aim-2` | Frente pra lá! | Face over there! | ✓ |
|  | `comandante/aim-3` | Vigiem aquele lado! | Watch that side! | ✓ |
| defend | `comandante/defend-1` | Defendam esta área! | Defend this ground! | ✓ |
|  | `comandante/defend-2` | Aqui ninguém passa! Abriguem-se! | No one gets through here! Take cover! | ✓ |
|  | `comandante/defend-3` | Segurem este terreno! | Hold this ground! | ✓ |
| recon | `comandante/recon-1` | Batedores, vão ver o que tem lá! | Scouts, go see what's out there! | ✓ |
|  | `comandante/recon-2` | Reconheçam aquele terreno! | Scout that ground! | ✓ |
|  | `comandante/recon-3` | Vão espiar, sem fazer barulho! | Go and look, quietly! | ✓ |
| enter | `comandante/enter-1` | Ocupem aquela casa! | Take that house! | ✓ |
|  | `comandante/enter-2` | Pra dentro da trincheira! | Into the trench! | ✓ |
|  | `comandante/enter-3` | Entrem e guarneçam! | Get in and man it! | ✓ |
| exit | `comandante/exit-1` | Saiam da posição! | Leave the position! | ✓ |
|  | `comandante/exit-2` | Pra fora, vamos! | Out, come on! | ✓ |
|  | `comandante/exit-3` | Deixem isso, saiam! | Leave it, get out! | ✓ |
| assault | `comandante/assault-1` | Assalto! Pra cima deles! | Assault! At them! | ✓ |
|  | `comandante/assault-2` | Tomem aquela posição! | Take that position! | ✓ |
|  | `comandante/assault-3` | Avante! Tomem a posição! | Forward! Take the position! | ✓ |
| fire-free | `comandante/fire-free-1` | Fogo à vontade! | Fire at will! | ✓ |
|  | `comandante/fire-free-2` | Atirem à vontade! | Shoot at will! | ✓ |
|  | `comandante/fire-free-3` | Fogo livre, pessoal! | Free fire, lads! | ✓ |
| fire-economy | `comandante/fire-economy-1` | Só atirem quando virem o branco dos olhos deles! | Don't fire till you see the whites of their eyes! | ✓ |
|  | `comandante/fire-economy-2` | Poupem bala! Cada tiro, um inimigo! | Save your rounds! One shot, one enemy! | ✓ |
|  | `comandante/fire-economy-3` | Nada de gastar à toa, mirem bem! | No wasting rounds, aim well! | ✓ |
| fire-contact | `comandante/fire-contact-1` | Ninguém atira antes da hora! | No one fires too soon! | ✓ |
|  | `comandante/fire-contact-2` | Esperem eles chegarem perto! | Let them come close! | ✓ |
|  | `comandante/fire-contact-3` | Fogo só se chegarem em cima! | Fire only if they're on us! | ✓ |
| fire-hold | `comandante/fire-hold-1` | Segurem o fogo! | Hold your fire! | ✓ |
|  | `comandante/fire-hold-2` | Ninguém atira! | No one fires! | ✓ |
|  | `comandante/fire-hold-3` | Cessar fogo! | Cease fire! | ✓ |

## 2. Respostas da seção

| id | tomada | texto | legenda (EN) | |
|---|---|---|---|---|
| move | `soldado/move-ack-1` | Sim, senhor! | Yes, sir! | ✓ |
|  | `soldado/move-ack-2` | Lá vamos nós. | Here we go. | ✓ |
|  | `soldado/move-ack-3` | Indo pra lá! | Heading over! | ✓ |
| advance | `soldado/advance-ack-1` | Avançando! | Advancing! | ✓ |
|  | `soldado/advance-ack-2` | Cobrindo! Vai, vai! | Covering! Go, go! | ✓ |
|  | `soldado/advance-ack-3` | Pra frente, pessoal! | Forward, lads! | ✓ |
| withdraw | `soldado/withdraw-ack-1` | Recuando! | Falling back! | ✓ |
|  | `soldado/withdraw-ack-2` | Pra trás, pessoal! | Back, lads! | ✓ |
|  | `soldado/withdraw-ack-3` | Saindo! | Getting out! | ✓ |
| hold | `soldado/hold-ack-1` | Alto! | Halt! | ✓ |
|  | `soldado/hold-ack-2` | Segurando aqui. | Holding here. | ✓ |
|  | `soldado/hold-ack-3` | Parados, senhor. | Halted, sir. | ✓ |
| attack | `soldado/attack-ack-1` | Fogo! | Fire! | ✓ |
|  | `soldado/attack-ack-2` | Pra cima! | At them! | ✓ |
|  | `soldado/attack-ack-3` | Vendo o alvo! | Target seen! | ✓ |
| suppress | `soldado/suppress-ack-1` | Mantendo o fogo! | Keeping up the fire! | ✓ |
|  | `soldado/suppress-ack-2` | Cabeça baixa neles! | Keeping their heads down! | ✓ |
|  | `soldado/suppress-ack-3` | Fogo contínuo! | Steady fire! | ✓ |
| area-fire | `soldado/area-fire-ack-1` | Atirando no mato! | Firing into the brush! | ✓ |
|  | `soldado/area-fire-ack-2` | Fogo na área! | Fire on the area! | ✓ |
|  | `soldado/area-fire-ack-3` | Gastando bala, senhor! | Spending rounds, sir! | ✓ |
| flank | `soldado/flank-ack-1` | Contornando! | Going round! | ✓ |
|  | `soldado/flank-ack-2` | Pelo lado, vamos! | By the side, let's go! | ✓ |
|  | `soldado/flank-ack-3` | Prendendo eles aqui! | Pinning them here! | ✓ |
| aim | `soldado/aim-ack-1` | Vigiando! | Watching! | ✓ |
|  | `soldado/aim-ack-2` | Olho lá. | Eyes on it. | ✓ |
|  | `soldado/aim-ack-3` | Frente virada, senhor. | Facing round, sir. | ✓ |
| defend | `soldado/defend-ack-1` | Defendendo! | Defending! | ✓ |
|  | `soldado/defend-ack-2` | Ninguém passa! | No one gets through! | ✓ |
|  | `soldado/defend-ack-3` | Tomando abrigo! | Taking cover! | ✓ |
| recon | `soldado/recon-ack-1` | Vou ver. | I'll go see. | ✓ |
|  | `soldado/recon-ack-2` | Já volto com notícia. | Back soon with news. | ✓ |
|  | `soldado/recon-ack-3` | Calado, indo. | Quiet, going. | ✓ |
| enter | `soldado/enter-ack-1` | Entrando! | Going in! | ✓ |
|  | `soldado/enter-ack-2` | Ocupando! | Taking it! | ✓ |
|  | `soldado/enter-ack-3` | Pra dentro, pessoal! | Inside, lads! | ✓ |
| exit | `soldado/exit-ack-1` | Saindo! | Getting out! | ✓ |
|  | `soldado/exit-ack-2` | Pra fora! | Out! | ✓ |
|  | `soldado/exit-ack-3` | Deixando a posição! | Leaving the position! | ✓ |
| assault | `soldado/assault-ack-1` | Avante! | Forward! | ✓ |
|  | `soldado/assault-ack-2` | Pra cima! | At them! | ✓ |
|  | `soldado/assault-ack-3` | Tomando! | Taking it! | ✓ |
| fire-free | `soldado/fire-free-ack-1` | Fogo à vontade! | Fire at will! | ✓ |
|  | `soldado/fire-free-ack-2` | Atirando! | Firing! | ✓ |
|  | `soldado/fire-free-ack-3` | Pode deixar! | Will do! | ✓ |
| fire-economy | `soldado/fire-economy-ack-1` | Poupando bala! | Saving rounds! | ✓ |
|  | `soldado/fire-economy-ack-2` | Só no certo, senhor. | Only sure shots, sir. | ✓ |
|  | `soldado/fire-economy-ack-3` | Esperando eles chegarem! | Waiting for them to come! | ✓ |
| fire-contact | `soldado/fire-contact-ack-1` | Esperando! | Waiting! | ✓ |
|  | `soldado/fire-contact-ack-2` | Quando chegarem, senhor. | When they come, sir. | ✓ |
|  | `soldado/fire-contact-ack-3` | Dedo fora do gatilho. | Finger off the trigger. | ✓ |
| fire-hold | `soldado/fire-hold-ack-1` | Segurando! | Holding! | ✓ |
|  | `soldado/fire-hold-ack-2` | Ninguém atira. | No one fires. | ✓ |
|  | `soldado/fire-hold-ack-3` | Cessar fogo! | Cease fire! | ✓ |

## 3. Avisos dos nossos soldados

| id | tomada | texto | legenda (EN) | |
|---|---|---|---|---|
| contact | `soldado/contact-1` | Inimigo à vista! | Enemy in sight! | ✓ |
|  | `soldado/contact-2` | Lá estão eles! | There they are! | ✓ |
|  | `soldado/contact-3` | Gente ali na frente! | Men up ahead! | ✓ |
| man-down | `soldado/man-down-1` | Homem ferido! | Man down! | ✓ |
|  | `soldado/man-down-2` | Pegaram um dos nossos! | They got one of ours! | ✓ |
|  | `soldado/man-down-3` | Caiu um aqui! | One down here! | ✓ |
| no-ammo | `soldado/no-ammo-1` | Acabou a munição! | Out of ammunition! | ✓ |
|  | `soldado/no-ammo-2` | Tô sem bala! | I'm out of rounds! | ✓ |
|  | `soldado/no-ammo-3` | Cartucho! Alguém tem cartucho? | Cartridges! Anyone got cartridges? | ✓ |
| reloading | `soldado/reloading-1` | Carregando! | Loading! | ✓ |
|  | `soldado/reloading-2` | Remuniciando! | Reloading! | ✓ |
|  | `soldado/reloading-3` | Cobre aí, tô carregando! | Cover me, I'm loading! | ✓ |
| pinned | `soldado/pinned-1` | Não dá pra levantar a cabeça! | Can't raise my head! | ✓ |
|  | `soldado/pinned-2` | Estamos presos aqui! | We're pinned here! | ✓ |
|  | `soldado/pinned-3` | Fogo demais, não dá! | Too much fire, can't do it! | ✓ |
| gun-set | `soldado/gun-set-1` | Metralhadora pronta! | Machine gun ready! | ✓ |
|  | `soldado/gun-set-2` | Peça montada! | Gun set up! | ✓ |
|  | `soldado/gun-set-3` | Pronta pra atirar! | Ready to fire! | ✓ |
| objective | `soldado/objective-1` | Posição tomada! | Position taken! | ✓ |
|  | `soldado/objective-2` | É nossa! | It's ours! | ✓ |
|  | `soldado/objective-3` | Tomamos! | We took it! | ✓ |
| falling-back | `soldado/falling-back-1` | Pra trás, pra trás! | Back, back! | ✓ |
|  | `soldado/falling-back-2` | Não segura mais, recua! | Can't hold, fall back! | ✓ |
|  | `soldado/falling-back-3` | Vamos embora daqui! | Let's get out of here! | ✓ |

## 4a. Xingamentos — Coluna

| id | momento | tomada | texto | legenda (EN) | |
|---|---|---|---|---|---|
| 01 | insult | `xingamento/column/01-1` | Filho da puta! | Son of a bitch! | ✓ |
| 02 | insult | `xingamento/column/02-1` | Vai pra puta que te pariu! | Go to hell, you bastard! | ✓ |
| 03 | insult | `xingamento/column/03-1` | Filho duma égua! | Son of a mare! | ✓ |
| 04 | insult | `xingamento/column/04-1` | Corno manso! | Tame cuckold! | ✓ |
| 05 | fire | `xingamento/column/05-1` | Toma, chifrudo! | Take that, cuckold! | ✓ |
| 06 | flee | `xingamento/column/06-1` | Corre, cagão! | Run, coward! | ✓ |
| 07 | insult | `xingamento/column/07-1` | Cachorro do governo! | Government dog! | ✓ |
| 08 | insult | `xingamento/column/08-1` | Pau-mandado de coronel! | Colonel's lackey! | ✓ |
| 09 | miss | `xingamento/column/09-1` | Porra, errei o desgraçado! | Damn it, missed the bastard! | ✓ |
| 10 | miss | `xingamento/column/10-1` | Merda de espingarda! | Shit rifle! | ✓ |
| 11 | under-fire | `xingamento/column/11-1` | Barbaridade, que tiroteio! | Good grief, what a firefight! | ✓ |
| 12 | miss | `xingamento/column/12-1` | Bah, mas que porcaria! | Bah, what rubbish! | ✓ |
| 14 | insult | `xingamento/column/14-1` | Vai pros quinto dos inferno, desgraçado! | Go to the pits of hell, you bastard! | ✓ |
| 15 | insult | `xingamento/column/15-1` | Mardito seja! | Damn you! | ✓ |
| 16 | insult | `xingamento/column/16-1` | Chimangos! | Chimangos! | ✓ |
|  |  | `xingamento/column/16-2` | Lá vêm os chimangos! | Here come the chimangos! | ✓ |
| 17 | flee | `xingamento/column/17-1` | Corre, provisório! | Run, provisional! | ✓ |
| 18 | under-fire | `xingamento/column/18-1` | Raios e coriscos! | Thunder and lightning! | ✓ |
| 19 | insult | `xingamento/column/19-1` | Canalhas! | Scoundrels! | ✓ |

## 4b. Xingamentos — legalistas

| id | momento | tomada | texto | legenda (EN) | |
|---|---|---|---|---|---|
| 01 | insult | `xingamento/legalist/01-1` | Filho da puta! | Son of a bitch! | ✓ |
| 02 | insult | `xingamento/legalist/02-1` | Bando de filhos da puta! | Pack of sons of bitches! | ✓ |
| 03 | fire | `xingamento/legalist/03-1` | Toma, corno! | Take that, cuckold! | ✓ |
| 04 | under-fire | `xingamento/legalist/04-1` | Puta que pariu, de onde vem esse tiro? | Damn it, where's that fire coming from? | ✓ |
| 05 | insult | `xingamento/legalist/05-1` | Vagabundos! | Bums! | ✓ |
| 06 | insult | `xingamento/legalist/06-1` | Rende, cachorro! | Surrender, dog! | ✓ |
| 07 | fire | `xingamento/legalist/07-1` | Hoje tu morre, desgraçado! | Today you die, bastard! | ✓ |
| 08 | insult | `xingamento/legalist/08-1` | Bando de ladrão de cavalo! | Pack of horse thieves! | ✓ |
| 09 | flee | `xingamento/legalist/09-1` | Foge não, covarde! | Don't run, coward! | ✓ |
| 10 | insult | `xingamento/legalist/10-1` | Cabra safado! | Dirty rogue! | ✓ |
| 11 | insult | `xingamento/legalist/11-1` | Daqui vocês não saem! | You're not getting out of here! | ✓ |
| 12 | insult | `xingamento/legalist/12-1` | Cadê o tal do Prestes? | Where's this Prestes, then? | ✓ |
| 13 | under-fire | `xingamento/legalist/13-1` | Merda, não acaba essa gente! | Shit, there's no end to them! | ✓ |
| 14 | insult | `xingamento/legalist/14-1` | Filho duma égua! | Son of a mare! | ✓ |
| 15 | under-fire | `xingamento/legalist/15-1` | Bah, de onde saiu essa gente? | Bah, where did these men come from? | ✓ |
| 16 | insult | `xingamento/legalist/16-1` | Revoltosos de merda! | Damn rebels! | ✓ |
| 17 | insult | `xingamento/legalist/17-1` | Bandidos! | Bandits! | ✓ |
| 18 | insult | `xingamento/legalist/18-1` | Maragatos de uma figa! | Damned maragatos! | ✓ |

## 4c. Xingamentos — cangaceiros

| id | momento | tomada | texto | legenda (EN) | |
|---|---|---|---|---|---|
| 01 | insult | `xingamento/cangaceiro/01-1` | Fi duma rapariga! | Son of a whore! | ✓ |
| 02 | insult | `xingamento/cangaceiro/02-1` | Filho de uma rapariga! | Son of a whore! | ✓ |
| 03 | insult | `xingamento/cangaceiro/03-1` | Fela da puta! | Son of a bitch! | ✓ |
| 04 | insult | `xingamento/cangaceiro/04-1` | Corno véio! | Old cuckold! | ✓ |
| 05 | insult | `xingamento/cangaceiro/05-1` | Cabra da peste! | Plague of a man! | ✓ |
| 06 | insult | `xingamento/cangaceiro/06-1` | Arreda, cabra frouxo! | Out of the way, weakling! | ✓ |
| 07 | under-fire | `xingamento/cangaceiro/07-1` | Oxente, de onde vem esse tiro? | Hey, where's that fire coming from? | ✓ |
| 08 | under-fire | `xingamento/cangaceiro/08-1` | Vôte, que tiroteio! | Lord, what a firefight! | ✓ |
| 09 | miss | `xingamento/cangaceiro/09-1` | Eita porra, errei! | Damn it, I missed! | ✓ |
| 10 | fire | `xingamento/cangaceiro/10-1` | Vou sangrar tu, desgraçado. | I'll bleed you, bastard. | ✓ |
| 11 | fire | `xingamento/cangaceiro/11-1` | Vou te furar, fi do cão! | I'll stick you, son of the devil! | ✓ |
| 12 | insult | `xingamento/cangaceiro/12-1` | Mizerave! | Wretch! | ✓ |
| 13 | flee | `xingamento/cangaceiro/13-1` | Corre, cabra mole! | Run, soft man! | ✓ |
| 14 | fire | `xingamento/cangaceiro/14-1` | Atira, que o coronel paga! | Shoot, the colonel pays! | ✓ |
| 15 | insult | `xingamento/cangaceiro/15-1` | Peste dos inferno! | Plague from hell! | ✓ |
| 16 | insult | `xingamento/cangaceiro/16-1` | Lá vem os revoltoso! | Here come the rebels! | ✓ |

## 5. Avisos do inimigo

| id | tomada | texto | legenda (EN) | |
|---|---|---|---|---|
| contact | `inimigo/contact-1` | Olha eles ali! | There they are! | ✓ |
|  | `inimigo/contact-2` | Tão lá no mato! | They're in the brush! | ✓ |
|  | `inimigo/contact-3` | Gente na frente, cuidado! | Men ahead, watch out! | ✓ |
| advance | `inimigo/advance-1` | Pra cima deles! | At them! | ✓ |
|  | `inimigo/advance-2` | Avança, cambada! | Advance, you lot! | ✓ |
|  | `inimigo/advance-3` | Cerca pelo lado! | Round them by the side! | ✓ |
| hold | `inimigo/hold-1` | Segura aí! | Hold there! | ✓ |
|  | `inimigo/hold-2` | Ninguém arreda o pé! | Nobody moves a foot! | ✓ |
| man-down | `inimigo/man-down-1` | Me acertaram! | I'm hit! | ✓ |
|  | `inimigo/man-down-2` | Tem homem caído aqui! | Man down here! | ✓ |
| no-ammo | `inimigo/no-ammo-1` | Cadê a munição?! | Where's the ammunition?! | ✓ |
|  | `inimigo/no-ammo-2` | Acabou a bala! | Out of rounds! | ✓ |
| pinned | `inimigo/pinned-1` | Abaixa, abaixa! | Get down, get down! | ✓ |
|  | `inimigo/pinned-2` | Não levanta, que eles atiram! | Stay down, they'll shoot! | ✓ |
| machine-gun | `inimigo/machine-gun-1` | Cuidado, a metralhadora! | Watch out, the machine gun! | ✓ |
|  | `inimigo/machine-gun-2` | Sai da frente dessa máquina! | Get away from that gun! | ✓ |
| falling-back | `inimigo/falling-back-1` | Corre, corre! | Run, run! | ✓ |
|  | `inimigo/falling-back-2` | Debanda, pessoal! | Scatter, lads! | ✓ |
|  | `inimigo/falling-back-3` | Não dá, vamos embora! | It's no good, let's go! | ✓ |
| objective | `inimigo/objective-1` | Tomamos! É nosso! | We took it! It's ours! | ✓ |
|  | `inimigo/objective-2` | Toca eles daqui! | Drive them out! | ✓ |
