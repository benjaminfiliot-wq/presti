// lib/agents/relais.ts — le relais unique des moteurs d'IA des agents (ordre de Benj du 05/10/2026 : « l'équipe doit tourner via la
// TOTALITÉ des IA »). Une porte, `creerLecteurRelais(agent, options, deps)`, qui rend un lecteur de même forme que celui de
// `creerLecteur` (lib/agents/llm.ts) mais qui, devant un moteur à bout, bascule au suivant sans perdre la tâche.
//
// L'ordre, selon la NATURE de la donnée :
//   publique : Codex (abonnement) → freellmapi (« auto ») → Ollama Cloud → Ollama local 8B → 4B ;
//   prospect : Codex (abonnement) → Ollama LOCAL (8B puis 4B) seulement, et seulement après le « oui » daté de Benj
//              (IA_LOCALE_PROSPECTS_OUI, inchangé). JAMAIS freellmapi ni un modèle :cloud — verrou structurel (CHAINE) ET garde au
//              moment de l'appel (moteurPermis), deux fois.
// Le Facteur ne se replie pas : son second juge est étalonné sur « codex:gpt-6-luna » seul (secondJuge.ts), un autre modèle serait refusé.
//
// Un moteur à bout (429, « usage limit », 401/402/403, connexion refusée, délai) est mis de côté pour une durée, MÉMORISÉE dans un
// petit fichier : chaque passage d'un agent est un nouveau processus. Quand Codex revient (échéance passée, ou la sonde suivante
// réussit), le relais le reprend tout seul : il est toujours le premier de la chaîne.
// Trace non sensible (jamais une donnée, une réponse ni un secret) : une ligne JSON par tentative dans le journal du relais, et le
// coût (0 €) inscrit comme avant avec le moteur, le modèle et l'issue.
//
// Ce module n'invente aucune clé : FL_KEY (freellmapi) vient de l'environnement ou du fichier de clé du compte qui le possède, jamais
// d'un coffre d'agent, jamais affichée. Réservé à Claude Code : moteurs, données personnelles et argent (CLAUDE.md:23).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { MODELES_LOCAUX, MODELES_OLLAMA_CLOUD, MOTEUR_DE, REPLI, TRAVAIL_DE } from './moteurs'
import {
  COUT_VOIE_EUROS, PLAFONDS, TRAVAUX_OLLAMA_8B, ErreurMoteur, lireCodexLanceur, valeurLanceurCodex, appelerCodex, calculerEcheanceMs, coutValide, emballerDonnees,
  enregistrerCoutReel, estDrapeauLeve, leconsDeLAgent, modeleCodexPour, plafondAutorise, retirerCoordonnees, verifierPlafondReel,
  type DepsLecteur, type Lecteur, type OptionsLecteur, type RetourCout,
} from './llm'
import { consigneAvecLecons } from './lecons'

// ── vocabulaire ──────────────────────────────────────────────────────────────────────────────────────────────────────
export type Nature = 'publique' | 'prospect'
export type IdMoteur = 'codex' | 'freellmapi' | 'ollama_cloud' | 'ollama_8b' | 'ollama_4b'
export type Raison = 'quota' | 'non_autorise' | 'indisponible' | 'delai' | 'sortie_invalide' | 'refuse'

/** L'ordre des moteurs par nature. Gelé : un prospect n'a jamais freellmapi ni Ollama Cloud dans sa chaîne. */
export const CHAINE: Readonly<Record<Nature, readonly IdMoteur[]>> = Object.freeze({
  publique: Object.freeze(['codex', 'freellmapi', 'ollama_cloud', 'ollama_8b', 'ollama_4b'] as IdMoteur[]),
  prospect: Object.freeze(['codex', 'ollama_8b', 'ollama_4b'] as IdMoteur[]),
})

/** Les seuls moteurs qui peuvent recevoir une donnée de prospect : l'abonnement payant et la machine locale de l'usine. */
const MOTEURS_PROSPECT: ReadonlySet<IdMoteur> = new Set<IdMoteur>(['codex', 'ollama_8b', 'ollama_4b'])
/** Garde posée AU MOMENT de l'appel (la chaîne ci-dessus est la première). */
export function moteurPermis(moteur: IdMoteur, nature: Nature): boolean {
  return nature === 'prospect' ? MOTEURS_PROSPECT.has(moteur) : true
}

