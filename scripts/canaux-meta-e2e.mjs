// Test permanent, HORS LIGNE — les canaux Meta de l'artisan (lib/canaux/meta.ts, lib/canaux/rangement.ts).
// Aucun appel réseau, aucune base, aucune clé : les charges utiles sont des fixtures INVENTÉES (scripts/fixtures/meta/), le secret
// de signature est une chaîne de test, le magasin est en mémoire.
// Usage : node scripts/canaux-meta-e2e.mjs
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import {
  verifierSignatureMeta, reponseVerification, lireWebhookMeta, fenetreOuverte, requeteEnvoiMeta, texteSortant, idEnvoye,
  lireErreurMeta, messageErreurMeta, requeteVerificationLiaison, lireVerificationLiaison, requeteAbonnement, requeteEchangeJetonLong,
  lireJetonPage, requeteProfil, lireNomProfil, LONGUEUR_MAX,
} from '../lib/canaux/meta.ts'
import { rangerEntrantMeta, statutApresEntrant } from '../lib/canaux/rangement.ts'

let ok = 0, ko = 0
const T = (nom, cond, detail = '') => { if (cond) { ok++; console.log(`  ✅ ${nom}`) } else { ko++; console.log(`  ❌ ${nom}${detail ? ` — ${detail}` : ''}`) } }
const fixture = (n) => readFileSync(new URL(`./fixtures/meta/${n}`, import.meta.url), 'utf8')
const SECRET = 'secret-de-test-hors-ligne'
const signer = (corps, s = SECRET) => 'sha256=' + crypto.createHmac('sha256', s).update(corps).digest('hex')
const MAINTENANT = Date.parse('2026-10-12T09:30:00Z')

console.log('\n── 1. Signature X-Hub-Signature-256')
const brutWa = fixture('whatsapp-messages.json')
const octets = new TextEncoder().encode(brutWa)
T('signature valide acceptée (octets)', verifierSignatureMeta(octets, signer(brutWa), SECRET))
T('signature valide acceptée (chaîne)', verifierSignatureMeta(brutWa, signer(brutWa), SECRET))
T('en-tête en majuscules accepté', verifierSignatureMeta(octets, signer(brutWa).toUpperCase().replace('SHA256=', 'sha256='), SECRET))
T('corps modifié d’un octet refusé', !verifierSignatureMeta(brutWa.replace('fuite', 'fuitE'), signer(brutWa), SECRET))
T('autre secret refusé', !verifierSignatureMeta(octets, signer(brutWa, 'autre-secret'), SECRET))
T('en-tête absent refusé', !verifierSignatureMeta(octets, null, SECRET))
T('préfixe sha1 refusé', !verifierSignatureMeta(octets, signer(brutWa).replace('sha256=', 'sha1='), SECRET))
T('hexadécimal tronqué refusé', !verifierSignatureMeta(octets, signer(brutWa).slice(0, 40), SECRET))
T('secret vide refusé (jamais « tout passe »)', !verifierSignatureMeta(octets, signer(brutWa, ''), ''))
T('JSON re-sérialisé (espaces changés) refusé : on signe le BRUT', !verifierSignatureMeta(JSON.stringify(JSON.parse(brutWa)), signer(brutWa), SECRET))

console.log('\n── 2. Vérification d’abonnement (GET)')
const p = (o) => new URLSearchParams(o)
T('bon jeton → défi rendu', reponseVerification(p({ 'hub.mode': 'subscribe', 'hub.verify_token': 'jeton-test', 'hub.challenge': '1158201444' }), 'jeton-test') === '1158201444')
T('mauvais jeton → null', reponseVerification(p({ 'hub.mode': 'subscribe', 'hub.verify_token': 'x', 'hub.challenge': '1' }), 'jeton-test') === null)
T('mode ≠ subscribe → null', reponseVerification(p({ 'hub.mode': 'unsubscribe', 'hub.verify_token': 'jeton-test', 'hub.challenge': '1' }), 'jeton-test') === null)
T('jeton non configuré → null', reponseVerification(p({ 'hub.mode': 'subscribe', 'hub.verify_token': '', 'hub.challenge': '1' }), '') === null)
T('défi avec balise refusé (pas de réflexion HTML)', reponseVerification(p({ 'hub.mode': 'subscribe', 'hub.verify_token': 'jeton-test', 'hub.challenge': '<script>' }), 'jeton-test') === null)

