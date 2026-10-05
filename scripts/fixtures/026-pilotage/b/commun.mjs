// scripts/fixtures/026-pilotage/b/commun.mjs — l'aide du lot b des juges du Pilotage (fiche 026-066, écrite par Claude Code),
// reprise par les lots c et s. Elle importe les aides du lot a (a/commun.mjs, fiche 026-012) sans les recopier.
//
//   copieAvecDrapeau(racine, { critere })  copie app/, lib/ et les fichiers de tête (proxy.ts ou, à défaut, middleware.ts ;
//        next.config.mjs, tsconfig.json, package.json, next-env.d.ts) dans .orchestre/travail/pilotage-copie/arbre/, relie
//        node_modules et public par des jonctions, et remplace `pilotage: false,` par `pilotage: true,` dans la copie de
//        lib/flags.ts SEULEMENT. Jamais .env.local. Lève une erreur qui porte le critère de l'appelant si un préalable manque
//        (aucun des deux fichiers de tête, motif du drapeau absent) : jamais un ENOENT sans identifiant.
//   serveurCopie(copie, { critere })       charge .env.local de la VRAIE racine (chargerEnv de scripts/lib/capture.mjs, rien
//        n'est affiché), lance `next dev` dans la copie sur un port libre, sous le verrou machine de capture.mjs (même fichier,
//        même format « <pid> <date> ») ; rend { base, arreter } : l'appelant arrête dans un `finally` (taskkill /T /F par PID).
//        Ne réutilise jamais PRESTI_BASE_URL ni le port 3400 : ils servent l'arbre réel, drapeau baissé.
//   fondateurEssai() / artisanEssai()      compteTest('direction' | 'artisan') de capture.mjs, dont `supprimer` est vérifié :
//        après le ménage, le compte doit avoir disparu (lu par la clé de service), sinon `supprimer` rend false.
//   avecComptes(roles, f)                  crée les comptes, appelle f(comptes), et les supprime dans un `finally` ; rend
//        { resultat, menage } (menage faux si un compte n'a pas disparu : le juge appelant sort alors en code 1).
//   journalDe(uid)                         le nombre de lignes de journal_direction de cet acteur, par la clé de service.
//   arbreTemoin(juge, { base, chemins })   l'arbre du mode --temoin : les `chemins` du commit `base` (git archive, rien n'est
//        écrit dans .git) sous .orchestre/travail/<juge>/temoin-arbre/, puis le témoin du lot b posé dessus (b/temoin/,
//        suffixe .temoin ôté). C'est le même témoin que la preuve pose sur la référence (JA-7).
//   lireBase(base, rel) / cheminsBase(base, prefixe)   un fichier (ou la liste des fichiers) du commit de comparaison.
//   sansCommentairesTs, lire, corpsDeFonction, premiereInstruction   lecture de source TypeScript pour les juges de route.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { R, TRAVAIL, court, premiereLigne, git, lireOuNull, sansCommentaires, exigerSousTravail, extraireTar, listerFichiers } from '../a/commun.mjs'

export { R, TRAVAIL, court, premiereLigne, lireOuNull, git, exigerSousTravail, listerFichiers }
export const B = path.dirname(fileURLToPath(import.meta.url))
export const TEMOIN_B = path.join(B, 'temoin')
export const SUFFIXE_TEMOIN = '.temoin'
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
export const lf = (t) => String(t ?? '').replace(/\r\n?/g, '\n')
export const posix = (p) => p.split(path.sep).join('/')

// ── Le commit de comparaison ─────────────────────────────────────────────────────────────────────────────────────────────
/** `--base=<commit>` (défaut HEAD) : le commit auquel les critères « rien d'autre n'a bougé » comparent la racine jugée. */
export function commitBase(valeur) {
  const v = valeur || 'HEAD'
  if (!/^[\w.^~/-]{1,80}$/.test(v)) throw new Error(`--base « ${v} » : un commit attendu`)
  const r = git(['rev-parse', '--verify', `${v}^{commit}`])
  if (r.code !== 0) throw new Error(`--base « ${v} » introuvable : ${court(r.stderr)}`)
  return r.stdout.trim()
}
/** Le contenu d'un fichier au commit `base` (null s'il n'y existe pas). */
export function lireBase(base, rel) {
  const r = git(['show', `${base}:${rel}`], { binaire: true })
  return r.code === 0 ? r.stdout.toString('utf8') : null
}
/** Les fichiers du commit `base` sous `prefixe`. */
export function cheminsBase(base, prefixe) {
  const r = git(['ls-tree', '-r', '--full-tree', '--name-only', '-z', base, '--', prefixe])
  if (r.code !== 0) throw new Error(`git ls-tree ${base.slice(0, 7)} ${prefixe} : ${court(r.stderr)}`)
  return r.stdout.split('\0').filter(Boolean)
}