/** Agents dont le résultat dépend de QUI répond (étalonnage par modèle) : aucun repli, Codex seul. */
export const SANS_REPLI: ReadonlySet<string> = new Set(['facteur'])

const MODELE_CLOUD = MODELES_OLLAMA_CLOUD[0]
const MODELE_8B = MODELES_LOCAUX[1]
const MODELE_4B = MODELES_LOCAUX[0]
const MODELE_FREELLMAPI = 'auto'
const modeleDe = (m: IdMoteur): string => (m === 'freellmapi' ? MODELE_FREELLMAPI : m === 'ollama_cloud' ? MODELE_CLOUD : m === 'ollama_8b' ? MODELE_8B : MODELE_4B)

/** Une voie de coût au sens de llm.ts (liste fermée) : tous les moteurs du relais valent 0 €, Ollama Cloud compris (compte gratuit). */
const COUT_RELAIS: Readonly<Record<string, number>> = Object.freeze({ ...COUT_VOIE_EUROS, ollama_cloud: 0 })
const voieDeCout = (m: IdMoteur): string => (m === 'ollama_8b' || m === 'ollama_4b' ? 'ollama_local' : m)

// ── la politique d'un agent ──────────────────────────────────────────────────────────────────────────────────────────
export type Politique = { agent: string; nature: Nature; travail: string; repli: boolean; premier?: IdMoteur; localGrand: boolean }

/** Ce que le relais sait d'un agent (MOTEUR_DE + TRAVAIL_DE + REPLI), ou null : le chef (affichage) et les agents sans modèle n'ont pas de lecteur. */
export function politiqueDe(agent: string): Politique | null {
  const entree = MOTEUR_DE[agent]
  if (!entree || entree.affichage) return null
  const travail = TRAVAIL_DE[agent]
  if (!travail) return null
  const nature: Nature = entree.personnelles ? 'prospect' : 'publique'
  const premiere = REPLI[travail]?.voies?.[0]
  const premier: IdMoteur | undefined = nature === 'publique' && (typeof premiere === 'string' ? premiere : premiere?.id) === 'freellmapi' ? 'freellmapi' : undefined
  return { agent, nature, travail, repli: !SANS_REPLI.has(agent), premier, localGrand: TRAVAUX_OLLAMA_8B.has(travail) }
}

/** La nature ne se baisse jamais : un agent de prospects reste de prospects, une consigne peut seulement la relever. */
export function natureEffective(base: Nature, demandee?: Nature): Nature {
  return base === 'prospect' || demandee === 'prospect' ? 'prospect' : 'publique'
}

/** La chaîne ordonnée pour un agent et une nature. Pure. */
export function construireChaine(p: Politique, nature: Nature): IdMoteur[] {
  if (!p.repli) return ['codex']
  let chaine = [...CHAINE[nature]]
  if (!p.localGrand) {
    // Tâche simple : le petit modèle, resté chaud en mémoire, d'abord (changer de modèle coûte ~2 min de chargement sur l'usine).
    const i8 = chaine.indexOf('ollama_8b'), i4 = chaine.indexOf('ollama_4b')
    if (i8 >= 0 && i4 >= 0) { chaine[i8] = 'ollama_4b'; chaine[i4] = 'ollama_8b' }
  }
  if (p.premier && nature === 'publique' && chaine.includes(p.premier)) chaine = [p.premier, ...chaine.filter((m) => m !== p.premier)]
  return chaine
}

// ── la mémoire des moteurs à bout ────────────────────────────────────────────────────────────────────────────────────
export type EtatMoteur = { jusqua: number; raison: Raison; vu: string }
export type EtatRelais = Partial<Record<IdMoteur, EtatMoteur>>
export type MagasinEtat = { lire: () => EtatRelais; ecrire: (etat: EtatRelais) => void }

const MINUTE = 60_000
const HEURE = 60 * MINUTE

