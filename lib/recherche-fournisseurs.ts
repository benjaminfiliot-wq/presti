import crypto from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import { genParams } from '@/lib/ai'
import { lireCache, ecrireCache, marquerHits, DOMAINES_PARTAGEABLES } from '@/lib/inventaire/cachePrix'
import { NOTE_ACCES_CONNEXION, domaineDe } from '@/lib/inventaire/liste-depart'
import type { Fournisseur } from '@/lib/inventaire/types'
import { resolveModel, type Tier } from '@/lib/models'

// L'assistant de recherche chez les fournisseurs (§8 F3) — le moteur.
//
// L'équivalent d'un employé qui ouvre trois onglets et note ce qu'il voit : l'assistant
// cherche (`web_search`, borné aux domaines des fournisseurs cochés), ouvre les fiches
// produit (`web_fetch`), et rapporte — fournisseur, désignation, prix TEL QU'AFFICHÉ,
// lien direct, extrait cité. Rien n'entre dans les données de l'artisan sans son clic
// « Retenir » (route `/recherche/retenir`).
//
// Anti-fabrication absolue : un prix n'est retenu que s'il figure dans l'extrait ET dans le
// texte des pages réellement récupérées par l'outil serveur. Sinon il n'existe pas, et le
// fournisseur passe dans « ce que je n'ai pas pu voir » — dit franchement, jamais comblé.
//
// Juridique (plan §8) : pages publiques, à la demande ; les outils serveur d'Anthropic
// respectent robots.txt. Depuis la migration 0056, les prix PUBLICS relevés chez trois enseignes
// vérifiées à la main sont mis en commun 72 h entre artisans (`lib/inventaire/cachePrix.ts`) :
// cela DIVISE le nombre de visites faites à ces sites au lieu de le multiplier. N'y entrent ni
// le nom que l'artisan donne à ses fournisseurs, ni ses tarifs négociés, ni ses requêtes longues
// (une désignation courte seulement, jamais un contexte de chantier).

export type HtOuTtc = 'HT' | 'TTC' | 'inconnu'

export type ResultatRecherche = {
  fournisseur: string
  fournisseur_id: string | null
  designation_vue: string
  reference: string | null
  /** Le montant lu sur la page, tel quel — jamais converti. */
  prix_vu: number
  ht_ou_ttc: HtOuTtc
  unite: string | null
  conditionnement: string | null
  disponibilite_vue: string | null
  /** Lien direct vers la page où le prix a été vu. */
  url: string
  /** Horodatage de l'observation (ISO), posé par le serveur. */
  vu_le: string
  /** 1-2 lignes CITÉES de la page, contenant le montant. */
  extrait: string
  /** Scellé serveur : prouve à /retenir que ce résultat sort bien du moteur, pour cet artisan. */
  sceau: string
}

export type NonVu = { fournisseur: string; fournisseur_id: string | null; raison: string }

export type SortieRecherche = {
  resultats: ResultatRecherche[]
  nonVus: NonVu[]
  tier: Tier
  model: string
  duree_ms: number
  /** Nombre d'appels à l'API (1 + reprises `pause_turn`). */
  appels: number
  /** Trace serveur (pages ouvertes, erreurs d'outil, rejets) — pour les journaux, jamais rendue au client. */
  journal: string[]
  /** Le service n'a pas répondu (solde d'API, coupure) ou a dépassé son temps — ce n'est pas « aucun prix trouvé ». */
  panne?: 'service' | 'delai'
  /** Les domaines servis depuis le cache mutualisé, donc sans aucun appel payant. */
  depuisCache?: string[]
}

export type EntreeRecherche = {
  /** Forcer une lecture fraîche : ignorer le cache mutualisé et aller voir maintenant. Sert aux
   *  tests, et à un artisan qui veut revérifier un prix qu'il juge dépassé. */
  sansCache?: boolean
  artisanId: string
  requete: string
  quantite?: number | null
  /** Les fournisseurs COCHÉS par l'artisan (avec leur fiche : url, prix_publics, ordre). */
  fournisseurs: Fournisseur[]
  tier: Tier
  /** Le vrai modèle, résolu par `resolveModel` côté route (jamais choisi ici). */
  model: string
  /** Budget total, en ms (défaut 50 s : sous `maxDuration = 60`). */
  budgetMs?: number
}

