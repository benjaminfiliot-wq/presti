// L'écrivain des événements métier (tâche 036-030, audit 036-029 « En tête », point 1).
//
// L'app RANGE un fait, n8n DÉCIDE (règle n8n-first, .claude/rules/architecture-outils.md) : ce module n'écrit qu'une ligne dans
// `evenements_metier` (supabase/migrations/0185_automatisation.sql:125, marque `traite_le` de 0193) ; le Cerveau de n8n la lit par la vue
// `n8n_evenements_a_traiter` (0193:425) et choisit le département. Aucune décision d'automatisation ici : ni palier, ni envoi, ni carte.
//
// Trois garanties, contrôlées par scripts/branchement-reel-qa.mjs (et ses mutants) :
//   1. idempotent : la clé `(artisan_id, cle)` est unique en base (0185:135) ; on insère « on conflict do nothing » (upsert
//      ignoreDuplicates) : un rejeu, un double clic ou une route rejouée n'écrit jamais deux fois le même fait ;
//   2. jamais bloquant : aucune exception ne sort d'ici, une écriture lente est abandonnée au bout de DELAI_MS ; la demande du prospect
//      passe toujours (la route ne lit que `{ ok }`, pour son journal) ;
//   3. sans texte libre : les faits sont un objet plat d'identifiants, de codes, de dates, de nombres et de booléens, la règle
//      `faits_sans_texte` de 0185:55-66 recopiée ici ; un fait qui ne passe pas est RETIRÉ (jamais un nom, un message ni un contact).
//
// Module sans import (le juge le charge tel quel, Node 24 retire les types) : le client Supabase est injecté par l'appelant.

export const DELAI_MS = 1500

/** Les types que le Cerveau route (nœud « Aiguiller » de presti-cerveau, constante ROUTES ; contrats/cerveau.json « routes »). */
// 036-036 : `stock_sous_le_seuil` s'ajoute (chef Opérations, genre « stock » : presti-dep-operations, nœud « Aiguiller », PAR_EVENEMENT).
export const TYPES_EVENEMENT = ['demande_recue', 'devis_a_preparer', 'relance_due', 'facture_a_emettre', 'impaye_echu', 'chantier_termine', 'rendez_vous_a_poser', 'page_du_matin', 'stock_sous_le_seuil'] as const
export type TypeEvenement = (typeof TYPES_EVENEMENT)[number]

/** Les objets qu'un fait peut viser (0185:129). */
export type ObjetEvenement = 'devis' | 'facture' | 'lead' | 'chantier' | 'client' | 'materiau' | 'rappel' | 'commande'

export type Fait = string | number | boolean | null
export type Evenement = {
  artisan_id: string
  type: TypeEvenement
  objet_type: ObjetEvenement | null
  objet_id: string | null
  cle: string
  faits: Record<string, Fait>
  survenu_le: string
}

export type Ecriture = { ok: true; doublon: boolean } | { ok: false; raison: string }

/** Le strict nécessaire du client Supabase (supabaseAdmin) : `from(table).upsert(lignes, options)`. */
export type ClientEvenements = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- les surcharges génériques de supabase-js ne se recopient pas ici
  from: (table: string) => { upsert: (...args: any[]) => PromiseLike<{ error: { message?: string } | null }> }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const CLE_FAIT = /^[a-z][a-z0-9_]{0,39}$/
// 0185:64 : une chaîne permise est un code en minuscules, un uuid ou une date ISO.
const CHAINE_PERMISE = /^([a-z][a-z0-9_:.-]{0,63}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9]{4}-[0-9]{2}-[0-9]{2}([T ][0-9:.+Z-]{0,20})?)$/
const CLE_EVENEMENT = /^[A-Za-z0-9_:.-]{3,120}$/
const TYPE_EVENEMENT = /^[a-z][a-z0-9_]{1,39}$/

/** Garde les seuls faits que 0185 accepte ; retire le reste (jamais d'échec pour un fait en trop : on écrit moins, pas rien). */
export function faitsSansTexte(brut: Record<string, unknown>): Record<string, Fait> {
  const sortie: Record<string, Fait> = {}
  for (const [k, v] of Object.entries(brut ?? {})) {
    if (!CLE_FAIT.test(k)) continue
    if (v === null || typeof v === 'boolean') sortie[k] = v
    else if (typeof v === 'number' && Number.isFinite(v)) sortie[k] = v
    else if (typeof v === 'string' && CHAINE_PERMISE.test(v)) sortie[k] = v
  }
  return sortie
}