/** Jusqu'à quand un moteur est mis de côté après un échec (en ms absolues), ou 0 : pas de mise de côté. Pure. */
export function echeanceDeMiseDeCote(moteur: IdMoteur, raison: Raison, maintenant: number, jusquaMs?: number): number {
  const local = moteur === 'ollama_8b' || moteur === 'ollama_4b'
  if (raison === 'sortie_invalide' || raison === 'refuse') return 0
  if (raison === 'quota') {
    if (moteur === 'codex') return Math.min(Math.max(jusquaMs ?? 0, maintenant + 15 * MINUTE), maintenant + 6 * HEURE) // re-sondé au plus tard dans 6 h
    if (moteur === 'ollama_cloud') return maintenant + 6 * HEURE
    if (moteur === 'freellmapi') return jusquaMs ? Math.min(Math.max(jusquaMs, maintenant + MINUTE), maintenant + HEURE) : maintenant + 5 * MINUTE
    return maintenant + 2 * MINUTE
  }
  if (raison === 'non_autorise') return local ? maintenant + 2 * MINUTE : maintenant + HEURE
  return maintenant + (local ? 2 : 5) * MINUTE // indisponible, délai
}

/** Sur l'usine : ~/travail/relais (le dossier des agents, lu par presti-journal). Ailleurs (le poste, les essais) : un dossier temporaire. */
function dossierParDefaut(env: NodeJS.ProcessEnv): string {
  if (env.IA_RELAIS_DOSSIER) return env.IA_RELAIS_DOSSIER
  return surLUsine(env) ? path.join(env.HOME || os.homedir(), 'travail', 'relais') : path.join(os.tmpdir(), 'presti-relais')
}

/** Magasin dans un fichier (etat-moteurs.json) : une panne d'écriture ne bloque jamais un appel (mémoire du processus seulement). */
export function magasinFichier(dossier: string): MagasinEtat {
  const fichier = path.join(dossier, 'etat-moteurs.json')
  let secours: EtatRelais = {}
  return {
    lire: () => {
      try {
        const j = JSON.parse(fs.readFileSync(fichier, 'utf8')) as { moteurs?: EtatRelais }
        return j && typeof j.moteurs === 'object' && j.moteurs ? j.moteurs : {}
      } catch { return secours }
    },
    ecrire: (etat) => {
      secours = etat
      try {
        fs.mkdirSync(dossier, { recursive: true })
        const tmp = `${fichier}.${process.pid}.tmp`
        fs.writeFileSync(tmp, JSON.stringify({ moteurs: etat }), { mode: 0o600 })
        fs.renameSync(tmp, fichier)
      } catch { /* mesure facultative */ }
    },
  }
}

export type LigneJournal = { le: string; agent: string; nature: Nature; moteur: IdMoteur; modele?: string; issue: 'ok' | 'bascule' | 'saute'; raison?: string; ms?: number; jusqua?: string }
export type JournalRelais = (ligne: LigneJournal) => void

/** Journal en lignes JSON (relais-AAAA-MM-JJ.jsonl) : jamais une donnée, une réponse ni un secret. Silencieux en cas de panne. */
export function journalFichier(dossier: string, maintenant: () => number = Date.now): JournalRelais {
  return (ligne) => {
    try {
      fs.mkdirSync(dossier, { recursive: true })
      const jour = new Date(maintenant()).toISOString().slice(0, 10)
      fs.appendFileSync(path.join(dossier, `relais-${jour}.jsonl`), `${JSON.stringify(ligne)}\n`, { mode: 0o600 })
    } catch { /* mesure facultative */ }
  }
}

// ── configuration lue dans l'environnement (jamais de secret affiché) ────────────────────────────────────────────────
function urlLocale(valeur: string | undefined): string | null {
  if (!valeur) return null
  try {
    const u = new URL(valeur)
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost' ? valeur : null
  } catch { return null }
}
const avecV1 = (base: string): string => { const b = base.replace(/\/+$/, ''); return /\/v1$/.test(b) ? b : `${b}/v1` }
/** Sur l'usine (hôte déclaré, ou lanceur de la file IA posé), les adresses locales par défaut valent : l'unité n'a rien d'autre à poser. */
function surLUsine(env: NodeJS.ProcessEnv): boolean {
  return env.PRESTI_HOTE === 'usine' || /presti-ia-modele$/.test(valeurLanceurCodex(env))
}
function lireCleFichier(env: NodeJS.ProcessEnv): string | null {
  try { return fs.readFileSync(path.join(env.HOME || os.homedir(), '.config', 'presti', 'freellmapi.key'), 'utf8').trim() || null } catch { return null }
}

