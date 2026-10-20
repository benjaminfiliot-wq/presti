import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { actif } from '@/lib/flags'
import { DUREES_MOIS } from '@/lib/legalArtisan'
import { MOIS_AUDIENCE } from '@/lib/audience'
import { notesClientAPurger } from '@/lib/crm/effacement'

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
//    DUREES_MOIS.conversation, SAUF celles liées à un devis SIGNÉ ou à une facture (audit RGPD du 20/10) ;
//  · le registre des essais gratuits (`essais_gratuits`, 0156), DUREES_MOIS.essai_gratuit après la fin de l'essai ;
//  · les jetons `password_resets`, `clients_sessions`, `clients_liens` expirés depuis une semaine.
//
// Ce que ce module NE TOUCHE JAMAIS :
//  · `factures` et `factures_lignes` — dix ans (art. L. 102 B du LPF), et le trigger
//    `factures_conservees` (0041) refuserait de toute façon ;
//  · une conversation liée à un devis SIGNÉ (statut « accepte », ou signature datée) ou à une facture : c'est le
//    contexte d'une pièce comptable, conservé dix ans avec elle. Avant le 20/10 le critère était TOUT devis rattaché,
//    même brouillon : un fil dont le devis n'a jamais été signé ni facturé était gardé pour toujours, alors que la
//    page de confidentialité annonce trois ans (RGPD art. 5.1 e). Un devis non signé n'est pas une pièce comptable :
//    le fil part (`devis.lead_id` passe à NULL), le devis lui-même n'est pas touché par cette purge.
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
/** Une session vérifiée par le code email (v7 bloc 2) l'est pour 90 jours : au-delà, le code est redemandé. */
export const JOURS_SESSIONS_VERIFIEES = 90

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
  /** Mesure d'audience (0090, 0091) : empreintes effacées à la clôture des jours finis, créneaux de plafond terminés, vues de plus de MOIS_AUDIENCE mois. */
  audience: number
  /** CRM (audit RGPD du 12/10, point b) : journal, chantiers clos, notes, membres inactifs (`purgerCrm`). */
  crm: number
  /** Registre des essais gratuits (0156) : lignes dont l'essai est fini depuis plus de DUREES_MOIS.essai_gratuit (`purgerEssaisGratuits`). */
  essais: number
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

/** Le client de base des purges : `supabaseAdmin`, ou une doublure dans scripts/rgpd-qa.mjs (qui joue les vraies fonctions). */
export type BaseRgpd = typeof supabaseAdmin

/**
 * Supprime les lignes les plus anciennes d'une table, en deux temps : PostgREST ne sait pas
 * limiter un DELETE, donc on lit d'abord au plus `plafond` clés triées par date, puis on
 * supprime exactement celles-là. C'est aussi ce qui rend la purge bornée et rejouable.
 *
 * `colonneDate` étant filtrée par `lt`, les lignes dont cette colonne est NULL sont
 * naturellement épargnées — c'est voulu pour `ip_bans.expires_le` (ban permanent).
 */