console.log('\n── 3. Lecture des trois charges utiles')
const wa = lireWebhookMeta(JSON.parse(brutWa), MAINTENANT)
T('WhatsApp : 2 messages (texte + photo ; réaction et statut ignorés)', wa.length === 2, JSON.stringify(wa.map((x) => x.id_message)))
T('WhatsApp : compte = phone_number_id', wa[0]?.compte === '200000000000001')
T('WhatsApp : expéditeur = wa_id, nom du profil', wa[0]?.expediteur === '33600000001' && wa[0]?.nom === 'Client Fictif')
T('WhatsApp : texte intact (accents, apostrophe)', wa[0]?.texte === "Bonjour, j'ai une fuite sous l'évier, vous pouvez passer cette semaine ?")
T('WhatsApp : horodatage en secondes → ISO', wa[0]?.recu_le === new Date(1791789240 * 1000).toISOString())
T('WhatsApp : photo = libellé + légende, pièce jointe', wa[1]?.texte === '[photo] la fuite' && wa[1]?.piece_jointe === true)

const ms = lireWebhookMeta(JSON.parse(fixture('messenger-messages.json')), MAINTENANT)
T('Messenger : 2 messages (écho et accusé de lecture ignorés)', ms.length === 2, JSON.stringify(ms.map((x) => x.id_message)))
T('Messenger : compte = id de Page, expéditeur = PSID', ms[0]?.canal === 'messenger' && ms[0]?.compte === '300000000000001' && ms[0]?.expediteur === '4000000000000001')
T('Messenger : horodatage en millisecondes', ms[0]?.recu_le === new Date(1791789300000).toISOString())
T('Messenger : pièce jointe sans texte → « [pièce jointe] »', ms[1]?.texte === '[pièce jointe]' && ms[1]?.piece_jointe === true)

const ig = lireWebhookMeta(JSON.parse(fixture('instagram-messages.json')), MAINTENANT)
T('Instagram : 1 message (message supprimé ignoré)', ig.length === 1)
T('Instagram : canal, compte IG, IGSID', ig[0]?.canal === 'instagram' && ig[0]?.compte === '17800000000000001' && ig[0]?.expediteur === '5000000000000001')

T('corps inconnu → []', lireWebhookMeta({ object: 'user', entry: [] }).length === 0)
T('corps illisible → [] sans exception', lireWebhookMeta('{"object":').length === 0 && lireWebhookMeta(null).length === 0 && lireWebhookMeta({ object: 'page', entry: 'x' }).length === 0)
T('identifiant avec caractères interdits ignoré', lireWebhookMeta({ object: 'page', entry: [{ id: '3<script>', messaging: [{ sender: { id: '4' }, message: { mid: 'm_1', text: 'x' } }] }] }).length === 0)

