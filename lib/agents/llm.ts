// lib/agents/llm.ts — la seule porte des agents vers un modèle (fiche 026-043, contrat de 026-041, compléments du
// 26/09 et du 27/09). Deux moteurs gratuits pour les données de prospect (Codex par CODEX_LANCEUR, sur l'usine ; le
// local de l'usine — Ollama, Laya — après un « oui » daté de Benj), un troisième pour la masse sans donnée
// personnelle (freellmapi, en boucle locale). Décision du chef d'entreprise du 27/09 : une donnée de prospect ne va
// JAMAIS à freellmapi, à Ollama Cloud, ni à Groq (exclu, refusé par Benj le 25/09).
//
// Aucune clé de modèle ici (ANTHROPIC_*, OPENAI_*) : ni lue, ni attendue. Aucun SDK, aucune API payante, aucun outil
// (function calling), aucune nouvelle tentative automatique au-delà de ce que ce fichier décide lui-même. Chaque appel
// inscrit un coût à 0 € (`enregistrerCout`, par défaut la fonction de lib/agents/bus.ts qui appelle
// `ops_cout_ajouter`), avec son moteur et son modèle, jamais avec les données ni la réponse.
//
// Réservé à Claude Code : moteurs, données personnelles et argent (CLAUDE.md:23).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'
import {
  CATALOGUE, ENTRAIDE, MODELES_LOCAUX, MODELE_AGENTS, MODELE_REJUGE, MOTEUR_DE, REPLI, TRAVAIL_DE,
  conseillersPour, type EntreeMoteur,
} from './moteurs'
import { ops_cout_ajouter } from './bus'

// ── contrat public ────────────────────────────────────────────────────────────────────────────────────────────────
export type Lecteur = (systeme: string, donnees: unknown) => Promise<unknown>

export type OptionsLecteur = {
  delaiMs?: number
  appelsMax?: number
  modele?: 'agents' | 'rejuge' | 'leger' | string
}

export type RetourCout = { ok?: boolean; coupe?: boolean } | null | undefined

export type DepsLecteur = {
  env?: NodeJS.ProcessEnv
  lancer?: typeof spawn
  fetch?: typeof fetch
  enregistrerCout?: (agent: string, montant: number, detail: Record<string, unknown>) => Promise<RetourCout>
  maintenant?: () => number
  attendre?: (ms: number) => Promise<void>
}

export const PLAFONDS = Object.freeze({
  jetonsSortie: 1024,
  appelsParExecution: 20,
  delaiMs: Object.freeze({ codex: 600_000, freellmapi: 60_000, ollama: 180_000, laya: 60_000 }),
  eurosParAppel: 0,
})

// ── emballerDonnees / retirerCoordonnees (contrat inchangé de 026-041) ───────────────────────────────────────────────
/** Émballe la consigne pour l'entrée standard du lanceur ou le corps HTTP : jamais deux marques emboîtées. */
export function emballerDonnees(donnees: unknown): string {
  const texte = typeof donnees === 'string' ? donnees : JSON.stringify(donnees)
  const nettoye = texte.split('<donnees>').join('').split('</donnees>').join('')
  return `<donnees>\n${nettoye}\n</donnees>`
}

function marcherTexte(valeur: unknown, transformer: (s: string) => string): unknown {
  if (typeof valeur === 'string') return transformer(valeur)
  if (Array.isArray(valeur)) return valeur.map((v) => marcherTexte(v, transformer))
  if (valeur !== null && typeof valeur === 'object') {
    const sortie: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(valeur as Record<string, unknown>)) sortie[k] = marcherTexte(v, transformer)
    return sortie
  }
  return valeur
}

const RE_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g
const RE_TEL_FR = /(?:\+33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}\b/g
const RE_SIREN = /\b\d{3}[\s.]?\d{3}[\s.]?\d{3}\b/g

function masquerCoordonneesTexte(texte: string): string {
  return texte.replace(RE_EMAIL, '[adresse]').replace(RE_TEL_FR, '[numéro]').replace(RE_SIREN, '[siren]')
}

