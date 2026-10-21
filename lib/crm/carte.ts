// CRM — la CARTE de l'atelier vivant (lot 5, migration 0172 ; drapeau crmAtelierVivant). Module PUR, sans réseau ni base :
//   • le TYPE de bâtiment d'un chantier (chantiers.type_batiment s'il est posé, sinon déduit du titre et de l'objet du devis) ;
//   • l'ÉTAT dessiné (pas commencé · en cours · presque fini · fini) tiré de l'avancement réel ;
//   • la VALIDATION (toutes les tâches faites → « Valider le chantier », qui le retire de la carte, jamais des données) ;
//   • la PLACE sur la carte : direction réelle depuis la base de l'artisan, distance comprimée (logarithme), une parcelle par
//     chantier (aucun chevauchement), couronne de repli pour ceux dont la position est inconnue ;
//   • la requête envoyée à la Base Adresse Nationale (adresse, code postal, ville — jamais le nom du client) et la lecture de sa
//     réponse. L'appel lui-même vit côté serveur (lib/crm/geocodage.ts).
// Rejoué par scripts/crm-atelier3d-qa.mjs (section K) et scripts/crm-vivant-qa.mjs (section K).

// ── 1. Les types de bâtiment ─────────────────────────────────────────────────────────────────────────────────────────
// Les valeurs admises par la contrainte de chantiers.type_batiment (0172), dans l'ordre du sélecteur : écrites UNE fois, dans
// lib/crm/valider.ts (module sans import, que les routes lisent pour refuser un type inconnu).
import { estTypeBat, TYPES_BATIMENT, type TypeBat } from './valider.ts'
export { estTypeBat, TYPES_BATIMENT, type TypeBat }
export const LIBELLES_TYPE_BATIMENT: Record<TypeBat, string> = {
  maison: 'Maison', appartement: 'Appartement', immeuble: 'Immeuble, copropriété', hotel: 'Hôtel', restaurant: 'Restaurant, café',
  commerce: 'Commerce, boutique', bureaux: 'Bureaux', entrepot: 'Entrepôt, local d’activité', ecole: 'École, crèche',
  sante: 'Santé (cabinet, clinique)', equipement: 'Équipement public (gymnase, salle)', exterieur: 'Extérieur (jardin, terrasse, piscine)',
  agricole: 'Bâtiment agricole',
}

/** Minuscules, sans accents, espaces resserrés : « Hôtel  des Pins » → « hotel des pins ». */
export const normaliser = (s: string | null | undefined): string =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Les mots-clés, du plus précis au plus large : « piscine municipale » est un équipement avant d'être un extérieur, « terrasse du
 * restaurant » un restaurant, « salle de bain » une maison (seules les salles DES FÊTES, DE SPORT… sont des équipements).
 */
export const REGLES_TYPE: readonly (readonly [RegExp, TypeBat])[] = [
  [/\b(piscine (municipale|intercommunale|publique)|centre aquatique|gymnase|salle (des fetes|de sport|polyvalente|omnisports?|communale)|complexe sportif|stade|mairie|mediatheque|bibliotheque|eglise|chapelle)\b/, 'equipement'],
  [/\b(hotel|hotellerie|auberge|gite|chambres? d hotes?)\b/, 'hotel'],
  [/\b(restaurant|brasserie|bistrot?|pizzeria|creperie|snack|cafe|bar|traiteur)\b/, 'restaurant'],
  [/\b(ecole|college|lycee|creche|groupe scolaire|maternelle|universite|cantine scolaire)\b/, 'ecole'],
  [/\b(clinique|hopital|ehpad|maison de sante|cabinet (medical|dentaire|infirmier|de kine\w*|veterinaire)|centre medical|pharmacie|laboratoire)\b/, 'sante'],
  [/\b(jardin|terrasse|piscine|bassin|pelouse|gazon|cloture|portail|allee|amenagement exterieur|elagage|haie|pergola|spa|abri de jardin|muret)\b/, 'exterieur'],
  [/\b(immeuble|copropriete|residence(?! (secondaire|principale))|syndic|parties communes|cage d escalier|colonnes? (montante|d immeuble))\b/, 'immeuble'],
  [/\b(appartement|appart|studio|duplex|[tf][1-6])\b/, 'appartement'],
  [/\b(bureaux|open ?space|siege social|tertiaire|coworking|plateau de bureaux|cabinet (comptable|d avocats?|d architecte))\b/, 'bureaux'],
  [/\b(boutique|magasin|commerce|vitrine|local commercial|boulangerie|salon de coiffure|agence|supermarche|epicerie)\b/, 'commerce'],
  [/\b(entrepot|logistique|usine|industriel(le)?|local d activite|atelier de production|zone d activite)\b/, 'entrepot'],
  [/\b(grange|hangar|ferme|etable|bergerie|ecurie|corps de ferme|batiment agricole|stabulation|chai)\b/, 'agricole'],
]