// ── L'arbre du mode --temoin ─────────────────────────────────────────────────────────────────────────────────────────────
/** Les fichiers du témoin du lot b : Map(chemin du dépôt → Buffer). */
export function fichiersTemoin() {
  const m = new Map()
  for (const f of listerFichiers(TEMOIN_B)) {
    const p = posix(f)
    if (!p.endsWith(SUFFIXE_TEMOIN)) throw new Error(`témoin : ${p} sans le suffixe ${SUFFIXE_TEMOIN}`)
    m.set(p.slice(0, -SUFFIXE_TEMOIN.length), fs.readFileSync(path.join(TEMOIN_B, f)))
  }
  return m
}
export function arbreTemoin(juge, { base, chemins }) {
  const dest = exigerSousTravail(path.join(TRAVAIL, juge, 'temoin-arbre'))
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  const tar = path.join(TRAVAIL, juge, 'temoin-arbre.tar')
  const existants = chemins.filter((c) => cheminsBase(base, c).length)
  if (existants.length) {
    const r = git(['archive', '--format=tar', `--output=${tar}`, base, '--', ...existants])
    if (r.code !== 0) throw new Error(`git archive ${base.slice(0, 7)} : ${court(r.stderr)}`)
    extraireTar(tar, dest)
    fs.rmSync(tar, { force: true })
  }
  const poses = []
  for (const [rel, buf] of fichiersTemoin()) {
    const f = path.join(dest, rel)
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.rmSync(f, { force: true })
    fs.writeFileSync(f, buf)
    poses.push(rel)
  }
  return { dest, poses }
}

// ── La copie au drapeau levé ─────────────────────────────────────────────────────────────────────────────────────────────
export const COPIE = path.join(TRAVAIL, 'pilotage-copie')
const MOTIF_BAISSE = 'pilotage: false,'
const MOTIF_LEVE = 'pilotage: true,'
// D-0510-D2 (correction du chef, 05/10, 026-117 et 026-120) : le drapeau `pilotage` est LEVÉ en production depuis 026-140 (Benj, 05/10) : le juge exigeait encore exactement un
// `pilotage: false,` dans lib/flags.ts et refusait toute racine réelle. Il accepte désormais l'UN des deux états, exactement une fois : baissé (levé dans la copie, comme avant)
// ou déjà levé (copie telle quelle). Rien d'assoupli : absent, doublé, ou `false` et `true` ensemble restent refusés ; la copie doit finir levée ; la source ne doit pas bouger.
const compter = (t, m) => t.split(m).length - 1
/** 'baisse' : un seul `pilotage: false,` et aucun `true` ; 'leve' : un seul `pilotage: true,` et aucun `false` ; sinon null (refusé). */
const etatDrapeau = (t) => { const b = compter(t, MOTIF_BAISSE), l = compter(t, MOTIF_LEVE); return b === 1 && l === 0 ? 'baisse' : b === 0 && l === 1 ? 'leve' : null }
const erreurCritere = (critere, m) => { const e = new Error(`${critere} : ${m}`); e.critere = critere; return e }
/** → { dest, tete, empreinteReelle, empreinteCopie, remplacements } */
export function copieAvecDrapeau(racine, { critere = 'RL-3' } = {}) {
  const dest = exigerSousTravail(path.join(COPIE, 'arbre'))
  const tete = ['proxy.ts', 'middleware.ts'].find((f) => fs.existsSync(path.join(racine, f)))
  if (!tete) throw erreurCritere(critere, `ni proxy.ts ni middleware.ts dans ${racine} : la copie n'aurait pas de garde`)
  const flagsReel = path.join(racine, 'lib', 'flags.ts')
  const texteFlags = lireOuNull(flagsReel)
  if (texteFlags === null) throw erreurCritere(critere, 'lib/flags.ts absent de la racine')
  const etat = etatDrapeau(texteFlags)
  if (!etat) throw erreurCritere(critere, `lib/flags.ts porte « ${MOTIF_BAISSE} » ${compter(texteFlags, MOTIF_BAISSE)} fois et « ${MOTIF_LEVE} » ${compter(texteFlags, MOTIF_LEVE)} fois : exactement un des deux, une seule fois, est attendu (le drapeau ne peut pas être levé dans la copie)`)
  const empreinteReelle = sha256(fs.readFileSync(flagsReel))
  // La copie précédente est retirée, jonctions comprises (rmSync ne suit pas une jonction : il retire le lien).
  for (const j of ['node_modules', 'public']) { try { fs.rmSync(path.join(dest, j), { recursive: false, force: true }) } catch { try { fs.unlinkSync(path.join(dest, j)) } catch { /* absente */ } } }
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  for (const d of ['app', 'lib']) {
    if (!fs.existsSync(path.join(racine, d))) throw erreurCritere(critere, `${d}/ absent de la racine`)
    fs.cpSync(path.join(racine, d), path.join(dest, d), { recursive: true })
  }
  for (const f of [tete, 'next.config.mjs', 'tsconfig.json', 'package.json', 'next-env.d.ts']) {
    if (fs.existsSync(path.join(racine, f))) fs.copyFileSync(path.join(racine, f), path.join(dest, f))
    else if (f !== 'next-env.d.ts') throw erreurCritere(critere, `${f} absent de la racine`)
  }
  for (const j of ['node_modules', 'public']) {
    const cible = path.join(R, j)
    if (fs.existsSync(cible)) fs.symlinkSync(cible, path.join(dest, j), 'junction')
  }
  const f = path.join(dest, 'lib', 'flags.ts')
  fs.writeFileSync(f, etat === 'baisse' ? texteFlags.replace(MOTIF_BAISSE, () => MOTIF_LEVE) : texteFlags)
  if (fs.existsSync(path.join(dest, '.env.local'))) throw erreurCritere(critere, '.env.local dans la copie')
  const copie = fs.readFileSync(f, 'utf8')
  return {
    dest, tete,
    empreinteReelle, empreinteReelleApres: sha256(fs.readFileSync(flagsReel)),
    leveDansCopie: copie.includes(MOTIF_LEVE) && !copie.includes(MOTIF_BAISSE),
    // « baisseDansReel » garde son nom (trois juges le lisent) : il dit que la SOURCE n'a pas bougé (même empreinte, même état), baissée ou levée.
    baisseDansReel: sha256(fs.readFileSync(flagsReel)) === empreinteReelle && etatDrapeau(fs.readFileSync(flagsReel, 'utf8')) === etat,
  }
}

