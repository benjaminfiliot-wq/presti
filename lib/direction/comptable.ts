// lib/direction/comptable.ts — le Comptable (fiche 026-243) : un volet du Trésorier, sous l'identité de bus `tresorier`.
//
// Ce que ce module ajoute à lib/direction/tresorerie.ts (qu'il IMPORTE, sans copier son calcul : l'alerte et le dépassement du
// seuil viennent de `situerTva`) :
//   · rapprocher        — chaque paiement Stripe réussi du mois ↔ une vente (sites_commandes, packs_pubs) ou un abonnement,
//                         par leur identifiant externe, jamais par l'ordre ; orphelins et écarts nommés, doublons comptés une fois ;
//   · seuilFranchise    — le cumul de l'année civile, fait des seules recettes rapprochées, contre le seuil DATÉ (art. 293 B) ;
//   · preparerDeclaration — le montant par période, PUR : jamais un dépôt, jamais un paiement, la TVA reste à 0 ;
//   · libelle           — un texte court par MOTEUR_DE (Codex ou le local, `personnelles: true`), repli fixe sinon.
//
// Lecture seule. La clé Stripe est une clé RESTREINTE (`rk_…`, variable STRIPE_CLE_LECTURE_COMPTABLE) : la clé du Checkout, qui
// écrit, n'est jamais lue ici, et une clé qui ne commence pas par `rk_` est refusée. Aucune méthode d'écriture Stripe n'est
// appelée, aucun fichier n'est écrit, aucune mention de TVA n'est touchée (les trois changements arrivent ENSEMBLE, le jour de
// l'immatriculation, par Benj ou Claude Code). Aucun effet de bord à l'import : tout ce qui touche une clé, la base ou le
// réseau est chargé à l'appel, et seulement si l'appelant n'a pas fourni ses propres données (le juge, scripts/comptable-qa.mjs,
// les fournit toutes : voir scripts/fixtures/026/comptable/CONTRAT.md).
//
// Les montants sont des ENTIERS en centimes. Les dates sont des jours `AAAA-MM-JJ` à l'heure de Paris.
import { createHash } from 'node:crypto'
import { situerTva } from '@/lib/direction/tresorerie'
import { MOTEUR_DE } from '@/lib/agents/moteurs'

export const AGENT = 'tresorier'
/** Ce que rend `libelle` quand aucun moteur autorisé ne répond. */
export const LIBELLE_FIXE = 'Encaissement rapproché'

export type Evenement = { id: string; type: string; status?: string; amount: number; created: string; charge?: string; client?: string }
export type Vente = { id?: string; paiement_id: string; prix_cents: number }
export type Ventes = { commandes: readonly Vente[]; abonnements: readonly Vente[] }
export type SeuilDate = { valeur_cents: number; source: string; date_source: string; alerte_pourcent?: number }
export type Recette = { id: string; montant: number; date: string }
export type Ecart = Recette & { attendu: number }
export type Rapprochement = { periode: string; recettes: Recette[]; orphelins: Recette[]; ecarts: Ecart[] }
export type LigneJournal = { cle: string; type: string; montant: number }
export type Journal = { ajouter(ligne: LigneJournal): unknown }
export type ConfigMoteur = { moteur?: string; modele?: string; personnelles?: boolean }
export type Deps = {
  /** Les événements normalisés du client Stripe de lecture. Absents : lus par la clé restreinte. */
  evenements?: readonly Evenement[]
  ventes?: Ventes
  seuil?: SeuilDate
  /** L'horodatage de préparation (ISO). Absent : l'instant de l'appel. */
  maintenant?: string
  journal?: Journal
  MOTEUR_DE?: Readonly<Record<string, ConfigMoteur | undefined>>
  moteur?: (evenement: unknown, configuration: ConfigMoteur) => Promise<string> | string
  /** Un client Stripe de lecture (liste de charges) à la place de celui de la clé restreinte. */
  stripe?: unknown
}

export class ErreurComptable extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'ErreurComptable'
  }
}

// ── les périodes et les jours ─────────────────────────────────────────────────────────────────────────────────────────────
const PERIODE = /^\d{4}-(0[1-9]|1[0-2])$/
const JOUR_DE_PARIS = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })

function verifierPeriode(periode: string): void {
  if (typeof periode !== 'string' || !PERIODE.test(periode)) throw new ErreurComptable('periode', 'Période attendue : AAAA-MM.')
}
/** Le mois en cours, à l'heure de Paris. */
export const periodeCourante = (): string => JOUR_DE_PARIS.format(new Date()).slice(0, 7)
const jourDe = (secondes: number): string => JOUR_DE_PARIS.format(new Date(secondes * 1000))

// ── le rapprochement : un calcul, sans effet ─────────────────────────────────────────────────────────────────────────────
function rapprocherEvenements(evenements: readonly Evenement[], ventes: Ventes, dans: (jour: string) => boolean) {
  const parPaiement = new Map<string, Vente>()
  for (const v of [...ventes.commandes, ...ventes.abonnements]) if (!parPaiement.has(v.paiement_id)) parPaiement.set(v.paiement_id, v)

  // Un remboursement diminue la recette de SON paiement ; il n'est jamais une recette. Deux fois le même : une seule.
  const rembourse = new Map<string, number>()
  const remboursementsVus = new Set<string>()
  for (const e of evenements) {
    if (e.type !== 'remboursement' || !e.charge || remboursementsVus.has(e.id)) continue
    remboursementsVus.add(e.id)
    rembourse.set(e.charge, (rembourse.get(e.charge) ?? 0) + e.amount)
  }

  const vus = new Set<string>()
  const recettes: Recette[] = [], orphelins: Recette[] = [], ecarts: Ecart[] = []
  for (const e of evenements) {
    if (e.type !== 'paiement' || e.status !== 'succeeded' || vus.has(e.id)) continue
    vus.add(e.id)
    const date = String(e.created).slice(0, 10)
    if (!dans(date)) continue
    const vente = parPaiement.get(e.id)
    if (!vente) { orphelins.push({ id: e.id, montant: e.amount, date }); continue }
    if (vente.prix_cents !== e.amount) { ecarts.push({ id: e.id, montant: e.amount, date, attendu: vente.prix_cents }); continue }
    recettes.push({ id: e.id, montant: Math.max(0, e.amount - (rembourse.get(e.id) ?? 0)), date })
  }
  return { recettes, orphelins, ecarts }
}

// ── la lecture de Stripe (clé restreinte, lecture seule) et de la base ───────────────────────────────────────────────────
type PageStripe = { data: Record<string, unknown>[]; has_more: boolean }
type ClientLecture = { charges: { list(params: Record<string, unknown>, options?: Record<string, unknown>): Promise<PageStripe> } }
const PAGES_MAX = 30

async function clientLecture(deps: Deps): Promise<ClientLecture> {
  if (deps.stripe) return deps.stripe as ClientLecture
  const cle = process.env.STRIPE_CLE_LECTURE_COMPTABLE
  if (!cle) throw new ErreurComptable('cle_absente', 'Clé Stripe de lecture du Comptable absente.')
  // Une clé qui peut écrire (sk_…) n'entre jamais ici : seule une clé restreinte, créée pour la lecture.
  if (!cle.startsWith('rk_')) throw new ErreurComptable('cle_non_restreinte', 'La clé du Comptable doit être une clé restreinte en lecture.')
  const { default: Stripe } = await import('stripe')
  return new Stripe(cle, { maxNetworkRetries: 0, timeout: 20_000 }) as unknown as ClientLecture
}

