// CRM — le GÉOCODAGE des chantiers et de la base de l'artisan (lot 5, migration 0172 ; drapeau crmAtelierVivant). Serveur seulement.
//
// Ce qui part : l'adresse, le code postal et la ville (lib/crm/carte.ts, requeteAdresse) — JAMAIS le nom du client — vers la Base
// Adresse Nationale (api-adresse.data.gouv.fr, service public), délai 4 s, au plus 10 recherches par chargement de la vue (la base
// comprise). Ce qui revient s'écrit sur le chantier (lat, lng, geocode_le), filtré sur `artisan_id = uid` et sur `geocode_le IS NULL`
// et sur le `maj_le` lu (une adresse modifiée entre-temps n'est pas écrasée — audit du 20/10, F1). Introuvable : geocode_le est posé, lat/lng restent vides (on ne redemande
// pas en boucle) ; panne (réseau, délai) : rien n'est écrit, on réessaiera au prochain chargement. Registre : docs/registre-traitements.md § 13.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { BAN_MAX_PAR_VUE, chercherAdresse, requeteAdresse, type PointGeo } from './carte'

type ChantierGeo = {
  id: string; statut: string; devis_id: string | null; adresse: string | null; code_postal: string | null; ville: string | null
  lat?: number | string | null; lng?: number | string | null; geocode_le?: string | null; retire_carte_le?: string | null; maj_le?: string | null
}
type Adresse = { adresse?: string | null; code_postal?: string | null; ville?: string | null }

/** La base de l'artisan : gardée en mémoire du serveur 24 h par TEXTE d'adresse (jamais par compte), pour ne pas la redemander à chaque vue. */
const CACHE_BASE = new Map<string, { point: PointGeo | null; le: number }>()
const DUREE_CACHE_MS = 24 * 3600_000
/** Plafond du cache (audit du 20/10, F3) : au-delà, la plus ancienne entrée sort. */
const CACHE_MAX = 500
/** Après une panne de la BAN, plus aucun appel pendant 5 min (audit du 20/10, M1) : la vue ne doit pas attendre à chaque chargement. */
const PAUSE_PANNE_MS = 5 * 60_000
let banEnPanneJusqua = 0

const nombre = (v: unknown): number | null => { const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN; return Number.isFinite(n) ? n : null }

/** La requête d'un chantier : son adresse à lui, sinon l'adresse du client sur le devis (texte libre, adresse seule). */
export function requeteChantier(c: ChantierGeo, adresseDevis: string | null | undefined): string | null {
  return requeteAdresse(c) ?? requeteAdresse({ adresse: adresseDevis ?? null })
}

/**
 * Prépare la carte d'UNE vue : la base géocodée (cache, sinon une recherche), puis les chantiers encore jamais cherchés (les visibles
 * d'abord), au plus BAN_MAX_PAR_VUE recherches en tout, en parallèle. Rend la base et la position de chaque chantier connu (y compris
 * celles qui viennent d'être trouvées). `fetchImpl` est injecté (les tests simulent la BAN) ; `ecrire` aussi (les tests lisent ce
 * qui serait écrit, sans base).
 */
export async function preparerCarte(p: {
  uid: string
  chantiers: readonly ChantierGeo[]
  adressesDevis: ReadonlyMap<string, string | null>
  siege: Adresse | null
  fetchImpl?: typeof fetch
  ecrire?: (id: string, champs: { lat: number | null; lng: number | null; geocode_le: string }, majLe?: string | null) => Promise<void>
  maintenant?: Date
}): Promise<{ base: PointGeo | null; positions: Map<string, PointGeo>; recherches: number; ecrits: string[] }> {
  const fetchImpl = p.fetchImpl ?? fetch
  const maintenant = p.maintenant ?? new Date()
  const ecrire = p.ecrire ?? (async (id, champs, majLe) => {
    let q = supabaseAdmin.from('chantiers').update(champs).eq('id', id).eq('artisan_id', p.uid).is('geocode_le', null)
    if (majLe) q = q.eq('maj_le', majLe)
    const { error } = await q
    if (error) console.error('[crm/carte] écriture de la position :', error.message)
  })
  let recherches = 0
  const enPanne = () => maintenant.getTime() < banEnPanneJusqua
  const noterPanne = () => { banEnPanneJusqua = maintenant.getTime() + PAUSE_PANNE_MS }
  // 1. La base — cherchée EN PARALLÈLE des chantiers (audit du 20/10, M1 : plus d'attente en série).
  let base: PointGeo | null = null
  let rechercheBase: Promise<void> = Promise.resolve()
  const qBase = requeteAdresse(p.siege)
  if (qBase) {
    const c = CACHE_BASE.get(qBase)
    if (c && maintenant.getTime() - c.le < DUREE_CACHE_MS) base = c.point
    else if (!enPanne()) {
      recherches++
      rechercheBase = chercherAdresse(qBase, fetchImpl).then((r) => {
        if ('panne' in r) { noterPanne(); return }
        base = r.point
        if (CACHE_BASE.size >= CACHE_MAX) { const premiere = CACHE_BASE.keys().next().value; if (premiere !== undefined) CACHE_BASE.delete(premiere) }
        CACHE_BASE.set(qBase, { point: r.point, le: maintenant.getTime() })
      })
    }
  }
  // 2. Les chantiers déjà placés, puis ceux à chercher (ni annulés, ni retirés de la carte), dans la limite des recherches.
  const positions = new Map<string, PointGeo>()
  for (const c of p.chantiers) { const lat = nombre(c.lat), lng = nombre(c.lng); if (lat !== null && lng !== null) positions.set(c.id, { lat, lng }) }
  const aChercher = p.chantiers
    .filter((c) => !c.geocode_le && c.statut !== 'annule' && !c.retire_carte_le)
    .map((c) => ({ c, q: requeteChantier(c, c.devis_id ? p.adressesDevis.get(c.devis_id) : null) }))
    .filter((x): x is { c: ChantierGeo; q: string } => !!x.q)
    .slice(0, enPanne() ? 0 : Math.max(0, BAN_MAX_PAR_VUE - recherches))
  recherches += aChercher.length
  const ecrits: string[] = []
  await Promise.all([rechercheBase, ...aChercher.map(async ({ c, q }) => {
    const r = await chercherAdresse(q, fetchImpl)
    if ('panne' in r) { noterPanne(); return }
    if (r.point) positions.set(c.id, r.point)
    await ecrire(c.id, { lat: r.point?.lat ?? null, lng: r.point?.lng ?? null, geocode_le: maintenant.toISOString() }, c.maj_le ?? null)
    ecrits.push(c.id)
  })])
  return { base, positions, recherches, ecrits }
}

/** Pour les tests : vide le cache de la base. */
export const viderCacheBase = () => { CACHE_BASE.clear(); banEnPanneJusqua = 0 }
