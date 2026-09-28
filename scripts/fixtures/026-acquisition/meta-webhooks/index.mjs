// scripts/fixtures/026-acquisition/meta-webhooks/index.mjs — jeux d'essai de meta-webhooks-qa (fiche 026-081, lot 6 de
// juges-026-acquisition-preuve.mjs), écrit par Claude Code. Secret et jeton d'essai (JP-4 du lot : ils n'apparaissent que
// dans ce dossier), corps de webhook Meta signés par HMAC-SHA256 (X-Hub-Signature-256), réponses de profil factices.
//
// Format des corps : au mieux de la documentation publique de Meta au 26/09 [à vérifier le jour de R6, voir 026-090
// §Contexte] — `comments` (Instagram), `feed` (Page Facebook), `messaging` (Messenger / Instagram Direct). Ce format n'est
// PAS encore confirmé par Meta : c'est le juge (donc ce fichier) qui fait foi tant que R6 n'a pas eu lieu ; metaWebhooks.ts
// (026-090) doit lire CE format.
import crypto from 'node:crypto'

export const SECRET = 'SECRET-META-TEMOIN-4b8e'
export const VERIF_TOKEN = 'VERIF-TEMOIN-19c2'

/** La signature X-Hub-Signature-256 (« sha256=<hex> ») d'un corps brut, avec SECRET. */
export const signer = (corpsBrut) => `sha256=${crypto.createHmac('sha256', SECRET).update(corpsBrut).digest('hex')}`

function corps(objet) {
  const brut = Buffer.from(JSON.stringify(objet))
  return { brut, signature: signer(brut), objet }
}

const commentaireInstagram = (id, texte, pseudo = 'artisan_temoin', metaId = 'META-PERSONNE-0001') => corps({
  object: 'instagram',
  entry: [{ id: '17841400000000001', time: 1_760_000_000, changes: [{ field: 'comments', value: { id, text: texte, from: { id: metaId, username: pseudo }, media: { id: 'media-temoin-1' } } }] }],
})
const commentaireFacebook = (id, texte) => corps({
  object: 'page',
  entry: [{ id: 'PAGE-TEMOIN-01', time: 1_760_000_100, changes: [{ field: 'feed', value: { item: 'comment', verb: 'add', comment_id: id, post_id: 'post-temoin-1', message: texte, from: { id: 'META-PERSONNE-0002', name: 'Client Témoin' } } }] }],
})
const messagerie = (mid, texte, { echo = false, senderId = 'META-PERSONNE-0003' } = {}) => corps({
  object: 'instagram',
  entry: [{ id: '17841400000000001', time: 1_760_000_200, messaging: [{ sender: { id: senderId }, recipient: { id: '17841400000000001' }, timestamp: 1_760_000_200, message: { mid, text: texte, ...(echo ? { is_echo: true } : {}) } }] }],
})
const postback = (mid, charge = 'PRISE_DE_CONTACT') => corps({
  object: 'instagram',
  entry: [{ id: '17841400000000001', time: 1_760_000_300, messaging: [{ sender: { id: 'META-PERSONNE-0004' }, recipient: { id: '17841400000000001' }, timestamp: 1_760_000_300, postback: { mid, payload: charge } }] }],
})

export const CORPS = {
  commentaire_site_maj: commentaireInstagram('COM-TEMOIN-0001', 'SITE'),
  commentaire_site_excl: commentaireInstagram('COM-TEMOIN-0002', 'site !'),
  commentaire_site_emoji: commentaireInstagram('COM-TEMOIN-0003', 'Site 🙂'),
  commentaire_pas_aimant: commentaireInstagram('COM-TEMOIN-0004', 'Joli site, bravo'),
  commentaire_sites_pas_chers: commentaireInstagram('COM-TEMOIN-0004B', 'sites web pas chers'),
  commentaire_facebook: commentaireFacebook('COM-TEMOIN-0005', 'SITE'),
  message_recu: messagerie('MSG-TEMOIN-0001', 'Bonjour, un devis pour une salle de bain ?'),
  message_echo: messagerie('MSG-TEMOIN-0002', 'Merci de votre message, nous revenons vite vers vous', { echo: true }),
  postback_amorce: postback('MSG-TEMOIN-0003'),
  message_stop: messagerie('MSG-TEMOIN-0004', 'STOP', { senderId: 'META-PERSONNE-0005' }),
}
// Le même message STOP rejoué : mêmes octets, même id_externe (mid) — sert l'idempotence (MW-6/MW-7).
export const MESSAGE_STOP_REJOUE = CORPS.message_stop

// Un octet changé APRÈS signature (la signature ci-dessous reste celle du corps ORIGINAL) : verifierSignature doit refuser.
const brutModifie = Buffer.from(CORPS.message_recu.brut)
brutModifie[brutModifie.length - 3] ^= 0xff
export const CORPS_MODIFIE = { brut: brutModifie, signature: CORPS.message_recu.signature }

// 300 Ko, signature valide (dépasse la limite de 256 Ko de la route : MW-4).
const gros = { object: 'instagram', entry: [{ id: '17841400000000001', time: 1_760_000_400, changes: [{ field: 'comments', value: { id: 'COM-TEMOIN-GROS', text: 'SITE', from: { id: 'META-PERSONNE-0006', username: 'artisan_temoin' }, media: { id: 'media-temoin-2' }, bourrage: 'x'.repeat(300 * 1024) } }] }] }
export const CORPS_300KO = corps(gros)

export const PROFIL_OK = { pseudo: 'artisan_temoin', suit_le_compte: true, abonnes: 128 }
// Une réponse d'erreur de consentement (Graph API, code 10 : action non autorisée par la personne).
export const PROFIL_ERREUR_CONSENTEMENT = { error: { message: 'This person has not authorized this action.', type: 'OAuthException', code: 10 } }

// Tous les corps signés (pour AC-1 : chaque signature recalculée doit être juste).
export const TOUS_SIGNES = [...Object.values(CORPS), CORPS_300KO]