/** Construit un événement valide, ou null (jamais une exception). */
export function construireEvenement(e: {
  artisanId: string; type: TypeEvenement; objetType: ObjetEvenement | null; objetId: string | null; cle: string; faits?: Record<string, unknown>; survenuLe?: Date
}): Evenement | null {
  if (!UUID.test(String(e.artisanId))) return null
  if (!TYPE_EVENEMENT.test(e.type) || !(TYPES_EVENEMENT as readonly string[]).includes(e.type)) return null
  if ((e.objetType === null) !== (e.objetId === null)) return null
  if (e.objetId !== null && !UUID.test(String(e.objetId))) return null
  if (!CLE_EVENEMENT.test(e.cle)) return null
  return {
    artisan_id: e.artisanId, type: e.type, objet_type: e.objetType, objet_id: e.objetId, cle: e.cle,
    faits: faitsSansTexte(e.faits ?? {}), survenu_le: (e.survenuLe ?? new Date()).toISOString(),
  }
}

/** Range un événement. Ne lève jamais ; abandonne au bout de `delaiMs`. */
export async function ecrireEvenement(client: ClientEvenements, ev: Evenement | null, delaiMs: number = DELAI_MS): Promise<Ecriture> {
  if (!ev) return { ok: false, raison: 'evenement_hors_forme' }
  let minuterie: ReturnType<typeof setTimeout> | undefined
  try {
    const ecriture = Promise.resolve(client.from('evenements_metier').upsert(ev, { onConflict: 'artisan_id,cle', ignoreDuplicates: true }))
      .then((r): Ecriture => (r && r.error ? { ok: false, raison: 'base:' + String(r.error.message ?? 'erreur').slice(0, 80) } : { ok: true, doublon: false }))
    const delai = new Promise<Ecriture>((resoudre) => { minuterie = setTimeout(() => resoudre({ ok: false, raison: 'delai_depasse' }), delaiMs) })
    return await Promise.race([ecriture, delai])
  } catch (e) {
    return { ok: false, raison: 'exception:' + String((e as Error)?.message ?? e).slice(0, 80) }
  } finally {
    if (minuterie) clearTimeout(minuterie)
  }
}

/** Une demande arrive (app/api/leads) : `demande_recue`, une fois par demande. Les faits sont des codes, jamais le message. */
export function evenementDemandeRecue(d: { artisanId: string; leadId: string; canal?: string | null; urgence?: string | null; aMessage?: boolean; photos?: number; survenuLe?: Date }): Evenement | null {
  return construireEvenement({
    artisanId: d.artisanId, type: 'demande_recue', objetType: 'lead', objetId: d.leadId, cle: 'demande_recue:' + d.leadId, survenuLe: d.survenuLe,
    faits: { lead_id: d.leadId, canal: d.canal ?? null, urgence: d.urgence ?? null, a_message: !!d.aMessage, photos: typeof d.photos === 'number' ? d.photos : 0 },
  })
}

/** Le canal d'une relance, en code : jamais l'adresse ni le numéro (036-036). */
export type CanalRelance = 'email' | 'sms' | 'aucun'

/** Une relance de conversation est due (rang 1, 2, 3 = J+2, J+5, J+10) : `relance_due`, une fois par demande et par rang.
 *  036-036 : l'appelant (app/api/cron/relances) n'écrit qu'après SES contrôles (demande « repondu », main non prise, registre des 3 jours lu,
 *  aucun sujet d'escalade dans le fil) ; ils deviennent des faits booléens, et le canal un code. Ni nom, ni contact, ni message. */