export const MAX_RESULTATS = 6
const BUDGET_MS_DEFAUT = 50_000
const MAX_REPRISES = 3
const MAX_FETCH = 4 // 8 auparavant : les pages s'empilent dans le contexte à chaque tour (242 000 tokens mesurés)

// ── Sceau ───────────────────────────────────────────────────────────────────────
// Clé dérivée d'un secret serveur : un client ne peut pas se fabriquer un résultat « vu par
// l'assistant » et le faire enregistrer par /retenir.
const CHAMPS_SCELLES = ['fournisseur', 'fournisseur_id', 'designation_vue', 'reference', 'prix_vu', 'ht_ou_ttc', 'unite', 'conditionnement', 'disponibilite_vue', 'url', 'vu_le', 'extrait'] as const
type Scellable = Pick<ResultatRecherche, (typeof CHAMPS_SCELLES)[number]>

function cleSceau(): Buffer {
  const secret = process.env.RECHERCHE_SCEAU_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return crypto.createHash('sha256').update(`presti-recherche-fournisseurs:${secret}`).digest()
}
export function sceller(artisanId: string, r: Scellable): string {
  const corps = JSON.stringify(CHAMPS_SCELLES.map((c) => r[c] ?? null))
  return crypto.createHmac('sha256', cleSceau()).update(`${artisanId}\n${corps}`).digest('hex')
}
export function sceauValide(artisanId: string, r: Scellable & { sceau?: unknown }): boolean {
  const attendu = Buffer.from(sceller(artisanId, r), 'utf8')
  // Comparer les OCTETS, pas les caractères : 64 lettres accentuées font 128 octets, et
  // `timingSafeEqual` jette alors au lieu de répondre « faux ». Un sceau invalide doit être
  // refusé proprement, jamais provoquer une erreur de service.
  const recu = Buffer.from(String(r.sceau ?? ''), 'utf8')
  return recu.length === attendu.length && crypto.timingSafeEqual(recu, attendu)
}

// ── Vérification « le montant est bien dans le texte » ──────────────────────────
/** Les écritures françaises d'un montant : 12,50 · 12.50 · 12,5 · 12€50 · 12 (si entier). */
export function ecrituresPrix(n: number): string[] {
  if (!Number.isFinite(n) || n < 0) return []
  const deux = n.toFixed(2)
  const [ent, dec] = deux.split('.')
  const out = new Set<string>([deux, deux.replace('.', ','), `${ent}€${dec}`, `${ent}€${dec[0]}`])
  if (dec === '00') { out.add(ent); out.add(`${ent}€`) }
  else if (dec.endsWith('0')) { out.add(`${ent},${dec[0]}`); out.add(`${ent}.${dec[0]}`) }
  return [...out]
}
const compact = (s: string) => s.replace(/[\s  ]+/g, '')
/** Vrai si l'une des écritures du montant apparaît dans le texte (espaces ignorés). */
export function prixDansTexte(prix: number, texte: string): boolean {
  if (!texte) return false
  const t = compact(texte)
  return ecrituresPrix(prix).some((e) => {
    const i = t.indexOf(compact(e))
    if (i < 0) return false
    // Pas une sous-chaîne d'un autre nombre (« 112,50 » ne valide pas 12,50).
    const avant = t[i - 1]
    return !(avant && /[\d.,]/.test(avant))
  })
}

// ── Nettoyage de la sortie du modèle ────────────────────────────────────────────
type Brut = {
  fournisseur?: unknown; designation_vue?: unknown; reference?: unknown; prix_vu?: unknown; ht_ou_ttc?: unknown
  unite?: unknown; conditionnement?: unknown; disponibilite_vue?: unknown; url?: unknown; extrait?: unknown
}
type SortieBrute = { resultats?: unknown; non_vus?: unknown }

const texte = (v: unknown, max: number): string | null => { const s = String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max); return s || null }
const nombre = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null
  const s = String(v ?? '').replace(/[^\d.,]/g, '').replace(',', '.')
  const n = Number(s)
  return s && Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}
const hote = (url: string): string | null => { try { return new URL(url).hostname.toLowerCase() } catch { return null } }
const sousDomaine = (h: string, d: string) => h === d || h.endsWith(`.${d}`)

