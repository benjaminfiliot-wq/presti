import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { DUREES_MOIS } from '@/lib/legalArtisan'

// Purges RGPD — appliquer les durées que les pages légales annoncent (audit final, auditeur B,
// majeur C6).
//
// Le défaut : `lib/legalArtisan.ts` et la politique de confidentialité promettaient douze mois
// pour les données anti-abus et trois ans pour les conversations sans suite, et AUCUNE ligne de
// code ne les appliquait. Les empreintes d'IP de 2024, les fils morts, les jetons expirés depuis
// des mois restaient en base pour toujours. C'était l'écart le plus facile à démontrer entre le
// document et la machine (RGPD art. 5.1 e, art. 13.2 a).
//
// Ce que ce module purge, et rien d'autre :
//  · `ip_abus` et `ip_bans` expirés au-delà de DUREES_MOIS.anti_abus ;
//  · les empreintes d'IP portées par `leads.ip` et `devis.accepte_ip` au-delà de la même durée —
//    mises à NULL, la ligne reste : un devis sans son IP d'acceptation reste un devis, un devis
//    supprimé serait une pièce du dossier en moins ;
//  · les conversations (`leads`, et par cascade `messages` et `relances`) sans échange depuis
//    DUREES_MOIS.conversation ET sans devis rattaché ;
//  · les jetons `password_resets`, `clients_sessions`, `clients_liens` expirés depuis une semaine.
//
// Ce que ce module NE TOUCHE JAMAIS :
//  · `factures` et `factures_lignes` — dix ans (art. L. 102 B du LPF), et le trigger
//    `factures_conservees` (0041) refuserait de toute façon ;
//  · une conversation qui porte un devis : le devis peut avoir été facturé, et un fil dont la
//    facture cite l'objet ne doit pas s'évaporer sous la pièce comptable. Le critère est
//    volontairement large (TOUT devis rattaché, même brouillon) : mieux vaut garder un fil de
//    trop que couper le contexte d'une facture.
//
// Deux exigences d'exploitation, tenues partout ici :
//  · BORNÉ. Chaque purge lit au plus `PLAFOND_LIGNES` clés (les plus vieilles d'abord) puis
//    supprime par lots de `LOT` : le cron quotidien ne peut pas expirer sur un rattrapage, et
//    une erreur de filtre ne peut pas vider une table d'un coup. `reste: true` dit qu'un plafond
//    a été atteint — le lendemain reprendra où on s'est arrêté.
//  · JAMAIS BLOQUANT. Une table absente (migration pas encore posée en production) est ignorée ;
//    une erreur est collectée dans `erreurs` et rendue à l'appelant, qui la trace dans
//    `passages_cron`. Les relances du même cron continuent de partir.

/** Lignes lues (donc au plus supprimées) par table et par passage. */
export const PLAFOND_LIGNES = 500

/** Conversations effacées par passage — plus bas : chaque suppression cascade sur les messages. */
export const PLAFOND_CONVERSATIONS = 100

/** Taille d'un lot d'identifiants dans un `in(...)` : PostgREST met les filtres dans l'URL. */
const LOT = 50

/**
 * Délai après expiration avant d'effacer un jeton. Une semaine suffit à comprendre une
 * réinitialisation suspecte ou une session volée ; au-delà, garder l'empreinte et l'IP d'un
 * jeton mort ne sert plus aucune finalité.
 */
export const JOURS_GRACE_JETONS = 7

export type BilanPurges = {
  /** Journal d'abus au-delà de douze mois. */
  ip_abus: number
  /** Bannissements dont l'expiration date de plus de douze mois (les permanents restent). */
  ip_bans: number
  /** Empreintes d'IP remises à NULL sur `leads`. */
  leads_ip: number
  /** Empreintes d'IP remises à NULL sur `devis`. */
  devis_ip: number
  /** Conversations effacées (avec leurs messages, par cascade). */
  conversations: number
  /** Jetons expirés effacés, toutes tables confondues. */
  jetons: number
  /** Vrai si un plafond a été atteint : il reste des lignes à purger au prochain passage. */
  reste: boolean
  erreurs: string[]
}

/** Horodatage d'il y a `mois` mois. Une seule fonction pour que toutes les purges datent pareil. */
export function seuilMois(mois: number, depuis: Date = new Date()): string {
  const d = new Date(depuis.getTime())
  d.setUTCMonth(d.getUTCMonth() - mois)
  return d.toISOString()
}

/** Horodatage d'il y a `jours` jours. */
export function seuilJours(jours: number, depuis: Date = new Date()): string {
  return new Date(depuis.getTime() - jours * 86400000).toISOString()
}

