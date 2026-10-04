// scripts/lib/capture.mjs — le juge prend ses captures lui-même.
//
// Une capture livrée par un agent n'est pas une preuve. Le 13/09 : quatre fichiers identiques pour « quatre écrans »
// (un seul PNG copié), et un « PNG » de 15 000 octets bourré de zéros pour un onglet — deux vérificateurs qui ne
// regardaient que la signature et la taille ont dit PASS. La preuve, c'est l'écran tel qu'il se rend, capturé par le
// vérificateur sur un serveur qu'il a lancé, avec un compte qu'il a créé et qu'il supprime, dans .orchestre/preuves/.
// L'agent n'a plus rien à déposer : il rend l'écran capturable (adressable par URL), le juge fait le reste.
//
// Réglages : PRESTI_BASE_URL (un serveur déjà lancé, sinon `next dev` sur un port libre, tué à la fin) ;
// NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local) pour le compte.
import fs from 'node:fs'
import os from 'node:os'
import net from 'node:net'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { chromium } from 'playwright'
import { verifierSessionTest } from './connexion-test.mjs'

/** .env.local → process.env (sans écraser ce qui est déjà posé). */
export function chargerEnv(racine) {
  const f = path.join(racine, '.env.local')
  if (!fs.existsSync(f)) return
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const i = l.indexOf('=')
    if (i < 1 || l.trim().startsWith('#')) continue
    const k = l.slice(0, i).trim()
    if (!process.env[k]) process.env[k] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
}

export const portLibre = () => new Promise((res, rej) => {
  const s = net.createServer(); s.unref(); s.on('error', rej)
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) })
})

const repond = async (url) => { try { const r = await fetch(url, { redirect: 'manual' }); return r.status > 0 } catch { return false } }
const tuer = (pid) => { if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' }); else { try { process.kill(pid, 'SIGTERM') } catch { /* déjà parti */ } } }

// Deux `next dev` sur le même dossier se marchent dessus (.next/ partagé : le second sert des 404 au premier — vu le
// 13/09 quand deux juges ont capturé en même temps). Un seul serveur lancé par un juge à la fois, sur toute la machine.
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
    await new Promise((r) => setTimeout(r, 3000))
  }
}
const libererVerrou = () => { try { if (fs.readFileSync(VERROU, 'utf8').startsWith(`${process.pid} `)) fs.unlinkSync(VERROU) } catch { /* déjà levé */ } }

/**
 * Un serveur pour capturer : PRESTI_BASE_URL s'il répond ; sinon le serveur de développement du projet s'il tourne
 * déjà (le port du script `dev`, 3400) ; sinon `next dev` sur un port libre, sous verrou, arrêté par `arreter`.
 */
export async function serveur(racine, { attenteMs = 150_000 } = {}) {
  const voulu = process.env.PRESTI_BASE_URL
  if (voulu && (await repond(voulu))) return { base: voulu.replace(/\/$/, ''), lance: false, arreter: async () => {} }
  let portDev = 3400
  try { const m = JSON.parse(fs.readFileSync(path.join(racine, 'package.json'), 'utf8')).scripts?.dev?.match(/-p\s+(\d+)/); if (m) portDev = Number(m[1]) } catch { /* 3400 */ }
  if (await repond(`http://127.0.0.1:${portDev}/`)) return { base: `http://127.0.0.1:${portDev}`, lance: false, port: portDev, arreter: async () => {} }
  await prendreVerrou()
  const port = await portLibre()
  const base = `http://127.0.0.1:${port}`
  const bin = path.join(racine, 'node_modules', 'next', 'dist', 'bin', 'next')
  // `--webpack` : sous Next 16 `next dev` démarre avec Turbopack et refuse le projet (next.config.mjs passe par Serwist, qui pose une
  // config webpack) : « To configure Turbopack, see … », le serveur s'arrête avant de répondre. Le build du projet est déjà
  // `next build --webpack` ; 026-257 a posé la même option sur les copies de b/commun.mjs ; ici, le serveur de l'arbre réel (04/10).
  const enfant = spawn(process.execPath, [bin, 'dev', '--webpack', '-p', String(port), '-H', '127.0.0.1'], { cwd: racine, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port), BROWSER: 'none' } })
  let journal = ''
  enfant.stdout.on('data', (d) => { journal += d })
  enfant.stderr.on('data', (d) => { journal += d })
  const debut = Date.now()
  while (Date.now() - debut < attenteMs) {
    if (await repond(base + '/')) return { base, lance: true, port, arreter: async () => { tuer(enfant.pid); libererVerrou() } }
    if (enfant.exitCode !== null) { libererVerrou(); throw new Error(`next dev s'est arrêté : ${journal.slice(-400)}`) }
    await new Promise((r) => setTimeout(r, 1000))
  }
  tuer(enfant.pid); libererVerrou()
  throw new Error(`next dev ne répond pas après ${attenteMs / 1000} s : ${journal.slice(-400)}`)
}