export function extraireJson(raw: string): SortieBrute | null {
  const essai = (t: string): SortieBrute | null => { try { const v = JSON.parse(t); return v && typeof v === 'object' ? (v as SortieBrute) : null } catch { return null } }
  const s = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const direct = essai(s)
  if (direct) return direct
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a >= 0 && b > a) {
    const sub = s.slice(a, b + 1)
    return essai(sub) ?? essai(sub.replace(/,\s*([}\]])/g, '$1'))
  }
  return null
}

export type Cadre = {
  artisanId: string
  /** Fournisseurs interrogeables : fiche + domaine autorisé. */
  interrogeables: { f: Fournisseur; domaine: string }[]
  /** Texte des pages réellement récupérées, par URL. */
  pages: Map<string, string>
  vuLe: string
}

/**
 * Re-valide la sortie du modèle. Pure : testable sans appel réseau.
 * Un résultat n'est gardé que si : fournisseur coché, URL sur SON domaine, prix > 0,
 * extrait cité contenant le montant, et — dès qu'une page a été récupérée — montant présent
 * dans une page récupérée. Tout le reste est rejeté, et on dit pourquoi.
 */
export function validerSortie(brute: SortieBrute | null, cadre: Cadre): { resultats: ResultatRecherche[]; nonVus: NonVu[]; rejets: string[] } {
  const resultats: ResultatRecherche[] = []
  const nonVus: NonVu[] = []
  // Vrai si le plafond de résultats a coupé l'examen : les sites non atteints ne peuvent alors
  // PAS être présentés comme « rien trouvé » — ils n'ont pas été regardés.
  let tronque = false
  const rejets: string[] = []
  const vus = new Set<string>()
  const parNom = (nom: string) => cadre.interrogeables.find((i) => i.f.nom.toLowerCase() === nom.toLowerCase()) ?? cadre.interrogeables.find((i) => nom.toLowerCase().includes(i.f.nom.toLowerCase()) || i.f.nom.toLowerCase().includes(nom.toLowerCase()))
  const corpus = [...cadre.pages.values()].join('\n')

  for (const b of (Array.isArray(brute?.resultats) ? (brute!.resultats as Brut[]) : []).slice(0, 30)) {
    if (!b || typeof b !== 'object') continue
    const url = texte(b.url, 1000)
    const h = url && /^https?:\/\//i.test(url) ? hote(url) : null
    if (!url || !h) { rejets.push('lien absent ou invalide'); continue }
    // Le fournisseur est déduit du domaine du lien (plus sûr que le nom écrit par le modèle).
    const parDomaine = cadre.interrogeables.find((i) => sousDomaine(h, i.domaine))
    const i = parDomaine ?? parNom(String(b.fournisseur ?? ''))
    if (!i || !sousDomaine(h, i.domaine)) { rejets.push(`lien hors des sites cochés : ${h}`); continue }
    const prix = nombre(b.prix_vu)
    const extrait = texte(b.extrait, 600)
    const designation = texte(b.designation_vue, 300)
    if (!prix || !extrait || !designation) { rejets.push(`${i.f.nom} : prix, extrait ou désignation manquant`); continue }
    if (!prixDansTexte(prix, extrait)) { rejets.push(`${i.f.nom} : le montant ${prix} n’est pas dans l’extrait cité`); continue }
    if (cadre.pages.size > 0 && !prixDansTexte(prix, corpus)) { rejets.push(`${i.f.nom} : le montant ${prix} n’apparaît dans aucune page récupérée`); continue }
    if (resultats.length >= MAX_RESULTATS) { tronque = true; break }
    const ht = String(b.ht_ou_ttc ?? '').toUpperCase()
    const base: Scellable = {
      fournisseur: i.f.nom, fournisseur_id: i.f.id,
      designation_vue: designation, reference: texte(b.reference, 80),
      prix_vu: prix, ht_ou_ttc: ht === 'HT' ? 'HT' : ht === 'TTC' ? 'TTC' : 'inconnu',
      unite: texte(b.unite, 16), conditionnement: texte(b.conditionnement, 80),
      disponibilite_vue: texte(b.disponibilite_vue, 120),
      url, vu_le: cadre.vuLe, extrait,
    }
    resultats.push({ ...base, sceau: sceller(cadre.artisanId, base) })
    vus.add(i.f.id)
  }

  // Ce que le modèle dit n'avoir pas pu voir — repris tel quel, borné aux fournisseurs cochés.
  for (const n of (Array.isArray(brute?.non_vus) ? (brute!.non_vus as { fournisseur?: unknown; raison?: unknown }[]) : []).slice(0, 20)) {
    const i = parNom(String(n?.fournisseur ?? ''))
    if (!i || vus.has(i.f.id) || nonVus.some((x) => x.fournisseur_id === i.f.id)) continue
    nonVus.push({ fournisseur: i.f.nom, fournisseur_id: i.f.id, raison: texte(n?.raison, 240) ?? 'rien de lisible sur ce site' })
  }
  // Un fournisseur coché sans résultat ni explication : on le dit aussi.
  for (const i of cadre.interrogeables) {
    if (vus.has(i.f.id) || nonVus.some((x) => x.fournisseur_id === i.f.id)) continue
    nonVus.push({ fournisseur: i.f.nom, fournisseur_id: i.f.id, raison: tronque
      ? 'la recherche s’est arrêtée avant d’arriver jusqu’à ce site — relancez avec moins de fournisseurs cochés'
      : 'aucune fiche produit avec un prix lisible n’a été trouvée pour cette recherche' })
  }
  return { resultats, nonVus, rejets }
}