type Config = {
  codex: string | null
  ollama: string | null
  freellmapi: { url: string; cle: string | null } | null
}
function configurer(env: NodeJS.ProcessEnv, lireCle: () => string | null): Config {
  const usine = surLUsine(env)
  const ollamaBrut = urlLocale(env.OLLAMA_URL) ?? (usine ? 'http://127.0.0.1:11434' : null)
  const freeExplicite = urlLocale(env.FREELLMAPI_URL)
  const freeBrut = freeExplicite ?? (usine ? 'http://127.0.0.1:3001' : null)
  const cleEnv = typeof env.FL_KEY === 'string' && env.FL_KEY.trim() ? env.FL_KEY.trim() : null
  const cle = cleEnv ?? (freeBrut ? lireCle() : null)
  // Sans clé, freellmapi n'est utilisable que par une adresse posée à dessein (un relais qui injecte lui-même la clé).
  const free = freeBrut && (cle || freeExplicite) ? { url: avecV1(freeBrut), cle } : null
  return { codex: lireCodexLanceur(env), ollama: ollamaBrut ? avecV1(ollamaBrut) : null, freellmapi: free }
}

function disponible(m: IdMoteur, nature: Nature, c: Config, drapeau: boolean): boolean {
  if (!moteurPermis(m, nature)) return false
  if (m === 'codex') return c.codex !== null
  if (m === 'freellmapi') return c.freellmapi !== null
  if (m === 'ollama_cloud') return c.ollama !== null
  return c.ollama !== null && (nature !== 'prospect' || drapeau) // le local reçoit du prospect seulement après le « oui » daté de Benj
}

// ── l'appel HTTP compatible OpenAI, avec la classification des échecs ────────────────────────────────────────────────
class EchecRelais extends Error {
  raison: Raison
  jusquaMs?: number
  statut?: number
  constructor(raison: Raison, message: string, extra: { jusquaMs?: number; statut?: number } = {}) {
    super(message)
    this.raison = raison
    this.jusquaMs = extra.jusquaMs
    this.statut = extra.statut
  }
}

/** Classe un statut HTTP et son corps (court, jamais journalisé) : quota, refus d'accès ou panne. Pure. */
export function classerReponseHttp(statut: number, corps: string, retryApresS: number | null, maintenant: number): { raison: Raison; jusquaMs?: number } {
  const t = String(corps).slice(0, 2000)
  if (statut === 429 || /usage limit|rate.?limit|quota|too many requests|exhausted/i.test(t) && statut >= 400) {
    let jusqua: number | undefined
    if (retryApresS !== null && Number.isFinite(retryApresS) && retryApresS > 0) jusqua = maintenant + retryApresS * 1000
    const m = /"retryAtMs"\s*:\s*(\d{10,})/.exec(t)
    if (m && Number(m[1]) > maintenant) jusqua = Number(m[1])
    return { raison: 'quota', jusquaMs: jusqua }
  }
  if (statut === 401 || statut === 402 || statut === 403) return { raison: 'non_autorise' }
  return { raison: 'indisponible' }
}