async function supprimerAnciennes(
  table: string, cle: string, colonneDate: string, avant: string, plafond: number, db: BaseRgpd = supabaseAdmin,
): Promise<Resultat> {
  const { data, error } = await db
    .from(table).select(cle)
    .lt(colonneDate, avant)
    .order(colonneDate, { ascending: true })
    .limit(plafond)
  if (error) return { n: 0, plein: false, erreur: tableAbsente(error.message) ? undefined : `${table} (lecture) : ${error.message}` }

  const cles = colonneTexte(data, cle)
  let n = 0
  for (const lot of parLots(cles)) {
    const { error: eSup } = await db.from(table).delete().in(cle, lot)
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
 * Conversations sans suite : trois ans sans le moindre message, et ni devis signé ni facture derrière.
 *
 * L'ordre des filtres compte. On part des fils créés avant le seuil (un fil né il y a un an ne
 * peut pas avoir trois ans de silence), puis on écarte ceux qui ont échangé depuis, puis ceux
 * qui sont liés à une PIÈCE COMPTABLE : un devis SIGNÉ (statut « accepte », ou une signature datée
 * `accepte_le`) ou un devis qui a donné lieu à une facture (une facture naît d'un devis rattaché
 * au fil). Ce qui reste est un fil mort sans pièce comptable derrière.
 *
 * Audit RGPD du 20/10 : le critère était « tout devis rattaché, même brouillon » — un fil dont le
 * devis n'a jamais été signé restait pour toujours, contre les trois ans annoncés. Un devis
 * brouillon, envoyé, refusé ou expiré n'est pas une pièce comptable (art. L. 102 B du LPF ne vise
 * que les pièces justificatives : devis accepté, facture).
 *
 * La suppression du lead emporte `messages` et `relances` par cascade (0010) ; `devis.lead_id`
 * est `on delete set null` : le devis non signé survit, détaché de la conversation — c'est à la
 * purge du devis, pas à celle-ci, de décider de son sort. Aucun devis signé ni facturé n'arrive ici.
 */
export async function purgerConversationsSansSuite(
  avant: string, plafond: number = PLAFOND_CONVERSATIONS, db: BaseRgpd = supabaseAdmin,
): Promise<Resultat> {
  const { data: candidats, error } = await db
    .from('leads').select('id')
    .lt('created_at', avant)
    .order('created_at', { ascending: true })
    .limit(plafond)
  if (error) return { n: 0, plein: false, erreur: tableAbsente(error.message) ? undefined : `leads (lecture) : ${error.message}` }

  const ids = colonneTexte(candidats, 'id')
  if (!ids.length) return { n: 0, plein: false }

  // À garder : un échange postérieur au seuil, un devis signé, ou un devis facturé.
  const garder = new Set<string>()
  for (const lot of parLots(ids)) {
    const { data: recents, error: eM } = await db
      .from('messages').select('lead_id').in('lead_id', lot).gte('sent_at', avant)
    if (eM) return { n: 0, plein: false, erreur: `messages (lecture) : ${eM.message}` }
    for (const id of colonneTexte(recents, 'lead_id')) garder.add(id)

    const { data: devis, error: eD } = await db
      .from('devis').select('id, lead_id, statut, accepte_le').in('lead_id', lot)
    if (eD) return { n: 0, plein: false, erreur: `devis (lecture) : ${eD.message}` }
    const lignes = (devis ?? []) as unknown as { id: string; lead_id: string | null; statut: string | null; accepte_le: string | null }[]
    const leadDeDevis = new Map<string, string>()
    for (const d of lignes) {
      if (!d.lead_id) continue
      leadDeDevis.set(d.id, d.lead_id)
      if (String(d.statut ?? '').toLowerCase() === 'accepte' || d.accepte_le) garder.add(d.lead_id)
    }
    // Un devis facturé (même si son statut n'est pas « accepte ») porte une pièce comptable : son fil reste.
    for (const lotDevis of parLots([...leadDeDevis.keys()])) {
      const { data: factures, error: eF } = await db.from('factures').select('devis_id').in('devis_id', lotDevis)
      if (eF) return { n: 0, plein: false, erreur: `factures (lecture) : ${eF.message}` }
      for (const idDevis of colonneTexte(factures, 'devis_id')) { const l = leadDeDevis.get(idDevis); if (l) garder.add(l) }
    }
  }

  const aEffacer = ids.filter((id) => !garder.has(id))
  let n = 0
  for (const lot of parLots(aEffacer)) {
    const { error: eSup } = await db.from('leads').delete().in('id', lot)
    if (eSup) return { n, plein: false, erreur: `leads (suppression) : ${eSup.message}` }
    n += lot.length
  }
  // Le plafond porte sur les CANDIDATS lus : s'il est plein, il reste des fils vieux à examiner
  // demain, même si aucun n'a été effacé aujourd'hui.
  return { n, plein: ids.length >= plafond }
}