// ── Outils serveur ───────────────────────────────────────────────────────────────
// Variantes de base (`web_search_20250305` / `web_fetch_20250910`) pour TOUS les modèles :
// les variantes 20260209 (filtrage dynamique, Sonnet/Opus 4.6+ et 5) ajoutent une exécution
// de code côté serveur qui a fait dépasser le budget de 50 s en test (Sonnet 5 : > 50 s,
// contre 18 s pour Haiku en variante de base). Sous `maxDuration = 60`, la vitesse prime.
// Les blocs de résultat ont la même forme dans les deux variantes.
const modeleRecent = (model: string) => /claude-(opus|sonnet|fable)-(5($|-)|4-[6-9])/.test(model)
function outilsPour(domaines: string[]) {
  return [
    { type: 'web_search_20250305' as const, name: 'web_search' as const, allowed_domains: domaines, max_uses: Math.min(4, domaines.length + 1), user_location: { type: 'approximate' as const, country: 'FR', timezone: 'Europe/Paris' } },
    { type: 'web_fetch_20250910' as const, name: 'web_fetch' as const, allowed_domains: domaines, max_uses: MAX_FETCH, max_content_tokens: 6_000 },
  ]
}
/** Pro/Expert (lecture) : thinking adaptatif (genParams) mais effort bas — c'est de la lecture, pas du raisonnement, et le budget est de 50 s. */
function parametres(model: string) {
  const base = genParams(model, 4_000)
  return modeleRecent(model) ? { ...base, output_config: { effort: 'low' as const } } : base
}