/** Le type DÉDUIT des textes du chantier (titre, objet du devis) ; rien de reconnu → « maison ». */
export function deduireType(...textes: (string | null | undefined)[]): TypeBat {
  const t = normaliser(textes.filter(Boolean).join(' · '))
  return REGLES_TYPE.find(([re]) => re.test(t))?.[1] ?? 'maison'
}

/** La variante d'un extérieur (ce qui se construit dehors) : piscine, jardin, ou terrasse. */
export type VarianteExterieur = 'piscine' | 'jardin' | 'terrasse'
export function varianteExterieur(...textes: (string | null | undefined)[]): VarianteExterieur {
  const t = normaliser(textes.filter(Boolean).join(' · '))
  if (/\b(piscine|bassin|spa)\b/.test(t)) return 'piscine'
  if (/\b(jardin|pelouse|gazon|haie|elagage|arbres?|plantations?|massifs?)\b/.test(t)) return 'jardin'
  return 'terrasse'
}

/** Le type d'UN chantier : celui choisi par l'artisan (type_batiment), sinon le type déduit. `deduit` dit lequel. */
export function typeDuChantier(c: { type_batiment?: string | null; titre?: string | null; objet?: string | null }): { type: TypeBat; deduit: boolean; variante: VarianteExterieur } {
  const variante = varianteExterieur(c.titre, c.objet)
  if (estTypeBat(c.type_batiment)) return { type: c.type_batiment, deduit: false, variante }
  return { type: deduireType(c.titre, c.objet), deduit: true, variante }
}

// ── 2. L'état dessiné ────────────────────────────────────────────────────────────────────────────────────────────────
export const PHASES = ['pas_commence', 'en_cours', 'presque_fini', 'fini'] as const
export type Phase = (typeof PHASES)[number]
export const LIBELLES_PHASE: Record<Phase, string> = { pas_commence: 'Pas commencé', en_cours: 'En cours', presque_fini: 'Presque fini', fini: 'Fini' }
/** Le seuil du « presque fini » : les trois quarts des tâches faites. */
export const SEUIL_PRESQUE = 0.75
/**
 * L'avancement à dessiner (0 à 1). Le bâtiment suit le TRAVAIL, jamais l'argent : un chantier facturé d'avance (étape « À facturer »
 * du pipeline) mais pas commencé reste un terrain avec ses fondations (bug du lot 5). Terminé → 1 ; sinon les tâches faites ; un
 * chantier « en cours » sans tâche cochée montre au moins ses premiers rangs (5 %).
 */
export function avancementDessine(c: { statut: string; etape?: string | null; avancement: number | null }): number {
  if (c.statut === 'termine') return 1
  const pct = Math.min(1, Math.max(0, (c.avancement ?? 0) / 100))
  return c.statut === 'en_cours' ? Math.max(0.05, pct) : pct
}
export function phaseDe(pct: number, termine = false): Phase {
  if (termine || pct >= 1) return 'fini'
  if (pct <= 0) return 'pas_commence'
  return pct >= SEUIL_PRESQUE ? 'presque_fini' : 'en_cours'
}

// ── 3. La validation ─────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * « Valider le chantier » s'offre quand toutes ses tâches sont faites (au moins une), ou quand il est déjà terminé. Un chantier
 * annulé ne se valide pas ; un chantier déjà retiré de la carte se « remet sur la carte ».
 */
