// scripts/garde-fou-envoi-qa.mjs — les promesses corrigées le 12/10 (audit des promesses, plans/promesses-2026-10.md),
// jugées HORS LIGNE : aucun appel au modèle (le SDK Anthropic est remplacé par un faux), aucune base, aucun envoi.
//
// Ce qu'on prouve :
//   GF-1  « sans inventer de prix ni de créneau » : un créneau proposé (jour, date, heure) est vu, un jour cité sans
//         engagement ne l'est pas, une négation l'annule, des horaires déclarés l'autorisent ;
//   GF-2  le garde-fou s'applique PROFIL VIDE (il était sauté) : prix et créneau retirés avec leur phrase ;
//   GF-3  la voie « diffusée » du mode automatique (onDelta) ne laisse plus rien partir avant le filtre : le modèle n'est
//         jamais appelé en flux, onDelta reçoit UN fragment, déjà filtré ; la régénération reçoit le rappel nommé ;
//   GF-4  la première réponse automatique (generateLeadReply) et les relances (generateRelanceReply) passent le même
//         filtre et reçoivent la persona de Ma plateforme (vous/tu, formule d'ouverture) ;
//   GF-5  le ton de Ma plateforme fait foi (tonDeReponse) ;
//   GF-6  un mot d'escalade coupe l'assistant AVANT le mode assisté (pas de proposition, pas de crédit) ;
//   GF-7  la mention « écrit par l'assistant » des e-mails partis sans relecture : présente, une seule fois.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/garde-fou-envoi-qa.mjs   (code 1 au premier échec)
process.env.ANTHROPIC_API_KEY ||= 'test-sans-appel'

import Anthropic from '@anthropic-ai/sdk'

// ── Le faux modèle : il rend ce qu'on lui dit, compte les appels, et refuse le flux.
const appels = []
let reponses = []
Anthropic.Messages.prototype.create = async function (params) {
  appels.push(params)
  const texte = reponses.length > 1 ? reponses.shift() : reponses[0]
  return { content: [{ type: 'text', text: texte }] }
}
Anthropic.Messages.prototype.stream = function () { throw new Error('flux interdit : le texte partirait avant le filtre') }

const { detecterCapacitesNonDeclarees, assainirReponse } = await import('../lib/ai/antiFabrication.ts')
const ai = await import('../lib/ai.ts')
const { tonDeReponse, iaDoitRepondre, decisionReponse, CONFIG_DEFAUT } = await import('../lib/plateformeConfig.ts')
const { avecMentionAssistant, mentionAssistant } = await import('../lib/mentionAssistant.ts')

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const creneaux = (t, profil = {}) => detecterCapacitesNonDeclarees(t, profil).filter((h) => h.cle === 'creneau')

console.log('\n── GF-1 créneau inventé')
T('« Je peux passer jeudi à 14 h » est vu', creneaux('Je peux passer jeudi à 14 h.').length === 1)
T('« Je vous propose un rendez-vous le 16 octobre » est vu', creneaux('Je vous propose un rendez-vous le 16 octobre.').length === 1)
T('« Je vous rappelle demain matin » est vu', creneaux('Je vous rappelle demain matin.').length === 1)
T('« Je passe vers 9h30 » est vu', creneaux('Je passe vers 9h30 si ça vous va.').length === 1)
T('« lâché lundi matin » (aucun engagement) n’est pas vu', creneaux('Votre chauffe-eau a lâché lundi matin, c’est bien ça ?').length === 0)
T('« Quel jour vous arrangerait ? » n’est pas vu', creneaux('Quel jour vous arrangerait pour un passage ?').length === 0)
T('négation : « je ne suis pas disponible jeudi matin » n’est pas vu', creneaux('Je ne suis pas disponible jeudi matin.').length === 0)
T('horaires déclarés « de 8 h à 18 h » : autorisé', creneaux('Je suis disponible de 8 h à 18 h.', { horaires: 'du lundi au vendredi de 8 h à 18 h' }).length === 0)
T('même phrase, profil vide : vue', creneaux('Je suis disponible de 8 h à 18 h.').length >= 1)

console.log('\n── GF-2 profil vide : le filtre s’applique')
const fautif = 'Bonjour Paul. Comptez 450 € pour la pose. Je peux passer jeudi à 14 h. Pouvez-vous m’envoyer une photo du chauffe-eau ?'
const r0 = await assainirReponse(fautif, {})
T('prix retiré', !/450/.test(r0.texte), r0.texte)
T('créneau retiré', !/jeudi/i.test(r0.texte), r0.texte)
T('le reste est gardé', /photo/.test(r0.texte) && /Bonjour Paul/.test(r0.texte), r0.texte)
const r1 = await ai.garderAvantEnvoi(fautif, { nom: 'Léa', metier: 'Plombier', ton_style: null })
T('garderAvantEnvoi, profil vide : prix et créneau retirés', !/450|jeudi/i.test(r1) && /photo/.test(r1), r1)