console.log('\n── 4. Idempotence (magasin en mémoire)')
// `sansVerrou` : le témoin — trouver puis créer sans verrou, avec la latence d'un aller-retour réseau entre les deux. C'est ce que
// faisait la première version (deux requêtes PostgREST) ; la base fait désormais les deux sous verrou (canaux_conversation_ouvrir).
const latence = () => new Promise((r) => setTimeout(r, 2))
function magasinMemoire({ casserAjoutUneFois = false, sansVerrou = false } = {}) {
  const marques = new Set(), leads = new Map(), messages = [], verrous = new Map()
  let casse = casserAjoutUneFois, n = 0
  const sousVerrou = (cle, f) => {
    if (sansVerrou) return f()
    const suite = (verrous.get(cle) ?? Promise.resolve()).then(f, f)
    verrous.set(cle, suite.catch(() => {}))
    return suite
  }
  const liaisons = { 'whatsapp:200000000000001': { id: 'canal-wa', artisan_id: 'artisan-A', type: 'whatsapp', actif: true }, 'messenger:300000000000001': { id: 'canal-fb', artisan_id: 'artisan-A', type: 'messenger', actif: true } }
  return {
    marques, leads, messages,
    async liaison(type, id) { return liaisons[`${type}:${id}`] ?? null },
    async marquer(c, id) { await null; const k = `${c}|${id}`; if (marques.has(k)) return false; marques.add(k); return true },
    async oublier(c, id) { marques.delete(`${c}|${id}`) },
    ouvrirConversation(l) {
      return sousVerrou(`${l.artisan_id}:${l.canal}:${l.canal_externe_id}`, async () => {
        for (const [id, x] of leads) if (x.artisan_id === l.artisan_id && x.canal === l.canal && x.canal_externe_id === l.canal_externe_id) return { id, statut: x.statut, nouveau: false }
        await latence()
        const id = `lead-${++n}`
        leads.set(id, { ...l, statut: 'nouveau' })
        return { id, statut: 'nouveau', nouveau: true }
      })
    },
    async rafraichir(id, champs) { Object.assign(leads.get(id), champs) },
    async ajouterMessage(m) { if (casse) { casse = false; throw new Error('panne simulée') } messages.push(m); return `msg-${messages.length}` },
  }
}
const m1 = magasinMemoire()
const premiere = await Promise.all(wa.map((e) => rangerEntrantMeta(e, m1, MAINTENANT)))
const rejeu = await Promise.all(wa.map((e) => rangerEntrantMeta(e, m1, MAINTENANT)))
T('première livraison : 2 messages rangés', premiere.filter((r) => r.etat === 'range').length === 2 && m1.messages.length === 2)
T('rejeu de Meta : 0 message de plus, 2 doublons', rejeu.every((r) => r.etat === 'doublon') && m1.messages.length === 2)
T('deux messages simultanés d’un NOUVEAU client → un seul fil', m1.leads.size === 1, `${m1.leads.size} fils`)
const temoin = magasinMemoire({ sansVerrou: true })
await Promise.all(wa.map((e) => rangerEntrantMeta(e, temoin, MAINTENANT)))
T('témoin sans verrou : la course ouvre bien deux fils (le test sait voir le défaut)', temoin.leads.size === 2, `${temoin.leads.size} fils`)
T('contact WhatsApp = numéro, nom du profil', [...m1.leads.values()][0]?.contact === '+33600000001' && [...m1.leads.values()][0]?.nom_prospect === 'Client Fictif')

const m2 = magasinMemoire()
const course = await Promise.all([rangerEntrantMeta(ms[0], m2, MAINTENANT), rangerEntrantMeta(ms[0], m2, MAINTENANT), rangerEntrantMeta(ms[0], m2, MAINTENANT)])
T('trois livraisons simultanées du même message → 1 rangé, 2 doublons', course.filter((r) => r.etat === 'range').length === 1 && m2.messages.length === 1)
T('Messenger sans nom : nom provisoire, contact vide', [...m2.leads.values()][0]?.nom_prospect === 'Client Messenger' && [...m2.leads.values()][0]?.contact === null)

const m3 = magasinMemoire({ casserAjoutUneFois: true })
let leve = false
try { await rangerEntrantMeta(wa[0], m3, MAINTENANT) } catch { leve = true }
const apres = await rangerEntrantMeta(wa[0], m3, MAINTENANT)
T('panne après la marque : l’erreur remonte (la route répond 500)', leve)
T('… la marque est retirée : le rejeu range le message (rien de perdu)', apres.etat === 'range' && m3.messages.length === 1)

T('compte inconnu → « inconnu », rien rangé', (await rangerEntrantMeta(ig[0], magasinMemoire(), MAINTENANT)).etat === 'inconnu')
T('statut : repondu → en_discussion ; gagné inchangé', statutApresEntrant('repondu') === 'en_discussion' && statutApresEntrant('gagne') === undefined)

console.log('\n── 5. Fenêtre de 24 h')
const il = (h) => new Date(MAINTENANT - h * 3600_000).toISOString()
T('message d’il y a 2 h → ouverte', fenetreOuverte(il(2), MAINTENANT))
T('message d’il y a 23 h 50 → encore ouverte (sous 23 h 55)',fenetreOuverte(il(23 + 50 / 60), MAINTENANT))
T('message d’il y a 23 h 58 → fermée (marge)', !fenetreOuverte(il(23 + 58 / 60), MAINTENANT))
T('message d’il y a 25 h → fermée', !fenetreOuverte(il(25), MAINTENANT))
T('pas de date → fermée (on n’envoie pas au hasard)', !fenetreOuverte(null, MAINTENANT))