/** Adresses e-mail, téléphones français et SIREN masqués — jamais coupé, aucun autre traitement (masquer de 026-070). */
export function retirerCoordonnees(donnees: unknown): unknown {
  return marcherTexte(donnees, masquerCoordonneesTexte)
}

const RE_SECRET = /\bsk-[A-Za-z0-9_-]{6,}\b|\b(?=[A-Za-z0-9_-]{32,}\b)(?=[^\s]*[0-9])(?=[^\s]*[A-Za-z])[A-Za-z0-9_-]{32,}\b/g
function masquerSecretsTexte(texte: string): string {
  return texte.replace(RE_SECRET, '[secret]')
}
function masquerCoordonneesEtSecrets(donnees: unknown): unknown {
  return marcherTexte(retirerCoordonnees(donnees), masquerSecretsTexte)
}

// ── petites mains (jamais un vrai secret, jamais process.env directement : tout vient de `env` reçu en paramètre) ────
function accessible(p: string | undefined, mode: number): string | null {
  if (!p) return null
  try { fs.accessSync(p, mode); return p } catch { return null }
}
function urlLocale(valeur: string | undefined): string | null {
  if (!valeur) return null
  try {
    const u = new URL(valeur)
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost' ? valeur : null
  } catch { return null }
}
const lireCodexLanceur = (env: NodeJS.ProcessEnv) => accessible(env.CODEX_LANCEUR, fs.constants.X_OK)
const lireFreellmapiUrl = (env: NodeJS.ProcessEnv) => urlLocale(env.FREELLMAPI_URL)
const lireOllamaUrl = (env: NodeJS.ProcessEnv) => urlLocale(env.OLLAMA_URL)
const lireJevChemin = (env: NodeJS.ProcessEnv) => accessible(env.JEV_CHEMIN, fs.constants.R_OK)

