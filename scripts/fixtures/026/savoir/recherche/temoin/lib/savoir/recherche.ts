// TÉMOIN (026-232) de lib/savoir/recherche.ts — l'implémentation de référence du contrat que juge
// scripts/savoir-recherche-qa.mjs (SVR-1 à SVR-9, SVR-11, SVR-12). 026-233 écrit la vraie ; ce fichier ne sert qu'au juge.
//
// Le savoir d'abord (les classes de l'agent, filtrées à la demande ET au retour), le web ensuite (Firecrawl sous la
// réserve de crédits, la question telle quelle), Perplexity en dernier (plan et coût nul constatés), jamais une donnée
// personnelle dans une requête web, chaque résultat avec sa source, un événement `savoir_recherche` par appel.
// 28/09, relecture (026-229) : la classe `interne` ne va jamais vers un moteur gratuit ; seul du public part au web.
// Toutes les E/S passent par `deps` : aucun fetch ici, aucun second client Firecrawl.
import { createHash, randomBytes } from 'node:crypto'
import { lireAvecFirecrawl } from '@/lib/agents/lectureFirecrawl'
import { MOTEUR_DE } from '@/lib/agents/moteurs'
import { normaliser } from '@/lib/savoir/index'

function geler<T>(valeur: T): T {
  if (valeur !== null && typeof valeur === 'object' && !Object.isFrozen(valeur)) {
    Object.freeze(valeur)
    for (const v of Object.values(valeur as Record<string, unknown>)) geler(v)
  }
  return valeur
}

export const PLAFONDS_RECHERCHE = geler({
  questionSignes: [3, 300] as [number, number],
  resultats: 8,
  extraitSignes: 600,
  savoirParAgentEtJour: 200,
  webParAgentEtJour: 10,
  pagesWebParRecherche: 3,
  perplexityParJour: 5,
  perplexityParRecherche: 1,
  besoinsParReponse: 2,
  relances: 1,
  creditsParLecture: 1,
  creditsParRecherche: 2,
})
export const RECHERCHE_WEB_DE: readonly string[] = geler(['chef', 'douleurs', 'redacteur_site', 'studio'])
/** Score (BM25) sous lequel le meilleur résultat du savoir ne suffit pas. */
export const SEUIL_SAVOIR = 2

export type Classe = 'public' | 'interne' | 'prospects'
const CLASSES: readonly Classe[] = ['public', 'interne', 'prospects']
// 28/09, relecture : `interne` seulement vers Codex, un modèle local ou Claude ; `prospects` seulement vers Codex ou local.
const MOTEURS_INTERNE = new Set(['codex', 'ollama_local', 'claude'])
const MOTEURS_PROSPECTS = new Set(['codex', 'ollama_local'])

export type EntreeMoteurRecherche = { moteur: string; personnelles: boolean }
export type SourceSavoir = { racine: string; chemin: string; debut: number; fin: number; classe: Classe; sha256: string; synchronise_le: string }
export type SourceWeb = { url: string; url_finale: string; lu_le: string; methode: string; robots: string }
export type SourcePerplexity = { url: string; lu_le: string; via: 'perplexity' }
export type ResultatRecherche =
  | { origine: 'savoir'; extrait: string; source: SourceSavoir }
  | { origine: 'web'; extrait: string; source: SourceWeb }
  | { origine: 'perplexity'; extrait: string; source: SourcePerplexity }
export type EtatWeb = { etat: 'non_demande' | 'ferme' | 'indisponible' | 'refuse' | 'fait'; raison?: string; credits: number; requetes: number }
export type RetourRecherche = { id: string; agent: string; question_sha256: string; resultats: ResultatRecherche[]; web: EtatWeb; refus?: string }
export type DemandeRecherche = { agent: string; question: string; web?: boolean; classes?: readonly string[] }
export type Interrupteur = { actif: boolean; depuis?: string | null; accord?: string | null }
export type ReglagesSavoir = {
  interrupteurs?: Partial<Record<string, Interrupteur>>
  perplexity?: { plan: string | null; cout_par_requete_eur: number | null; source?: string | null; constate_le: string | null }
  [cle: string]: unknown
}
export type PageLue = { texte: string; url_finale: string; methode: string; horodatage: string; robots: string }
export type TransportFirecrawl = {
  chercher(requete: string): Promise<{ resultats: Array<{ url: string; titre?: string }> } | { refus: string }>
  lire(url: string): Promise<PageLue | { refus: string }>
}
export type TransportPerplexity = (question: string) => Promise<{ reponse: string; citations: Array<string | { url: string }> } | { refus: string }>
export type ResultatSavoirBrut = { texte: string; score: number; source?: Partial<SourceSavoir> }
export type DepsRecherche = {
  savoir(question: string, options: { k: number; classes: Classe[] }): Promise<ResultatSavoirBrut[]> | ResultatSavoirBrut[]
  moteurs?: Readonly<Record<string, Readonly<EntreeMoteurRecherche>>>
  reglages: ReglagesSavoir
  nomsProspects?: readonly string[]
  firecrawl?: TransportFirecrawl
  perplexity?: TransportPerplexity
  /** Compteurs du jour, modifiés en place : `savoir:<agent>`, `web:<agent>`, `perplexity`. */
  compteurs: Record<string, number>
  /** Réserve de crédits Firecrawl restante, décomptée en place. */
  credits: { restant: number }
  journal(evenement: { type: string; objet: string; resume: string }): Promise<unknown> | unknown
  horloge: { maintenant(): number }
}
export type Lecteur = (systeme: string, donnees: unknown) => Promise<unknown>