export function peutValider(c: { statut: string; taches?: { total: number; faites: number } | null; retire_carte_le?: string | null }): boolean {
  if (c.statut === 'annule' || c.retire_carte_le) return false
  const t = c.taches
  return c.statut === 'termine' || (!!t && t.total > 0 && t.faites >= t.total)
}
/** Ce que la validation écrit sur le chantier : terminé, fin réelle (gardée si déjà posée), retiré de la carte. */
export function champsValidation(c: { date_fin_reelle: string | null }, jour: string, maintenant: Date): { statut: 'termine'; date_fin_reelle: string; retire_carte_le: string } {
  return { statut: 'termine', date_fin_reelle: c.date_fin_reelle ?? jour, retire_carte_le: maintenant.toISOString() }
}

// ── 4. La place sur la carte ─────────────────────────────────────────────────────────────────────────────────────────
export type PointGeo = { lat: number; lng: number }
export const estPointGeo = (p: unknown): p is PointGeo => !!p && typeof p === 'object' && Number.isFinite((p as PointGeo).lat) && Number.isFinite((p as PointGeo).lng)
/** Le pas de la trame : une parcelle de chantier tous les 5,6 m, une rue entre deux parcelles (lib/crm/infrastructure.ts). */
export const PAS = 5.6
/** Les écarts en kilomètres, vers l'est et vers le SUD (le nord est en haut de la carte : z négatif). Approximation locale (< 0,5 % à 100 km). */
export function ecartKm(de: PointGeo, vers: PointGeo): { est: number; sud: number; km: number } {
  const est = (vers.lng - de.lng) * 111.32 * Math.cos((de.lat * Math.PI) / 180)
  const sud = -(vers.lat - de.lat) * 110.57
  return { est, sud, km: Math.hypot(est, sud) }
}
/** La distance comprimée : 0 km → au bord de la base ; 1,5 km → ≈ 5 m de maquette ; 15 km → ≈ 17 m ; 300 km → ≈ 37 m. */
export const COMPRESSION = { k: 7, d0: 1.5 } as const
export const rayonComprime = (km: number): number => COMPRESSION.k * Math.log(1 + Math.max(0, km) / COMPRESSION.d0)

const hacherC = (s: string): number => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0) / 4294967296
}
const arr = (v: number) => Math.round(v * 10) / 10

export type EntreePlacement = { id: string; geo: PointGeo | null }
export type Placement = { id: string; p: [number, number]; reel: boolean; km: number | null; ideal: [number, number] | null }
/**
 * Place chaque chantier sur une parcelle de la trame (multiples de 5,6 m), hors de l'enclos de la base :
 *   1. la référence est la base géocodée de l'artisan, sinon le barycentre des chantiers connus ;
 *   2. les chantiers connus, du plus proche au plus loin : le point IDÉAL est dans la vraie direction (est → +x, nord → −z), à la
 *      distance comprimée au-delà du bord de l'enclos ; la parcelle retenue est la parcelle LIBRE la plus proche de ce point ;
 *   3. les autres (adresse inconnue ou introuvable) prennent, dans l'ordre, les parcelles libres de la couronne de repli.
 * Déterministe : mêmes entrées → mêmes places ; jamais deux chantiers sur la même parcelle.
 */