async function lireEvenements(periode: string, deps: Deps): Promise<Evenement[]> {
  const client = await clientLecture(deps)
  const annee = Number(periode.slice(0, 4)), mois = Number(periode.slice(5, 7))
  // Large d'un jour de chaque côté : le tri par jour de Paris se fait ensuite, ici.
  const debut = Math.floor(Date.UTC(annee, 0, 1) / 1000) - 86_400
  const fin = Math.floor(Date.UTC(annee, mois, 1) / 1000) + 86_400
  const charges: Record<string, unknown>[] = []
  let apres: string | undefined, complet = false
  for (let page = 0; page < PAGES_MAX && !complet; page++) {
    const l = await client.charges.list({ limit: 100, created: { gte: debut, lte: fin }, ...(apres ? { starting_after: apres } : {}) }, { timeout: 20_000, maxNetworkRetries: 0 })
    charges.push(...l.data)
    complet = !l.has_more || !l.data.length
    if (!complet) apres = String(l.data[l.data.length - 1].id)
  }
  // Une lecture tronquée sous-compterait le cumul du seuil, en silence : mieux vaut ne rien rendre.
  if (!complet) throw new ErreurComptable('lecture_incomplete', 'Trop de paiements pour une lecture complète.')

  const sortie: Evenement[] = []
  for (const c of charges) {
    if (c.status !== 'succeeded' || c.paid !== true || c.currency !== 'eur') continue
    // Le paiement s'identifie comme sur la vente : l'intention de paiement quand il y en a une, sinon la charge.
    const id = typeof c.payment_intent === 'string' && c.payment_intent ? c.payment_intent : String(c.id)
    const created = jourDe(Number(c.created))
    const client_ = typeof c.customer === 'string' ? c.customer : undefined
    sortie.push({ id, type: 'paiement', status: 'succeeded', amount: Number(c.amount), created, ...(client_ ? { client: client_ } : {}) })
    const rembourse = Number(c.amount_refunded) || 0
    if (rembourse > 0) sortie.push({ id: `re_${id}`, type: 'remboursement', amount: rembourse, created, charge: id })
  }
  return sortie
}

async function lireVentes(evenements: readonly Evenement[]): Promise<Ventes> {
  const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
  const [sites, packs, abonnes] = await Promise.all([
    supabaseAdmin.from('sites_commandes').select('id, prix_cents, stripe_payment_intent_id').not('stripe_payment_intent_id', 'is', null).limit(5000),
    supabaseAdmin.from('packs_pubs').select('id, prix_cents, stripe_payment_intent_id').not('stripe_payment_intent_id', 'is', null).limit(5000),
    supabaseAdmin.from('artisans').select('stripe_customer_id').not('stripe_subscription_id', 'is', null).limit(5000),
  ])
  if (sites.error || packs.error || abonnes.error) throw new ErreurComptable('base', 'Base indisponible.')
  const commandes: Vente[] = []
  for (const l of [...(sites.data ?? []), ...(packs.data ?? [])]) {
    if (l.stripe_payment_intent_id) commandes.push({ id: String(l.id), paiement_id: String(l.stripe_payment_intent_id), prix_cents: Number(l.prix_cents) })
  }
  // Un abonnement : un paiement d'un client Stripe que la base connaît comme abonné, et qui n'est pas une vente.
  const clientsAbonnes = new Set((abonnes.data ?? []).map(a => a.stripe_customer_id).filter(Boolean))
  const connus = new Set(commandes.map(v => v.paiement_id))
  const abonnements: Vente[] = []
  for (const e of evenements) {
    if (e.type === 'paiement' && e.client && clientsAbonnes.has(e.client) && !connus.has(e.id)) abonnements.push({ paiement_id: e.id, prix_cents: e.amount })
  }
  return { commandes, abonnements }
}

/** Le seuil de franchise en vigueur, tel que la même source que la tuile Argent le porte (reglages_globaux), avec sa date. */
export async function seuilDeLaBase(): Promise<SeuilDate> {
  const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
  const r = await supabaseAdmin.from('reglages_globaux').select('cle, valeur, en_vigueur_le, maj_le').in('cle', ['tva_seuil_franchise_cents', 'tva_alerte_pourcent'])
  if (r.error) throw new ErreurComptable('base', 'Base indisponible.')
  const ligne = (r.data ?? []).find(l => l.cle === 'tva_seuil_franchise_cents')
  const valeur = Number(ligne?.valeur)
  if (!ligne || !Number.isFinite(valeur) || valeur <= 0) throw new ErreurComptable('seuil_absent', 'Seuil de franchise absent des réglages.')
  const date = String(ligne.en_vigueur_le ?? ligne.maj_le ?? '').slice(0, 10)
  if (!date) throw new ErreurComptable('seuil_non_date', 'Seuil de franchise sans date.')
  const alerte = Number((r.data ?? []).find(l => l.cle === 'tva_alerte_pourcent')?.valeur)
  return {
    valeur_cents: valeur,
    source: ligne.en_vigueur_le ? 'reglages_globaux : en vigueur le' : 'reglages_globaux : mis à jour le',
    date_source: date,
    ...(Number.isFinite(alerte) && alerte > 0 ? { alerte_pourcent: alerte } : {}),
  }
}