async function appelerHttp(o: {
  fetchFn: typeof fetch
  base: string
  modele: string
  systeme: string
  corps: string
  maxTokens: number
  delaiMs: number
  cle: string | null
  extra?: Record<string, unknown>
  maintenant: number
}): Promise<{ texte: string; fournisseurReel?: string }> {
  const corpsHttp: Record<string, unknown> = {
    model: o.modele,
    messages: [{ role: 'system', content: o.systeme }, { role: 'user', content: o.corps }],
    max_tokens: o.maxTokens,
    ...(o.extra ?? {}),
  }
  const controleur = new AbortController()
  const minuteur = setTimeout(() => controleur.abort(), o.delaiMs)
  let reponse: Response
  try {
    reponse = await o.fetchFn(`${o.base}/chat/completions`, {
      method: 'POST',
      headers: o.cle ? { 'content-type': 'application/json', authorization: `Bearer ${o.cle}` } : { 'content-type': 'application/json' },
      body: JSON.stringify(corpsHttp),
      signal: controleur.signal,
    })
  } catch (e) {
    clearTimeout(minuteur)
    const delai = e instanceof Error && e.name === 'AbortError'
    throw new EchecRelais(delai ? 'delai' : 'indisponible', delai ? 'délai dépassé' : 'connexion refusée')
  }
  clearTimeout(minuteur)
  if (!reponse.ok) {
    let brut = ''
    try { brut = await reponse.text() } catch { brut = '' }
    const ra = Number(reponse.headers.get('retry-after') || '')
    const c = classerReponseHttp(reponse.status, brut, Number.isFinite(ra) && ra > 0 ? ra : null, o.maintenant)
    throw new EchecRelais(c.raison, `HTTP ${reponse.status}`, { jusquaMs: c.jusquaMs, statut: reponse.status })
  }
  let recu: unknown
  try { recu = await reponse.json() } catch { throw new EchecRelais('indisponible', 'réponse illisible') }
  const c = recu as { choices?: Array<{ message?: { content?: unknown } }>; fournisseur_reel?: unknown; _routed_via?: { platform?: unknown } }
  const texte = c?.choices?.[0]?.message?.content
  if (typeof texte !== 'string' || !texte.trim()) throw new EchecRelais('sortie_invalide', 'réponse sans texte')
  const reel = typeof c?.fournisseur_reel === 'string' ? c.fournisseur_reel : typeof c?._routed_via?.platform === 'string' ? c._routed_via.platform : undefined
  return { texte, fournisseurReel: reel }
}

/** JSON strict, avec la seule tolérance d'une clôture ```json autour (les modèles libres en mettent) : jamais d'extraction dans de la prose. */
export function lireJson(texte: string): unknown {
  let t = String(texte).trim()
  const m = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/.exec(t)
  if (m) t = m[1].trim()
  try { return JSON.parse(t) } catch { throw new EchecRelais('sortie_invalide', 'réponse non JSON') }
}

// ── le lecteur du relais ─────────────────────────────────────────────────────────────────────────────────────────────
export type DepsRelais = DepsLecteur & {
  /** Dossier du journal et de la mémoire des moteurs (sinon IA_RELAIS_DOSSIER, sinon ~/travail/relais sur l'usine, sinon un dossier temporaire). */
  dossier?: string
  etat?: MagasinEtat
  journal?: JournalRelais
  /** La clé de freellmapi du compte qui la possède (sinon ~/.config/presti/freellmapi.key) : jamais journalisée. */
  lireCle?: () => string | null
}
export type LecteurRelais = Lecteur & {
  (systeme: string, donnees: unknown, opts?: { nature?: Nature }): Promise<unknown>
  /** Le moteur qui a servi le dernier appel réussi (voie:modèle). */
  dernier?: string
  nature: Nature
  chaine: readonly IdMoteur[]
}

/** Délai de Codex quand un repli existe : une panne de Codex coûte au plus ceci avant de passer au suivant. */
export const DELAI_CODEX_AVEC_REPLI_MS = 150_000

