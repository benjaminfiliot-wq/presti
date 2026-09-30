// scripts/fixtures/026-garde/pause/commun.mjs — les outils du juge garde-pause-qa : lecture du code (inventaire des voies de
// sortie), arbre témoin, lancement des enfants. Ne juge rien seul. Aucune écriture hors .orchestre/travail/garde-pause-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  R, TRAVAIL, court, premiereLigne, lancer, lireOptions, creerSortie, sansCommentaires, importsDe, listerFichiers, exigerSousTravail, lireOuNull, sous,
} from '../../026-pilotage/a/commun.mjs'

export { R, TRAVAIL, court, premiereLigne, lancer, lireOptions, creerSortie, sansCommentaires, importsDe, listerFichiers, exigerSousTravail, lireOuNull }

export const D = path.dirname(fileURLToPath(import.meta.url))
export const TEMOIN_DIR = path.join(D, 'temoin')
export const SUFFIXE = '.temoin'
export const TRAV = path.join(TRAVAIL, 'garde-pause-qa')
export const posix = (p) => p.split(path.sep).join('/')
export const lf = (t) => String(t ?? '').replace(/\r\n?/g, '\n')
export const exemptions = () => JSON.parse(fs.readFileSync(path.join(D, 'exemptions.json'), 'utf8'))

// ── Le témoin : les fichiers corrigés (Map chemin du dépôt → Buffer) ───────────────────────────────────────────────────
export function fichiersTemoin() {
  const m = new Map()
  for (const f of listerFichiers(TEMOIN_DIR)) {
    if (!f.endsWith(SUFFIXE)) throw new Error(`témoin : ${f} sans le suffixe ${SUFFIXE}`)
    m.set(f.slice(0, -SUFFIXE.length), fs.readFileSync(path.join(TEMOIN_DIR, f)))
  }
  return m
}
const ecrireNeuf = (f, buf) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.rmSync(f, { force: true }); fs.writeFileSync(f, buf) }
/** --temoin : l'état actuel de app/, lib/ et vercel.json (liens physiques), le témoin posé dessus (remplace le lien, jamais le contenu). */
export function arbreTemoin() {
  const dest = exigerSousTravail(path.join(TRAV, 'arbre-temoin'))
  fs.rmSync(dest, { recursive: true, force: true })
  for (const d of ['app', 'lib']) {
    for (const f of listerFichiers(path.join(R, d))) {
      const cible = path.join(dest, d, f)
      fs.mkdirSync(path.dirname(cible), { recursive: true })
      try { fs.linkSync(path.join(R, d, f), cible) } catch { fs.copyFileSync(path.join(R, d, f), cible) }
    }
  }
  if (fs.existsSync(path.join(R, 'vercel.json'))) fs.copyFileSync(path.join(R, 'vercel.json'), path.join(dest, 'vercel.json'))
  for (const [rel, buf] of fichiersTemoin()) ecrireNeuf(path.join(dest, rel), buf)
  return dest
}

// ── La lecture du code ─────────────────────────────────────────────────────────────────────────────────────────────────
const RE_SRC = /\.(ts|tsx)$/
export function sources(racine) {
  const m = new Map()
  for (const d of ['app', 'lib']) for (const f of listerFichiers(path.join(racine, d))) if (RE_SRC.test(f)) m.set(`${d}/${f}`, fs.readFileSync(path.join(racine, d, f), 'utf8'))
  return m
}
export const estClient = (t) => /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(lf(t))

/** Les marqueurs d'une sortie vers l'extérieur, cherchés dans le texte sans commentaires. Liste fermée de PATTERNS, pas de fichiers :
 *  un fichier neuf qui envoie quelque chose y est trouvé sans que personne ne l'ajoute ici. */