// ── Le serveur de la copie ───────────────────────────────────────────────────────────────────────────────────────────────
const VERROU = path.join(os.tmpdir(), 'presti-capture-serveur.lock')
const vivant = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }
async function prendreVerrou() {
  const debut = Date.now()
  for (;;) {
    try { fs.writeFileSync(VERROU, `${process.pid} ${new Date().toISOString()}\n`, { flag: 'wx' }); return } catch { /* pris */ }
    try {
      const [pid] = fs.readFileSync(VERROU, 'utf8').trim().split(/\s+/)
      if (!vivant(Number(pid)) || Date.now() - fs.statSync(VERROU).mtimeMs > 20 * 60_000) { fs.unlinkSync(VERROU); continue }
    } catch { continue }
    if (Date.now() - debut > 15 * 60_000) throw new Error('un autre juge tient le serveur de capture depuis plus de 15 min')
    await new Promise((ok) => setTimeout(ok, 3000))
  }
}
const libererVerrou = () => { try { if (fs.readFileSync(VERROU, 'utf8').startsWith(`${process.pid} `)) fs.unlinkSync(VERROU) } catch { /* déjà levé */ } }
/** Arrête un processus et ses enfants, par son PID seulement (jamais par nom). */
export const tuerPid = (pid) => {
  if (!pid) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
  else { try { process.kill(pid, 'SIGTERM') } catch { /* déjà parti */ } }
}
const repond = async (url) => { try { const r = await fetch(url, { redirect: 'manual' }); return r.status > 0 } catch { return false } }

let capture = null
const moduleCapture = async () => (capture ??= await import('../../../lib/capture.mjs'))

/** next dev sur la copie. → { base, port, arreter } ; l'appelant appelle arreter() dans un finally. */
export async function serveurCopie(copie, { critere = 'RL-3', attenteMs = 240_000 } = {}) {
  const { chargerEnv, portLibre } = await moduleCapture()
  chargerEnv(R) // la VRAIE racine : la copie n'a jamais .env.local ; rien n'est affiché
  const bin = path.join(R, 'node_modules', 'next', 'dist', 'bin', 'next')
  if (!fs.existsSync(bin)) throw erreurCritere(critere, 'next introuvable dans node_modules')
  await prendreVerrou()
  let enfant = null
  try {
    const port = await portLibre()
    if (port === 3400) throw erreurCritere(critere, 'port 3400 : c’est celui de l’arbre réel')
    const base = `http://127.0.0.1:${port}`
    enfant = spawn(process.execPath, [bin, 'dev', '--webpack', '-p', String(port), '-H', '127.0.0.1'], { cwd: copie, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, env: { ...process.env, PORT: String(port), BROWSER: 'none', NEXT_TELEMETRY_DISABLED: '1' } })
    let journal = ''
    enfant.stdout.on('data', (d) => { journal = (journal + d).slice(-4000) })
    enfant.stderr.on('data', (d) => { journal = (journal + d).slice(-4000) })
    const debut = Date.now()
    while (Date.now() - debut < attenteMs) {
      if (await repond(`${base}/api/controle/chiffres`)) {
        const pid = enfant.pid
        return { base, port, pid, arreter: async () => { tuerPid(pid); libererVerrou() } }
      }
      if (enfant.exitCode !== null) throw erreurCritere(critere, `next dev (copie) s'est arrêté : ${court(journal.slice(-300), 300)}`)
      await new Promise((ok) => setTimeout(ok, 1000))
    }
    throw erreurCritere(critere, `next dev (copie) ne répond pas après ${attenteMs / 1000} s : ${court(journal.slice(-300), 300)}`)
  } catch (e) { if (enfant) tuerPid(enfant.pid); libererVerrou(); throw e }
}

