// TÉMOIN de la fiche 026-234 (écrit par Claude Code) : un lib/agents/llm.ts MINIMAL au contrat de 026-041 (moteurs
// Codex et freellmapi seulement), avec le branchement des leçons que 026-237 fera dans le vrai module : lecture des
// réglages et des leçons UNE fois, à la création du lecteur (`deps.reglages`, `deps.lecons` injectables), puis
// `consigneAvecLecons(systeme, leconsPour(agent, …))` passé au moteur. Interrupteur éteint : octets identiques.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'
import { MOTEUR_DE, REPLI, TRAVAIL_DE } from './moteurs'
import { consigneAvecLecons, leconsPour, lireLecons, type Lecon } from './lecons'

export type Lecteur = (systeme: string, donnees: unknown) => Promise<unknown>
export type DepsLecteur = {
  env?: NodeJS.ProcessEnv
  lancer?: typeof spawn
  fetch?: typeof fetch
  enregistrerCout?: (agent: string, montant: number, detail: Record<string, unknown>) => Promise<unknown>
  maintenant?: () => number
  attendre?: (ms: number) => Promise<void>
  lecons?: string
  reglages?: string
}

export function emballerDonnees(donnees: unknown): string {
  const texte = typeof donnees === 'string' ? donnees : JSON.stringify(donnees)
  return `<donnees>\n${texte.split('<donnees>').join('').split('</donnees>').join('')}\n</donnees>`
}
function marcher(v: unknown, f: (s: string) => string): unknown {
  if (typeof v === 'string') return f(v)
  if (Array.isArray(v)) return v.map((x) => marcher(x, f))
  if (v !== null && typeof v === 'object') return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, marcher(x, f)]))
  return v
}
export function retirerCoordonnees(donnees: unknown): unknown {
  return marcher(donnees, (s) => s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[adresse]').replace(/(?:\+33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}\b/g, '[numéro]').replace(/\b\d{3}[\s.]?\d{3}[\s.]?\d{3}\b/g, '[siren]'))
}

function leconsAllumees(fichier: string): boolean {
  try { return JSON.parse(fs.readFileSync(fichier, 'utf8'))?.interrupteurs?.lecons_dans_consignes?.actif === true } catch { return false }
}
/** Une seule lecture, à la création ; une lecture impossible laisse la consigne telle quelle. */
function chargerLecons(agent: string, deps: DepsLecteur): Lecon[] {
  const reglages = deps.reglages ?? path.join(process.cwd(), 'docs', 'savoir', 'reglages.json')
  if (!leconsAllumees(reglages)) return []
  try { return leconsPour(agent, lireLecons(deps.lecons ?? path.join(process.cwd(), 'docs', 'savoir', 'lecons')).lecons) } catch { return [] }
}
function urlLocale(v: string | undefined): string | null {
  if (!v) return null
  try { const u = new URL(v); return u.hostname === '127.0.0.1' || u.hostname === 'localhost' ? v : null } catch { return null }
}

async function appelerCodex(lancer: typeof spawn, chemin: string, modele: string, entreeStandard: string, env: NodeJS.ProcessEnv): Promise<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-codex-'))
  const sortie = path.join(dir, 'sortie.json')
  const envEnfant: Record<string, string> = {}
  for (const k of ['PATH', 'HOME', 'LANG']) if (env[k]) envEnfant[k] = env[k] as string
  const enfant: ChildProcess = lancer(chemin, ['exec', '--model', modele, '--sandbox', 'read-only', '--skip-git-repo-check', '--output-last-message', sortie, '-'], { env: envEnfant as NodeJS.ProcessEnv })
  enfant.stdin?.write(entreeStandard)
  enfant.stdin?.end()
  const code: number | null = await new Promise((ok) => { enfant.on('close', (c) => ok(c)); enfant.on('error', () => ok(1)) })
  let texte = ''
  try { texte = fs.readFileSync(sortie, 'utf8') } catch { texte = '' }
  fs.rmSync(dir, { recursive: true, force: true })
  if (code !== 0 || !texte) throw new Error(`code de sortie ${code}`)
  return texte
}

export function creerLecteur(agent: string, _options: Record<string, unknown> = {}, deps: DepsLecteur = {}): Lecteur | null {
  const env = deps.env ?? process.env
  const entree = MOTEUR_DE[agent]
  if (!entree || entree.affichage) return null
  const repli = REPLI[TRAVAIL_DE[agent]]
  if (!repli) return null
  const d1 = entree.personnelles
  const voies = repli.voies.map((v) => (typeof v === 'string' ? v : v.id)).filter((id) => id === 'codex' || (id === 'freellmapi' && !d1))
  const codex = env.CODEX_LANCEUR && fs.existsSync(env.CODEX_LANCEUR) ? env.CODEX_LANCEUR : null
  const freellmapi = urlLocale(env.FREELLMAPI_URL)
  const voie = voies.find((id) => (id === 'codex' ? !!codex : !!freellmapi))
  if (!voie) return null
  const lancer = deps.lancer ?? spawn
  const fetchFn = deps.fetch ?? fetch
  const lecons = chargerLecons(agent, deps)
  return async (systeme, donnees) => {
    const consigne = consigneAvecLecons(systeme, lecons)
    let texte: string
    if (voie === 'codex') {
      texte = await appelerCodex(lancer, codex as string, entree.modele, `${consigne}\n${emballerDonnees(donnees)}`, env)
    } else {
      const corps: Record<string, unknown> = { messages: [{ role: 'system', content: consigne }, { role: 'user', content: emballerDonnees(retirerCoordonnees(donnees)) }], max_tokens: 1024 }
      if (entree.modele !== 'auto') corps.model = entree.modele
      const r = await fetchFn(`${(freellmapi as string).replace(/\/+$/, '')}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps) })
      const j = (await r.json()) as { choices?: Array<{ message?: { content?: unknown } }> }
      texte = String(j?.choices?.[0]?.message?.content ?? '')
    }
    if (deps.enregistrerCout) await deps.enregistrerCout(agent, 0, { moteur: voie, modele: entree.modele })
    return JSON.parse(texte.trim())
  }
}