function promptSysteme(interrogeables: Cadre['interrogeables'], quantite: number | null | undefined, mode: 'outils' | 'lecture' = 'outils'): string {
  const sites = interrogeables.map((i) => `- ${i.f.nom} → ${i.f.url} (domaine ${i.domaine})`).join('\n')
  return `Tu es l'assistant achats d'un artisan du bâtiment en France. Il te demande un matériau ; tu vas le chercher UNIQUEMENT sur les sites de ses fournisseurs ci-dessous, et tu rapportes exactement ce que tu as vu — comme un employé qui ouvre les onglets et note.

Sites autorisés (et rien d'autre) :
${sites}

Méthode :
${mode === 'outils' ? `1. Pour chaque site, lance web_search (résultats restreints à ces domaines) avec la désignation demandée ; ajoute le nom du site à la requête si utile.
2. Ouvre avec web_fetch les fiches produit les plus pertinentes — au moins 2 par site avant de conclure qu'il n'y a rien, jusqu'à 3. Ne retiens QUE ce qui est écrit sur la page ouverte.` : `1. Tu n'as PAS d'outils : les pages déjà ouvertes chez ces fournisseurs te sont fournies dans le message, chacune sous son URL.
2. Lis-les attentivement et ne retiens QUE ce qui y est écrit (désignation exacte, référence, prix, conditionnement, disponibilité). Un site sans page fournie, ou dont la page ne montre aucun prix, va dans non_vus.`}
3. Un prix affiché se rapporte TOUJOURS, même accompagné d'une mention (« prix pratiqué par le dépôt de X », « selon magasin », « n'est plus proposé à la vente en ligne », « retrait en magasin uniquement ») : le prix va dans prix_vu, la mention va, mot pour mot, dans disponibilite_vue. C'est à l'artisan de juger — pas à toi de taire un prix vu.
4. Réponds UNIQUEMENT par un objet JSON strict (pas de texte autour, pas de markdown) :
{"resultats":[{"fournisseur":"nom exact du site ci-dessus","designation_vue":"désignation exacte lue sur la fiche","reference":"référence lue ou null","prix_vu":12.5,"ht_ou_ttc":"HT|TTC|inconnu","unite":"u|m²|m|kg|lot… ou null","conditionnement":"ex. plaque 2,5 × 1,2 m, sac de 25 kg — ou null","disponibilite_vue":"ce qui est écrit sur la dispo, ou null","url":"URL directe de la fiche","extrait":"1 à 2 lignes COPIÉES de la page, contenant le prix tel qu'affiché"}],"non_vus":[{"fournisseur":"nom exact","raison":"ce qui a empêché de voir un prix"}]}

Règles absolues :
- prix_vu = le nombre lu sur la page, tel quel (jamais converti HT↔TTC, jamais estimé, jamais arrondi). ht_ou_ttc = ce que la page indique ; "inconnu" si rien n'est précisé.
- extrait = texte copié de la page (pas reformulé), il DOIT contenir le montant. Si tu ne peux pas citer un prix vu, le résultat n'existe pas : mets le site dans non_vus.
- Jamais de prix de mémoire, jamais de prix d'un autre site, jamais d'estimation « habituelle ». Un prix non vu n'existe pas.
- Un site qui exige une connexion, une page bloquée, une référence introuvable → non_vus avec la raison exacte.
- Au plus ${MAX_RESULTATS} résultats au total, les plus pertinents (produit correspondant, prix visible), 1 à 3 par site.${quantite ? `\n- Quantité souhaitée : ${quantite} — signale dans conditionnement si un lot/carton change le calcul, sans rien inventer.` : ''}`
}

// ── Le moteur ────────────────────────────────────────────────────────────────────
//
// Deux temps, pour tenir sous 50 s quel que soit le niveau :
//   1. NAVIGATION — toujours le modèle Standard (Haiku, ~18 s mesurés) avec les outils
//      serveur : il cherche, ouvre les fiches, et propose une première lecture.
//   2. LECTURE — pour Pro/Expert seulement : le modèle du niveau relit les pages récupérées
//      (sans outil, effort mesuré) et produit la sortie finale. Sonnet 5 avec les outils
//      dépassait 50 s en test ; en lecture pure il tient en ~10 s.
// Dans les deux cas, la même re-validation (`validerSortie`) s'applique : un prix absent
// des pages récupérées n'existe pas.
const client = new Anthropic()
const MODELE_NAVIGATION = resolveModel('standard', 'gratuit').model
const CARACTERES_PAR_PAGE = 12_000
const PAGES_LUES_MAX = 5

/**
 * Condense une page pour la lecture : l'en-tête (titre, désignation) puis des fenêtres de
 * texte autour de chaque « € » — c'est là que sont les prix et leurs mentions. Une page de
 * 27 000 caractères tronquée à son début peut ne plus montrer aucun prix ; condensée ainsi,
 * elle les montre tous. Pure, testable.
 */
export function condenserPage(txt: string, max = CARACTERES_PAR_PAGE): string {
  const t = txt.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
  if (t.length <= max) return t
  const tete = t.slice(0, Math.floor(max * 0.3))
  const morceaux: string[] = [tete]
  let total = tete.length
  let fin = tete.length
  for (let i = t.indexOf('€', fin); i >= 0 && total < max; i = t.indexOf('€', i + 1)) {
    const debut = Math.max(fin, i - 350), stop = Math.min(t.length, i + 250)
    if (stop <= fin) continue
    const m = t.slice(debut, stop)
    morceaux.push(m); total += m.length; fin = stop
  }
  return morceaux.join('\n[…]\n').slice(0, max)
}