/** Le « oui » daté de Benj : une date AAAA-MM-JJ, non future. Toute autre valeur éteint le drapeau (§5 de 026-041). */
function estDrapeauLeve(valeur: string | undefined, maintenantMs: number): boolean {
  if (!valeur || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return false
  const ts = Date.parse(`${valeur}T00:00:00Z`)
  return Number.isFinite(ts) && ts <= maintenantMs
}

function attendreReel(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function enregistrerCoutReel(agent: string, montant: number, detail: Record<string, unknown>): Promise<RetourCout> {
  const fournisseur = typeof detail?.moteur === 'string' ? String(detail.moteur) : 'inconnu'
  const r = await ops_cout_ajouter({ p_agent: agent, p_fournisseur: fournisseur, p_montant_eur: montant, p_detail: detail, p_tache: null })
  if (!r.ok) return { coupe: true }
  return { ok: true }
}

function tuerProcessus(enfant: ChildProcess): void {
  try { enfant.kill('SIGKILL') } catch { /* déjà mort */ }
}

/** Le compteur facultatif de l'usine (026-053) : une ligne sans donnée ni réponse par appel freellmapi. */
function ecrireCompteurSiBesoin(env: NodeJS.ProcessEnv, ligne: { agent: string; moteur: string; modele?: string; fournisseur_reel?: string }): void {
  const dossier = env.IA_COMPTEURS
  if (!dossier) return
  try {
    fs.mkdirSync(dossier, { recursive: true })
    const jour = new Date().toISOString().slice(0, 10)
    const fichier = path.join(dossier, `compteurs-${jour}.jsonl`)
    const enreg = { le: new Date().toISOString(), agent: ligne.agent, moteur: ligne.moteur, modele: ligne.modele, fournisseur_reel: ligne.fournisseur_reel }
    fs.appendFileSync(fichier, `${JSON.stringify(enreg)}\n`)
  } catch { /* mesure facultative : ne bloque jamais l'appel */ }
}

// ── JSON strict ───────────────────────────────────────────────────────────────────────────────────────────────────
function parserJsonStrict(texte: string): unknown {
  try { return JSON.parse(texte.trim()) } catch { throw new Error('réponse non JSON') }
}

// ── erreurs de moteur : P (panne ponctuelle, on passe à la voie suivante) ou Q (quota, à sec jusqu'à une échéance) ───
class ErreurMoteur extends Error {
  type: 'P' | 'Q'
  echeanceTexte?: string
  constructor(type: 'P' | 'Q', message: string, echeanceTexte?: string) {
    super(message)
    this.type = type
    this.echeanceTexte = echeanceTexte
  }
}

/** « sinon 15 minutes » (§4 de 026-041) : l'échéance lue dans le message si elle est bien après le moment de la marque,
 *  sinon un plancher de 15 minutes à partir de la marque (le message ne porte que l'heure à la minute : un arrondi
 *  défavorable ne doit jamais réduire la fenêtre en dessous de ce plancher). */
function calculerEcheanceMs(texteEcheance: string | undefined, marqueMs: number): number {
  const QUINZE_MIN = 15 * 60 * 1000
  if (texteEcheance) {
    const parsed = Date.parse(`${texteEcheance.replace(' ', 'T')}:00Z`)
    if (Number.isFinite(parsed) && parsed > marqueMs) return parsed
  }
  return marqueMs + QUINZE_MIN
}

// ── appel HTTP compatible OpenAI (freellmapi, Ollama) ────────────────────────────────────────────────────────────────
async function appelerHttpCompatibleOpenAI(opts: {
  fetchFn: typeof fetch
  urlBase: string
  modele: string | undefined
  systeme: string
  corpsDonnees: string
  maxTokens: number
  delaiMs: number
  attendreFn: (ms: number) => Promise<void>
}): Promise<{ texte: string; fournisseurReel?: string }> {
  const corps: Record<string, unknown> = {
    messages: [{ role: 'system', content: opts.systeme }, { role: 'user', content: opts.corpsDonnees }],
    max_tokens: opts.maxTokens,
  }
  if (opts.modele) corps.model = opts.modele
  const url = `${opts.urlBase.replace(/\/+$/, '')}/chat/completions`
  for (let tentative = 1; ; tentative++) {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), opts.delaiMs)
    let reponse: Response
    try {
      reponse = await opts.fetchFn(url, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps), signal: controleur.signal,
      })
    } catch {
      clearTimeout(minuteur)
      throw new ErreurMoteur('P', 'connexion refusée ou délai dépassé')
    }
    clearTimeout(minuteur)
    if (reponse.status === 429) {
      const retryApres = Number(reponse.headers.get('retry-after') || '')
      if (tentative === 1 && Number.isFinite(retryApres) && retryApres > 0 && retryApres <= 60) {
        await opts.attendreFn(retryApres * 1000)
        continue
      }
      throw new ErreurMoteur('Q', 'limite atteinte (429)')
    }
    if (reponse.status >= 500) throw new ErreurMoteur('P', `panne (${reponse.status})`)
    if (!reponse.ok) throw new ErreurMoteur('P', `erreur (${reponse.status})`)
    let corpsRecu: unknown
    try { corpsRecu = await reponse.json() } catch { throw new ErreurMoteur('P', 'réponse illisible') }
    const c = corpsRecu as { choices?: Array<{ message?: { content?: unknown } }>; fournisseur_reel?: unknown }
    const texte = c?.choices?.[0]?.message?.content
    if (typeof texte !== 'string') throw new ErreurMoteur('P', 'réponse sans texte')
    return { texte, fournisseurReel: typeof c?.fournisseur_reel === 'string' ? c.fournisseur_reel : undefined }
  }
}