console.log('\n── 6. Requêtes d’envoi')
const rWa = requeteEnvoiMeta({ canal: 'whatsapp', compte: '200000000000001', jeton: 'JETON-FICTIF-0123456789' }, '33600000001', 'Bonjour, **demain 9 h** ?', 'v26.0')
const corpsWa = rWa.init ? JSON.parse(rWa.init.body) : {}
T('WhatsApp : POST /{phone_number_id}/messages', rWa.url === 'https://graph.facebook.com/v26.0/200000000000001/messages' && rWa.init.method === 'POST')
T('WhatsApp : corps messaging_product/to/type/text', corpsWa.messaging_product === 'whatsapp' && corpsWa.to === '33600000001' && corpsWa.type === 'text' && corpsWa.text.preview_url === false)
T('WhatsApp : gras Markdown converti en *gras*', corpsWa.text?.body === 'Bonjour, *demain 9 h* ?')
T('jeton dans l’en-tête, jamais dans l’adresse', rWa.init.headers.authorization === 'Bearer JETON-FICTIF-0123456789' && !rWa.url.includes('JETON'))
const rFb = requeteEnvoiMeta({ canal: 'messenger', compte: '300000000000001', jeton: 'JETON-PAGE-FICTIF-012345' }, '4000000000000001', 'Bonjour **Paul**')
const corpsFb = JSON.parse(rFb.init.body)
T('Messenger : POST /me/messages, RESPONSE, gras retiré', rFb.url.endsWith('/me/messages') && corpsFb.messaging_type === 'RESPONSE' && corpsFb.recipient.id === '4000000000000001' && corpsFb.message.text === 'Bonjour Paul')
const rIg = requeteEnvoiMeta({ canal: 'instagram', compte: '17800000000000001', jeton: 'JETON-IG-FICTIF-0123456', hote: 'graph.instagram.com' }, '5000000000000001', 'Merci !')
T('Instagram Login : graph.instagram.com/…/me/messages', rIg.url === 'https://graph.instagram.com/v26.0/me/messages')
T('Instagram par la Page : graph.facebook.com', requeteEnvoiMeta({ canal: 'instagram', compte: '1', jeton: 'x'.repeat(20) }, '5', 'ok').url.startsWith('https://graph.facebook.com/'))
T('trop long pour Instagram → refus, pas de coupe en douce', 'erreur' in requeteEnvoiMeta({ canal: 'instagram', compte: '1', jeton: 'x'.repeat(20) }, '5', 'a'.repeat(LONGUEUR_MAX.instagram + 1)))
T('jeton illisible → refus', 'erreur' in requeteEnvoiMeta({ canal: 'whatsapp', compte: '1', jeton: '' }, '336', 'x'))
T('version invalide → version par défaut', requeteEnvoiMeta({ canal: 'whatsapp', compte: '200000000000001', jeton: 'x'.repeat(20) }, '33600000001', 'x', '../../evil').url.includes('/v26.0/'))
T('texte vide → refus', 'erreur' in requeteEnvoiMeta({ canal: 'messenger', compte: '1', jeton: 'x'.repeat(20) }, '4', '   '))
T('texteSortant : lignes vides tassées', texteSortant('messenger', 'a\n\n\n\nb') === 'a\n\nb')
T('id envoyé lu (WhatsApp / Messenger)', idEnvoye({ messages: [{ id: 'wamid.SORTANT' }] }) === 'wamid.SORTANT' && idEnvoye({ recipient_id: '4', message_id: 'm_SORTANT' }) === 'm_SORTANT')

console.log('\n── 7. Erreurs de la Graph API')
T('WhatsApp 131047 → hors fenêtre', lireErreurMeta({ error: { code: 131047 } }).genre === 'hors_fenetre')
T('Messenger 10/2018278 → hors fenêtre', lireErreurMeta({ error: { code: 10, error_subcode: 2018278 } }).genre === 'hors_fenetre')
T('Instagram 10/2534022 → hors fenêtre', lireErreurMeta({ error: { code: 10, error_subcode: 2534022 } }).genre === 'hors_fenetre')
T('190 → jeton', lireErreurMeta({ error: { code: 190 } }).genre === 'jeton')
T('613 → débit', lireErreurMeta({ error: { code: 613 } }).genre === 'debit')
T('corps vide → autre', lireErreurMeta(null).genre === 'autre')
const msgHf = messageErreurMeta('whatsapp', { genre: 'hors_fenetre', code: 131047, sous_code: null })
T('message hors fenêtre WhatsApp : « modèle » et « rien n’est parti »', /modèle/.test(msgHf) && /Rien n’est parti/.test(msgHf))