export function placerChantiers(p: {
  base: PointGeo | null
  chantiers: readonly EntreePlacement[]
  /** Le centre de la base dessinée et la demi-emprise de l'enclos (la rue de ceinture), en mètres de maquette. */
  centre: readonly [number, number]
  demi: readonly [number, number]
  /** Une parcelle est-elle constructible (hors de l'enclos) ? */
  libre: (x: number, z: number) => boolean
  /** La couronne de repli, déjà ordonnée (la plus proche d'abord). */
  repli: readonly (readonly [number, number])[]
}): Placement[] {
  const connus = p.chantiers.filter((c) => estPointGeo(c.geo))
  const ref: PointGeo | null = estPointGeo(p.base) ? p.base
    : connus.length ? { lat: connus.reduce((s, c) => s + c.geo!.lat, 0) / connus.length, lng: connus.reduce((s, c) => s + c.geo!.lng, 0) / connus.length } : null
  const prises = new Set<string>()
  const cle = (x: number, z: number) => `${arr(x)}:${arr(z)}`
  const sortie = new Map<string, Placement>()
  if (ref) {
    const avecKm = connus.map((c) => ({ c, e: ecartKm(ref, c.geo!) })).sort((a, b) => a.e.km - b.e.km || a.c.id.localeCompare(b.c.id))
    for (const { c, e } of avecKm) {
      // À la même adresse que la base (moins de 50 m) : une direction stable tirée de l'identifiant.
      const theta = e.km < 0.05 ? hacherC(c.id) * 2 * Math.PI : Math.atan2(e.sud, e.est)
      const cos = Math.cos(theta), sin = Math.sin(theta)
      // Le bord de l'enclos dans cette direction, puis la rue de ceinture et une demi-parcelle.
      const bord = Math.min(Math.abs(cos) > 1e-9 ? p.demi[0] / Math.abs(cos) : Infinity, Math.abs(sin) > 1e-9 ? p.demi[1] / Math.abs(sin) : Infinity)
      const r = bord + PAS + rayonComprime(e.km)
      const ideal: [number, number] = [p.centre[0] + r * cos, p.centre[1] + r * sin]
      const i0 = Math.round(ideal[0] / PAS), j0 = Math.round(ideal[1] / PAS)
      // Les parcelles libres par anneaux autour du point idéal ; une fois la première trouvée, deux anneaux de plus suffisent
      // (aucune parcelle au-delà ne peut être plus proche) — la plus proche gagne, à égalité la plus à l'ouest puis la plus au nord.
      let choix: [number, number] | null = null, meilleur = Infinity, trouve = -1
      for (let anneau = 0; anneau <= 60 && (trouve < 0 || anneau <= trouve + 2); anneau++) {
        for (let di = -anneau; di <= anneau; di++) for (let dj = -anneau; dj <= anneau; dj++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== anneau) continue
          const x = arr((i0 + di) * PAS), z = arr((j0 + dj) * PAS)
          if (!p.libre(x, z) || prises.has(cle(x, z))) continue
          const d = Math.hypot(x - ideal[0], z - ideal[1])
          if (trouve < 0) trouve = anneau
          if (d < meilleur - 1e-9 || (Math.abs(d - meilleur) < 1e-9 && choix && (x < choix[0] || (x === choix[0] && z < choix[1])))) { meilleur = d; choix = [x, z] }
        }
      }
      if (!choix) continue
      prises.add(cle(choix[0], choix[1]))
      sortie.set(c.id, { id: c.id, p: choix, reel: true, km: Math.round(e.km * 10) / 10, ideal: [arr(ideal[0]), arr(ideal[1])] })
    }
  }
  const repli = p.repli.filter(([x, z]) => p.libre(x, z))
  let k = 0
  for (const c of p.chantiers) {
    if (sortie.has(c.id)) continue
    while (k < repli.length && prises.has(cle(repli[k][0], repli[k][1]))) k++
    if (k >= repli.length) break
    const [x, z] = repli[k]
    prises.add(cle(x, z))
    sortie.set(c.id, { id: c.id, p: [x, z], reel: false, km: null, ideal: null })
  }
  // L'ordre d'entrée est gardé (celui de la liste des chantiers) : la scène pose les objets dans cet ordre.
  return p.chantiers.map((c) => sortie.get(c.id)).filter((x): x is Placement => !!x)
}

/** L'étendue de la trame : les parcelles occupées et l'enclos, plus une couronne d'une parcelle (la carte grandit avec les chantiers). */
export function etendueTrame(cases: readonly (readonly [number, number])[], enclos: { x0: number; x1: number; z0: number; z1: number }, marge = 2): { xs: number[]; zs: number[] } {
  const xsC = cases.map((c) => c[0]), zsC = cases.map((c) => c[1])
  const iMin = Math.min(Math.floor(enclos.x0 / PAS) - marge, ...xsC.map((x) => Math.round(x / PAS) - marge))
  const iMax = Math.max(Math.ceil(enclos.x1 / PAS) + marge, ...xsC.map((x) => Math.round(x / PAS) + marge))
  const jMin = Math.min(Math.floor(enclos.z0 / PAS) - marge, ...zsC.map((z) => Math.round(z / PAS) - marge))
  const jMax = Math.max(Math.ceil(enclos.z1 / PAS) + marge, ...zsC.map((z) => Math.round(z / PAS) + marge))
  // Les rues passent ENTRE les parcelles : à mi-pas.
  const xs: number[] = [], zs: number[] = []
  for (let i = iMin; i < iMax; i++) xs.push(arr((i + 0.5) * PAS))
  for (let j = jMin; j < jMax; j++) zs.push(arr((j + 0.5) * PAS))
  return { xs, zs }
}