console.log('\n── GF-3 mode automatique : rien ne part avant le filtre')
const artisanVide = { nom: 'Léa', metier: 'Plombier', ton_style: 'direct et efficace' }
appels.length = 0; reponses = [fautif]
const fragments = []
const final = await ai.generateConversationReply(artisanVide, { nom_prospect: 'Paul', message: 'Mon chauffe-eau fuit' }, [{ sens: 'in', contenu: 'Mon chauffe-eau ne chauffe plus' }], 'claude-haiku-5-5', (d) => fragments.push(d), {})
T('onDelta reçoit UN seul fragment', fragments.length === 1, `${fragments.length} fragment(s)`)
T('le fragment est le texte filtré, rendu à l’identique', fragments[0] === final && !/450|jeudi/i.test(fragments[0]), fragments[0])
T('une régénération avec le rappel nommé a été tentée', appels.length === 2 && /ATTENTION/.test(appels[1].system) && /créneau/.test(appels[1].system), `${appels.length} appel(s)`)
appels.length = 0; reponses = ['Bonjour Paul. Pouvez-vous m’envoyer une photo du chauffe-eau ?']
const propre = await ai.generateConversationReply(artisanVide, { nom_prospect: 'Paul', message: 'x' }, [{ sens: 'in', contenu: 'x' }], 'claude-haiku-5-5', () => {}, {})
T('texte propre : un seul appel, texte intact', appels.length === 1 && propre === 'Bonjour Paul. Pouvez-vous m’envoyer une photo du chauffe-eau ?', propre)

console.log('\n── GF-4 première réponse et relances : même filtre, persona appliquée')
const persona = { vouvoiement: false, emojis: false, longueur: 'courte', formule_ouverture: 'Salut et merci pour ton message !' }
appels.length = 0; reponses = [fautif]
const premiere = await ai.generateLeadReply(artisanVide, { nom_prospect: 'Paul', message: 'Mon chauffe-eau ne chauffe plus', contact: 'paul@presti-test.invalid' }, 'claude-sonnet-5', undefined, persona)
T('première réponse : prix et créneau retirés', !/450|jeudi/i.test(premiere), premiere)
T('première réponse : modèle réglé transmis', appels[0]?.model === 'claude-sonnet-5', appels[0]?.model)
T('première réponse : tutoiement et formule d’ouverture dans le cadrage', /TUTOIES/.test(appels[0]?.system ?? '') && /Salut et merci pour ton message/.test(appels[0]?.system ?? ''))
appels.length = 0; reponses = [fautif]
const relance = await ai.generateRelanceReply(artisanVide, { nom_prospect: 'Paul', message: 'Mon chauffe-eau ne chauffe plus' }, 2, undefined, persona)
T('relance : prix et créneau retirés', !/450|jeudi/i.test(relance), relance)
T('relance : tutoiement dans le cadrage', /TUTOIES/.test(appels[0]?.system ?? ''))

console.log('\n── GF-5 le ton de Ma plateforme fait foi')
const ton = tonDeReponse({ ton: 'direct' }, 'Bonjour, merci pour votre demande !')
T('le réglage passe en premier', ton.startsWith('direct et efficace'), ton)
T('le message de l’inscription ne sert que d’exemple', /manière d'écrire seulement/.test(ton) && /merci pour votre demande/.test(ton), ton)
T('sans message d’inscription : le réglage seul', tonDeReponse({ ton: 'sobre' }, null) === 'sobre, factuel et précis')

console.log('\n── GF-6 escalade avant le mode assisté')
const cfgAssistee = { ...CONFIG_DEFAUT, mode_reponse: 'assistee' }
const d1 = iaDoitRepondre(cfgAssistee, { nbReponsesIA: 0, message: 'Grosse fuite sous l’évier !' })
T('Assistée + « fuite » → escalade', !d1.ok && d1.raison === 'escalade', JSON.stringify(d1))
const d2 = decisionReponse({ plan: 'essentiel' }, { prise_en_main: false }, { ...CONFIG_DEFAUT, mode_reponse: 'auto' }, { nbReponsesIA: 0, message: 'urgence, ça fuit' })
T('Essentiel en auto verrouillé + mot d’escalade → silence (rien n’est préparé)', !d2.ok && d2.raison === 'escalade' && d2.comportement === 'silence', JSON.stringify(d2))
const d3 = iaDoitRepondre(cfgAssistee, { nbReponsesIA: 0, message: 'Bonjour, un devis pour une douche ?' })
T('Assistée sans mot d’escalade → assistée (inchangé)', !d3.ok && d3.raison === 'assistee', JSON.stringify(d3))

console.log('\n── GF-7 mention de l’assistant')
const avec = avecMentionAssistant('Bonjour Paul,\n\nJe reviens vers vous.\n\nLéa', 'Léa Plomberie')
T('la mention est en pied', avec.endsWith(mentionAssistant('Léa Plomberie')) && /assistant de Léa Plomberie/.test(avec), avec)
T('jamais deux fois', avecMentionAssistant(avec, 'Léa Plomberie') === avec)
T('sans nom d’artisan : mention neutre', /^Message rédigé et envoyé automatiquement par l’assistant\.$/.test(mentionAssistant(null)), mentionAssistant(null))

console.log(`\n${ko ? '✗' : '✓'} garde-fou des envois : ${ok} vert(s), ${ko} rouge(s)`)
process.exitCode = ko ? 1 : 0