/**
 * Une table qui n'existe pas encore n'est pas une erreur de purge : la production peut tourner
 * une migration en retard, et le cron ne doit pas alerter pour ça.
 */
const tableAbsente = (message: string) => /does not exist|schema cache|could not find the table/i.test(message)

function parLots<T>(elements: T[], taille = LOT): T[][] {
  const lots: T[][] = []
  for (let i = 0; i < elements.length; i += taille) lots.push(elements.slice(i, i + taille))
  return lots
}

/** Extrait une colonne texte d'un jeu de lignes non typées (PostgREST rend du `any`). */
function colonneTexte(lignes: unknown[] | null, cle: string): string[] {
  return (lignes ?? [])
    .map((l) => (l as Record<string, unknown>)[cle])
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
}

type Resultat = { n: number; plein: boolean; erreur?: string }

/**
 * Supprime les lignes les plus anciennes d'une table, en deux temps : PostgREST ne sait pas
 * limiter un DELETE, donc on lit d'abord au plus `plafond` clés triées par date, puis on
 * supprime exactement celles-là. C'est aussi ce qui rend la purge bornée et rejouable.
 *
 * `colonneDate` étant filtrée par `lt`, les lignes dont cette colonne est NULL sont
 * naturellement épargnées — c'est voulu pour `ip_bans.expires_le` (ban permanent).
 */
async function supprimerAnciennes(
  table: string, cle: string, colonneDate: string, avant: string, plafond: number,
): Promise<Resultat> {
  const { data, error } = await supabaseAdmin
    .from(table).select(cle)
    .lt(colonneDate, avant)
    .order(colonneDate, { ascending: true })
    .limit(plafond)
  if (error) return { n: 0, plein: false, erreur: tableAbsente(error.message) ? undefined : `${table} (lecture) : ${error.message}` }

  const cles = colonneTexte(data, cle)
  let n = 0
  for (const lot of parLots(cles)) {
    const { error: eSup } = await supabaseAdmin.from(table).delete().in(cle, lot)
    if (eSup) return { n, plein: false, erreur: `${table} (suppression) : ${eSup.message}` }
    n += lot.length
  }
  return { n, plein: cles.length >= plafond }
}

/**
 * Remet à NULL une empreinte d'IP devenue trop vieille, sans toucher au reste de la ligne.
 * Supprimer la ligne serait disproportionné : un lead est la demande d'un client, un devis est
 * une pièce du dossier. C'est l'IP, et elle seule, qui a une durée de douze mois.
 */
async function effacerEmpreintesIp(
  table: string, colonneIp: string, colonneDate: string, avant: string, plafond: number,
): Promise<Resultat> {
  const { data, error } = await supabaseAdmin
    .from(table).select('id')
    .lt(colonneDate, avant)
    .not(colonneIp, 'is', null)
    .order(colonneDate, { ascending: true })
    .limit(plafond)
  if (error) return { n: 0, plein: false, erreur: tableAbsente(error.message) ? undefined : `${table}.${colonneIp} (lecture) : ${error.message}` }

  const ids = colonneTexte(data, 'id')
  let n = 0
  for (const lot of parLots(ids)) {
    const { error: eMaj } = await supabaseAdmin.from(table).update({ [colonneIp]: null }).in('id', lot)
    if (eMaj) return { n, plein: false, erreur: `${table}.${colonneIp} (écriture) : ${eMaj.message}` }
    n += lot.length
  }
  return { n, plein: ids.length >= plafond }
}

/**
 * Conversations sans suite : trois ans sans le moindre message, et aucun devis rattaché.
 *
 * L'ordre des filtres compte. On part des fils créés avant le seuil (un fil né il y a un an ne
 * peut pas avoir trois ans de silence), puis on écarte ceux qui ont échangé depuis, puis ceux
 * qui portent un devis — donc, indirectement, ceux qu'une facture cite, puisqu'une facture
 * naît d'un devis rattaché au fil. Ce qui reste est un fil mort sans pièce comptable derrière.
 *
 * La suppression du lead emporte `messages` et `relances` par cascade (0010) ; `devis.lead_id`
 * est `on delete set null`, mais aucun fil porteur de devis n'arrive jusqu'ici.
 */