export function marqueursDeSortie(texte) {
  const s = sansCommentaires(texte), m = []
  if (/api\.resend\.com\/emails/.test(s)) m.push('resend')
  if (/api\.publora\.com/.test(s)) m.push('publora')
  if (/graph\.facebook\.com/.test(s) && /['"]POST['"]/.test(s)) m.push('graph-ecriture')
  if (/\bsendNotification\s*\(|messages:send/.test(s)) m.push('push')
  if (/nodemailer|createTransport|\bsendMail\s*\(/.test(s)) m.push('smtp')
  if (/hooks\.slack\.com|discord(?:app)?\.com\/api\/webhooks|api\.telegram\.org/.test(s)) m.push('messagerie-tierce')
  if (/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/.test(s) && /https?:\/\/(?!127\.0\.0\.1|localhost)/.test(s)) m.push('http-ecriture')
  return m
}
const CANDIDATS = (b) => [b, `${b}.ts`, `${b}.tsx`, `${b}/index.ts`, `${b}/index.tsx`]
export function resoudre(spec, depuis, tous) {
  let base = null
  if (spec.startsWith('@/')) base = spec.slice(2)
  else if (spec.startsWith('.')) base = posix(path.posix.normalize(path.posix.join(path.posix.dirname(depuis), spec)))
  return base === null ? null : CANDIDATS(base).find((c) => tous.has(c)) ?? null
}
/** Les noms de fonctions exportés d'un fichier (les appels d'envoi sont ceux-là). */
export function fonctionsExportees(texte) {
  const s = sansCommentaires(texte), n = new Set()
  for (const m of s.matchAll(/\bexport\s+(?:async\s+)?function\s+([\w$]+)/g)) n.add(m[1])
  for (const m of s.matchAll(/\bexport\s+const\s+([\w$]+)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[\w$]+)\s*(?::[^=]+)?=>/g)) n.add(m[1])
  return [...n]
}
export const RE_LECTURE_PAUSE = /\b(?:pauseGenerale|sortiePermise)\s*\(/
/** Vrai si le texte lit la pause AVANT la première occurrence de `appel(`. Les positions sont celles du texte sans commentaires. */
export function litLaPauseAvant(texteBrut, appel) {
  const s = sansCommentaires(texteBrut)
  const a = new RegExp(`\\b${appel}\\s*\\(`).exec(s)
  const p = RE_LECTURE_PAUSE.exec(s)
  return !!a && !!p && p.index < a.index
}
/** L'inventaire : { primitives: [{ fichier, marques, importeurs: [{ fichier, noms }] }] }, dérivé des sources de la racine. */
export function inventaire(racine) {
  const tous = sources(racine)
  const serveur = new Map([...tous].filter(([, t]) => !estClient(t)))
  const primitives = []
  for (const [f, t] of serveur) {
    const marques = marqueursDeSortie(t)
    if (!marques.length) continue
    const fonctions = fonctionsExportees(t)
    const importeurs = []
    for (const [g, u] of serveur) {
      if (g === f) continue
      const noms = new Set()
      for (const im of importsDe(u)) {
        if (im.type || !im.spec || resoudre(im.spec, g, tous) !== f) continue
        const s = sansCommentaires(u)
        for (const n of fonctions) if (new RegExp(`\\b${n}\\s*\\(`).test(s)) noms.add(n)
      }
      if (noms.size) importeurs.push({ fichier: g, noms: [...noms] })
    }
    primitives.push({ fichier: f, marques, fonctions, importeurs, gardeInterne: gardeInterne(t, marques) })
  }
  return primitives
}
/** La primitive lit-elle elle-même la pause avant son effet ? (l'appel d'un paramètre `ctx.pause` compte aussi). */
function gardeInterne(texte, marques) {
  const s = sansCommentaires(texte)
  const effet = marques.includes('resend') ? s.search(/fetch\s*\(\s*['"`]https:\/\/api\.resend\.com/) : marques.includes('graph-ecriture') ? s.search(/\bo\.fetch\s*\(/) : s.search(/\bfetch\s*\(|sendNotification\s*\(/)
  const p = RE_LECTURE_PAUSE.exec(s) ?? /ctx\.pause\s*===\s*true/.exec(s)
  return effet >= 0 && !!p && p.index < effet
}

// ── Les enfants ────────────────────────────────────────────────────────────────────────────────────────────────────────
export const MARQUE = '@@gp@@ '
/** Lance le juge lui-même en enfant (groupe de scénarios) ; rend { obs, erreur }. */
export function lancerEnfant(script, groupe, racine, env = {}) {
  // Deux essais : une machine chargée (d'autres sessions travaillent sur ce dépôt) peut faire expirer un enfant sans qu'il y ait faute.
  let r = null, ligne
  for (let essai = 0; essai < 2 && !ligne; essai++) {
    r = lancer(process.execPath, [script, `--enfant=${groupe}`, `--racine=${racine}`], { cwd: R, timeout: 180_000, env: { ...process.env, ...env } })
    ligne = r.stdout.split(/\r?\n/).find((l) => l.startsWith(MARQUE))
  }
  if (!ligne) return { obs: null, erreur: `enfant « ${groupe} » sans résultat (code ${r.code}) : ${court(r.sortie.trim().split(/\r?\n/).filter((l) => !/ExperimentalWarning|--trace-warnings/.test(l)).slice(-3).join(' | '), 240)}` }
  try { return { obs: JSON.parse(ligne.slice(MARQUE.length)), erreur: null } } catch (e) { return { obs: null, erreur: `enfant « ${groupe} » : sortie illisible (${premiereLigne(e)})` } }
}
export { sous }
