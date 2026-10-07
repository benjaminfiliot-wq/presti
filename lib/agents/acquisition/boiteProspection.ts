// lib/agents/acquisition/boiteProspection.ts — la boîte Gmail d'où part la prospection (06/10/2026, revu le 07/10).
//
// Deux modes, et rien d'autre :
//   1. une boîte DÉDIÉE : PROSPECTION_GMAIL_USER + PROSPECTION_GMAIL_PASS (+ ACQ_ADRESSE_REPONSE) ;
//   2. « boîte de l'entreprise, fil de prospection seulement » (décision de Benj du 07/10 : « on fait par mon mail mais on ne
//      touche pas à mes mails perso »), activé par PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL=oui (valeur exacte) :
//      - l'envoi part de la boîte de l'entreprise (IMAP_USER, un Gmail), avec un Reply-To « plus » : <local>+presti@<domaine>,
//        DÉRIVÉ de IMAP_USER (jamais écrit en dur) ;
//      - la relève ne cherche QUE les messages adressés à cette adresse « plus » (recherche côté serveur, porteurs/gmail.ts) :
//        un message personnel, adressé à l'adresse ordinaire, n'est jamais ouvert ;
//      - dans ce mode, l'adresse de réponse ET l'adresse relevée sont TOUJOURS l'adresse « plus » : ACQ_ADRESSE_REPONSE n'est
//        prise que si elle vaut exactement cette adresse (une autre valeur ferait relever, ou répondre, hors du fil).
// Sans l'un ou l'autre : null / '' — chaque route reste « en_attente_gmail », rien n'est lu, rien ne part.
//
// 07/10/2026 — INCIDENT : le 06/10, ce module retombait par défaut sur IMAP_USER (le Gmail personnel de Benj) et relevait la
// boîte ENTIÈRE. Ce repli large est SUPPRIMÉ : l'ancienne variable PROSPECTION_AUTORISER_BOITE_ENTREPRISE n'a plus aucun
// effet (et reste interdite). Voir docs/agents/vercel-variables-prospection.md.
// Le mot de passe n'est jamais recopié ni journalisé : il est lu là où il est déjà.
import { boiteEntrepriseResolue } from '@/lib/canaux'

export type BoiteProspection = {
  user: string
  pass: string
  /** L'adresse relevée (seuls les messages qui lui sont adressés sont lus) et écrite comme adresse de réponse. */
  adresse: string
  /** L'adresse « De » des envois. */
  expediteur: string
  /** L'en-tête Reply-To des envois (mode fil seul : l'adresse « plus ») ; null : aucun. */
  repondreA: string | null
  source: 'prospection' | 'entreprise_fil_seul'
}

const GMAIL = /@(gmail|googlemail)\.com$/i
/** L'étiquette de l'adresse « plus » du fil de prospection. */
export const ETIQUETTE_FIL = 'presti'

/** Le mode « fil seul » n'est permis que par la variable explicite posée par Benj, valeur exacte « oui ». */
export function filSeulAutorise(env: Record<string, string | undefined> = process.env): boolean {
  return (env.PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL ?? '').trim().toLowerCase() === 'oui'
}

/** <local>+presti@<domaine>, dérivée d'une adresse Gmail (une étiquette déjà présente est remplacée) ; '' si l'adresse est invalide. */
export function adresseFil(adresse: string): string {
  const m = /^([A-Za-z0-9._-]{1,64})(?:\+[^@\s]*)?@([A-Za-z0-9.-]{1,200})$/.exec(String(adresse ?? '').trim().toLowerCase())
  return m ? `${m[1]}+${ETIQUETTE_FIL}@${m[2]}` : ''
}

export function boiteProspection(env: Record<string, string | undefined> = process.env, entreprise = boiteEntrepriseResolue): BoiteProspection | null {
  const userP = (env.PROSPECTION_GMAIL_USER ?? '').trim()
  const passP = env.PROSPECTION_GMAIL_PASS ?? ''
  const adresseP = (env.ACQ_ADRESSE_REPONSE ?? '').trim()
  if (userP && passP) {
    const adresse = adresseP || userP
    return { user: userP, pass: passP, adresse, expediteur: adresse, repondreA: null, source: 'prospection' }
  }
  // Sans boîte dédiée : rien, sauf le mode « fil seul » autorisé par Benj. La boîte de l'entreprise n'est pas lue avant.
  if (!filSeulAutorise(env)) return null
  const b = entreprise()
  if (!b || !GMAIL.test(b.user) || !/gmail\.com$/i.test(b.hote)) return null
  const fil = adresseFil(b.user)
  if (!fil) return null
  if (adresseP && adresseP.toLowerCase() !== fil) return null
  return { user: b.user, pass: b.pass, adresse: fil, expediteur: b.user, repondreA: fil, source: 'entreprise_fil_seul' }
}

/** L'adresse où les prospects répondent : boîte dédiée → celle posée, sinon la boîte ; fil seul → l'adresse « plus » ; '' sinon. */
export function adresseReponseProspection(env: Record<string, string | undefined> = process.env, entreprise = boiteEntrepriseResolue): string {
  const b = boiteProspection(env, entreprise)
  if (b) return b.adresse
  // Sans boîte (rien ne part, rien n'est relevé) : l'adresse posée seule reste lisible par le rédacteur, comme avant.
  return filSeulAutorise(env) ? '' : (env.ACQ_ADRESSE_REPONSE ?? '').trim()
}