type Appel = { rep: Anthropic.Message } | { erreur: string; delai: boolean }
async function appeler(params: Anthropic.MessageCreateParamsNonStreaming, timeoutMs: number): Promise<Appel> {
  try {
    // Pas de retry : un second essai après un délai dépassé sortirait du budget.
    return { rep: await client.messages.create(params, { timeout: timeoutMs, maxRetries: 0 }) }
  } catch (err) {
    const delai = err instanceof Anthropic.APIConnectionTimeoutError
    return { erreur: delai ? 'délai dépassé' : err instanceof Error ? err.message : String(err), delai }
  }
}

async function rechercherEnDirect(e: EntreeRecherche): Promise<SortieRecherche> {
  const debut = Date.now()
  const budget = e.budgetMs ?? BUDGET_MS_DEFAUT
  const restant = () => budget - (Date.now() - debut)
  const vuLe = new Date().toISOString()
  const nonVus: NonVu[] = []
  const interrogeables: Cadre['interrogeables'] = []
  const journal: string[] = []

  // Tri : sans prix publics → non vu d'emblée, sans appel. Sans URL → pareil.
  for (const f of e.fournisseurs) {
    const domaine = domaineDe(f.url)
    if (!f.prix_publics) { nonVus.push({ fournisseur: f.nom, fournisseur_id: f.id, raison: f.note_acces || NOTE_ACCES_CONNEXION }); continue }
    if (!domaine) { nonVus.push({ fournisseur: f.nom, fournisseur_id: f.id, raison: 'aucune adresse de site sur la fiche fournisseur' }); continue }
    interrogeables.push({ f, domaine })
  }
  // Déclarée AVANT `fini` : cette fonction la lit, et elle est appelée dès la ligne suivante
  // (aucun fournisseur interrogeable) — une déclaration plus bas plantait en zone morte.
  let panne: 'service' | 'delai' | null = null
  const requete = e.requete.trim().slice(0, 300)
  const fini = (resultats: ResultatRecherche[], nv: NonVu[], appels: number): SortieRecherche =>
    ({ resultats, nonVus: [...nonVus, ...nv], tier: e.tier, model: e.model, duree_ms: Date.now() - debut, appels, journal, ...(panne ? { panne } : {}) })
  if (!interrogeables.length || !requete) return fini([], [], 0)
  const tousNonVus = (raison: string) => interrogeables.map((i) => ({ fournisseur: i.f.nom, fournisseur_id: i.f.id, raison }))

  const domaines = [...new Set(interrogeables.map((i) => i.domaine))]
  const tools = outilsPour(domaines)
  const lectureSeparee = e.model !== MODELE_NAVIGATION
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: `Je cherche : ${requete}${e.quantite ? ` (quantité : ${e.quantite})` : ''}` }]
  const pages = new Map<string, string>()
  let appels = 0
  let texteFinal = ''

  // ── 1. Navigation. Boucle serveur : sur `pause_turn`, on renvoie la conversation telle
  // quelle et le serveur reprend — dans la limite du budget (réduit si une lecture suit).
  const budgetNavigation = lectureSeparee ? Math.min(budget, 32_000) : budget
  for (let reprise = 0; reprise <= MAX_REPRISES; reprise++) {
    const dispo = budgetNavigation - (Date.now() - debut)
    if (dispo < 5_000) break
    appels++
    const a = await appeler({ ...parametres(MODELE_NAVIGATION), system: promptSysteme(interrogeables, e.quantite, 'outils'), tools, messages }, dispo)
    if ('erreur' in a) {
      journal.push(`navigation ✗ ${a.erreur}`)
      // Le service lui-même est en panne (solde d'API épuisé, clé invalide, coupure) : ce n'est
      // PAS « les fournisseurs n'ont rien ». L'écran doit le dire, sinon l'artisan croit que
      // ses fournisseurs n'affichent pas de prix et recommence pour rien.
      panne = a.delai ? 'delai' : /credit balance|rate_limit|authentication|invalid x-api-key|overloaded|billing/i.test(a.erreur) ? 'service' : 'service'
      console.error('[recherche-fournisseurs]', journal[journal.length - 1])
      return fini([], tousNonVus(a.delai ? 'l’assistant n’a pas terminé sa lecture dans le temps imparti (50 s) — relancez avec moins de fournisseurs cochés' : 'le service de recherche n’a pas répondu — réessayez dans un instant'), appels)
    }
    const rep = a.rep
    texteFinal = ''
    for (const bloc of rep.content) {
      if (bloc.type === 'text') texteFinal += bloc.text
      else if (bloc.type === 'server_tool_use') journal.push(`${bloc.name} ${JSON.stringify(bloc.input).slice(0, 160)}`)
      else if (bloc.type === 'web_search_tool_result') journal.push(Array.isArray(bloc.content) ? `search → ${bloc.content.length} résultat(s)` : `search ✗ ${bloc.content.error_code}`)
      else if (bloc.type === 'web_fetch_tool_result') {
        if (bloc.content.type === 'web_fetch_result' && bloc.content.content.source.type === 'text') {
          pages.set(bloc.content.url, bloc.content.content.source.data)
          journal.push(`fetch ✓ ${bloc.content.url} (${bloc.content.content.source.data.length} car.)`)
        } else journal.push(`fetch ✗ ${bloc.content.type === 'web_fetch_tool_result_error' ? bloc.content.error_code : bloc.content.type}`)
      }
    }
    journal.push(`navigation ${appels} (${MODELE_NAVIGATION}) : stop=${rep.stop_reason}, ${rep.usage.input_tokens}+${rep.usage.output_tokens} tokens`)
    if (rep.stop_reason !== 'pause_turn') break
    messages.push({ role: 'assistant', content: rep.content })
  }

  const cadre: Cadre = { artisanId: e.artisanId, interrogeables, pages, vuLe }
  const v1 = validerSortie(extraireJson(texteFinal), cadre)
  journal.push(...v1.rejets.map((r) => `rejet navigation : ${r}`))

  // ── 2. Lecture par le modèle du niveau (Pro/Expert), sur les pages récupérées.
  if (lectureSeparee && pages.size > 0 && restant() >= 12_000) {
    const extraits = [...pages.entries()].slice(0, PAGES_LUES_MAX)
      .map(([url, txt]) => `### Page : ${url}\n${condenserPage(txt)}`)
      .join('\n\n')
    appels++
    const a = await appeler({
      ...parametres(e.model), system: promptSysteme(interrogeables, e.quantite, 'lecture'),
      messages: [{ role: 'user', content: `Je cherche : ${requete}${e.quantite ? ` (quantité : ${e.quantite})` : ''}\n\nPages ouvertes chez mes fournisseurs :\n\n${extraits}` }],
    }, restant())
    if ('erreur' in a) {
      journal.push(`lecture ✗ ${a.erreur} — on garde la lecture de navigation`)
      console.error('[recherche-fournisseurs]', journal[journal.length - 1])
    } else {
      const texte2 = a.rep.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
      journal.push(`lecture (${e.model}) : stop=${a.rep.stop_reason}, ${a.rep.usage.input_tokens}+${a.rep.usage.output_tokens} tokens`)
      const v2 = validerSortie(extraireJson(texte2), cadre)
      journal.push(...v2.rejets.map((r) => `rejet lecture : ${r}`))
      if (v2.resultats.length || !v1.resultats.length) {
        if (journal.some((j) => /^rejet/.test(j))) console.warn('[recherche-fournisseurs] rejets :', journal.filter((j) => /^rejet/.test(j)).join(' | '))
        return fini(v2.resultats, v2.nonVus, appels)
      }
      journal.push('lecture sans résultat validé — on garde la lecture de navigation')
    }
  } else if (lectureSeparee) {
    journal.push(pages.size ? `lecture sautée : ${Math.round(restant() / 1000)} s restantes` : 'lecture sautée : aucune page récupérée')
  }

  if (v1.rejets.length) console.warn('[recherche-fournisseurs] rejets :', v1.rejets.join(' | '))
  return fini(v1.resultats, v1.nonVus, appels)
}