export function evenementRelanceDue(r: {
  artisanId: string; leadId: string; rang: number; echeance?: string | null; survenuLe?: Date
  canal?: CanalRelance | null; depuisLe?: string | null; registreLu?: boolean; sujetEscalade?: boolean; pauseGenerale?: boolean; stop?: boolean | null
}): Evenement | null {
  if (!Number.isInteger(r.rang) || r.rang < 1 || r.rang > 9) return null
  return construireEvenement({
    artisanId: r.artisanId, type: 'relance_due', objetType: 'lead', objetId: r.leadId, cle: 'relance_due:' + r.leadId + ':r' + r.rang, survenuLe: r.survenuLe,
    faits: { lead_id: r.leadId, rang: r.rang, echeance: r.echeance ?? null, statut: 'repondu', canal: r.canal ?? null, depuis_le: r.depuisLe ?? null,
      registre_lu: r.registreLu === true, sujet_escalade: r.sujetEscalade === true,
      // La pause générale LUE par l'appelant (sortiePermise) : false seulement si elle a été lue levée ; sinon nul (le chef s'abstient).
      pause_generale: r.pauseGenerale === false ? false : null,
      // Le client a-t-il demandé l'arrêt ? Fourni par l'appelant (booléen) ; absent = nul = inconnu, et le contrôleur de conflit s'abstient.
      stop: typeof r.stop === 'boolean' ? r.stop : null },
  })
}

/** Un devis est créé par l'artisan (app/api/devis, POST) : `devis_a_preparer` pour le chef Devis, une fois par devis. L'objet est le devis ;
 *  le chef lit le devis et ses lignes (presti-cerveau) et prépare la carte « devis prêt ». `qualifiee` : l'artisan l'a ouvert lui-même.
 *  `escalade` reste nul (non contrôlé ici) : le chef le traite comme une escalade, le côté sûr (contrats/devis.json, evenement_traite). */
export function evenementDevisAPreparer(d: { artisanId: string; devisId: string; leadId?: string | null; lignes?: number; survenuLe?: Date }): Evenement | null {
  return construireEvenement({
    artisanId: d.artisanId, type: 'devis_a_preparer', objetType: 'devis', objetId: d.devisId, cle: 'devis_a_preparer:' + d.devisId, survenuLe: d.survenuLe,
    faits: { devis_id: d.devisId, lead_id: d.leadId ?? null, qualifiee: true, escalade: null, lignes: typeof d.lignes === 'number' ? d.lignes : null },
  })
}

/** Les paliers de relance d'impayé, en jours après l'échéance (lib/relancesImpayes.ts:38). */
export const PALIERS_IMPAYE = [3, 10, 21] as const

/** Une facture émise est échue sans paiement : `impaye_echu`, une fois par facture ET par palier atteint (J+3, J+10, J+21). Le montant est
 *  calculé par le code (centimes entiers), jamais par n8n. Avant J+3 : rien (null). */
/** `contestation` : le client conteste-t-il ? Calculé par le code des impayés (relancesImpayesMagasin.contestation), en booléen, ou nul si
 *  non lu : nul vaut « inconnu », et lib-relancer refuse alors la relance (fail-closed). Jamais le texte du client. */
export function evenementImpayeEchu(f: { artisanId: string; factureId: string; dateEcheance: string; montantTtcCentimes: number | null; maintenant: Date; contestation?: boolean | null; survenuLe?: Date }): Evenement | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f.dateEcheance))) return null
  const retard = Math.floor((Date.UTC(f.maintenant.getUTCFullYear(), f.maintenant.getUTCMonth(), f.maintenant.getUTCDate()) - Date.parse(f.dateEcheance + 'T00:00:00Z')) / 86400000)
  const palier = [...PALIERS_IMPAYE].reverse().find((p) => retard >= p)
  if (!palier) return null
  return construireEvenement({
    artisanId: f.artisanId, type: 'impaye_echu', objetType: 'facture', objetId: f.factureId, cle: 'impaye_echu:' + f.factureId + ':j' + palier, survenuLe: f.survenuLe,
    faits: { facture_id: f.factureId, date_echeance: f.dateEcheance, jours_retard: retard, palier: palier,
      montant_ttc_centimes: Number.isInteger(f.montantTtcCentimes) ? f.montantTtcCentimes : null, contestation: typeof f.contestation === 'boolean' ? f.contestation : null },
  })
}