// ── Le ménage des comptes de test ────────────────────────────────────────────────────────────────────────────────────
//
// 04/10 : quatre comptes `is_founder` de capture (cinq avec celui du jour) sont restés deux jours en production — l'audit de
// sécurité les a trouvés. Cause : `supprimer()` lançait deux DELETE sans jamais regarder la réponse (`.catch(() => {})` ne
// rattrape qu'une panne réseau, pas un 4xx/5xx), donc un refus passait pour un succès ; et rien ne vérifiait à la fin que
// le compte avait disparu. Un juge tué avant son `finally` en laissait aussi, sans que personne ne le sache.
// Désormais : les privilèges partent d'abord (si la suite échoue, le compte qui reste n'est plus fondateur), la fiche et le
// compte de connexion sont supprimés, puis la PREUVE est lue (ni l'une ni l'autre n'existent plus) — sinon une erreur, jamais
// un silence. Les comptes oubliés d'un run interrompu sont balayés au run suivant, et leur absence est contrôlée à la fin.
// Aucun verrou de conservation n'est levé ici : un compte qui porte une facture émise reste, et l'erreur le dit.
const MOTIF_COMPTE_CAPTURE = /^capture\.(artisan|direction)\.(\d{13})@presti-test\.invalid$/
/** Un compte de capture plus vieux que ça n'appartient plus à un run en cours (un run dure moins d'une heure). */
const AGE_COMPTE_OUBLIE_MS = 60 * 60_000
const masquer = (t) => String(t ?? '').replace(/\s+/g, ' ').replace(/[^\s"'<>(),;]+@[^\s"'<>(),;]+/g, '***@***').slice(0, 160)
const enteteService = () => { const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY; return { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' } }
const urlBase = () => {
  const SB = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!SB || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont nécessaires (.env.local)')
  return SB
}

/**
 * Retire un compte de test (par son id) : privilèges, rôle direction, fiche artisan, compte de connexion — puis prouve qu'il a
 * disparu. Lève une erreur (sans adresse e-mail) si la fiche ou le compte de connexion existe encore. Idempotent.
 */
export async function retirerCompteTest(id) {
  const SB = urlBase(), h = enteteService()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id))) throw new Error('retirerCompteTest : identifiant invalide')
  const id8 = id.slice(0, 8), problemes = []
  const essayer = async (quoi, url, init, admis = []) => {
    try {
      const r = await fetch(url, { ...init, headers: h, signal: AbortSignal.timeout(20_000) })
      if (!r.ok && !admis.includes(r.status)) problemes.push(`${quoi} : ${r.status} ${masquer(await r.text().catch(() => ''))}`)
    } catch (e) { problemes.push(`${quoi} : ${masquer(e?.message ?? e)}`) }
  }
  await essayer('retrait des privilèges', `${SB}/rest/v1/artisans?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ is_founder: false, role_interne: null }) })
  await essayer('retrait du rôle direction', `${SB}/rest/v1/direction_roles?user_id=eq.${id}`, { method: 'DELETE' }, [404])
  await essayer('suppression de la fiche artisan', `${SB}/rest/v1/artisans?id=eq.${id}`, { method: 'DELETE' })
  await essayer('suppression du compte de connexion', `${SB}/auth/v1/admin/users/${id}`, { method: 'DELETE' }, [404])
  // La preuve : on LIT la base, on ne se fie pas aux réponses des DELETE.
  const restes = []
  const fiche = await fetch(`${SB}/rest/v1/artisans?select=id&id=eq.${id}`, { headers: h, signal: AbortSignal.timeout(20_000) })
  if (!fiche.ok) restes.push(`lecture de la fiche impossible (${fiche.status})`)
  else if ((await fiche.json().catch(() => [null])).length) restes.push('la fiche artisan existe encore')
  const roles = await fetch(`${SB}/rest/v1/direction_roles?select=user_id&user_id=eq.${id}`, { headers: h, signal: AbortSignal.timeout(20_000) })
  if (roles.ok && (await roles.json().catch(() => [null])).length) restes.push('le rôle direction existe encore')
  const connexion = await fetch(`${SB}/auth/v1/admin/users/${id}`, { headers: h, signal: AbortSignal.timeout(20_000) })
  if (connexion.status !== 404) restes.push(`le compte de connexion répond encore (${connexion.status})`)
  if (restes.length) throw new Error(`ménage du compte de test ${id8} en échec : ${restes.join(' ; ')}${problemes.length ? ` — ${problemes.join(' ; ')}` : ''}`)
}

/** Les comptes de capture plus vieux que `ageMs`, fiche ou compte de connexion : ceux qu'un run interrompu a laissés. */
export async function comptesCaptureOublies({ ageMs = AGE_COMPTE_OUBLIE_MS } = {}) {
  const SB = urlBase(), h = enteteService(), trouves = new Map()
  const noter = (id, email) => {
    const m = MOTIF_COMPTE_CAPTURE.exec(String(email ?? '').toLowerCase())
    if (m && Date.now() - Number(m[2]) > ageMs) trouves.set(id, { id, role: m[1], ageMin: Math.round((Date.now() - Number(m[2])) / 60_000) })
  }
  for (let page = 1; page <= 25; page++) {
    const r = await fetch(`${SB}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: h, signal: AbortSignal.timeout(30_000) })
    if (!r.ok) throw new Error(`liste des comptes de connexion illisible : ${r.status}`)
    const { users = [] } = await r.json()
    for (const u of users) noter(u.id, u.email)
    if (users.length < 200) break
  }
  const f = await fetch(`${SB}/rest/v1/artisans?select=id,email&email=like.capture.*%40presti-test.invalid&limit=1000`, { headers: h, signal: AbortSignal.timeout(30_000) })
  if (!f.ok) throw new Error(`liste des fiches artisans illisible : ${f.status}`)
  for (const a of await f.json()) noter(a.id, a.email)
  return [...trouves.values()]
}