export async function purgerConversationsSansSuite(
  avant: string, plafond: number = PLAFOND_CONVERSATIONS,
): Promise<Resultat> {
  const { data: candidats, error } = await supabaseAdmin
    .from('leads').select('id')
    .lt('created_at', avant)
    .order('created_at', { ascending: true })
    .limit(plafond)
  if (error) return { n: 0, plein: false, erreur: tableAbsente(error.message) ? undefined : `leads (lecture) : ${error.message}` }

  const ids = colonneTexte(candidats, 'id')
  if (!ids.length) return { n: 0, plein: false }

  // À garder : un échange postérieur au seuil, ou un devis rattaché (même brouillon).
  const garder = new Set<string>()
  for (const lot of parLots(ids)) {
    const { data: recents, error: eM } = await supabaseAdmin
      .from('messages').select('lead_id').in('lead_id', lot).gte('sent_at', avant)
    if (eM) return { n: 0, plein: false, erreur: `messages (lecture) : ${eM.message}` }
    for (const id of colonneTexte(recents, 'lead_id')) garder.add(id)

    const { data: devis, error: eD } = await supabaseAdmin
      .from('devis').select('lead_id').in('lead_id', lot)
    if (eD) return { n: 0, plein: false, erreur: `devis (lecture) : ${eD.message}` }
    for (const id of colonneTexte(devis, 'lead_id')) garder.add(id)
  }

  const aEffacer = ids.filter((id) => !garder.has(id))
  let n = 0
  for (const lot of parLots(aEffacer)) {
    const { error: eSup } = await supabaseAdmin.from('leads').delete().in('id', lot)
    if (eSup) return { n, plein: false, erreur: `leads (suppression) : ${eSup.message}` }
    n += lot.length
  }
  // Le plafond porte sur les CANDIDATS lus : s'il est plein, il reste des fils vieux à examiner
  // demain, même si aucun n'a été effacé aujourd'hui.
  return { n, plein: ids.length >= plafond }
}

/**
 * Le passage quotidien. Rendu à l'appelant (le cron des relances) qui le trace dans
 * `passages_cron` ; ne jette jamais, ne fait jamais échouer ce qui l'entoure.
 */
export async function purgerRgpd(maintenant: Date = new Date()): Promise<BilanPurges> {
  const seuilAbus = seuilMois(DUREES_MOIS.anti_abus, maintenant)
  const seuilConversation = seuilMois(DUREES_MOIS.conversation, maintenant)
  const seuilJetons = seuilJours(JOURS_GRACE_JETONS, maintenant)

  const bilan: BilanPurges = {
    ip_abus: 0, ip_bans: 0, leads_ip: 0, devis_ip: 0, conversations: 0, jetons: 0,
    reste: false, erreurs: [],
  }
  const noter = (r: Resultat): number => {
    if (r.erreur) bilan.erreurs.push(r.erreur)
    if (r.plein) bilan.reste = true
    return r.n
  }

  // 1. Anti-abus (douze mois). Le journal d'abus part sur son horodatage ; un bannissement part
  //    quand son EXPIRATION a plus de douze mois. Un ban permanent (`expires_le` NULL) reste :
  //    ce n'est pas un historique, c'est une mesure de sécurité encore active — l'effacer
  //    rouvrirait la porte à l'adresse bannie.
  bilan.ip_abus = noter(await supprimerAnciennes('ip_abus', 'id', 'at', seuilAbus, PLAFOND_LIGNES))
  bilan.ip_bans = noter(await supprimerAnciennes('ip_bans', 'ip', 'expires_le', seuilAbus, PLAFOND_LIGNES))

  // 2. Empreintes d'IP dans les tables métier (douze mois aussi) : la ligne reste, l'IP part.
  //    `devis` se date sur `accepte_le` et non sur `created_at` : les douze mois courent depuis
  //    l'acceptation, moment où l'empreinte a été écrite (0033 les écrit ensemble).
  bilan.leads_ip = noter(await effacerEmpreintesIp('leads', 'ip', 'created_at', seuilAbus, PLAFOND_LIGNES))
  bilan.devis_ip = noter(await effacerEmpreintesIp('devis', 'accepte_ip', 'accepte_le', seuilAbus, PLAFOND_LIGNES))

  // 3. Conversations sans suite (trois ans), factures et devis épargnés.
  bilan.conversations = noter(await purgerConversationsSansSuite(seuilConversation, PLAFOND_CONVERSATIONS))

  // 4. Jetons expirés. Rien d'annoncé dans la politique pour eux : ils n'ont aucune utilité
  //    passé leur date, donc on les garde moins longtemps que tout le reste, pas plus.
  bilan.jetons =
    noter(await supprimerAnciennes('password_resets', 'id', 'expires_at', seuilJetons, PLAFOND_LIGNES)) +
    noter(await supprimerAnciennes('clients_sessions', 'id', 'expire_le', seuilJetons, PLAFOND_LIGNES)) +
    noter(await supprimerAnciennes('clients_liens', 'id', 'expire_le', seuilJetons, PLAFOND_LIGNES))

  return bilan
}