/**
 * La recherche telle que le reste du produit l'appelle. Elle consulte d'abord le CACHE MUTUALISÉ
 * (migration 0056) : ce qu'un autre artisan a fait voir chez Castorama il y a deux heures n'a
 * aucune raison d'être repayé. Ce qui manque seulement est lu en direct, puis rangé pour les
 * suivants.
 *
 * Trois précautions, chacune payée d'une erreur possible :
 * · Les résultats du cache sont RE-SCELLÉS pour l'artisan qui lit — le sceau est lié à lui, et
 *   sans cela son clic « Retenir » n'enregistrerait rien, sans le moindre message.
 * · Leur date de lecture d'origine est conservée telle quelle. La re-dater ferait signer une
 *   date fausse par le serveur, qui s'écrirait ensuite dans ses observations de prix.
 * · Rien n'est rangé après une panne : mettre un échec en cache le figerait trois jours.
 */
export async function rechercherChezFournisseurs(e: EntreeRecherche): Promise<SortieRecherche> {
  const debut = Date.now()

  // Le fournisseur de CET artisan, par domaine — c'est lui qui reprend son nom et son identifiant
  // sur un résultat venu d'ailleurs. Seuls les domaines à prix publics sont concernés.
  const parDomaine = new Map<string, Fournisseur>()
  for (const f of e.fournisseurs) {
    const d = domaineDe(f.url)
    if (f.prix_publics && d && DOMAINES_PARTAGEABLES.has(d) && !parDomaine.has(d)) parDomaine.set(d, f)
  }

  const cache = parDomaine.size && !e.sansCache ? await lireCache(e.requete, [...parDomaine.keys()]) : new Map()
  const resultatsCache: ResultatRecherche[] = []
  const nonVusCache: NonVu[] = []
  const domainesServis: string[] = []
  const servis = new Set<string>()
  for (const [domaine, entree] of cache) {
    const f = parDomaine.get(domaine)
    if (!f) continue
    domainesServis.push(domaine)
    servis.add(f.id)
    for (const r of entree.resultats) {
      const base = { ...r, fournisseur: f.nom, fournisseur_id: f.id }
      resultatsCache.push({ ...base, sceau: sceller(e.artisanId, base) })
    }
    if (entree.raisonNonVu) nonVusCache.push({ fournisseur: f.nom, fournisseur_id: f.id, raison: entree.raisonNonVu })
  }
  if (domainesServis.length) marquerHits(e.requete, domainesServis)

  // Exclure par DOMAINE et non par fiche : un artisan peut avoir deux fiches sur le même site
  // (« Casto Marans » et « Casto La Rochelle »). Filtrer sur l'identifiant en laissait passer une,
  // qui refaisait payer une lecture déjà servie par le cache.
  const domainesServisSet = new Set(domainesServis)
  const restants = e.fournisseurs.filter((f) => {
    const d = domaineDe(f.url)
    return !(d && domainesServisSet.has(d))
  })
  const journalCache = domainesServis.length ? [`cache : ${domainesServis.join(', ')} servis sans appel`] : []

  // Tout était déjà connu : aucune requête, aucun crédit, réponse immédiate.
  if (!restants.length) {
    return {
      resultats: resultatsCache, nonVus: nonVusCache, tier: e.tier, model: e.model,
      duree_ms: Date.now() - debut, appels: 0, journal: journalCache, depuisCache: domainesServis,
    }
  }

  const direct = await rechercherEnDirect({ ...e, fournisseurs: restants })

  // Ranger ce qui vient d'être vu, pour les artisans suivants. Jamais après une panne : on
  // figerait un échec. `prix_publics` est revérifié à l'écriture, pas seulement à l'appel.
  if (!direct.panne) {
    const parDom = new Map<string, { domaine: string; prixPublics: boolean; resultats: ResultatRecherche[]; raisonNonVu: string | null }>()
    for (const f of restants) {
      const d = domaineDe(f.url)
      if (!d || !DOMAINES_PARTAGEABLES.has(d) || parDom.has(d)) continue
      parDom.set(d, { domaine: d, prixPublics: f.prix_publics === true, resultats: [], raisonNonVu: null })
      parDom.get(d)!.resultats = direct.resultats.filter((r) => domaineDe(r.url) === d)
    }
    const aRanger = [...parDom.values()].filter((x) => x.resultats.length || x.raisonNonVu)
    if (aRanger.length) void ecrireCache(e.requete, aRanger, e.tier)
  }

  return {
    ...direct,
    resultats: [...resultatsCache, ...direct.resultats],
    nonVus: [...nonVusCache, ...direct.nonVus],
    duree_ms: Date.now() - debut,
    journal: [...journalCache, ...direct.journal],
    depuisCache: domainesServis,
  }
}