/** Les événements et les ventes de l'année en cours jusqu'à la période, lus UNE fois : à repasser aux trois calculs. */
export async function preparerDonnees(periode: string, deps: Deps = {}): Promise<Deps & { evenements: readonly Evenement[]; ventes: Ventes }> {
  verifierPeriode(periode)
  const evenements = deps.evenements ?? await lireEvenements(periode, deps)
  const ventes = deps.ventes ?? await lireVentes(evenements)
  return { ...deps, evenements, ventes }
}

async function calculer(periode: string, deps: Deps) {
  const { evenements, ventes } = await preparerDonnees(periode, deps)
  return rapprocherEvenements(evenements, ventes, jour => jour.slice(0, 7) === periode)
}

/** UN seul calcul du total : la déclaration et la tuile Recettes le partagent. */
async function totalRecettes(periode: string, deps: Deps): Promise<number> {
  const { recettes } = await calculer(periode, deps)
  return recettes.reduce((somme, r) => somme + r.montant, 0)
}

// ── le journal : une ligne par recette rapprochée, une seule fois ────────────────────────────────────────────────────────
const UN_AN_EN_SECONDES = 31_536_000

async function journalParDefaut(): Promise<Journal> {
  const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
  const bus = await import('@/lib/agents/bus')
  return {
    async ajouter(ligne: LigneJournal) {
      // L'identifiant Stripe ne va pas dans le journal : seulement son empreinte. La clé est posée UNE fois (consommer_limite,
      // plafond 1) : un second passage sur la même période ne duplique rien.
      const empreinte = createHash('sha256').update(ligne.cle).digest('hex').slice(0, 24)
      const periode = ligne.cle.split(':')[0]
      const garde = await supabaseAdmin.rpc('consommer_limite', { p_cle: `comptable:${empreinte}`, p_max: 1, p_fenetre_s: UN_AN_EN_SECONDES })
      if (garde.error) throw new ErreurComptable('journal', 'Journal indisponible.')
      if (garde.data !== true) return
      const r = await bus.ops_evenement_ajouter({ p_agent: AGENT, p_type: ligne.type, p_objet: `comptable:${periode}:${empreinte}`, p_resume: `Rapprochement ${periode} : encaissement de ${(ligne.montant / 100).toFixed(2)} €` })
      if (!r.ok) throw new ErreurComptable('journal', 'Journal indisponible.')
    },
  }
}

// ── l'interface publique ────────────────────────────────────────────────────────────────────────────────────────────────
/** Rapproche les paiements Stripe du mois de leurs ventes, et journalise chaque recette rapprochée (idempotent par période). */
export async function rapprocher(periode: string, deps: Deps = {}): Promise<Rapprochement> {
  const resultat = await calculer(periode, deps)
  const journal = deps.journal ?? await journalParDefaut()
  for (const recette of resultat.recettes) await journal.ajouter({ cle: `${periode}:${recette.id}`, type: 'rapprochement', montant: recette.montant })
  return { periode, ...resultat }
}