// ── 5. La Base Adresse Nationale (la requête et sa réponse ; l'appel est côté serveur) ─────────────────────────────────
export const BAN_URL = 'https://api-adresse.data.gouv.fr/search/'
/** Délai de réponse au-delà duquel on abandonne (une vue ne doit jamais attendre plus). */
export const BAN_DELAI_MS = 4000
/** Au plus 10 recherches par chargement de la vue (la base de l'artisan comprise). */
export const BAN_MAX_PAR_VUE = 10
/** Le score minimal d'une réponse (0 à 1) : en dessous, l'adresse est tenue pour introuvable. */
export const BAN_SCORE_MIN = 0.4
/**
 * Le texte envoyé : l'adresse, le code postal et la ville, RIEN d'autre (jamais le nom du client). null si trop court pour la BAN
 * (3 caractères) ; tronqué à 200 caractères (sa limite).
 */
export function requeteAdresse(a: { adresse?: string | null; code_postal?: string | null; ville?: string | null } | null | undefined): string | null {
  if (!a) return null
  const q = [a.adresse, a.code_postal, a.ville].map((s) => (s ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ')
  if (q.replace(/[^0-9A-Za-zÀ-ÿ]/g, '').length < 3) return null
  return q.slice(0, 200)
}
/** L'adresse complète d'appel (le seul paramètre `q` et `limit=1`). */
export const urlBan = (q: string): string => `${BAN_URL}?${new URLSearchParams({ q, limit: '1' }).toString()}`
/** La réponse GeoJSON de la BAN → un point, ou null (rien, score trop bas, coordonnées absurdes). */
export function lireReponseBan(json: unknown): PointGeo | null {
  const f = (json as { features?: { geometry?: { coordinates?: unknown[] }; properties?: { score?: unknown } }[] } | null)?.features?.[0]
  const co = f?.geometry?.coordinates
  if (!Array.isArray(co) || co.length < 2) return null
  const lng = Number(co[0]), lat = Number(co[1]), score = Number(f?.properties?.score ?? 0)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  if (!(score >= BAN_SCORE_MIN)) return null
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 }
}
/**
 * Une recherche à la BAN, avec un délai de 4 s. `fetchImpl` est injecté (les tests le simulent). Rend
 * `{ point }` (null : introuvable — on ne redemandera pas) ou `{ panne: true }` (réseau, délai, réponse illisible : on réessaiera).
 */
export async function chercherAdresse(q: string, fetchImpl: typeof fetch, delai = BAN_DELAI_MS): Promise<{ point: PointGeo | null } | { panne: true }> {
  const ctl = new AbortController()
  const minuteur = setTimeout(() => ctl.abort(), delai)
  try {
    const r = await fetchImpl(urlBan(q), { signal: ctl.signal, headers: { Accept: 'application/json' }, cache: 'no-store' })
    if (!r.ok) return r.status === 400 ? { point: null } : { panne: true }
    return { point: lireReponseBan(await r.json()) }
  } catch {
    return { panne: true }
  } finally {
    clearTimeout(minuteur)
  }
}

// ── 6. Se déplacer dans la carte (lot 8) : la cible de la caméra reste dans la carte, avec une marge ─────────────────────────────
/** Ramène la cible (x, z) dans l'emprise [min, max] élargie de `marge` : on ne perd jamais la carte de vue. */
export function bornerCible(p: readonly [number, number], b: { min: readonly [number, number]; max: readonly [number, number] }, marge = 6): [number, number] {
  const c = (v: number, a: number, z: number) => Math.min(z + marge, Math.max(a - marge, v))
  return [c(p[0], b.min[0], b.max[0]), c(p[1], b.min[1], b.max[1])]
}