/**
 * Registre des essais gratuits (0156) : une ligne par EMPREINTE d'adresse e-mail (SHA-256 — pseudonyme, pas anonyme), gardée
 * pour qu'un compte recréé avec la même boîte ne rouvre pas un essai. Sa durée n'était écrite nulle part (audit RGPD du 20/10) :
 * DUREES_MOIS.essai_gratuit (24 mois) après la FIN de l'essai, ou après son début si la fin manque. Passé ce délai l'empreinte
 * n'a plus de raison d'être : un nouvel essai redevient possible, c'est la contrepartie assumée de la limitation de conservation
 * (RGPD art. 5.1 e). Pas de clé étrangère vers `artisans` : la ligne survit au compte, c'est donc cette purge qui l'efface.
 */
export async function purgerEssaisGratuits(
  maintenant: Date = new Date(), plafond: number = PLAFOND_LIGNES, db: BaseRgpd = supabaseAdmin,
): Promise<Resultat> {
  const avant = seuilMois(DUREES_MOIS.essai_gratuit, maintenant)
  const parFin = await supprimerAnciennes('essais_gratuits', 'email_hash', 'fin', avant, plafond, db)
  if (parFin.erreur) return parFin
  // Une ligne sans date de fin (jamais écrite par le code, mais la colonne l'admet) se date sur son début.
  const { data, error } = await db.from('essais_gratuits').select('email_hash').is('fin', null).lt('debut', avant).order('debut', { ascending: true }).limit(plafond)
  if (error) return { n: parFin.n, plein: parFin.plein, erreur: tableAbsente(error.message) ? undefined : `essais_gratuits (lecture) : ${error.message}` }
  const cles = colonneTexte(data, 'email_hash')
  let n = parFin.n
  for (const lot of parLots(cles)) {
    const { error: eSup } = await db.from('essais_gratuits').delete().in('email_hash', lot)
    if (eSup) return { n, plein: false, erreur: `essais_gratuits (suppression) : ${eSup.message}` }
    n += lot.length
  }
  return { n, plein: parFin.plein || cles.length >= plafond }
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
    ip_abus: 0, ip_bans: 0, leads_ip: 0, devis_ip: 0, conversations: 0, jetons: 0, audience: 0, crm: 0, essais: 0,
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

  // 3. Conversations sans suite (trois ans). Épargnées : celles liées à un devis SIGNÉ ou à une facture (pièces comptables).
  bilan.conversations = noter(await purgerConversationsSansSuite(seuilConversation, PLAFOND_CONVERSATIONS))

  // 4. Jetons expirés. Rien d'annoncé dans la politique pour eux : ils n'ont aucune utilité
  //    passé leur date, donc on les garde moins longtemps que tout le reste, pas plus.
  bilan.jetons =
    noter(await supprimerAnciennes('password_resets', 'id', 'expires_at', seuilJetons, PLAFOND_LIGNES)) +
    noter(await supprimerAnciennes('clients_sessions', 'id', 'expire_le', seuilJetons, PLAFOND_LIGNES)) +
    noter(await supprimerAnciennes('clients_liens', 'id', 'expire_le', seuilJetons, PLAFOND_LIGNES))

  // 6. Centre de direction (v10, 0065) : journal > 24 mois (le trigger l'autorise passé ce délai), re-confirmations
  //    expirées > 7 j (sans utilité), alertes acquittées > 12 mois. Derrière le drapeau : sans 0065, pas de tables.
  if (actif('direction')) {
    bilan.jetons +=
      noter(await supprimerAnciennes('journal_direction', 'id', 'cree_le', seuilMois(24, maintenant), PLAFOND_LIGNES)) +
      noter(await supprimerAnciennes('reconfirmations', 'jeton_hash', 'expire_le', seuilJetons, PLAFOND_LIGNES)) +
      noter(await supprimerAnciennes('alertes', 'id', 'acquittee_le', seuilMois(12, maintenant), PLAFOND_LIGNES))
  }

  // 7. Mode support (v11 §5, 0074) : 24 mois, le même délai que `journal_direction` et pour la même
  //    raison — une trace de lecture est la preuve que l'artisan peut nous opposer, et la garder
  //    moins longtemps que l'action qu'elle documente laisserait une action sans sa contrepartie.
  //    Les lectures partent EN PREMIER : elles référencent les accès, qui référencent les tickets.
  //    Derrière le drapeau : sans 0074, ces tables n'existent pas.
  if (actif('supportArtisan')) {
    bilan.jetons +=
      noter(await supprimerAnciennes('acces_support_lectures', 'id', 'lu_le', seuilMois(24, maintenant), PLAFOND_LIGNES)) +
      noter(await supprimerAnciennes('acces_support', 'id', 'demande_le', seuilMois(24, maintenant), PLAFOND_LIGNES)) +
      noter(await supprimerAnciennes('tickets', 'id', 'ouvert_le', seuilMois(24, maintenant), PLAFOND_LIGNES))
  }

  // 5. Code par email (v7 bloc 2) : codes et appareils de confiance passés de date, et les
  //    sessions vérifiées de plus de 90 jours — l'artisan retape alors un code, une fois.
  //    Derrière le drapeau : sans la migration 0063, ces tables n'existent pas.
  if (actif('codeEmail')) {
    bilan.jetons +=
      noter(await supprimerAnciennes('codes_connexion', 'user_id', 'expire_le', seuilJetons, PLAFOND_LIGNES)) +
      noter(await supprimerAnciennes('appareils_confiance', 'id', 'expire_le', seuilJetons, PLAFOND_LIGNES)) +
      noter(await supprimerAnciennes('sessions_verifiees', 'session_id', 'verifiee_le', seuilJours(JOURS_SESSIONS_VERIFIEES, maintenant), PLAFOND_LIGNES))
  }

  // 8. Mesure d'audience (0090, 0091) : UNE fonction SQL, dans cet ordre — chaque jour fini verse ses visiteurs dans
  //    `audience_jours`, PUIS ses empreintes sont effacées (dans l'ordre inverse, le compte du jour serait perdu),
  //    puis les créneaux de plafond `audience:%` terminés, puis les vues de plus de MOIS_AUDIENCE mois, en une
  //    instruction — par PostgREST, 500 lignes par passage ne tenaient plus la durée au-delà de 500 vues par jour.
  //    PAS derrière le drapeau : une mesure coupée laisse ses lignes, et elles doivent partir quand même (revue du
  //    14/09). Sans les migrations, la fonction manque : ce n'est pas une erreur de purge.
  {
    const { data, error } = await supabaseAdmin.rpc('audience_cloturer', { p_mois: MOIS_AUDIENCE })
    if (error) { if (!/does not exist|schema cache|could not find/i.test(error.message)) bilan.erreurs.push(`audience_cloturer : ${error.message}`) }
    else if (data && typeof data === 'object') {
      const r = data as { empreintes?: number; plafonds?: number; vues?: number }
      bilan.audience += (r.empreintes ?? 0) + (r.plafonds ?? 0) + (r.vues ?? 0)
    }
  }

  // 9. CRM (0141). PAS derrière le drapeau : les comptes à l'essai ont des lignes, et elles doivent partir à l'heure dite.
  {
    const r = await purgerCrm(maintenant)
    bilan.crm = r.n
    if (r.plein) bilan.reste = true
    bilan.erreurs.push(...r.erreurs)
  }

  // 10. Registre des essais gratuits (0156) : 24 mois après la fin de l'essai. PAS derrière le drapeau : une table absente est tolérée.
  bilan.essais = noter(await purgerEssaisGratuits(maintenant, PLAFOND_LIGNES))

  return bilan
}