// ── Les comptes d'essai ──────────────────────────────────────────────────────────────────────────────────────────────────
const cles = () => {
  const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SB || !SVC) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY attendues (.env.local de la vraie racine)')
  return { SB, h: { apikey: SVC, Authorization: `Bearer ${SVC}` } }
}
/** Le compte a-t-il disparu (auth et artisans) ? Lu par la clé de service. */
export async function compteDisparu(id) {
  const { SB, h } = cles()
  const u = await fetch(`${SB}/auth/v1/admin/users/${id}`, { headers: h })
  const a = await fetch(`${SB}/rest/v1/artisans?select=id&id=eq.${id}`, { headers: h })
  const lignes = a.ok ? await a.json() : null
  return u.status === 404 && Array.isArray(lignes) && lignes.length === 0
}
async function compteEssai(role) {
  const { chargerEnv, compteTest } = await moduleCapture()
  chargerEnv(R)
  const c = await compteTest(role)
  const supprimerBrut = c.supprimer
  return { ...c, jeton: c.sess.access_token, supprimer: async () => { await supprimerBrut(); return compteDisparu(c.id) } }
}
export const fondateurEssai = () => compteEssai('direction')
export const artisanEssai = () => compteEssai('artisan')
/** Crée les comptes (« direction », « artisan »), appelle f, supprime tout dans un finally. → { resultat, menage, erreur } */
export async function avecComptes(roles, f) {
  const comptes = {}
  let resultat = null, erreur = null, menage = true
  try {
    for (const r of roles) comptes[r] = await compteEssai(r)
    resultat = await f(comptes)
  } catch (e) { erreur = e } finally {
    for (const c of Object.values(comptes)) { try { if (!(await c.supprimer())) menage = false } catch { menage = false } }
  }
  return { resultat, menage, erreur }
}
/** Le nombre de lignes de journal_direction de cet acteur (clé de service). */
export async function journalDe(uid) {
  const { SB, h } = cles()
  const r = await fetch(`${SB}/rest/v1/journal_direction?select=id&acteur_id=eq.${uid}`, { headers: { ...h, Prefer: 'count=exact', Range: '0-0' } })
  const plage = r.headers.get('content-range') || ''
  const n = Number(plage.split('/')[1])
  if (!r.ok || !Number.isFinite(n)) throw new Error(`journal_direction illisible : ${r.status}`)
  return n
}

// ── Lecture de source TypeScript ─────────────────────────────────────────────────────────────────────────────────────────
export const sansCommentairesTs = (src) => sansCommentaires(src)
export const lire = (racine, rel) => lireOuNull(path.join(racine, rel))
/** Le corps (entre accolades) de la fonction exportée `nom` (export async function nom(…) {…}), commentaires ôtés. */
export function corpsDeFonction(src, nom) {
  const s = sansCommentaires(src)
  const m = new RegExp(`export\\s+(?:async\\s+)?function\\s+${nom}\\s*\\(`).exec(s)
  if (!m) return null
  let i = s.indexOf('(', m.index), prof = 0
  for (; i < s.length; i++) { if (s[i] === '(') prof++; else if (s[i] === ')') { prof--; if (!prof) break } }
  const debut = s.indexOf('{', i)
  if (debut < 0) return null
  prof = 0
  for (let j = debut; j < s.length; j++) {
    const c = s[j]
    if (c === '\'' || c === '"' || c === '`') { const q = c; j++; while (j < s.length && s[j] !== q) { if (s[j] === '\\') j++; j++ } continue }
    if (c === '{') prof++
    else if (c === '}') { prof--; if (!prof) return s.slice(debut + 1, j) }
  }
  return null
}
/** La première instruction d'un corps (jusqu'au premier « ; » ou fin de ligne de premier niveau), blancs repliés. */
export function premiereInstruction(corps) {
  const t = String(corps ?? '').trim()
  const fin = t.search(/;|\n/)
  return (fin < 0 ? t : t.slice(0, fin)).replace(/\s+/g, ' ').trim()
}