export function creerLecteurRelais(agent: string, options: OptionsLecteur & { nature?: Nature } = {}, deps: DepsRelais = {}): LecteurRelais | null {
  const politique = politiqueDe(agent)
  if (!politique) return null
  const entree = MOTEUR_DE[agent]
  const env = deps.env ?? process.env
  const lancer = deps.lancer ?? spawn
  const fetchFn = deps.fetch ?? fetch
  const enregistrerCoutFn = deps.enregistrerCout ?? enregistrerCoutReel
  const maintenantFn = deps.maintenant ?? Date.now
  const verifierPlafondFn = deps.verifierPlafond ?? verifierPlafondReel
  const coutDeVoieFn = deps.coutDeVoie ?? ((id: string) => (Object.prototype.hasOwnProperty.call(COUT_RELAIS, id) ? COUT_RELAIS[id] : undefined))
  const dossier = deps.dossier ?? dossierParDefaut(env)
  const magasin = deps.etat ?? magasinFichier(dossier)
  const journal = deps.journal ?? journalFichier(dossier, maintenantFn)
  const lireCle = deps.lireCle ?? (() => lireCleFichier(env))
  const natureBase = natureEffective(politique.nature, options.nature)
  const leconsChoisies = leconsDeLAgent(agent, deps)
  const appelsMax = Math.min(options.appelsMax ?? PLAFONDS.appelsParExecution, PLAFONDS.appelsParExecution)
  let compteurAppels = 0
  let coupe = false
  const dejaDits = new Set<string>()

  const identiteDe = (m: IdMoteur): string => (m === 'codex' ? `codex:${modeleCodexPour(entree, options)}` : m === 'freellmapi' ? `freellmapi:${MODELE_FREELLMAPI}` : m === 'ollama_cloud' ? `ollama_cloud:${MODELE_CLOUD}` : `ollama:${modeleDe(m)}`)
  const drapeau = () => estDrapeauLeve(env.IA_LOCALE_PROSPECTS_OUI, maintenantFn())

  const delaiPour = (m: IdMoteur, aUnRepli: boolean): number => {
    const plafond = m === 'codex' ? (aUnRepli ? Math.min(PLAFONDS.delaiMs.codex, DELAI_CODEX_AVEC_REPLI_MS) : PLAFONDS.delaiMs.codex) : m === 'freellmapi' ? PLAFONDS.delaiMs.freellmapi : PLAFONDS.delaiMs.ollama
    return options.delaiMs !== undefined ? Math.min(options.delaiMs, plafond) : plafond
  }

  async function essayer(m: IdMoteur, consigne: string, donnees: unknown, nature: Nature, config: Config, aUnRepli: boolean): Promise<{ ok: true; valeur: unknown; fournisseurReel?: string } | { ok: false; raison: Raison; jusquaMs?: number }> {
    const maintenant = maintenantFn()
    try {
      if (m === 'codex') {
        let texte: string
        try {
          texte = await appelerCodex({ lancer, chemin: config.codex as string, modele: modeleCodexPour(entree, options), systeme: consigne, emballage: emballerDonnees(donnees), delaiMs: delaiPour('codex', aUnRepli), env })
        } catch (e) {
          if (e instanceof ErreurMoteur) {
            if (e.type === 'Q') throw new EchecRelais('quota', e.message, { jusquaMs: calculerEcheanceMs(e.echeanceTexte, maintenant) })
            if (e.message === 'non autorisé') throw new EchecRelais('non_autorise', e.message)
            if (e.message === 'délai dépassé') throw new EchecRelais('delai', e.message)
            throw new EchecRelais('indisponible', e.message)
          }
          throw e
        }
        return { ok: true, valeur: lireJson(texte) }
      }
      // freellmapi, Ollama Cloud, Ollama local : HTTP local ; les coordonnées sont masquées avant de partir (comme creerLecteur).
      const base = m === 'freellmapi' ? (config.freellmapi as { url: string }).url : (config.ollama as string)
      const cle = m === 'freellmapi' ? (config.freellmapi as { cle: string | null }).cle : null
      const modele = modeleDe(m)
      const { texte, fournisseurReel } = await appelerHttp({
        fetchFn, base, modele, systeme: consigne, corps: emballerDonnees(retirerCoordonnees(donnees)), maxTokens: PLAFONDS.jetonsSortie,
        delaiMs: delaiPour(m, aUnRepli), cle, maintenant,
        // qwen3:8b réfléchit par défaut et épuise ses jetons avant de répondre : on lui demande de répondre tout de suite.
        extra: m === 'ollama_8b' ? { reasoning_effort: 'none' } : undefined,
      })
      if (fournisseurReel && /^groq/i.test(fournisseurReel)) throw new EchecRelais('refuse', 'fournisseur exclu')
      return { ok: true, valeur: lireJson(texte), fournisseurReel }
    } catch (e) {
      if (e instanceof EchecRelais) return { ok: false, raison: e.raison, jusquaMs: e.jusquaMs }
      return { ok: false, raison: 'indisponible' }
    }
  }

  const lecteur = (async (systeme: string, donnees: unknown, opts?: { nature?: Nature }): Promise<unknown> => {
    compteurAppels++
    if (compteurAppels > appelsMax) throw new Error(`plafond d'appels atteint (${appelsMax})`)
    if (coupe) throw new Error('exécution coupée (plafond de coût)')

    const nature = natureEffective(natureBase, opts?.nature)
    const config = configurer(env, lireCle)
    const chaine = construireChaine(politique, nature)
    const etat = { ...magasin.lire() }
    const consigne = consigneAvecLecons(systeme, leconsChoisies)
    const dire = (ligne: Omit<LigneJournal, 'le' | 'agent' | 'nature'>) => journal({ le: new Date(maintenantFn()).toISOString(), agent, nature, ...ligne })

    const candidats: IdMoteur[] = []
    for (const m of chaine) {
      if (!disponible(m, nature, config, drapeau())) continue // pas configuré, ou interdit à cette nature
      const bout = etat[m]
      if (bout && bout.jusqua > maintenantFn()) {
        const cle = `${m}:${bout.raison}`
        if (!dejaDits.has(cle)) { dejaDits.add(cle); dire({ moteur: m, issue: 'saute', raison: bout.raison, jusqua: new Date(bout.jusqua).toISOString() }) }
        continue
      }
      candidats.push(m)
    }
    if (!candidats.length) throw new Error('attente : aucune voie disponible pour le moment')

    let derniere: Error = new Error('attente : toutes les voies ont échoué')
    for (let i = 0; i < candidats.length; i++) {
      const m = candidats[i]
      if (coupe) throw new Error('exécution coupée (plafond de coût)')
      if (!moteurPermis(m, nature)) continue // deuxième verrou : aucune donnée de prospect hors Codex et local
      const cout = coutDeVoieFn(voieDeCout(m), { moteur: m })
      if (!coutValide(cout)) throw new Error('coût inconnu : appel refusé')
      if (!(await plafondAutorise(verifierPlafondFn, agent, cout as number))) throw new Error('plafond de coût : appel refusé avant consommation')
      const debut = Date.now()
      const r = await essayer(m, consigne, donnees, nature, config, i < candidats.length - 1)
      const ms = Date.now() - debut
      const detail: Record<string, unknown> = { moteur: m === 'codex' ? 'codex' : m === 'freellmapi' ? 'freellmapi' : m === 'ollama_cloud' ? 'ollama_cloud' : 'ollama', modele: m === 'codex' ? modeleCodexPour(entree, options) : modeleDe(m), nature, issue: r.ok ? 'ok' : 'bascule' }
      if (!r.ok) detail.raison = r.raison
      if (r.ok && r.fournisseurReel) detail.fournisseur_reel = r.fournisseurReel
      let retourCout: RetourCout
      try { retourCout = await enregistrerCoutFn(agent, cout as number, detail) } catch (e) { coupe = true; throw e instanceof Error ? e : new Error(String(e)) }
      if (retourCout && retourCout.coupe) { coupe = true; throw new Error('exécution coupée (plafond de coût)') }

      if (r.ok) {
        if (etat[m]) { const propre = { ...magasin.lire() }; delete propre[m]; magasin.ecrire(propre) } // le moteur est revenu : plus à bout
        dire({ moteur: m, modele: String(detail.modele), issue: 'ok', ms })
        lecteur.dernier = identiteDe(m)
        return r.valeur
      }
      const jusqua = echeanceDeMiseDeCote(m, r.raison, maintenantFn(), r.jusquaMs)
      if (jusqua > 0) { const courant = { ...magasin.lire() }; courant[m] = { jusqua, raison: r.raison, vu: new Date(maintenantFn()).toISOString() }; magasin.ecrire(courant) }
      dire({ moteur: m, modele: String(detail.modele), issue: 'bascule', raison: r.raison, ms, ...(jusqua > 0 ? { jusqua: new Date(jusqua).toISOString() } : {}) })
      derniere = new Error(`${m} : ${r.raison}`)
    }
    throw derniere
  }) as LecteurRelais
  lecteur.nature = natureBase
  lecteur.chaine = construireChaine(politique, natureBase)
  const config0 = configurer(env, lireCle)
  const utilisables = lecteur.chaine.filter((m) => disponible(m, natureBase, config0, drapeau()))
  // Aucun moteur permis à cette nature n'est configuré (ni Codex, ni, pour un prospect avec le « oui » daté, le local) : pas de lecteur,
  // comme creerLecteur — l'appelant dit « modèle absent » et ne touche à rien (un moteur à bout, lui, donne un lecteur qui attend).
  if (!utilisables.length) return null
  lecteur.identite = utilisables.map(identiteDe).join('>')
  return lecteur
}