// ── CRM (audit RGPD du 12/10, point b) ──────────────────────────────────────────────────────────────────────────────────
// Ce qui part, et à quel moment (durées : DUREES_MOIS, affichées par lib/legalArtisan.ts) :
//  · le journal du CRM au-delà de DUREES_MOIS.crm_journal (24 mois), et les rappels FAITS (0162) au-delà de la même durée ;
//  · un chantier FINI depuis DUREES_MOIS.crm (36 mois) : fin réelle, sinon fin prévue, dépassée de 36 mois ET plus aucune
//    modification depuis — avec ses tâches, réservations, équipe et notes (cascade de 0141), ses photos et pièces (0163 :
//    les fichiers du bucket privé sont retirés AVANT la ligne). Le devis n'est pas touché ;
//  · une note CLIENT dont le client n'a plus aucune pièce (orpheline), ou dont la dernière pièce ET la note ont 36 mois ;
//  · une note de DEMANDE vieille de 36 mois, sur une demande sans échange depuis 36 mois ;
//  · un membre de l'équipe inactif depuis DUREES_MOIS.equipe_inactif (12 mois) et rattaché à aucun chantier, aucune
//    tâche, aucun véhicule.
// Garde-fou : si plus de la moitié des notes client d'un artisan semblent orphelines, c'est que l'empreinte a changé
// (secret serveur, lib/crm/empreinte.ts), pas que ses clients ont disparu : rien n'est supprimé, et l'erreur le dit.