/** Retire les comptes de capture oubliés ; lève une erreur si l'un d'eux résiste. Rend leur nombre. */
export async function balayerComptesCapture(opts) {
  const oublies = await comptesCaptureOublies(opts), echecs = []
  for (const o of oublies) { try { await retirerCompteTest(o.id) } catch (e) { echecs.push(e.message) } }
  if (echecs.length) throw new Error(`${echecs.length} compte(s) de capture oublié(s) impossible(s) à retirer : ${echecs.join(' | ')}`)
  return oublies.length
}

/** Contrôle de fin de suite : aucun compte de capture oublié ne reste en base (lève une erreur sinon). */
export async function verifierAucunCompteCapture(opts) {
  const restes = await comptesCaptureOublies(opts)
  if (restes.length) throw new Error(`${restes.length} compte(s) de capture oublié(s) en base : ${restes.map((r) => `${r.id.slice(0, 8)} (${r.role}, ${r.ageMin} min)`).join(', ')}`)
}

/** Un compte de capture (@presti-test.invalid), artisan ou direction (fondateur), avec sa session attestée ; `supprimer` le retire (et lève une erreur s'il reste). */
export async function compteTest(role = 'artisan') {
  const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!SB || !SVC || !ANON) throw new Error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et NEXT_PUBLIC_SUPABASE_ANON_KEY sont nécessaires (.env.local)')
  const h = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
  const st = Date.now(), email = `capture.${role}.${st}@presti-test.invalid`, pw = `Capture-${crypto.randomBytes(12).toString('base64url')}`
  const u = await (await fetch(`${SB}/auth/v1/admin/users`, { method: 'POST', headers: h, body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
  if (!u?.id) throw new Error(`création du compte de capture refusée : ${masquer(JSON.stringify(u))}`)
  const supprimer = () => retirerCompteTest(u.id)
  // Échec en cours de création : on défait, et si le ménage échoue lui aussi, les DEUX erreurs sont dites.
  const abandonner = async (message) => {
    try { await supprimer() } catch (e) { throw new Error(`${message} — ET ${e.message}`) }
    throw new Error(message)
  }
  const ligne = { id: u.id, email, nom: role === 'direction' ? 'Direction (capture)' : 'Artisan (capture)', metier: 'Plombier', slug: `capture-${st}`, ...(role === 'direction' ? { is_founder: true } : {}) }
  // La visite guidée se lit d'abord dans artisans.aide_vues (localStorage n'est que le repli) : un compte neuf la reçoit
  // par-dessus l'écran. On la déclare vue ; si la colonne n'est pas migrée, on réessaie sans.
  let r = await fetch(`${SB}/rest/v1/artisans`, { method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify({ ...ligne, aide_vues: ['visite:console'] }) })
  if (!r.ok) r = await fetch(`${SB}/rest/v1/artisans`, { method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify(ligne) })
  if (!r.ok) { const t = masquer(await r.text()); await abandonner(`ligne artisans refusée : ${r.status} ${t}`) }
  const sess = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json()
  if (!sess?.access_token) await abandonner('session de capture refusée')
  await verifierSessionTest(sess.access_token)
  const ref = SB.replace(/^https?:\/\//, '').split('.')[0]
  return { id: u.id, email, sess, cleLocale: `sb-${ref}-auth-token`, supprimer }
}

/**
 * Capture chaque écran. `ecrans` : [{ nom, chemin, attendre? }] — `chemin` relatif (« /controle?onglet=cerveaux »),
 * `attendre` un texte qui doit être visible avant la capture (sinon 2,5 s d'attente et l'écran tel quel).
 * Rend par écran : fichier, octets, md5 (pour prouver que deux écrans diffèrent), texte (le rendu, pour les
 * assertions du vérificateur), ok (la page a chargé), attendu (le texte attendu est apparu, ou null), url (finale).
 */
export async function capturer({ racine, dossier, ecrans, largeur = 390, hauteur = 844, role = 'artisan', pleinePage = false, stockageLocal = {} }) {
  chargerEnv(racine)
  fs.mkdirSync(dossier, { recursive: true })
  const srv = await serveur(racine)
  let compte = null, navigateur = null, erreur = null
  const resultats = []
  try {
    // Les comptes qu'un run interrompu (juge tué avant son ménage) a laissés : retirés ici, avant d'en créer un autre.
    await balayerComptesCapture()
    compte = await compteTest(role)
    navigateur = await chromium.launch()
    const page = await navigateur.newPage({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1, locale: 'fr-FR' })
    // La session, plus ce que le vérificateur veut poser dans localStorage (la visite guidée déjà vue, par exemple :
    // un compte neuf la reçoit par-dessus l'écran, et la capture montrerait le tutoriel au lieu de la page).
    const local = { [compte.cleLocale]: JSON.stringify(compte.sess), 'presti.aide_vues': JSON.stringify(['visite:console']), ...stockageLocal }
    await page.addInitScript((entrees) => { try { for (const [k, v] of Object.entries(entrees)) localStorage.setItem(k, v) } catch { /* stockage indisponible */ } }, local)
    // Les réponses d'API en erreur (≥ 400) pendant la capture : un écran figé sur « Chargement… » a presque toujours
    // une 401/403/500 derrière — le vérificateur l'affiche au lieu de deviner.
    let erreursApi = []
    page.on('response', (r) => { if (r.status() >= 400 && /\/api\//.test(r.url())) erreursApi.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`) })
    for (const e of ecrans) {
      const fichier = path.join(dossier, `${e.nom}.png`)
      let ok = true, attendu = null
      erreursApi = []
      try { await page.goto(srv.base + e.chemin, { waitUntil: 'load', timeout: 150_000 }) } catch { ok = false }
      // `attendre` : un texte (n'importe où), ou { texte, dans } — le texte dans un élément précis (« h3 »), pour
      // distinguer le titre de l'écran actif d'un libellé de fil d'Ariane qui, lui, est sur tous les écrans.
      if (e.attendre) {
        const cible = typeof e.attendre === 'string' ? page.getByText(e.attendre, { exact: false }) : page.locator(e.attendre.dans, { hasText: e.attendre.texte })
        // Un serveur que le juge vient de lancer compile la page au premier passage (le Poste de contrôle : souvent plus de 25 s).
        attendu = await cible.first().waitFor({ state: 'visible', timeout: srv.lance ? 90_000 : 25_000 }).then(() => true).catch(() => false)
        await page.waitForTimeout(600)
      } else await page.waitForTimeout(2500)
      await page.screenshot({ path: fichier, fullPage: pleinePage })
      const texte = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
      const octets = fs.statSync(fichier).size
      resultats.push({ nom: e.nom, chemin: e.chemin, fichier, octets, md5: crypto.createHash('md5').update(fs.readFileSync(fichier)).digest('hex'), texte, ok, attendu, url: page.url(), erreursApi: [...erreursApi] })
    }
  } catch (e) { erreur = e }
  // Le ménage ne se fait plus dans un `finally` qui avale ou écrase : il tourne toujours, et son échec est DIT — avec l'erreur
  // du run s'il y en avait une, parce qu'un compte fondateur resté en base est plus grave que la capture qui a échoué.
  await navigateur?.close().catch(() => {})
  let echecMenage = null
  try { await compte?.supprimer() } catch (e) { echecMenage = e }
  await srv.arreter()
  // Contrôle de fin de suite : aucun compte de capture oublié ne reste (ni le nôtre, ni celui d'un run interrompu).
  if (!echecMenage) { try { await verifierAucunCompteCapture() } catch (e) { echecMenage = e } }
  if (erreur && echecMenage) throw new Error(`${erreur?.message ?? erreur} — ET le ménage a échoué : ${echecMenage.message}`)
  if (erreur) throw erreur
  if (echecMenage) throw echecMenage
  return resultats
}

/** Vrai si toutes les captures diffèrent (deux écrans identiques = un seul écran). */
export const distinctes = (resultats) => new Set(resultats.map((r) => r.md5)).size === resultats.length