/** Le cumul de l'année civile (recettes rapprochées seulement, jusqu'à la fin de la période) contre le seuil daté. */
export async function seuilFranchise(periode: string, deps: Deps = {}) {
  const seuil = deps.seuil ?? await seuilDeLaBase()
  if (!seuil || !seuil.source || !seuil.date_source) throw new ErreurComptable('seuil_non_date', 'Le seuil de franchise exige une source datée.')
  if (!Number.isFinite(seuil.valeur_cents) || seuil.valeur_cents <= 0) throw new ErreurComptable('seuil_absent', 'Seuil de franchise invalide.')
  const { evenements, ventes } = await preparerDonnees(periode, deps)
  const annee = periode.slice(0, 4)
  const { recettes } = rapprocherEvenements(evenements, ventes, jour => jour.slice(0, 4) === annee && jour.slice(0, 7) <= periode)
  let cumul = 0
  let franchi_le: string | null = null
  for (const r of [...recettes].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    cumul += r.montant
    if (franchi_le === null && cumul >= seuil.valeur_cents) franchi_le = r.date
  }
  // L'alerte et le dépassement sont ceux de la tuile Argent (situerTva), pas un second calcul.
  const reglages: Record<string, number | string> = { tva_seuil_franchise_cents: seuil.valeur_cents }
  if (typeof seuil.alerte_pourcent === 'number') reglages.tva_alerte_pourcent = seuil.alerte_pourcent
  const t = situerTva(cumul, reglages)
  const alerte: 'seuil_depasse' | 'approche_seuil' | null = t.depasse ? 'seuil_depasse' : t.alerte ? 'approche_seuil' : null
  return { periode, cumul, seuil: t.seuil, pourcentage: cumul / seuil.valeur_cents * 100, alerte, franchi_le, source: seuil.source, date_source: seuil.date_source }
}

/** Le montant de la période, PRÉPARÉ pour que Benj le déclare lui-même : ni dépôt, ni paiement, ni journal, TVA à 0. */
export async function preparerDeclaration(periode: string, deps: Deps = {}) {
  const recettes = await totalRecettes(periode, deps)
  return { periode, recettes, tva: 0, source: 'rapprochement' as const, prepare_le: deps.maintenant ?? new Date().toISOString() }
}

/** Le total que montrerait une tuile Recettes : le même calcul que la déclaration. */
export async function recettesTuile(periode: string, deps: Deps = {}) {
  return totalRecettes(periode, deps)
}

// ── le libellé : Codex ou le local seulement, jamais un moteur gratuit ni un modèle :cloud ────────────────────────────────
const CONSIGNE = 'Écris, en français et en une phrase courte, le libellé de cet événement comptable. Réponds par un JSON {"libelle":"…"}.'

async function moteurParDefaut(evenement: unknown): Promise<string> {
  // La pause générale se lit AVANT tout appel au modèle (garde-pause-qa GP-2) : sous pause ou dans le doute, `libelle` retombe sur
  // le libellé fixe, sans aucun appel. Chargée à l'appel comme le reste : aucun effet de bord à l'import.
  const { sortiePermise } = await import('@/lib/agents/sortie')
  if (!(await sortiePermise()).permise) throw new ErreurComptable('moteur', 'Pause générale : aucun appel au modèle.')
  const { creerLecteur } = await import('@/lib/agents/llm')
  const lecteur = creerLecteur('comptable')
  if (!lecteur) throw new ErreurComptable('moteur', 'Aucun moteur autorisé pour le Comptable.')
  const e = (evenement && typeof evenement === 'object' ? evenement : {}) as Record<string, unknown>
  // Au modèle : le type, la période et le montant, rien d'autre (ni identifiant, ni client).
  const donnees = { type: String(e.type ?? 'rapprochement').slice(0, 40), periode: String(e.periode ?? '').slice(0, 7), montant_cents: Number.isInteger(e.montant) ? e.montant : null }
  const brut = await lecteur(CONSIGNE, donnees)
  const texte = typeof brut === 'string' ? brut : (brut as { libelle?: unknown } | null)?.libelle
  if (typeof texte !== 'string' || !texte.trim()) throw new ErreurComptable('moteur', 'Réponse vide.')
  return texte.trim().slice(0, 200)
}

export async function libelle(evenement: unknown, deps: Deps = {}): Promise<string> {
  const configuration = (deps.MOTEUR_DE ?? MOTEUR_DE).comptable
  const autorise = configuration?.personnelles === true
    && (configuration.moteur === 'codex' || configuration.moteur === 'ollama_local')
    && !String(configuration.modele ?? '').includes(':cloud')
  if (autorise && configuration) {
    try {
      const texte = await (deps.moteur ?? moteurParDefaut)(evenement, configuration)
      if (typeof texte === 'string' && texte.trim()) return texte.trim()
    } catch { /* repli fixe */ }
  }
  return LIBELLE_FIXE
}