export async function purgerCrm(maintenant: Date = new Date()): Promise<{ n: number; plein: boolean; erreurs: string[] }> {
  const erreurs: string[] = []
  let n = 0, plein = false
  const noter = (r: Resultat) => { if (r.erreur) erreurs.push(r.erreur); if (r.plein) plein = true; n += r.n }
  const seuilJournal = seuilMois(DUREES_MOIS.crm_journal, maintenant)
  const seuilCrm = seuilMois(DUREES_MOIS.crm, maintenant)
  const jourCrm = seuilCrm.slice(0, 10)
  const seuilEquipe = seuilMois(DUREES_MOIS.equipe_inactif, maintenant)

  // 1. Journal.
  noter(await supprimerAnciennes('crm_journal', 'id', 'cree_le', seuilJournal, PLAFOND_LIGNES))
  // 1 bis. 0162 — les rappels FAITS (dont l'historique des relances de devis envoyées) au-delà de la même durée que le
  //        journal. Un rappel ouvert ne part jamais : c'est un rendez-vous à venir ou en retard.
  noter(await (async (): Promise<Resultat> => {
    const { data, error } = await supabaseAdmin.from('crm_rappels').select('id').not('fait_le', 'is', null).lt('fait_le', seuilJournal).limit(PLAFOND_LIGNES)
    if (error) return { n: 0, plein: false, erreur: tableAbsente(error.message) ? undefined : `crm_rappels (lecture) : ${error.message}` }
    const ids = colonneTexte(data, 'id')
    let k = 0
    for (const lot of parLots(ids)) {
      const { error: e } = await supabaseAdmin.from('crm_rappels').delete().in('id', lot)
      if (e) return { n: k, plein: false, erreur: `crm_rappels (suppression) : ${e.message}` }
      k += lot.length
    }
    return { n: k, plein: ids.length >= PLAFOND_LIGNES }
  })())

  // 2. Chantiers finis depuis 36 mois, et plus touchés depuis.
  noter(await (async (): Promise<Resultat> => {
    const { data, error } = await supabaseAdmin.from('chantiers').select('id')
      .lt('maj_le', seuilCrm)
      .or(`date_fin_reelle.lt.${jourCrm},and(date_fin_reelle.is.null,date_fin_prevue.lt.${jourCrm}),and(date_fin_reelle.is.null,date_fin_prevue.is.null)`)
      .order('maj_le', { ascending: true }).limit(PLAFOND_LIGNES)
    if (error) return { n: 0, plein: false, erreur: tableAbsente(error.message) ? undefined : `chantiers (lecture) : ${error.message}` }
    const ids = colonneTexte(data, 'id')
    let k = 0
    for (const lot of parLots(ids)) {
      // 0163 — les photos et pièces du chantier : la cascade emporte les LIGNES, jamais les FICHIERS du bucket privé.
      // Ils sont retirés d'abord ; si le retrait échoue, le chantier reste (il sera repris au passage suivant).
      const { data: pieces, error: ep } = await supabaseAdmin.from('chantier_pieces').select('chemin').in('chantier_id', lot)
      if (ep && !tableAbsente(ep.message)) return { n: k, plein: false, erreur: `chantier_pieces (lecture) : ${ep.message}` }
      const chemins = colonneTexte(pieces, 'chemin')
      if (chemins.length) {
        const { error: es } = await supabaseAdmin.storage.from('chantier-pieces').remove(chemins)
        if (es) return { n: k, plein: false, erreur: `chantier-pieces (fichiers) : ${es.message}` }
      }
      const { error: e } = await supabaseAdmin.from('chantiers').delete().in('id', lot)
      if (e) return { n: k, plein: false, erreur: `chantiers (suppression) : ${e.message}` }
      k += lot.length
    }
    return { n: k, plein: ids.length >= PLAFOND_LIGNES }
  })())

  // 3. Notes client : orphelines, ou client et note sans nouvelle depuis 36 mois. Un artisan à la fois (ses pièces
  //    sont relues comme le CRM les lit), au plus 20 artisans par passage.
  noter(await (async (): Promise<Resultat> => {
    const { data, error } = await supabaseAdmin.from('crm_notes').select('id, artisan_id, client_cle, cree_le, maj_le')
      .not('client_cle', 'is', null).order('artisan_id').limit(PLAFOND_LIGNES * 4)
    if (error) return { n: 0, plein: false, erreur: tableAbsente(error.message) ? undefined : `crm_notes (lecture) : ${error.message}` }
    const parArtisan = new Map<string, { id: string; client_cle: string; cree_le: string; maj_le: string | null }[]>()
    for (const l of (data ?? []) as { id: string; artisan_id: string; client_cle: string; cree_le: string; maj_le: string | null }[]) parArtisan.set(l.artisan_id, [...(parArtisan.get(l.artisan_id) ?? []), l])
    const { chargerDossiers } = await import('@/lib/crm/serveur')
    const { regrouperClients } = await import('@/lib/crm/clients')
    const { idClientPour } = await import('@/lib/crm/empreinte')
    let k = 0
    for (const [uid, notes] of [...parArtisan].slice(0, 20)) {
      const d = await chargerDossiers(uid)
      if (!d.ok) { erreurs.push(`crm_notes (pièces de ${uid.slice(0, 8)}) : ${d.erreur.message}`); continue }
      if (d.tronque) continue // historique coupé à 2 000 pièces : un client absent ne prouve rien
      const groupes = regrouperClients({ artisanId: uid, devis: d.devis, factures: d.factures, leads: d.leads, chantiers: d.chantiers, carnet: d.carnet, idDe: idClientPour(uid) })
      const choix = notesClientAPurger(notes, groupes, seuilCrm)
      if (choix.suspect) { erreurs.push(`crm_notes : plus de la moitié des notes client de ${uid.slice(0, 8)} sans client — empreinte changée ? Rien supprimé.`); continue }
      for (const lot of parLots(choix.ids)) {
        const { error: e } = await supabaseAdmin.from('crm_notes').delete().eq('artisan_id', uid).in('id', lot)
        if (e) return { n: k, plein: false, erreur: `crm_notes (suppression) : ${e.message}` }
        k += lot.length
      }
    }
    return { n: k, plein: parArtisan.size > 20 || (data ?? []).length >= PLAFOND_LIGNES * 4 }
  })())

  // 4. Notes de demande : la note et la demande ont 36 mois, et la demande n'a plus échangé depuis.
  noter(await (async (): Promise<Resultat> => {
    const { data, error } = await supabaseAdmin.from('crm_notes').select('id, lead_id, lead:leads(created_at)')
      .not('lead_id', 'is', null).lt('maj_le', seuilCrm).order('maj_le', { ascending: true }).limit(PLAFOND_LIGNES)
    if (error) return { n: 0, plein: false, erreur: tableAbsente(error.message) ? undefined : `crm_notes demandes (lecture) : ${error.message}` }
    const lignes = (data ?? []) as unknown as { id: string; lead_id: string; lead: { created_at: string | null } | null }[]
    const candidates = lignes.filter((l) => !l.lead?.created_at || l.lead.created_at < seuilCrm)
    const actifs = new Set<string>()
    for (const lot of parLots([...new Set(candidates.map((l) => l.lead_id))])) {
      const { data: recents, error: e } = await supabaseAdmin.from('messages').select('lead_id').in('lead_id', lot).gte('sent_at', seuilCrm)
      if (e) return { n: 0, plein: false, erreur: `messages (lecture) : ${e.message}` }
      for (const id of colonneTexte(recents, 'lead_id')) actifs.add(id)
    }
    const ids = candidates.filter((l) => !actifs.has(l.lead_id)).map((l) => l.id)
    let k = 0
    for (const lot of parLots(ids)) {
      const { error: e } = await supabaseAdmin.from('crm_notes').delete().in('id', lot)
      if (e) return { n: k, plein: false, erreur: `crm_notes demandes (suppression) : ${e.message}` }
      k += lot.length
    }
    return { n: k, plein: lignes.length >= PLAFOND_LIGNES }
  })())

  // 5. Membres inactifs depuis 12 mois, rattachés à rien.
  noter(await (async (): Promise<Resultat> => {
    const { data, error } = await supabaseAdmin.from('equipe_membres').select('id')
      .eq('actif', false).lt('maj_le', seuilEquipe).order('maj_le', { ascending: true }).limit(PLAFOND_LIGNES)
    if (error) return { n: 0, plein: false, erreur: tableAbsente(error.message) ? undefined : `equipe_membres (lecture) : ${error.message}` }
    const ids = colonneTexte(data, 'id')
    const rattaches = new Set<string>()
    for (const lot of parLots(ids)) {
      const [eq, ta, ve] = await Promise.all([
        supabaseAdmin.from('chantier_equipe').select('membre_id').in('membre_id', lot),
        supabaseAdmin.from('chantier_taches').select('membre_id').in('membre_id', lot),
        supabaseAdmin.from('vehicules').select('conducteur_id').in('conducteur_id', lot),
      ])
      const e = eq.error ?? ta.error ?? ve.error
      if (e) return { n: 0, plein: false, erreur: `equipe_membres (rattachements) : ${e.message}` }
      for (const id of [...colonneTexte(eq.data, 'membre_id'), ...colonneTexte(ta.data, 'membre_id'), ...colonneTexte(ve.data, 'conducteur_id')]) rattaches.add(id)
    }
    const aEffacer = ids.filter((id) => !rattaches.has(id))
    let k = 0
    for (const lot of parLots(aEffacer)) {
      const { error: e } = await supabaseAdmin.from('equipe_membres').delete().in('id', lot).eq('actif', false)
      if (e) return { n: k, plein: false, erreur: `equipe_membres (suppression) : ${e.message}` }
      k += lot.length
    }
    return { n: k, plein: ids.length >= PLAFOND_LIGNES }
  })())

  return { n, plein, erreurs }
}
