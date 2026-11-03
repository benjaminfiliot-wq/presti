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
export const TYPES_EVENEMENT = ['demande_recue', 'devis_a_preparer', 'relance_due', 'facture_a_emettre', 'impaye_echu', 'chantier_termine', 'rendez_vous_a_poser', 'page_du_matin'] as const
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

/** Une relance de conversation est due (rang 1, 2, 3 = J+2, J+5, J+10) : `relance_due`, une fois par demande et par rang. */
export function evenementRelanceDue(r: { artisanId: string; leadId: string; rang: number; echeance?: string | null; survenuLe?: Date }): Evenement | null {
  if (!Number.isInteger(r.rang) || r.rang < 1 || r.rang > 9) return null
  return construireEvenement({
    artisanId: r.artisanId, type: 'relance_due', objetType: 'lead', objetId: r.leadId, cle: 'relance_due:' + r.leadId + ':r' + r.rang, survenuLe: r.survenuLe,
    faits: { lead_id: r.leadId, rang: r.rang, echeance: r.echeance ?? null },
  })
}
