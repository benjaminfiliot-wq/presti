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
  const enfant = spawn(process.execPath, [bin, 'dev', '-p', String(port), '-H', '127.0.0.1'], { cwd: racine, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port), BROWSER: 'none' } })
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

/** Un compte de capture (@presti-test.invalid), artisan ou direction (fondateur), avec sa session attestée ; `supprimer` le retire. */
export async function compteTest(role = 'artisan') {
  const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!SB || !SVC || !ANON) throw new Error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et NEXT_PUBLIC_SUPABASE_ANON_KEY sont nécessaires (.env.local)')
  const h = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
  const st = Date.now(), email = `capture.${role}.${st}@presti-test.invalid`, pw = `Capture-${crypto.randomBytes(12).toString('base64url')}`
  const u = await (await fetch(`${SB}/auth/v1/admin/users`, { method: 'POST', headers: h, body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
  if (!u?.id) throw new Error(`création du compte de capture refusée : ${JSON.stringify(u).slice(0, 200)}`)
  const supprimer = async () => {
    await fetch(`${SB}/rest/v1/artisans?id=eq.${u.id}`, { method: 'DELETE', headers: h }).catch(() => {})
    await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: h }).catch(() => {})
  }
  const ligne = { id: u.id, email, nom: role === 'direction' ? 'Direction (capture)' : 'Artisan (capture)', metier: 'Plombier', slug: `capture-${st}`, ...(role === 'direction' ? { is_founder: true } : {}) }
  // La visite guidée se lit d'abord dans artisans.aide_vues (localStorage n'est que le repli) : un compte neuf la reçoit
  // par-dessus l'écran. On la déclare vue ; si la colonne n'est pas migrée, on réessaie sans.
  let r = await fetch(`${SB}/rest/v1/artisans`, { method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify({ ...ligne, aide_vues: ['visite:console'] }) })
  if (!r.ok) r = await fetch(`${SB}/rest/v1/artisans`, { method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify(ligne) })
  if (!r.ok) { const t = (await r.text()).slice(0, 200); await supprimer(); throw new Error(`ligne artisans refusée : ${r.status} ${t}`) }
  const sess = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json()
  if (!sess?.access_token) { await supprimer(); throw new Error('session de capture refusée') }
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
  let compte = null, navigateur = null
  const resultats = []
  try {
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
        attendu = await cible.first().waitFor({ state: 'visible', timeout: 25_000 }).then(() => true).catch(() => false)
        await page.waitForTimeout(600)
      } else await page.waitForTimeout(2500)
      await page.screenshot({ path: fichier, fullPage: pleinePage })
      const texte = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
      const octets = fs.statSync(fichier).size
      resultats.push({ nom: e.nom, chemin: e.chemin, fichier, octets, md5: crypto.createHash('md5').update(fs.readFileSync(fichier)).digest('hex'), texte, ok, attendu, url: page.url(), erreursApi: [...erreursApi] })
    }
  } finally {
    await navigateur?.close().catch(() => {})
    await compte?.supprimer()
    await srv.arreter()
  }
  return resultats
}

/** Vrai si toutes les captures diffèrent (deux écrans identiques = un seul écran). */
export const distinctes = (resultats) => new Set(resultats.map((r) => r.md5)).size === resultats.length