/** Un chantier est terminé : `chantier_termine` pour l'Après-chantier, une fois par chantier. */
/** `email_connu` : un booléen calculé par le code (le devis du chantier porte une adresse), jamais l'adresse elle-même. */
/** `opposition` : le client a refusé les messages d'après-chantier (crm_apres_opposition, 0171), lu par le code ; nul = non lu (le chef s'abstient). */
export function evenementChantierTermine(c: { artisanId: string; chantierId: string; dateFinReelle: string; devisId?: string | null; emailConnu?: boolean; opposition?: boolean | null; litige?: boolean | null; survenuLe?: Date }): Evenement | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(c.dateFinReelle))) return null
  return construireEvenement({
    artisanId: c.artisanId, type: 'chantier_termine', objetType: 'chantier', objetId: c.chantierId, cle: 'chantier_termine:' + c.chantierId, survenuLe: c.survenuLe,
    faits: { chantier_id: c.chantierId, date_fin_reelle: c.dateFinReelle, devis_id: c.devisId ?? null, email_connu: c.emailConnu === true, opposition: typeof c.opposition === 'boolean' ? c.opposition : null,
      litige: typeof c.litige === 'boolean' ? c.litige : null },
  })
}

/** Un article de l'inventaire est sous son seuil d'alerte : `stock_sous_le_seuil` pour les Opérations, une fois par article et par jour.
 *  La quantité est la somme calculée par le code (jamais par n8n). */
export function evenementStockSousLeSeuil(m: { artisanId: string; materiauId: string; quantite: number; seuil: number; jour: string; survenuLe?: Date }): Evenement | null {
  if (!Number.isFinite(m.quantite) || !Number.isFinite(m.seuil) || m.seuil <= 0 || m.quantite > m.seuil || !/^\d{4}-\d{2}-\d{2}$/.test(m.jour)) return null
  return construireEvenement({
    artisanId: m.artisanId, type: 'stock_sous_le_seuil', objetType: 'materiau', objetId: m.materiauId, cle: 'stock_sous_le_seuil:' + m.materiauId + ':' + m.jour, survenuLe: m.survenuLe,
    faits: { materiau_id: m.materiauId, quantite: m.quantite, seuil: m.seuil, jour: m.jour },
  })
}

/** Le point du matin de la Direction : `page_du_matin`, une fois par compte et par jour (jour de Paris). Sans objet. */
export function evenementPageDuMatin(p: { artisanId: string; jour: string; survenuLe?: Date }): Evenement | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.jour)) return null
  return construireEvenement({ artisanId: p.artisanId, type: 'page_du_matin', objetType: null, objetId: null, cle: 'page_du_matin:' + p.jour, survenuLe: p.survenuLe, faits: { jour: p.jour } })
}

/** Range plusieurs événements par lots bornés (mêmes garanties qu'ecrireEvenement). Aucune Direction n'est perdue si les
 *  factures ou articles du matin occupent les 500 premières places du relevé. */
export async function ecrireEvenements(client: ClientEvenements, evs: (Evenement | null)[], delaiMs: number = DELAI_MS): Promise<Ecriture & { nombre: number }> {
  const lignes = evs.filter((e): e is Evenement => !!e)
  const vues = new Set<string>()
  const uniques = lignes.filter((e) => { const k = e.artisan_id + '|' + e.cle; if (vues.has(k)) return false; vues.add(k); return true })
  if (!uniques.length) return { ok: true, doublon: false, nombre: 0 }
  const lots: Evenement[][] = []
  for (let i = 0; i < uniques.length; i += 500) lots.push(uniques.slice(i, i + 500))
  const ecrireLot = async (lot: Evenement[]): Promise<Ecriture> => {
    let minuterie: ReturnType<typeof setTimeout> | undefined
    try {
      const ecriture = Promise.resolve(client.from('evenements_metier').upsert(lot, { onConflict: 'artisan_id,cle', ignoreDuplicates: true }))
        .then((r): Ecriture => (r && r.error ? { ok: false, raison: 'base:' + String(r.error.message ?? 'erreur').slice(0, 80) } : { ok: true, doublon: false }))
      const delai = new Promise<Ecriture>((resoudre) => { minuterie = setTimeout(() => resoudre({ ok: false, raison: 'delai_depasse' }), delaiMs) })
      return await Promise.race([ecriture, delai])
    } catch (e) {
      return { ok: false, raison: 'exception:' + String((e as Error)?.message ?? e).slice(0, 80) }
    } finally {
      if (minuterie) clearTimeout(minuterie)
    }
  }
  const issues = await Promise.all(lots.map(ecrireLot))
  const echec = issues.find((x): x is { ok: false; raison: string } => !x.ok)
  return echec ? { ...echec, nombre: uniques.length } : { ok: true, doublon: false, nombre: uniques.length }
}