console.log('\n── 8. Connexion d’un compte')
const vWa = requeteVerificationLiaison({ canal: 'whatsapp', compte: '200000000000001', jeton: 'x'.repeat(20) }, 'v26.0')
T('vérif WhatsApp : GET /{id}?fields=display_phone_number', vWa.init.method === 'GET' && vWa.url.includes('/200000000000001?fields=display_phone_number'))
T('vérif WhatsApp lue', lireVerificationLiaison('whatsapp', '200000000000001', { display_phone_number: '+33 1 00 00 00 00', verified_name: 'Atelier Fictif', id: '200000000000001' }).externe_id === '200000000000001')
T('vérif Messenger : jeton d’une AUTRE Page refusé (anti-détournement)', 'erreur' in lireVerificationLiaison('messenger', '300000000000001', { id: '399999999999999', name: 'Autre Page' }))
T('vérif Messenger : bonne Page acceptée', lireVerificationLiaison('messenger', '300000000000001', { id: '300000000000001', name: 'Atelier Fictif' }).page_id === '300000000000001')
const vIg = lireVerificationLiaison('instagram', '300000000000001', { id: '300000000000001', instagram_business_account: { id: '17800000000000001', username: 'atelier.fictif' } }, 'graph.facebook.com')
T('vérif Instagram par la Page : id IG tiré de la Page', vIg.externe_id === '17800000000000001' && vIg.libelle === '@atelier.fictif' && vIg.page_id === '300000000000001')
T('vérif Instagram : Page sans compte IG → refus clair', 'erreur' in lireVerificationLiaison('instagram', '300000000000001', { id: '300000000000001' }, 'graph.facebook.com'))
T('erreur Graph à la vérification → refus', 'erreur' in lireVerificationLiaison('whatsapp', '2', { error: { code: 190 } }))
T('abonnement WhatsApp : POST /{waba}/subscribed_apps', requeteAbonnement({ canal: 'whatsapp', jeton: 'x'.repeat(20), waba_id: '100000000000001' }).url.endsWith('/100000000000001/subscribed_apps'))
T('abonnement Page : subscribed_fields=messages', requeteAbonnement({ canal: 'messenger', jeton: 'x'.repeat(20), page_id: '300000000000001' }).url.endsWith('/300000000000001/subscribed_apps?subscribed_fields=messages'))
T('abonnement WhatsApp sans WABA → refus', 'erreur' in requeteAbonnement({ canal: 'whatsapp', jeton: 'x'.repeat(20) }))
const ech = requeteEchangeJetonLong('JETON-UTILISATEUR-FICTIF', '123456789012345', 'secret-app-fictif')
T('échange de jeton long : secret dans le CORPS, pas dans l’adresse', ech.init.method === 'POST' && !ech.url.includes('secret') && ech.init.body.includes('client_secret=secret-app-fictif') && ech.init.body.includes('grant_type=fb_exchange_token'))
T('jeton de Page lu seulement pour la bonne Page', lireJetonPage('300000000000001', { id: '300000000000001', access_token: 'P'.repeat(30) }) === 'P'.repeat(30) && lireJetonPage('300000000000001', { id: '9', access_token: 'P'.repeat(30) }) === null)
T('profil Messenger : first_name,last_name', requeteProfil({ canal: 'messenger', compte: '3', jeton: 'x'.repeat(20) }, '4000000000000001').url.endsWith('/4000000000000001?fields=first_name,last_name'))
T('profil : nom lu', lireNomProfil({ first_name: 'Paul', last_name: 'Fictif' }) === 'Paul Fictif' && lireNomProfil({ username: 'p.fictif' }) === '@p.fictif')
T('profil WhatsApp : pas de lecture (le nom est dans le webhook)', requeteProfil({ canal: 'whatsapp', compte: '2', jeton: 'x'.repeat(20) }, '336') === null)

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} en échec`)
process.exitCode = ko === 0 ? 0 : 1