export function classesPour(agent: string, moteurs: Readonly<Record<string, Readonly<EntreeMoteurRecherche>>> = MOTEUR_DE): Classe[] {
  const e = Object.hasOwn(moteurs, agent) ? moteurs[agent] : undefined
  if (!e) return ['public']
  const moteur = String(e.moteur).toLowerCase()
  if (!MOTEURS_INTERNE.has(moteur) || /(:|-)cloud$/.test(moteur)) return ['public']
  if (e.personnelles === true && MOTEURS_PROSPECTS.has(moteur)) return ['public', 'interne', 'prospects']
  return ['public', 'interne']
}

const RE_ADRESSE = /[A-Za-z0-9._%+-]+(?:@|%40)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/
const RE_NUMERO = /(?<!\d)(?:\+33[\s.-]?|0033[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}(?!\d)/
const RE_SIREN = /(?<!\d)\d{3}[ .]?\d{3}[ .]?\d{3}(?:[ .]?\d{5})?(?!\d)/g
function luhn(chiffres: string): boolean {
  let t = 0
  for (let i = 0; i < chiffres.length; i++) {
    let d = Number(chiffres[chiffres.length - 1 - i])
    if (i % 2) { d *= 2; if (d > 9) d -= 9 }
    t += d
  }
  return chiffres.length > 0 && t % 10 === 0
}
export function refusDonneePersonnelle(question: string, nomsProspects: readonly string[] = []): 'adresse' | 'numero' | 'siren' | 'nom_prospect' | null {
  const q = String(question ?? '')
  if (RE_ADRESSE.test(q)) return 'adresse'
  if (RE_NUMERO.test(q)) return 'numero'
  for (const m of q.matchAll(RE_SIREN)) if (luhn(m[0].replace(/\D/g, ''))) return 'siren'
  const jetons = normaliser(q)
  for (const nom of nomsProspects) {
    const n = normaliser(String(nom ?? ''))
    if (!n.length) continue
    for (let i = 0; i + n.length <= jetons.length; i++) if (n.every((t, k) => jetons[i + k] === t)) return 'nom_prospect'
  }
  return null
}

const empreinte = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex')
const estDate = (s: unknown): boolean => typeof s === 'string' && Number.isFinite(Date.parse(s))
const estUrl = (s: unknown): boolean => { if (typeof s !== 'string') return false; try { return ['http:', 'https:'].includes(new URL(s).protocol) } catch { return false } }
const texteNonVide = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0

function sourceSavoir(s: Partial<SourceSavoir> | undefined): SourceSavoir | null {
  if (!s || typeof s !== 'object') return null
  if (!texteNonVide(s.racine) || !texteNonVide(s.chemin)) return null
  if (!Number.isInteger(s.debut) || !Number.isInteger(s.fin) || (s.debut as number) < 1 || (s.fin as number) < (s.debut as number)) return null
  if (!CLASSES.includes(s.classe as Classe)) return null
  if (typeof s.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(s.sha256)) return null
  if (!estDate(s.synchronise_le)) return null
  return { racine: s.racine, chemin: s.chemin, debut: s.debut as number, fin: s.fin as number, classe: s.classe as Classe, sha256: s.sha256, synchronise_le: s.synchronise_le as string }
}
function actif(reglages: ReglagesSavoir, nom: string): boolean {
  return reglages?.interrupteurs?.[nom]?.actif === true
}
/** Raison de fermeture de Perplexity, ou null s'il est permis. */
function perplexityFerme(deps: DepsRecherche, maintenant: number): string | null {
  if (!deps.perplexity) return 'perplexity_absent'
  if (!actif(deps.reglages, 'perplexity')) return 'perplexity_eteint'
  const p = deps.reglages.perplexity
  if (!p || !texteNonVide(p.plan)) return 'perplexity_plan'
  if (p.cout_par_requete_eur !== 0) return 'perplexity_cout'
  const constat = typeof p.constate_le === 'string' ? Date.parse(p.constate_le) : NaN
  if (!Number.isFinite(constat) || constat > maintenant || maintenant - constat > 30 * 86_400_000) return 'perplexity_constat'
  if ((deps.compteurs.perplexity ?? 0) >= PLAFONDS_RECHERCHE.perplexityParJour) return 'perplexity_plafond'
  return null
}
function identifiant(maintenant: number): string {
  return `r${new Date(maintenant).toISOString().replace(/\D/g, '').slice(0, 14)}-${randomBytes(4).toString('hex')}`
}

export async function chercher(demande: DemandeRecherche, deps: DepsRecherche): Promise<RetourRecherche> {
  const P = PLAFONDS_RECHERCHE
  const agent = String(demande?.agent ?? '')
  const question = typeof demande?.question === 'string' ? demande.question : ''
  const maintenant = deps.horloge.maintenant()
  const id = identifiant(maintenant)
  const web: EtatWeb = { etat: 'non_demande', credits: 0, requetes: 0 }
  const retour: RetourRecherche = { id, agent, question_sha256: empreinte(question), resultats: [], web }
  const incr = (cle: string): void => { deps.compteurs[cle] = (deps.compteurs[cle] ?? 0) + 1 }

  const longueur = question.trim().length
  if (longueur < P.questionSignes[0] || longueur > P.questionSignes[1]) {
    retour.refus = 'question_hors_bornes'
    await journaliser(retour, deps)
    return retour
  }

  // 1. Le savoir d'abord, dans les classes de l'agent (restreintes par la demande, jamais élargies).
  let classes = classesPour(agent, deps.moteurs ?? MOTEUR_DE)
  if (Array.isArray(demande.classes)) classes = classes.filter((c) => demande.classes!.includes(c))
  const retenus: Array<{ score: number; r: ResultatRecherche }> = []
  const cleSavoir = `savoir:${agent}`
  if (classes.length && (deps.compteurs[cleSavoir] ?? 0) < P.savoirParAgentEtJour) {
    incr(cleSavoir)
    let bruts: unknown = []
    try { bruts = await deps.savoir(question, { k: P.resultats, classes: [...classes] }) } catch { bruts = [] }
    for (const b of Array.isArray(bruts) ? (bruts as ResultatSavoirBrut[]) : []) {
      const source = sourceSavoir(b?.source)
      if (!source || !classes.includes(source.classe)) continue // filtre au retour : la cloison ne dépend pas du savoir
      if (!texteNonVide(b.texte)) continue
      retenus.push({ score: Number.isFinite(b.score) ? b.score : 0, r: { origine: 'savoir', extrait: b.texte.slice(0, P.extraitSignes), source } })
    }
  }
  retenus.sort((a, b) => b.score - a.score)
  const savoir = retenus.slice(0, P.resultats)
  retour.resultats.push(...savoir.map((x) => x.r))
  const suffisant = savoir.length >= 2 && savoir[0].score >= SEUIL_SAVOIR

  // 2. Le web ensuite : la question telle quelle, jamais augmentée d'un extrait (seul du public part au web).
  if (demande.web === true) {
    const genre = refusDonneePersonnelle(question, deps.nomsProspects ?? [])
    const fermer = (raison: string): void => { web.etat = 'ferme'; web.raison = raison }
    if (genre) { web.etat = 'refuse'; web.raison = genre; retour.refus = 'donnee_personnelle' }
    else if (!RECHERCHE_WEB_DE.includes(agent)) fermer('agent')
    else if (!actif(deps.reglages, 'recherche_web')) fermer('interrupteur')
    else if (suffisant) fermer('savoir_suffisant')
    else if ((deps.compteurs[`web:${agent}`] ?? 0) >= P.webParAgentEtJour) fermer('plafond')
    else {
      let compte = false
      const compter = (): void => { if (!compte) { incr(`web:${agent}`); compte = true } }
      const place = (): boolean => retour.resultats.length < P.resultats
      let rendus = 0
      let etat: EtatWeb['etat'] = 'ferme'
      let raison: string | undefined
      if (!deps.firecrawl) { etat = 'indisponible'; raison = 'transport' }
      else if (deps.credits.restant < P.creditsParRecherche) { etat = 'ferme'; raison = 'credits' }
      else {
        compter()
        deps.credits.restant -= P.creditsParRecherche
        web.credits += P.creditsParRecherche
        web.requetes += 1
        let trouves: Awaited<ReturnType<TransportFirecrawl['chercher']>> | null = null
        try { trouves = await deps.firecrawl.chercher(question) } catch { trouves = null }
        if (!trouves || 'refus' in trouves || !Array.isArray(trouves.resultats)) { etat = 'indisponible'; raison = 'firecrawl' }
        else {
          etat = 'fait'
          const urls = trouves.resultats.map((x) => x?.url).filter(estUrl).slice(0, P.pagesWebParRecherche)
          for (const url of urls) {
            if (!place() || deps.credits.restant < P.creditsParLecture) break
            deps.credits.restant -= P.creditsParLecture
            web.credits += P.creditsParLecture
            web.requetes += 1
            let page: Awaited<ReturnType<TransportFirecrawl['lire']>> | null = null
            try { page = await deps.firecrawl.lire(url) } catch { page = null }
            if (!page || 'refus' in page) continue
            if (!texteNonVide(page.texte) || !estUrl(page.url_finale) || !estDate(page.horodatage) || !texteNonVide(page.methode) || !texteNonVide(page.robots)) continue
            retour.resultats.push({ origine: 'web', extrait: page.texte.slice(0, P.extraitSignes), source: { url, url_finale: page.url_finale, lu_le: page.horodatage, methode: page.methode, robots: page.robots } })
            rendus++
          }
        }
      }
      // 3. Perplexity en dernier, seulement si Firecrawl n'a rien rendu, une fois par appel.
      if (rendus === 0 && place()) {
        const pourquoi = perplexityFerme(deps, maintenant)
        if (!pourquoi) {
          compter()
          incr('perplexity')
          web.requetes += 1
          etat = 'fait'
          let rep: Awaited<ReturnType<TransportPerplexity>> | null = null
          try { rep = await deps.perplexity!(question) } catch { rep = null }
          if (rep && !('refus' in rep) && texteNonVide(rep.reponse) && Array.isArray(rep.citations)) {
            const lu_le = new Date(maintenant).toISOString()
            for (const c of rep.citations) {
              const url = typeof c === 'string' ? c : c?.url
              if (!estUrl(url) || !place()) continue
              retour.resultats.push({ origine: 'perplexity', extrait: rep.reponse.slice(0, P.extraitSignes), source: { url: url as string, lu_le, via: 'perplexity' } })
            }
          }
        } else if (etat === 'fait' && !raison) raison = pourquoi
      }
      web.etat = etat
      if (raison) web.raison = raison
    }
  }
  await journaliser(retour, deps)
  return retour
}

/** Un seul événement par appel, sans la question ni un extrait. */
async function journaliser(retour: RetourRecherche, deps: DepsRecherche): Promise<void> {
  const nSavoir = retour.resultats.filter((r) => r.origine === 'savoir').length
  const nWeb = retour.resultats.length - nSavoir
  let resume = `${retour.resultats.length} résultat(s) · savoir ${nSavoir} · web ${nWeb} · ${retour.web.credits} crédit(s)`
  if (retour.refus) resume += ` · refus ${retour.refus}`
  await deps.journal({ type: 'savoir_recherche', objet: `recherche:${retour.id}`, resume: resume.slice(0, 200) })
}

function besoinsDe(reponse: unknown): string[] {
  let r = reponse
  if (typeof r === 'string') { try { r = JSON.parse(r) } catch { return [] } }
  if (!r || typeof r !== 'object') return []
  const b = (r as { besoins_recherche?: unknown }).besoins_recherche
  return Array.isArray(b) ? b.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []
}

/** Enveloppe un lecteur : le modèle demande (deux besoins au plus), l'outil cherche, le lecteur est rappelé une fois. */
export function avecRecherche(lecteur: Lecteur, agent: string, deps: DepsRecherche): Lecteur {
  return async (systeme, donnees) => {
    const premiere = await lecteur(systeme, donnees)
    const besoins = besoinsDe(premiere).slice(0, PLAFONDS_RECHERCHE.besoinsParReponse)
    if (!besoins.length) return premiere
    const web = RECHERCHE_WEB_DE.includes(agent)
    const resultats_recherche: Array<{ question: string; resultats: ResultatRecherche[]; refus?: string }> = []
    for (const question of besoins) {
      const r = await chercher({ agent, question, web }, deps)
      resultats_recherche.push({ question, resultats: r.resultats, ...(r.refus ? { refus: r.refus } : {}) })
    }
    const enrichies = donnees && typeof donnees === 'object' && !Array.isArray(donnees)
      ? { ...(donnees as Record<string, unknown>), resultats_recherche }
      : { donnees, resultats_recherche }
    return lecteur(systeme, enrichies) // une relance, une seule : ses besoins_recherche sont ignorés
  }
}

/** Le transport Firecrawl réel : la seule porte, `lireAvecFirecrawl` (026-223 : robots, conditions, repli, provenance). */
export function firecrawlPar(depsLecture: Parameters<typeof lireAvecFirecrawl>[1]): TransportFirecrawl {
  return {
    chercher: (requete) => lireAvecFirecrawl({ operation: 'chercher', requete }, depsLecture),
    lire: (url) => lireAvecFirecrawl({ operation: 'lire', url }, depsLecture),
  }
}
