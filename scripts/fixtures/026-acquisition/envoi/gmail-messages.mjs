// scripts/fixtures/026-acquisition/envoi/gmail-messages.mjs — les messages IMAP témoins du Gmail de prospection (lot 5,
// fiche 026-062), écrit par Claude Code AVANT lib/agents/acquisition/porteurs/gmail.ts (026-089, CLAUDE.md:23). Domaines en
// .invalid ; noms « Témoin ».
//
// Chaque message : { uid, messageId, from, to, cc, subject, date, headers: {..}, texte }. `to`/`cc` disent qui doit LIRE le
// message : `ADRESSE_PROSPECTION` (la boîte de prospection, celle que releverGmail doit relever) ou `AUTRE_ADRESSE` (une autre
// boîte que le même serveur IMAP factice héberge dans le jeu d'essai — releverGmail ne doit JAMAIS l'ouvrir, GM-4).
import { ADRESSE_PROSPECTION } from './commun.mjs'

export const AUTRE_ADRESSE = 'autre.boite.temoin@gmail.invalid'
export const UID_VALIDITY_INITIALE = 1000000001

/** Les messages de l'époque courante (UIDVALIDITY = UID_VALIDITY_INITIALE), UID croissants. */
export const MESSAGES = [
  {
    uid: 101,
    messageId: '<reponse-artisan-1@temoin-menuiserie.invalid>',
    from: 'artisan.temoin@temoin-menuiserie.invalid',
    to: ADRESSE_PROSPECTION,
    subject: 'Re: Réf. TEM001 — votre site internet',
    date: '2026-10-14T09:10:00.000Z',
    headers: {},
    texte: "Bonjour, oui ça m'intéresse, vous pouvez m'appeler. Cordialement, un artisan Témoin.",
  },
  {
    uid: 102,
    messageId: '<stop-1@temoin-plomberie.invalid>',
    from: 'plombier.temoin@temoin-plomberie.invalid',
    to: ADRESSE_PROSPECTION,
    subject: 'STOP',
    date: '2026-10-14T09:12:00.000Z',
    headers: {},
    texte: 'STOP. Ne me recontactez plus.',
  },
  {
    uid: 103,
    messageId: '<accuse-cf7-1@temoin-couverture.invalid>',
    from: 'wordpress@temoin-couverture.invalid',
    to: ADRESSE_PROSPECTION,
    subject: '[Témoin Couverture] Message envoyé',
    date: '2026-10-14T09:13:00.000Z',
    headers: { 'Auto-Submitted': 'no' },
    texte: 'Votre message a bien été envoyé.',
  },
  {
    uid: 104,
    messageId: '<autoreply-1@temoin-electricite.invalid>',
    from: 'contact.temoin@temoin-electricite.invalid',
    to: ADRESSE_PROSPECTION,
    subject: 'Réponse automatique : absence',
    date: '2026-10-14T09:14:00.000Z',
    headers: { 'Auto-Submitted': 'auto-replied' },
    texte: 'Je suis absent jusqu\'au 20/10.',
  },
  {
    // Adressé à l'AUTRE boîte du même serveur factice : ne doit jamais être lu par releverGmail (GM-4).
    uid: 105,
    messageId: '<jamais-lu@temoin-piege.invalid>',
    from: 'piege.temoin@temoin-piege.invalid',
    to: AUTRE_ADRESSE,
    subject: 'Ce message ne doit jamais être ouvert',
    date: '2026-10-14T09:15:00.000Z',
    headers: {},
    texte: 'Si ce texte apparaît dans une sortie du juge, GM-4 est en échec.',
  },
  {
    uid: 106,
    messageId: '<in-reply-1@temoin-charpente.invalid>',
    from: 'charpentier.temoin@temoin-charpente.invalid',
    to: ADRESSE_PROSPECTION,
    subject: 'Re: Réf. TEM002',
    date: '2026-10-14T09:16:00.000Z',
    headers: { 'In-Reply-To': '<envoi-tem002@presti-prospection.invalid>' },
    texte: 'Combien ça coûte ?',
  },
]

/** Un message des 14 derniers jours qu'une reprise après UIDVALIDITY changé doit retrouver, dédoublonné par Message-ID. */
export const MESSAGE_REPRISE = {
  uid: 55,
  messageId: '<reponse-artisan-1@temoin-menuiserie.invalid>', // même Message-ID que uid 101 : la dédoublonne
  from: 'artisan.temoin@temoin-menuiserie.invalid',
  to: ADRESSE_PROSPECTION,
  subject: 'Re: Réf. TEM001 — votre site internet',
  date: '2026-10-08T09:10:00.000Z',
  headers: {},
  texte: "Message repris après changement d'UIDVALIDITY.",
}
export const UID_VALIDITY_NOUVELLE = 1000000002