// ── la sonde : un essai réel d'UN moteur sur une consigne publique triviale ─────────────────────────────────────────
export type ResultatSonde = { moteur: IdMoteur; modele: string; configure: boolean; ok: boolean; raison?: Raison | 'non_configure'; ms?: number; reponse?: string; fournisseurReel?: string }

/** « Réponds ok » à un moteur précis, sans état ni journal : donnée publique seulement. Sert à l'essai réel sur l'usine. */
export async function sonderMoteur(m: IdMoteur, deps: DepsRelais = {}): Promise<ResultatSonde> {
  const env = deps.env ?? process.env
  const config = configurer(env, deps.lireCle ?? (() => lireCleFichier(env)))
  const modele = m === 'codex' ? MOTEUR_DE.facteur.modele : modeleDe(m)
  const conf = disponible(m, 'publique', config, true)
  if (!conf) return { moteur: m, modele, configure: false, ok: false, raison: 'non_configure' }
  const systeme = 'Réponds uniquement par un objet JSON : {"ok": true}.'
  const donnees = { consigne: 'réponds ok' }
  const debut = Date.now()
  const maintenant = (deps.maintenant ?? Date.now)()
  try {
    if (m === 'codex') {
      const texte = await appelerCodex({ lancer: deps.lancer ?? spawn, chemin: config.codex as string, modele: MOTEUR_DE.facteur.modele, systeme, emballage: emballerDonnees(donnees), delaiMs: 120_000, env })
      return { moteur: m, modele: MOTEUR_DE.facteur.modele, configure: true, ok: true, ms: Date.now() - debut, reponse: JSON.stringify(lireJson(texte)).slice(0, 80) }
    }
    const base = m === 'freellmapi' ? (config.freellmapi as { url: string }).url : (config.ollama as string)
    const cle = m === 'freellmapi' ? (config.freellmapi as { cle: string | null }).cle : null
    const { texte, fournisseurReel } = await appelerHttp({ fetchFn: deps.fetch ?? fetch, base, modele, systeme, corps: emballerDonnees(donnees), maxTokens: 200, delaiMs: m === 'ollama_8b' || m === 'ollama_4b' ? 170_000 : 60_000, cle, maintenant, extra: m === 'ollama_8b' ? { reasoning_effort: 'none' } : undefined })
    // Une sonde éprouve la liaison : une réponse qui n'est pas du JSON (un routeur libre répond parfois en prose) prouve que le moteur répond.
    let reponse: string
    try { reponse = JSON.stringify(lireJson(texte)).slice(0, 80) } catch { reponse = `texte non JSON (${String(texte).replace(/\s+/g, ' ').slice(0, 30)})` }
    return { moteur: m, modele, configure: true, ok: true, ms: Date.now() - debut, reponse, fournisseurReel }
  } catch (e) {
    let raison: Raison = 'indisponible'
    if (e instanceof EchecRelais) raison = e.raison
    else if (e instanceof ErreurMoteur) raison = e.type === 'Q' ? 'quota' : e.message === 'non autorisé' ? 'non_autorise' : e.message === 'délai dépassé' ? 'delai' : 'indisponible'
    return { moteur: m, modele, configure: true, ok: false, raison, ms: Date.now() - debut }
  }
}

/** Ce que le relais voit sans rien appeler : moteurs configurés, moteurs mis de côté (pour la station et le contrôle). */
export function lireEtatRelais(deps: DepsRelais = {}): { configures: Record<IdMoteur, boolean>; a_bout: Array<{ moteur: IdMoteur; raison: Raison; jusqua: string }> } {
  const env = deps.env ?? process.env
  const config = configurer(env, deps.lireCle ?? (() => lireCleFichier(env)))
  const magasin = deps.etat ?? magasinFichier(deps.dossier ?? dossierParDefaut(env))
  const etat = magasin.lire()
  const maintenant = (deps.maintenant ?? Date.now)()
  const ids: IdMoteur[] = ['codex', 'freellmapi', 'ollama_cloud', 'ollama_8b', 'ollama_4b']
  return {
    configures: Object.fromEntries(ids.map((m) => [m, disponible(m, 'publique', config, true)])) as Record<IdMoteur, boolean>,
    a_bout: ids.filter((m) => (etat[m]?.jusqua ?? 0) > maintenant).map((m) => ({ moteur: m, raison: (etat[m] as EtatMoteur).raison, jusqua: new Date((etat[m] as EtatMoteur).jusqua).toISOString() })),
  }
}