// ── appel Codex (moteur `codex`, LL-5) ───────────────────────────────────────────────────────────────────────────────
async function appelerCodex(opts: {
  lancer: typeof spawn
  chemin: string
  modele: string
  systeme: string
  emballage: string
  delaiMs: number
  env: NodeJS.ProcessEnv
}): Promise<string> {
  const dirTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-codex-'))
  const fichierSortie = path.join(dirTmp, 'sortie.json')
  const argv = ['exec', '--model', opts.modele, '--sandbox', 'read-only', '--skip-git-repo-check', '--output-last-message', fichierSortie, '-']
  const envEnfant: Record<string, string> = {}
  if (opts.env.PATH) envEnfant.PATH = opts.env.PATH
  if (opts.env.HOME) envEnfant.HOME = opts.env.HOME
  if (opts.env.LANG) envEnfant.LANG = opts.env.LANG

  let enfant: ChildProcess
  try {
    enfant = opts.lancer(opts.chemin, argv, { env: envEnfant as NodeJS.ProcessEnv })
  } catch {
    try { fs.rmSync(dirTmp, { recursive: true, force: true }) } catch { /* rien à faire */ }
    throw new ErreurMoteur('P', 'lancement impossible')
  }

  let stderr = ''
  enfant.stderr?.on('data', (d: Buffer) => { stderr += d.toString('utf8') })
  try { enfant.stdin?.write(`${opts.systeme}\n${opts.emballage}`) } catch { /* le lanceur peut avoir déjà fermé */ }
  try { enfant.stdin?.end() } catch { /* idem */ }

  const code: number | null = await new Promise((resolve) => {
    let fini = false
    const minuteur = setTimeout(() => { fini = true; tuerProcessus(enfant); resolve(124) }, opts.delaiMs)
    enfant.on('close', (c) => { if (!fini) { clearTimeout(minuteur); resolve(c) } })
    enfant.on('error', () => { if (!fini) { clearTimeout(minuteur); resolve(1) } })
  })

  let texte = ''
  try { texte = fs.readFileSync(fichierSortie, 'utf8') } catch { texte = '' }
  try { fs.rmSync(dirTmp, { recursive: true, force: true }) } catch { /* rien à faire */ }

  if (code === 124) throw new ErreurMoteur('P', 'délai dépassé')
  if (/usage limit/i.test(stderr)) {
    const m = /try again at (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/.exec(stderr)
    throw new ErreurMoteur('Q', 'limite atteinte', m ? m[1] : undefined)
  }
  if (/401/.test(stderr)) throw new ErreurMoteur('P', 'non autorisé')
  if (code !== 0 || !texte) throw new ErreurMoteur('P', `code de sortie ${code}`)
  return texte
}

// ── modèle choisi selon la voie et le travail ────────────────────────────────────────────────────────────────────────
function modeleCodexPour(entree: EntreeMoteur, options: OptionsLecteur): string {
  if (options.modele === 'rejuge') return MODELE_REJUGE
  if (options.modele === 'leger' && entree.leger) return entree.leger
  return entree.modele
}
const TRAVAUX_OLLAMA_8B = new Set(['prospect_redaction', 'texte_vendu', 'raisonnement'])
function modeleOllamaPour(travail: string): string {
  return TRAVAUX_OLLAMA_8B.has(travail) ? MODELES_LOCAUX[1] : MODELES_LOCAUX[0]
}

// ── creerLecteur : la seule fabrique de lecteurs de modèle ───────────────────────────────────────────────────────────
type ResultatEssai =
  | { ok: true; valeur: unknown; detail: Record<string, unknown> }
  | { ok: false; terminal: boolean; erreur: Error; detail: Record<string, unknown>; echeanceTexte?: string }

const VOIES_EXECUTABLES = new Set(['codex', 'freellmapi', 'ollama_local'])

export function creerLecteur(agent: string, options: OptionsLecteur = {}, deps: DepsLecteur = {}): Lecteur | null {
  const env = deps.env ?? process.env
  const entree = MOTEUR_DE[agent]
  if (!entree || entree.affichage) return null
  const classe: 'D0' | 'D1' = entree.personnelles ? 'D1' : 'D0'
  const travail = TRAVAIL_DE[agent]
  const repli = REPLI[travail]
  if (!repli) return null

  const lancer = deps.lancer ?? spawn
  const fetchFn = deps.fetch ?? fetch
  const enregistrerCoutFn = deps.enregistrerCout ?? enregistrerCoutReel
  const maintenantFn = deps.maintenant ?? Date.now
  const attendreFn = deps.attendre ?? attendreReel

  const candidats = repli.voies
    .map((v) => (typeof v === 'string' ? v : v.id))
    .filter((id) => VOIES_EXECUTABLES.has(id))
    .filter((id) => classe !== 'D1' || CATALOGUE[id]?.d1 !== 'non')
  if (!candidats.length) return null

  const drapeauLeve = () => classe !== 'D1' || estDrapeauLeve(env.IA_LOCALE_PROSPECTS_OUI, maintenantFn())
  const estConfigure = (id: string): boolean => {
    if (id === 'codex') return !!lireCodexLanceur(env)
    if (id === 'freellmapi') return !!lireFreellmapiUrl(env)
    if (id === 'ollama_local') return !!lireOllamaUrl(env)
    return false
  }
  const gateD1 = (id: string) => !((id === 'ollama_local') && classe === 'D1' && !drapeauLeve())

  const disponiblesMaintenant = candidats.filter((id) => gateD1(id) && estConfigure(id))
  if (!disponiblesMaintenant.length) return null

  const aSec = new Map<string, number>()
  let compteurAppels = 0
  let coupe = false
  const appelsMax = Math.min(options.appelsMax ?? PLAFONDS.appelsParExecution, PLAFONDS.appelsParExecution)

  const delaiPour = (id: string): number => {
    const plafond = id === 'codex' ? PLAFONDS.delaiMs.codex : id === 'ollama_local' ? PLAFONDS.delaiMs.ollama : PLAFONDS.delaiMs.freellmapi
    return options.delaiMs !== undefined ? Math.min(options.delaiMs, plafond) : plafond
  }

  async function essayerUneVoie(id: string, systeme: string, donneesBrutes: unknown): Promise<ResultatEssai> {
    if (id === 'codex') {
      const modele = modeleCodexPour(entree, options)
      const chemin = lireCodexLanceur(env) as string
      const detail: Record<string, unknown> = { moteur: 'codex', modele }
      try {
        const texte = await appelerCodex({ lancer, chemin, modele, systeme, emballage: emballerDonnees(donneesBrutes), delaiMs: delaiPour('codex'), env })
        return { ok: true, valeur: parserJsonStrict(texte), detail }
      } catch (e) {
        if (e instanceof ErreurMoteur) return { ok: false, terminal: false, erreur: e, detail, echeanceTexte: e.echeanceTexte }
        return { ok: false, terminal: true, erreur: e instanceof Error ? e : new Error('erreur inconnue'), detail }
      }
    }
    // freellmapi et ollama_local : URL locale, JSON compatible OpenAI, données passées par retirerCoordonnees.
    const urlBase = (id === 'freellmapi' ? lireFreellmapiUrl(env) : lireOllamaUrl(env)) as string
    // `modeleEnvoye` : ce qui part dans le corps HTTP (absent pour 'auto', freellmapi choisit seul). `modeleRegistre` :
    // ce qui est inscrit au coût et au compteur — jamais `undefined` (sinon le champ disparaît au JSON.stringify).
    const modeleEnvoye = id === 'ollama_local' ? modeleOllamaPour(travail) : (entree.modele === 'auto' ? undefined : entree.modele)
    const modeleRegistre = modeleEnvoye ?? entree.modele
    const donneesMasquees = retirerCoordonnees(donneesBrutes)
    const detail: Record<string, unknown> = { moteur: id === 'freellmapi' ? 'freellmapi' : 'ollama', modele: modeleRegistre }
    try {
      const { texte, fournisseurReel } = await appelerHttpCompatibleOpenAI({
        fetchFn, urlBase, modele: modeleEnvoye, systeme, corpsDonnees: emballerDonnees(donneesMasquees),
        maxTokens: PLAFONDS.jetonsSortie, delaiMs: delaiPour(id), attendreFn,
      })
      if (fournisseurReel) detail.fournisseur_reel = fournisseurReel
      if (id === 'freellmapi') ecrireCompteurSiBesoin(env, { agent, moteur: 'freellmapi', modele: modeleRegistre, fournisseur_reel: fournisseurReel })
      if (fournisseurReel && /^groq/i.test(fournisseurReel)) {
        return { ok: false, terminal: true, erreur: new Error('réponse non JSON'), detail }
      }
      return { ok: true, valeur: parserJsonStrict(texte), detail }
    } catch (e) {
      if (id === 'freellmapi') ecrireCompteurSiBesoin(env, { agent, moteur: 'freellmapi', modele: modeleRegistre })
      if (e instanceof ErreurMoteur) return { ok: false, terminal: false, erreur: e, detail, echeanceTexte: e.echeanceTexte }
      return { ok: false, terminal: true, erreur: e instanceof Error ? e : new Error('erreur inconnue'), detail }
    }
  }

  const lecteur: Lecteur = async (systeme, donnees) => {
    compteurAppels++
    if (compteurAppels > appelsMax) throw new Error(`plafond d'appels atteint (${appelsMax})`)
    if (coupe) throw new Error('exécution coupée (plafond de coût)')

    const maintenantMs = maintenantFn()
    const essais = candidats.filter((id) => {
      if (!gateD1(id) || !estConfigure(id)) return false
      const jusqua = aSec.get(id)
      return !(jusqua && jusqua > maintenantMs)
    })
    if (!essais.length) throw new Error('attente : aucune voie disponible pour le moment')

    let derniereErreur: Error = new Error('attente : toutes les voies ont échoué')
    for (const id of essais) {
      if (coupe) throw new Error('exécution coupée (plafond de coût)')
      const resultat = await essayerUneVoie(id, systeme, donnees)

      let retourCout: RetourCout
      try { retourCout = await enregistrerCoutFn(agent, 0, resultat.detail) }
      catch (e) { coupe = true; throw e instanceof Error ? e : new Error(String(e)) }
      if (retourCout && retourCout.coupe) { coupe = true; throw new Error('exécution coupée (plafond de coût)') }

      if (resultat.ok) return resultat.valeur
      if (resultat.terminal) throw resultat.erreur
      if (resultat.echeanceTexte !== undefined || resultat.detail.moteur === 'codex' || (resultat.erreur instanceof ErreurMoteur && resultat.erreur.type === 'Q')) {
        aSec.set(id, calculerEcheanceMs(resultat.echeanceTexte, maintenantFn()))
      }
      derniereErreur = resultat.erreur
    }
    throw derniereErreur
  }
  return lecteur
}

// ── entraide : troisième avis après un tour refusé (§6 de 026-041) ───────────────────────────────────────────────────
export async function demanderConseil(
  ctx: { tache: string; classe: 'D0' | 'D1'; verdict: string; journal: string; consigne: string },
  deps: DepsLecteur = {},
): Promise<{ conseiller: string; texte: string } | null> {
  const env = deps.env ?? process.env
  const fetchFn = deps.fetch ?? fetch
  const attendreFn = deps.attendre ?? attendreReel
  const enregistrerCoutFn = deps.enregistrerCout ?? enregistrerCoutReel
  const maintenantFn = deps.maintenant ?? Date.now

  const drapeau = estDrapeauLeve(env.IA_LOCALE_PROSPECTS_OUI, maintenantFn())
  const conseillers = conseillersPour(ctx.classe, { drapeau })
  if (!conseillers.length) return null

  const estD1 = ctx.classe === 'D1'
  const urlBase = estD1 ? lireOllamaUrl(env) : lireFreellmapiUrl(env)
  if (!urlBase) return null

  const derniers = (t: string, n: number) => (t.length > n ? t.slice(-n) : t)
  const extraits = {
    verdict: derniers(ctx.verdict, ENTRAIDE.extraitVerdict),
    journal: derniers(ctx.journal, ENTRAIDE.extraitJournal),
    consigne: derniers(ctx.consigne, ENTRAIDE.extraitConsigne),
  }
  const masque = estD1 ? marcherTexte(extraits, (s) => (s.length > ENTRAIDE.extraitD1 ? s.slice(-ENTRAIDE.extraitD1) : s)) : masquerCoordonneesEtSecrets(extraits)
  const corpsDonnees = emballerDonnees(masque)
  const systeme = 'Second avis bref sur un verdict de juge automatique : jamais de verdict, jamais un pass ou fail.'
  const maxTokens = estD1 ? ENTRAIDE.maxTokensD1 : ENTRAIDE.maxTokensD0
  const delaiMs = estD1 ? ENTRAIDE.delaiMsD1 : ENTRAIDE.delaiMsD0

  for (const modele of conseillers) {
    let resultat: { texte: string; fournisseurReel?: string }
    try {
      resultat = await appelerHttpCompatibleOpenAI({ fetchFn, urlBase, modele, systeme, corpsDonnees, maxTokens, delaiMs, attendreFn })
    } catch {
      continue
    }
    const moteur = estD1 ? 'ollama' : 'freellmapi'
    if (resultat.fournisseurReel && /^groq/i.test(resultat.fournisseurReel)) {
      await enregistrerCoutFn('entraide', 0, { moteur, modele, fournisseur_reel: resultat.fournisseurReel })
      continue
    }
    await enregistrerCoutFn('entraide', 0, { moteur, modele, fournisseur_reel: resultat.fournisseurReel })
    const lignes = resultat.texte.split('\n').slice(0, 25).join('\n')
    return { conseiller: modele, texte: lignes }
  }
  return null
}

// ── Laya (Jev), en local seulement : decider / noter / vraisemblance ────────────────────────────────────────────────
type OptsD1 = { d1?: boolean }

async function appelerJev(mode: 'decide' | 'score' | 'noul', texte: string, options: string[] | undefined, opts: OptsD1, deps: DepsLecteur): Promise<unknown> {
  const env = deps.env ?? process.env
  const lancer = deps.lancer ?? spawn
  const enregistrerCoutFn = deps.enregistrerCout ?? enregistrerCoutReel
  const maintenantFn = deps.maintenant ?? Date.now

  if (opts.d1 && !estDrapeauLeve(env.IA_LOCALE_PROSPECTS_OUI, maintenantFn())) return null
  const chemin = lireJevChemin(env)
  if (!chemin) return null

  const dirTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-jev-'))
  const fichierRequete = path.join(dirTmp, 'requete.json')
  fs.writeFileSync(fichierRequete, JSON.stringify({ mode, texte, options }), { mode: 0o600 })

  const envEnfant: Record<string, string> = { JEV_PROVIDER: 'laya' }
  if (env.PATH) envEnfant.PATH = env.PATH
  if (env.HOME) envEnfant.HOME = env.HOME
  if (env.LANG) envEnfant.LANG = env.LANG

  let enfant: ChildProcess
  try {
    enfant = lancer(process.execPath, [chemin, 'ask', '-f', fichierRequete, '--provider', 'laya'], { env: envEnfant as NodeJS.ProcessEnv })
  } catch {
    try { fs.rmSync(dirTmp, { recursive: true, force: true }) } catch { /* rien à faire */ }
    return null
  }
  let stdout = ''
  enfant.stdout?.on('data', (d: Buffer) => { stdout += d.toString('utf8') })
  const code: number | null = await new Promise((resolve) => {
    let fini = false
    const minuteur = setTimeout(() => { fini = true; tuerProcessus(enfant); resolve(124) }, PLAFONDS.delaiMs.laya)
    enfant.on('close', (c) => { if (!fini) { clearTimeout(minuteur); resolve(c) } })
    enfant.on('error', () => { if (!fini) { clearTimeout(minuteur); resolve(1) } })
  })
  try { fs.rmSync(fichierRequete, { force: true }) } catch { /* rien à faire */ }
  try { fs.rmSync(dirTmp, { recursive: true, force: true }) } catch { /* rien à faire */ }

  let valeur: unknown = null
  try { valeur = JSON.parse(stdout.trim()) } catch { valeur = null }
  await enregistrerCoutFn('laya', 0, { moteur: 'laya', mode })
  return code === 0 ? valeur : null
}

export async function decider(consigne: string, options: string[], opts: OptsD1 = {}, deps: DepsLecteur = {}): Promise<{ choix: string } | null> {
  return (await appelerJev('decide', consigne, options, opts, deps)) as { choix: string } | null
}
export async function noter(consigne: string, opts: OptsD1 = {}, deps: DepsLecteur = {}): Promise<{ niveau: number; distribution: Record<string, number> } | null> {
  return (await appelerJev('score', consigne, undefined, opts, deps)) as { niveau: number; distribution: Record<string, number> } | null
}
export async function vraisemblance(texte: string, opts: OptsD1 = {}, deps: DepsLecteur = {}): Promise<{ p: number; bloque: boolean } | null> {
  const r = (await appelerJev('noul', texte, undefined, opts, deps)) as { p: number } | null
  if (!r || typeof r.p !== 'number') return null
  return { p: r.p, bloque: r.p < 0.5 }
}
