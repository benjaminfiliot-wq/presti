#!/usr/bin/env node
// Juge de la tâche 036-009 : les connecteurs « Connecter / Retirer » (OAuth Google avec état et PKCE, jetons chiffrés pour l'app et
// pour n8n, retrait, expiration), derrière le drapeau `connexions` BAISSÉ.
//
// Hors ligne : un FAUX Google (point d'autorisation, de jeton, de révocation, essais de lecture) et une FAUSSE base remplacent tout
// réseau ; aucune donnée réelle (comptes « artisan.essai@example.com », uid tirés au hasard, clés tirées au hasard à chaque passage).
// Les attentes (portées minimales, format v1, règles de l'état) sont écrites ICI, indépendamment du code : le juge ne lit pas ce qu'il
// vérifie dans le code qu'il vérifie.
//
// Déroulé : (1) contrôles statiques (drapeau baissé dans lib/flags.ts, branchement des routes, filtre sur le compte, aucun `plan ===`,
// lib/secretBox.ts inchangé) ; (2) le cœur (lib/connexions/{chiffrement,oauth,etat,routes}.ts) est copié dans un dossier temporaire et
// joué par un processus enfant ; (3) chaque MUTANT modifie la copie (ou le texte, pour les mutants statiques) et doit faire ROUGIR le juge.
//
// Usage : node scripts/connexions-qa.mjs            (code de sortie 0 = vert)
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CE_FICHIER = fileURLToPath(import.meta.url)
const COEUR = ['chiffrement.ts', 'oauth.ts', 'etat.ts', 'routes.ts']
const lireTexte = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8')


// ═════════════════════════════════════════════ PARENT ═════════════════════════════════════════════════════════════════════════
async function parent() {
  let echecs = 0
  const ok = (cond, nom) => { console.log(`${cond ? '  ✓' : '  ✗'} ${nom}`); if (!cond) echecs++ }

  // ── 1. Statique ──
  console.log('1. Contrôles statiques')
  const textes = {
    flags: lireTexte('lib/flags.ts'),
    serveur: lireTexte('lib/connexions/serveur.ts'),
    demarrer: lireTexte('app/api/connexions/google/demarrer/route.ts'),
    retour: lireTexte('app/api/connexions/google/retour/route.ts'),
    retirer: lireTexte('app/api/connexions/retirer/route.ts'),
  }
  for (const f of COEUR) textes[f] = lireTexte(`lib/connexions/${f}`)
  const stat = controlesStatiques(textes)
  for (const [nom, v] of stat) ok(v, nom)
  let secretBoxIntact = false
  const g = spawnSync('git', ['show', 'HEAD:lib/secretBox.ts'], { cwd: RACINE, encoding: 'utf8' })
  if (g.status === 0) secretBoxIntact = g.stdout === lireTexte('lib/secretBox.ts')
  ok(secretBoxIntact, 'lib/secretBox.ts est identique à HEAD (lecture seule)')

  // ── 2. Le cœur, joué tel quel ──
  console.log('2. Le cœur, contre un faux Google et une fausse base')
  const base = jouer(null)
  for (const l of base.lignes) console.log(l)
  ok(base.rouges === 0 && base.verts >= 60, `cœur : ${base.verts} verts, ${base.rouges} rouges (au moins 60 verts attendus)`)

  // ── 3. Mutants ──
  console.log('3. Mutants (chacun doit faire rougir le juge)')
  let tues = 0
  for (const m of MUTANTS) {
    let rouge, detail
    if (m.statique) {
      const t = { ...textes }
      const r = remplacer(t[m.statique], m)
      if (r === null) { ok(false, `mutant ${m.nom} : motif introuvable (mutant périmé)`); continue }
      t[m.statique] = r
      const fautes = controlesStatiques(t).filter(([, v]) => !v).map(([n]) => n)
      rouge = fautes.length > 0; detail = fautes[0] || ''
    } else {
      const res = jouer(m)
      if (res.perime) { ok(false, `mutant ${m.nom} : motif introuvable (mutant périmé)`); continue }
      rouge = res.rouges > 0 || res.plante; detail = res.premierRouge || (res.plante ? 'plantage' : '')
    }
    ok(rouge, `mutant ${m.nom} → ${rouge ? 'tué' : 'SURVIT'}${detail ? ` (${detail})` : ''}`)
    if (rouge) tues++
  }
  console.log(`\n${tues}/${MUTANTS.length} mutants tués ; ${echecs} échec(s).`)
  console.log(echecs === 0 ? 'CONNEXIONS-QA VERT' : 'CONNEXIONS-QA ROUGE')
  process.exit(echecs === 0 ? 0 : 1)
}

function remplacer(texte, m) {
  if (!texte.includes(m.de)) return null
  let r = m.tous ? texte.split(m.de).join(m.vers) : texte.replace(m.de, m.vers)
  // Un mutant peut porter un second remplacement (de2 → vers2), tout aussi obligatoire.
  if (m.de2) { if (!r.includes(m.de2)) return null; r = r.replace(m.de2, m.vers2) }
  return r
}

/** Copie le cœur (muté ou non) dans un dossier temporaire et le joue dans un processus enfant. */
function jouer(mutant) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'connexions-qa-'))
  try {
    for (const f of COEUR) {
      let t = lireTexte(`lib/connexions/${f}`)
      if (mutant && mutant.fichier === f) {
        const r = remplacer(t, mutant)
        if (r === null) return { perime: true }
        t = r
      }
      fs.writeFileSync(path.join(dir, f), t)
    }
    const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs', CE_FICHIER, '--enfant', dir],
      { cwd: RACINE, encoding: 'utf8', timeout: 90_000, env: { PATH: process.env.PATH, HOME: process.env.HOME } })
    const ligne = (r.stdout || '').split('\n').find((l) => l.startsWith('RESULTAT '))
    if (!ligne) return { plante: true, rouges: 1, verts: 0, lignes: [(r.stdout || '') + (r.stderr || '')], premierRouge: (r.stderr || '').split('\n')[0] }
    const res = JSON.parse(ligne.slice(9))
    return { ...res, lignes: (r.stdout || '').split('\n').filter((l) => l.startsWith('  ')) }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function controlesStatiques(t) {
  const r = []
  r.push(['lib/flags.ts : le drapeau `connexions` est BAISSÉ', /^\s*connexions:\s*false,/m.test(t.flags)])
  r.push(['serveur.ts : le drapeau branché est `actif(\'connexions\')`, rien d\'autre', /drapeauLeve:\s*\(\)\s*=>\s*actif\('connexions'\),/.test(t.serveur)])
  r.push(['serveur.ts : l\'offre passe par peut() de lib/plans.ts', /import \{ peut \} from '@\/lib\/plans'/.test(t.serveur) && /^\s*peut,$/m.test(t.serveur)])
  r.push(['serveur.ts : la session vient d\'authArtisan', /await authArtisan\(req\)/.test(t.serveur)])
  r.push(['serveur.ts : au retour, la suspension et la déconnexion de partout sont relues', /suspensionEnCours\(uid\),/.test(t.serveur) && /sessions_invalides_avant/.test(t.serveur)])
  r.push(['serveur.ts : une lecture des connexions en erreur lève (jamais une liste vide)', /throw new Error\('lecture des connexions impossible'\)/.test(t.serveur)])
  // Chaque lecture et chaque mise à jour de public.connexions filtre sur le compte (la clé de service passe outre la RLS).
  const requetes = t.serveur.split('\n').filter((l) => l.includes(".from('connexions')") && !l.includes('.insert('))
  r.push([`serveur.ts : les ${requetes.length} requêtes de lecture et de mise à jour filtrent sur artisan_id`,
    requetes.length >= 3 && requetes.every((l) => l.includes(".eq('artisan_id', artisanId)"))])
  r.push(['serveur.ts : l\'insertion ne prend l\'artisan que de la ligne construite par le cœur', /\.insert\(\{ \.\.\.l, acteur_id: l\.artisan_id \}\)/.test(t.serveur)])
  r.push(['serveur.ts : aucun message d\'erreur complet dans les journaux (le code seulement)', !/error\.message|error\.details/.test(t.serveur)])
  for (const [nom, fn] of [['demarrer', 'demarrer'], ['retour', 'retour'], ['retirer', 'retirer']]) {
    const s = t[nom]
    const exports = [...s.matchAll(/export async function (\w+)\(req: Request\): Promise<Response> \{ return (\w+)\(req, dependancesReelles\(\)\) \}/g)]
    const toutesLesFonctions = [...s.matchAll(/export (async )?function/g)].length
    r.push([`route ${nom} : chaque méthode délègue à ${fn}() avec les vraies dépendances, rien d'autre`,
      new RegExp(`import \\{ ${fn} \\} from '@/lib/connexions/routes'`).test(s) && exports.length >= 1
      && exports.length === toutesLesFonctions && exports.every((e) => e[2] === fn)])
  }
  const tout = Object.entries(t).filter(([k]) => k !== 'flags').map(([, v]) => v).join('\n')
  r.push(['aucun `plan ===` ni nom d\'offre comparé en dur', !/plan\s*[!=]==?\s*'|'(studio|signature|essentiel|business)'\s*[!=]==?/.test(tout)])
  r.push(['aucune variable NEXT_PUBLIC_ (rien côté client)', !/NEXT_PUBLIC_/.test(tout)])
  r.push(['aucun journal ne cite un jeton, un secret ou le vérificateur',
    !/console\.\w+\([^)]*(jeton|access_token|refresh_token|secret_app|secret_n8n|verificateur|CLIENT_SECRET|secretClair)/.test(tout)])
  r.push(['routes.ts : la garde du drapeau est la première instruction de chaque route',
    (t['routes.ts'].match(/Promise<Response> \{\n\s*if \(!d\.drapeauLeve\(\)\) return introuvable\(\)/g) || []).length === 3])
  return r
}

// Les mutants : ceux qu'exige la tâche (drapeau, state, jeton au client, secret en clair, retrait, expiration, portée), et d'autres.
const MUTANTS = [
  { nom: 'drapeau baissé qui répond 200 (les trois routes)', fichier: 'routes.ts', de: 'if (!d.drapeauLeve()) return introuvable()', vers: 'if (false) return introuvable()', tous: true },
  { nom: 'drapeau ignoré par la seule route de retour', fichier: 'routes.ts', de: "if (!d.drapeauLeve()) return introuvable()\n  const u = new URL(req.url)", vers: 'const u = new URL(req.url)' },
  { nom: 'drapeau ignoré par le seul retrait', fichier: 'routes.ts', de: "if (!d.drapeauLeve()) return introuvable()\n  if (req.method !== 'POST') return json({ error: 'Méthode non permise.' }, 405)\n  const s = await d.session(req)\n  if ('statut' in s) return json({ error: s.erreur }, s.statut)\n  const b = await req.json().catch(() => null) as { id?: unknown }", vers: "if (req.method !== 'POST') return json({ error: 'Méthode non permise.' }, 405)\n  const s = await d.session(req)\n  if ('statut' in s) return json({ error: s.erreur }, s.statut)\n  const b = await req.json().catch(() => null) as { id?: unknown }" },
  { nom: 'state non vérifié', fichier: 'routes.ts', de: '!egalConstant(etat.state, stateRecu)', vers: 'false' },
  { nom: 'état échu accepté', fichier: 'routes.ts', de: 'etat.expire < d.maintenant()', vers: 'false' },
  { nom: 'vérificateur PKCE renvoyé au navigateur', fichier: 'routes.ts', de: 'return json({ ok: true, url }', vers: 'return json({ ok: true, url, verificateur }' },
  { nom: 'jetons renvoyés au client au retour', fichier: 'routes.ts', de: "return lu ? retourVers('ok')", vers: "return lu ? new Response(JSON.stringify(jetons), { status: 200 })" },
  { nom: 'secret_app stocké en clair', fichier: 'routes.ts', de: "secret_app: chiffrerPour('app', secretClair, id, d.env),", vers: 'secret_app: secretClair,' },
  { nom: 'secret_n8n chiffré avec la clé de l\'app', fichier: 'routes.ts', de: "secret_n8n: chiffrerPour('n8n', secretClair, id, d.env)", vers: "secret_n8n: chiffrerPour('app', secretClair, id, d.env)" },
  { nom: 'chiffré non lié à sa ligne (donnée associée ôtée)', fichier: 'chiffrement.ts', de: 'c.setAAD(donneeAssociee(lien, dest))', vers: '',
    de2: 'd.setAAD(donneeAssociee(lien, dest))', vers2: '' },
  { nom: 'clé de n8n égale à celle de l\'app acceptée', fichier: 'chiffrement.ts', de: 'if (app && crypto.timingSafeEqual(app, k)) return null', vers: '' },
  { nom: 'retrait qui garde le jeton', fichier: 'etat.ts', de: "return { etat: 'retiree', secret_app: null, secret_n8n: null, retiree_le: maintenantIso }", vers: "return { etat: 'retiree', retiree_le: maintenantIso }" },
  { nom: 'retrait sans révocation chez Google', fichier: 'routes.ts', de: 'if (sec.refresh_token) await revoquer(d, sec.refresh_token)', vers: '' },
  { nom: 'jeton expiré qui fait planter', fichier: 'etat.ts', de: "} catch {\n    // Dernier filet", vers: "} catch (e) { throw e\n    // Dernier filet",
    de2: "    } catch { return { utilisable: false, motif: 'injoignable' } }", vers2: '    } catch (e) { throw e }' },
  { nom: 'jeton expiré traité comme une panne (ni état ni alerte)', fichier: 'etat.ts', de: "if (corps?.error === 'invalid_grant') {", vers: "if (corps?.error === 'jamais') {" },
  { nom: 'portée élargie (Gmail complet)', fichier: 'oauth.ts', de: "gmail: ['openid', 'email', `${G}gmail.readonly`],", vers: "gmail: ['openid', 'email', `${G}gmail.readonly`, 'https://mail.google.com/']," },
  { nom: 'portée élargie (agenda complet au lieu des créneaux)', fichier: 'oauth.ts', de: '`${G}calendar.freebusy`', vers: '`${G}calendar`' },
  { nom: 'portée élargie acceptée au retour', fichier: 'oauth.ts', de: "if (!voulues.has(p)) return { ok: false, motif: 'portee_elargie' }", vers: '' },
  { nom: 'portées accordées auparavant réutilisées', fichier: 'oauth.ts', de: "include_granted_scopes: 'false'", vers: "include_granted_scopes: 'true'" },
  { nom: 'PKCE en clair (plain)', fichier: 'oauth.ts', de: "code_challenge_method: 'S256'", vers: "code_challenge_method: 'plain'" },
  { nom: 'vérificateur PKCE non envoyé à l\'échange', fichier: 'routes.ts', de: 'code_verifier: etat.verificateur', vers: "code_verifier: 'x'" },
  { nom: 'offre non contrôlée au départ', fichier: 'routes.ts', de: 'if (!d.peut(o.plan, CAPACITE[f])) return', vers: 'if (false) return' },
  { nom: 'offre non relue au retour', fichier: 'routes.ts', de: '!d.peut(o.plan, CAPACITE[f]) || !fournisseurOuvert', vers: '!fournisseurOuvert' },
  { nom: 'Gmail ouvert sans vérification Google', fichier: 'oauth.ts', de: "if (f === 'gmail') return env.GOOGLE_VERIFICATION_GMAIL === 'accordee'", vers: "if (f === 'gmail') return true" },
  { nom: '« active » sans essai de lecture réussi', fichier: 'routes.ts', de: 'await d.magasin.maj(id, etat.uid, lu ?', vers: 'await d.magasin.maj(id, etat.uid, true ?' },
  { nom: 'l\'écran « Connexions » reçoit le secret', fichier: 'etat.ts', de: 'etat: l.etat, derniere_synchro: l.derniere_synchro,', vers: 'etat: l.etat, secret_app: l.secret_app, derniere_synchro: l.derniere_synchro,' },
  { nom: 'rebrancher par une seconde ligne au lieu de renouveler', fichier: 'routes.ts', de: 'const existante = memeCompte.find((l) => l.fournisseur === f)', vers: 'const existante = memeCompte.find(() => false)' },
  { nom: 'retrait qui révoque malgré une autre connexion du même compte Google', fichier: 'routes.ts', de: 'if (clair && autres === 0) {', vers: 'if (clair) {' },
  { nom: 'refus de portée qui révoque malgré une autre connexion du même compte', fichier: 'routes.ts', de: 'if (memeCompte.length === 0) await revoquer(', vers: 'if (true) await revoquer(' },
  { nom: 'lecture en erreur prise pour « aucune connexion »', fichier: 'routes.ts', de: "catch { return retourVers('refus', 'enregistrement') }", vers: 'catch { memeCompte = [] }' },
  { nom: 'compte non revérifié au retour', fichier: 'routes.ts', de: "if (!await d.compteValide(etat.uid, etat.iat).catch(() => false)) return retourVers('refus', 'compte')", vers: '' },
  { nom: 'statique : lecture en erreur rendue comme une liste vide', statique: 'serveur', de: "throw new Error('lecture des connexions impossible')", vers: 'return []' },
  { nom: 'statique : suspension non relue au retour', statique: 'serveur', de: '        suspensionEnCours(uid),', vers: '        Promise.resolve(null),' },
  { nom: 'statique : drapeau forcé à vrai dans serveur.ts', statique: 'serveur', de: "drapeauLeve: () => actif('connexions'),", vers: 'drapeauLeve: () => true,' },
  { nom: 'statique : requête sans filtre sur le compte', statique: 'serveur', de: ".eq('id', id).eq('artisan_id', artisanId).maybeSingle()", vers: ".eq('id', id).maybeSingle()" },
  { nom: 'statique : drapeau levé dans lib/flags.ts', statique: 'flags', de: '  connexions: false,', vers: '  connexions: true,' },
  { nom: 'statique : route qui répond sans passer par le cœur', statique: 'retour', de: 'export async function GET(req: Request): Promise<Response> { return retour(req, dependancesReelles()) }', vers: "export async function GET(req: Request): Promise<Response> { return new Response('ok') }" },
  { nom: 'statique : offre comparée en dur', statique: 'routes.ts', de: 'if (!d.peut(o.plan, CAPACITE[f])) return', vers: "if (o.plan === 'gratuit') return" },
  { nom: 'statique : un jeton dans un journal', statique: 'routes.ts', de: "  const portees = controlerPortees(", vers: "  console.error('jetons', jetons.access_token)\n  const portees = controlerPortees(" },
]
// ═════════════════════════════════════════════ ENFANT ═════════════════════════════════════════════════════════════════════════
async function enfant(dir) {
  const imp = (f) => import(pathToFileURL(path.join(dir, f)).href)
  let verts = 0, rouges = 0, premierRouge = ''
  const ok = (cond, nom) => {
    if (cond) verts++; else { rouges++; if (!premierRouge) premierRouge = nom }
    console.log(`  ${cond ? '✓' : '✗'} ${nom}`)
  }
  const fin = () => { console.log('RESULTAT ' + JSON.stringify({ verts, rouges, premierRouge })) }
  try {
    const C = await imp('chiffrement.ts'), O = await imp('oauth.ts'), E = await imp('etat.ts'), R = await imp('routes.ts')
    const { peut } = await import(pathToFileURL(path.join(RACINE, 'lib/plans.ts')).href)
    await scenarios({ C, O, E, R, peut, ok })
  } catch (e) {
    ok(false, `exception non rattrapée : ${String(e && e.message || e).slice(0, 120)}`)
  }
  fin()
}

// ── Les attentes, écrites ici (pas lues dans le code) ──
const GA = 'https://www.googleapis.com/auth/'
const PORTEES_ATTENDUES = {
  gmail: ['openid', 'email', `${GA}gmail.readonly`],
  google_agenda: ['openid', 'email', `${GA}calendar.freebusy`],
  google_drive: ['openid', 'email', `${GA}drive.file`],
}
const V1 = /^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$/

async function scenarios({ C, O, E, R, peut, ok }) {
  const cle = () => crypto.randomBytes(32).toString('base64')
  const CLIENT_ID = 'client-essai.apps.example'
  const CLIENT_SECRET = 'SECRET-CLIENT-ESSAI-' + crypto.randomBytes(6).toString('hex')
  const envBase = {
    CANAUX_KEY: cle(), BOITE_CLE_N8N: cle(), GOOGLE_OAUTH_CLIENT_ID: CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET: CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URI: 'https://console.example/api/connexions/google/retour',
  }
  const UID_A = crypto.randomUUID(), UID_B = crypto.randomUUID()
  const EMAIL = 'Artisan.Essai@example.com'

  // Faux Google : tout appel sortant passe ici ; chaque appel est noté.
  function fauxGoogle(opts = {}) {
    const appels = []
    const jetonsEmis = []
    const fetch = async (url, init = {}) => {
      const u = String(url)
      const corps = typeof init.body === 'string' ? init.body : ''
      appels.push({ url: u, corps, entetes: init.headers || {} })
      if (opts.injoignable) throw new Error('réseau coupé')
      if (u === O.URL_JETON) {
        const p = new URLSearchParams(corps)
        if (p.get('grant_type') === 'authorization_code') {
          if (p.get('client_secret') !== CLIENT_SECRET || p.get('code') !== 'code-essai') return rep(400, { error: 'invalid_grant' })
          // PKCE : le faux Google contrôle le vérificateur contre le défi qu'il a reçu à l'autorisation.
          if (!opts.defi || crypto.createHash('sha256').update(p.get('code_verifier') || '').digest('base64url') !== opts.defi) return rep(400, { error: 'invalid_grant' })
          const access = 'ACCES-FAUX-' + crypto.randomBytes(8).toString('hex'), refresh = 'RAFRAICHI-FAUX-' + crypto.randomBytes(8).toString('hex')
          jetonsEmis.push(access, refresh)
          const scope = opts.scope ?? ['openid', `${GA}userinfo.email`, ...PORTEES_ATTENDUES[opts.fournisseur].slice(2)].join(' ')
          return rep(200, { access_token: access, refresh_token: refresh, expires_in: 3599, scope, token_type: 'Bearer', id_token: idToken(opts.aud ?? CLIENT_ID) })
        }
        if (p.get('grant_type') === 'refresh_token') {
          if (opts.rafraichir === 'invalid_grant') return rep(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' })
          if (opts.rafraichir === 'panne') return rep(503, { error: 'backendError' })
          if (opts.rafraichir === 'json_casse') return new Response('<html>', { status: 200 })
          const access = 'ACCES-NEUF-' + crypto.randomBytes(8).toString('hex'); jetonsEmis.push(access)
          return rep(200, { access_token: access, expires_in: 3599 })
        }
        return rep(400, { error: 'unsupported_grant_type' })
      }
      if (u === O.URL_REVOCATION) return rep(200, {})
      if (u.startsWith('https://gmail.googleapis.com/') || u.startsWith('https://www.googleapis.com/')) {
        return opts.essaiEchoue ? rep(403, { error: { code: 403 } }) : rep(200, { ok: true })
      }
      return rep(599, { error: 'hors du faux Google : ' + u })
    }
    return { fetch, appels, jetonsEmis }
  }
  const rep = (s, j) => new Response(JSON.stringify(j), { status: s, headers: { 'content-type': 'application/json' } })
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const idToken = (aud) => `${b64({ alg: 'RS256' })}.${b64({ iss: 'https://accounts.google.com', aud, email: EMAIL, email_verified: true, sub: '1' })}.signature`

  // Fausse base : filtre sur le compte comme le vrai magasin ; elle NE refait PAS les gardes de 0193 (le juge contrôle le code, pas la base).
  function fausseBase() {
    const lignes = new Map()
    let appels = 0
    const etatBase = { panneLecture: false }
    const magasin = {
      async lire(id, artisanId) { appels++; const l = lignes.get(id); return l && l.artisan_id === artisanId ? { ...l } : null },
      async vivantes(artisanId, f, compte) {
        appels++
        if (etatBase.panneLecture) throw new Error('panne de lecture')
        return [...lignes.values()].filter((l) => l.artisan_id === artisanId && (f === null || l.fournisseur === f) && l.etat !== 'retiree' && (l.compte_affiche ?? null) === (compte ?? null)).map((l) => ({ ...l }))
      },
      async inserer(l) {
        appels++
        if ([...lignes.values()].some((x) => x.artisan_id === l.artisan_id && x.fournisseur === l.fournisseur && x.etat !== 'retiree' && (x.compte_affiche || '') === (l.compte_affiche || ''))) return false
        lignes.set(l.id, { ...l }); return true
      },
      async maj(id, artisanId, patch) { appels++; const l = lignes.get(id); if (!l || l.artisan_id !== artisanId) return false; lignes.set(id, { ...l, ...patch }); return true },
    }
    return { magasin, lignes, etatBase, get appels() { return appels } }
  }

  const PLANS = { [UID_A]: 'studio', [UID_B]: 'gratuit' }
  function deps({ drapeau = true, env = envBase, g, base, maintenant = () => horloge.t, plan, compteValide = async () => true } = {}) {
    return {
      drapeauLeve: () => drapeau,
      session: async (req) => {
        const a = req.headers.get('authorization') || ''
        if (a === 'Bearer jeton-session-A') return { uid: UID_A, iat: 1000 }
        if (a === 'Bearer jeton-session-B') return { uid: UID_B, iat: 1000 }
        return { statut: 401, erreur: 'Non connecté.' }
      },
      compteValide,
      planDe: async (uid) => ({ plan: plan ?? PLANS[uid] ?? null }),
      peut,
      magasin: base.magasin,
      env, fetch: g.fetch, maintenant,
    }
  }
  const horloge = { t: Date.UTC(2026, 10, 3, 9, 0, 0) }
  const sorties = [] // tout ce qui part vers le navigateur, pour la chasse aux secrets
  async function garder(res) {
    const corps = await res.clone().text()
    sorties.push(corps + '\n' + [...res.headers.entries()].map(([k, v]) => `${k}: ${v}`).join('\n'))
    return res
  }
  const post = (chemin, corps, session = 'A') => new Request('https://console.example' + chemin, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(session ? { authorization: `Bearer jeton-session-${session}` } : {}) }, body: JSON.stringify(corps) })

  async function demarrerPour(f, d) {
    const res = await garder(await R.demarrer(post('/api/connexions/google/demarrer', { fournisseur: f }), d))
    const corps = await res.json().catch(() => null)
    const cookie = (res.headers.get('set-cookie') || '').split(';')[0]
    return { res, corps, cookie }
  }
  async function connecterJusquauBout(f, d, g, { stateRecu, cookie, attendre = 0 } = {}) {
    const dep = await demarrerPour(f, d)
    const url = new URL(dep.corps.url)
    g.opts.defi = url.searchParams.get('code_challenge')
    g.opts.fournisseur = f
    horloge.t += attendre
    const st = stateRecu ?? url.searchParams.get('state')
    const req = new Request(`https://console.example/api/connexions/google/retour?code=code-essai&state=${encodeURIComponent(st)}`,
      { headers: { cookie: cookie ?? dep.cookie } })
    const res = await garder(await R.retour(req, d))
    return { dep, url, res, lieu: res.headers.get('location') || '' }
  }
  function fgVivant(opts = {}) { const o = { ...opts }; const g = fauxGoogle(o); g.opts = o; return g }

  // ── A. Drapeau baissé : 404 partout, rien n'est lu ni appelé ──
  {
    const g = fgVivant(), base = fausseBase(), d = deps({ drapeau: false, g, base })
    const r1 = await garder(await R.demarrer(post('/api/connexions/google/demarrer', { fournisseur: 'google_agenda' }), d))
    const r2 = await garder(await R.demarrer(new Request('https://console.example/api/connexions/google/demarrer'), d))
    const r3 = await garder(await R.retour(new Request('https://console.example/api/connexions/google/retour?code=code-essai&state=x'), d))
    const r4 = await garder(await R.retirer(post('/api/connexions/retirer', { id: crypto.randomUUID() }), d))
    ok(r1.status === 404, 'drapeau baissé : démarrer (POST) → 404')
    ok(r2.status === 404, 'drapeau baissé : démarrer (GET) → 404')
    ok(r3.status === 404, 'drapeau baissé : retour → 404')
    ok(r4.status === 404, 'drapeau baissé : retirer → 404')
    ok(g.appels.length === 0 && base.appels === 0, 'drapeau baissé : aucun appel à Google ni à la base')
    ok(![r1, r2, r3, r4].some((r) => r.headers.get('set-cookie')), 'drapeau baissé : aucun cookie posé')
  }

  // ── B. Démarrer : session, offre, fournisseur, configuration ──
  {
    const g = fgVivant(), base = fausseBase(), d = deps({ g, base })
    ok((await R.demarrer(post('/api/connexions/google/demarrer', { fournisseur: 'google_agenda' }, null), d)).status === 401, 'démarrer sans session → 401')
    ok((await R.demarrer(post('/api/connexions/google/demarrer', { fournisseur: 'google_agenda' }, 'B'), d)).status === 403, 'démarrer, offre gratuite (peut() refuse) → 403')
    ok((await R.demarrer(post('/api/connexions/google/demarrer', { fournisseur: 'dropbox' }), d)).status === 400, 'démarrer, outil inconnu → 400')
    ok((await R.demarrer(post('/api/connexions/google/demarrer', { fournisseur: 'gmail' }), d)).status === 409, 'Gmail fermé tant que la vérification Google n\'est pas accordée → 409')
    const dG = deps({ g, base, env: { ...envBase, GOOGLE_VERIFICATION_GMAIL: 'accordee' } })
    ok((await R.demarrer(post('/api/connexions/google/demarrer', { fournisseur: 'gmail' }), dG)).status === 200, 'Gmail ouvert une fois la vérification accordée (variable posée par Benj)')
    const sansN8n = { ...envBase }; delete sansN8n.BOITE_CLE_N8N
    ok((await R.demarrer(post('/api/connexions/google/demarrer', { fournisseur: 'google_agenda' }), deps({ g, base, env: sansN8n }))).status === 503, 'sans la clé de n8n : 503, rien ne démarre')
    ok((await R.demarrer(post('/api/connexions/google/demarrer', { fournisseur: 'google_agenda' }), deps({ g, base, env: { ...envBase, BOITE_CLE_N8N: envBase.CANAUX_KEY } }))).status === 503, 'clé de n8n identique à celle de l\'app : refusée (503)')
    ok(!C.chiffrementsDisponibles({ ...envBase, BOITE_CLE_N8N: envBase.CANAUX_KEY }), 'chiffrementsDisponibles() refuse deux clés identiques')
    const sansClient = { ...envBase }; delete sansClient.GOOGLE_OAUTH_CLIENT_SECRET
    ok((await R.demarrer(post('/api/connexions/google/demarrer', { fournisseur: 'google_agenda' }), deps({ g, base, env: sansClient }))).status === 503, 'sans application OAuth configurée : 503')
    ok(g.appels.length === 0, 'démarrer n\'appelle jamais Google côté serveur')
  }

  // ── C. L'URL d'autorisation : portées minimales, PKCE S256, état, rien de secret ──
  for (const f of ['google_agenda', 'google_drive', 'gmail']) {
    const g = fgVivant(), base = fausseBase(), d = deps({ g, base, env: { ...envBase, GOOGLE_VERIFICATION_GMAIL: 'accordee' } })
    const { res, corps, cookie } = await demarrerPour(f, d)
    const u = new URL(corps.url)
    ok(res.status === 200 && u.origin + u.pathname === 'https://accounts.google.com/o/oauth2/v2/auth', `${f} : l'URL va chez Google`)
    ok(JSON.stringify((u.searchParams.get('scope') || '').split(' ').sort()) === JSON.stringify([...PORTEES_ATTENDUES[f]].sort()), `${f} : portées EXACTEMENT minimales (${PORTEES_ATTENDUES[f].slice(2).join(', ')})`)
    ok(u.searchParams.get('code_challenge_method') === 'S256' && /^[A-Za-z0-9_-]{43}$/.test(u.searchParams.get('code_challenge') || ''), `${f} : PKCE S256`)
    ok((u.searchParams.get('state') || '').length >= 43, `${f} : state de 32 octets aléatoires`)
    ok(u.searchParams.get('include_granted_scopes') === 'false' && u.searchParams.get('access_type') === 'offline', `${f} : pas de portées héritées ; accès hors ligne`)
    ok(u.searchParams.get('redirect_uri') === envBase.GOOGLE_OAUTH_REDIRECT_URI && u.searchParams.get('response_type') === 'code', `${f} : redirection et type de réponse attendus`)
    ok(Object.keys(corps).sort().join(',') === 'ok,url', `${f} : la réponse ne porte que { ok, url }`)
    const c = res.headers.get('set-cookie') || ''
    ok(/HttpOnly/.test(c) && /Secure/.test(c) && /SameSite=Lax/.test(c) && /Max-Age=600/.test(c) && c.startsWith('__Host-'), `${f} : cookie d'état HttpOnly, Secure, SameSite=Lax, 10 min, préfixe __Host-`)
    const valeur = cookie.split('=').slice(1).join('=')
    ok(V1.test(valeur) && !valeur.includes(u.searchParams.get('state')), `${f} : le cookie d'état est chiffré (v1), le state n'y est pas en clair`)
  }

  // ── D. Le parcours complet (agenda), puis la chasse aux secrets ──
  let ligneA = null
  {
    const g = fgVivant(), base = fausseBase(), d = deps({ g, base })
    const { res, lieu, url } = await connecterJusquauBout('google_agenda', d, g)
    ok(res.status === 303 && lieu === '/dashboard?connexion=ok', 'retour réussi : 303 vers le tableau de bord, connexion=ok')
    ok((res.headers.get('set-cookie') || '').includes('Max-Age=0'), 'retour : le cookie d\'état est effacé')
    const echange = g.appels.find((a) => a.url === O.URL_JETON)
    const p = new URLSearchParams(echange?.corps || '')
    ok(!!echange && crypto.createHash('sha256').update(p.get('code_verifier') || '').digest('base64url') === url.searchParams.get('code_challenge'), 'échange : le vérificateur PKCE correspond au défi envoyé')
    ok(p.get('redirect_uri') === envBase.GOOGLE_OAUTH_REDIRECT_URI, 'échange : même redirect_uri qu\'à l\'autorisation')
    const lignes = [...base.lignes.values()]
    ok(lignes.length === 1, 'une seule connexion enregistrée')
    const l = lignes[0]; ligneA = l
    ok(l && l.artisan_id === UID_A && l.fournisseur === 'google_agenda', 'la connexion appartient au compte de la session de départ')
    ok(l && l.etat === 'active' && !!l.verifiee_le, '« active » seulement après l\'essai de lecture réussi')
    ok(l && g.appels.some((a) => a.url === 'https://www.googleapis.com/calendar/v3/freeBusy'), 'essai de lecture : les créneaux occupés (freeBusy), rien d\'autre')
    ok(l && l.compte_affiche === EMAIL.toLowerCase(), 'compte affiché : l\'adresse vérifiée, en minuscules')
    ok(l && JSON.stringify(l.portees) === JSON.stringify([`${GA}calendar.freebusy`, `${GA}userinfo.email`, 'openid'].sort()), 'portées enregistrées : celles accordées, normalisées')
    ok(l && V1.test(l.secret_app || '') && V1.test(l.secret_n8n || ''), 'secret_app et secret_n8n au format v1 (celui que 0193 exige)')
    ok(l && g.jetonsEmis.every((j) => !String(l.secret_app).includes(j) && !String(l.secret_n8n).includes(j)), 'aucun jeton en clair dans la ligne')
    const ouvertApp = l && C.dechiffrerPour('app', l.secret_app, l.id, envBase)
    const ouvertN8n = l && C.dechiffrerPour('n8n', l.secret_n8n, l.id, envBase)
    ok(!!ouvertApp && JSON.parse(ouvertApp).refresh_token === g.jetonsEmis[1], 'l\'app ouvre secret_app avec CANAUX_KEY')
    ok(!!ouvertN8n && JSON.parse(ouvertN8n).refresh_token === g.jetonsEmis[1], 'n8n ouvre secret_n8n avec BOITE_CLE_N8N')
    // Contrôle indépendant du code : un déchiffrement AES-GCM écrit ici, avec la clé de n8n et la donnée associée attendue.
    const ouvrirIci = (b64cle, stocke, aad) => { try { const [, iv, tag, data] = stocke.split('.'); const dd = crypto.createDecipheriv('aes-256-gcm', Buffer.from(b64cle, 'base64'), Buffer.from(iv, 'base64url')); if (aad) dd.setAAD(Buffer.from(aad)); dd.setAuthTag(Buffer.from(tag, 'base64url')); return Buffer.concat([dd.update(Buffer.from(data, 'base64url')), dd.final()]).toString('utf8') } catch { return null } }
    ok(!!l && ouvrirIci(envBase.BOITE_CLE_N8N, l.secret_n8n, `connexions:${l.id}:n8n`) !== null, 'secret_n8n s\'ouvre avec la seule clé de n8n et la donnée associée « connexions:<id>:n8n » (contrat de n8n)')
    ok(!!l && ouvrirIci(envBase.CANAUX_KEY, l.secret_n8n, `connexions:${l.id}:n8n`) === null && ouvrirIci(envBase.CANAUX_KEY, l.secret_n8n, `connexions:${l.id}:app`) === null, 'CANAUX_KEY n\'ouvre pas secret_n8n')
    ok(!!l && ouvrirIci(envBase.BOITE_CLE_N8N, l.secret_app, `connexions:${l.id}:app`) === null && ouvrirIci(envBase.BOITE_CLE_N8N, l.secret_app, `connexions:${l.id}:n8n`) === null, 'la clé de n8n n\'ouvre pas secret_app')
    ok(!!l && C.dechiffrerPour('app', l.secret_app, crypto.randomUUID(), envBase) === null, 'un chiffré recopié sur une autre ligne ne s\'ouvre pas')
    ok(!!l && ouvrirIci(envBase.BOITE_CLE_N8N, l.secret_n8n, null) === null, 'un chiffré sans sa donnée associée ne s\'ouvre pas')
    ok(!!l && C.dechiffrerPour('n8n', l.secret_app, l.id, envBase) === null, 'secret_app recopié dans secret_n8n ne s\'ouvre pas')
    const vue = l && E.vueConnexion(l)
    ok(!!vue && !('secret_app' in vue) && !('secret_n8n' in vue) && !JSON.stringify(vue).includes('v1.'), 'la vue « Connexions » ne porte aucun secret')
    ok(!!vue && vue.etat === 'active' && typeof vue.libelle === 'string', 'la vue « Connexions » dit l\'état')

    // Rebrancher le même compte pour le même outil : renouvelée sur place (même ligne, nouveaux secrets), une seule vivante.
    horloge.t += 60_000
    const secretAvant = l.secret_app
    const rb = await connecterJusquauBout('google_agenda', d, g)
    const vivantes = [...base.lignes.values()].filter((x) => x.etat !== 'retiree')
    const renouvelee = base.lignes.get(l.id)
    ok(rb.lieu === '/dashboard?connexion=ok' && vivantes.length === 1 && renouvelee.etat === 'active' && renouvelee.secret_app !== secretAvant
      && JSON.parse(C.dechiffrerPour('app', renouvelee.secret_app, l.id, envBase)).refresh_token === g.jetonsEmis[g.jetonsEmis.length - 1],
      'rebrancher : la connexion est renouvelée sur place (nouveaux secrets, une seule vivante)')

    const secrets = [...g.jetonsEmis, CLIENT_SECRET, 'code-essai']
    const vus = secrets.filter((s) => sorties.some((x) => x.includes(s)))
    ok(vus.length === 0, `aucune réponse au navigateur ne porte un jeton, le client secret ou le code (${sorties.length} réponses lues)`)
    const verifs = g.appels.filter((a) => a.url === O.URL_JETON).map((a) => new URLSearchParams(a.corps).get('code_verifier')).filter(Boolean)
    ok(verifs.length > 0 && verifs.every((v) => !sorties.some((x) => x.includes(v))), 'le vérificateur PKCE ne part jamais vers le navigateur')
  }

  // ── E. L'état : refusé s'il manque, diffère, est altéré ou échu ; rien n'est échangé ──
  {
    const cas = [
      ['state différent', { stateRecu: 'autre-' + crypto.randomBytes(30).toString('base64url') }],
      ['cookie absent', { cookie: '' }],
      ['cookie altéré', { cookie: O.COOKIE_ETAT + '=v1.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.AAAA' }],
      ['état échu (11 minutes)', { attendre: 11 * 60_000 }],
    ]
    for (const [nom, o] of cas) {
      const g = fgVivant(), base = fausseBase(), d = deps({ g, base })
      const { res, lieu } = await connecterJusquauBout('google_agenda', d, g, o)
      ok(res.status === 303 && lieu.includes('connexion=refus') && lieu.includes('etat_invalide'), `${nom} : refus etat_invalide`)
      ok(!g.appels.some((a) => a.url === O.URL_JETON) && base.lignes.size === 0, `${nom} : aucun échange de code, rien d'enregistré`)
    }
    // Le cookie d'état d'une autre session (A) rejoué avec le state d'un autre départ (B) : refus.
    const g = fgVivant(), base = fausseBase(), d = deps({ g, base, plan: 'studio' })
    const a = await demarrerPour('google_agenda', d)
    const b = await garder(await R.demarrer(post('/api/connexions/google/demarrer', { fournisseur: 'google_agenda' }, 'B'), d))
    const stateB = new URL((await b.json()).url).searchParams.get('state')
    const res = await R.retour(new Request(`https://console.example/api/connexions/google/retour?code=code-essai&state=${stateB}`, { headers: { cookie: a.cookie } }), d)
    ok((res.headers.get('location') || '').includes('etat_invalide') && base.lignes.size === 0, 'state d\'un autre départ avec le cookie de la session A : refus')
    // L'artisan refuse chez Google.
    const dep = await demarrerPour('google_agenda', d)
    const st = new URL(dep.corps.url).searchParams.get('state')
    const r2 = await R.retour(new Request(`https://console.example/api/connexions/google/retour?error=access_denied&state=${st}`, { headers: { cookie: dep.cookie } }), d)
    ok((r2.headers.get('location') || '').includes('refuse_par_artisan') && base.lignes.size === 0, 'refus chez Google : rien n\'est enregistré')
  }

  // ── F. Portées accordées ≠ demandées ; essai de lecture raté ; offre perdue entre départ et retour ──
  {
    const g = fgVivant({ scope: `openid ${GA}userinfo.email ${GA}calendar.freebusy https://mail.google.com/` }), base = fausseBase(), d = deps({ g, base })
    const { lieu } = await connecterJusquauBout('google_agenda', d, g)
    ok(lieu.includes('portee_elargie') && base.lignes.size === 0, 'portée élargie accordée : refus, rien d\'enregistré')
    ok(g.appels.some((a) => a.url === O.URL_REVOCATION), 'portée élargie : le jeton reçu est révoqué chez Google')
    const g2 = fgVivant({ scope: `openid ${GA}userinfo.email` }), b2 = fausseBase()
    const r2 = await connecterJusquauBout('google_agenda', deps({ g: g2, base: b2 }), g2)
    ok(r2.lieu.includes('portee_refusee') && b2.lignes.size === 0, 'portée principale décochée : refus, rien d\'enregistré')
    const g3 = fgVivant({ essaiEchoue: true }), b3 = fausseBase()
    const r3 = await connecterJusquauBout('google_drive', deps({ g: g3, base: b3 }), g3)
    const l3 = [...b3.lignes.values()][0]
    ok(r3.lieu.includes('essai_lecture_echoue') && l3 && l3.etat === 'erreur' && l3.motif_erreur === 'essai_lecture_echoue', 'essai de lecture raté : état « erreur », jamais « active »')
    const g4 = fgVivant(), b4 = fausseBase()
    let planCourant = 'studio'
    const d4 = { ...deps({ g: g4, base: b4 }), planDe: async () => ({ plan: planCourant }) }
    const dep = await demarrerPour('google_agenda', d4)
    g4.opts.defi = new URL(dep.corps.url).searchParams.get('code_challenge'); g4.opts.fournisseur = 'google_agenda'
    planCourant = 'gratuit'
    const st = new URL(dep.corps.url).searchParams.get('state')
    const r4 = await R.retour(new Request(`https://console.example/api/connexions/google/retour?code=code-essai&state=${st}`, { headers: { cookie: dep.cookie } }), d4)
    ok((r4.headers.get('location') || '').includes('motif=offre') && b4.lignes.size === 0, 'offre perdue entre le départ et le retour : peut() relu, refus')
  }

  // ── G. Retirer ──
  {
    const g = fgVivant(), base = fausseBase(), d = deps({ g, base })
    await connecterJusquauBout('google_agenda', d, g)
    const l = [...base.lignes.values()][0]
    const rB = await garder(await R.retirer(post('/api/connexions/retirer', { id: l.id }, 'B'), d))
    ok(rB.status === 404 && base.lignes.get(l.id).etat === 'active' && base.lignes.get(l.id).secret_app, 'un autre compte ne retire pas la connexion (404, rien ne change)')
    ok((await R.retirer(post('/api/connexions/retirer', { id: l.id }, null), d)).status === 401, 'retirer sans session → 401')
    ok((await R.retirer(post('/api/connexions/retirer', { id: 'pas-un-id' }), d)).status === 400, 'retirer, identifiant invalide → 400')
    const avant = g.appels.length
    const rA = await garder(await R.retirer(post('/api/connexions/retirer', { id: l.id }), d))
    const apres = base.lignes.get(l.id)
    ok(rA.status === 200 && apres.etat === 'retiree', 'retirer : la ligne passe à « retiree »')
    ok(apres.secret_app === null && apres.secret_n8n === null && !!apres.retiree_le, 'retirer : les deux jetons sont effacés, retiree_le posé')
    const revoc = g.appels.slice(avant).find((a) => a.url === O.URL_REVOCATION)
    ok(!!revoc && new URLSearchParams(revoc.corps).get('token') === g.jetonsEmis[1], 'retirer : l\'autorisation est révoquée chez Google (jeton de rafraîchissement)')
    const r2 = await (await R.retirer(post('/api/connexions/retirer', { id: l.id }), d)).json()
    ok(r2.ok === true && r2.deja === true, 'retirer deux fois : idempotent')
    const gp = fgVivant({ injoignable: true })
    const b2 = fausseBase(); const g2 = fgVivant(); const d2 = deps({ g: g2, base: b2 })
    await connecterJusquauBout('google_drive', d2, g2)
    const l2 = [...b2.lignes.values()][0]
    const r3 = await R.retirer(post('/api/connexions/retirer', { id: l2.id }), { ...d2, fetch: gp.fetch })
    ok(r3.status === 200 && b2.lignes.get(l2.id).secret_app === null, 'Google injoignable au retrait : le retrait chez Presti a lieu quand même')
    ok(JSON.stringify(E.patchRetrait('2026-11-03T09:00:00.000Z')) === JSON.stringify({ etat: 'retiree', secret_app: null, secret_n8n: null, retiree_le: '2026-11-03T09:00:00.000Z' }), 'patchRetrait : exactement retiree + deux secrets à null')
  }

  // ── G2. Même compte Google sur deux outils ; lecture en erreur ; compte suspendu au retour ──
  {
    const g = fgVivant(), base = fausseBase(), d = deps({ g, base })
    await connecterJusquauBout('google_agenda', d, g)
    await connecterJusquauBout('google_drive', d, g)
    const [agenda, drive] = ['google_agenda', 'google_drive'].map((f) => [...base.lignes.values()].find((x) => x.fournisseur === f))
    ok(agenda?.etat === 'active' && drive?.etat === 'active', 'même compte Google : agenda et Drive branchés côte à côte')
    const avant = g.appels.length
    await R.retirer(post('/api/connexions/retirer', { id: drive.id }), d)
    ok(!g.appels.slice(avant).some((a) => a.url === O.URL_REVOCATION), 'retirer Drive quand l\'agenda du même compte vit : pas de révocation chez Google (elle couperait l\'agenda)')
    ok(base.lignes.get(drive.id).etat === 'retiree' && base.lignes.get(drive.id).secret_app === null && base.lignes.get(agenda.id).etat === 'active' && !!base.lignes.get(agenda.id).secret_app,
      'Drive retiré et effacé, l\'agenda intact')
    g.opts.scope = `openid ${GA}userinfo.email`
    const av2 = g.appels.length
    const r = await connecterJusquauBout('google_drive', d, g)
    ok(r.lieu.includes('portee_refusee') && !g.appels.slice(av2).some((a) => a.url === O.URL_REVOCATION), 'portée refusée alors que l\'agenda du même compte vit : pas de révocation')
    delete g.opts.scope
    base.etatBase.panneLecture = true
    const av3 = g.appels.length
    const r2 = await connecterJusquauBout('google_agenda', d, g)
    ok(r2.lieu.includes('motif=enregistrement') && base.lignes.get(agenda.id).etat === 'active' && base.lignes.get(agenda.id).secret_app === agenda.secret_app,
      'lecture de la base en erreur au retour : refus, la connexion existante reste intacte')
    ok(!g.appels.slice(av3).some((a) => a.url === O.URL_REVOCATION), 'lecture en erreur : aucune révocation à l\'aveugle')
    const av4 = g.appels.length
    const r3 = await R.retirer(post('/api/connexions/retirer', { id: agenda.id }), d)
    ok(r3.status === 200 && !g.appels.slice(av4).some((a) => a.url === O.URL_REVOCATION) && base.lignes.get(agenda.id).secret_app === null,
      'retrait pendant une panne de lecture : jetons effacés chez Presti, pas de révocation à l\'aveugle')
    base.etatBase.panneLecture = false
    const g5 = fgVivant(), b5 = fausseBase()
    const d5 = deps({ g: g5, base: b5, compteValide: async (uid, iat) => !(uid === UID_A && iat === 1000) })
    const r5 = await connecterJusquauBout('google_agenda', d5, g5)
    ok(r5.lieu.includes('motif=compte') && b5.lignes.size === 0 && !g5.appels.some((a) => a.url === O.URL_JETON),
      'compte suspendu ou déconnecté de partout entre le départ et le retour : refus avant tout échange')
  }

  // ── H. Expiration : le système se tait, l'état le dit, une alerte part, rien ne plante ──
  {
    const id = crypto.randomUUID()
    const secret = JSON.stringify({ refresh_token: 'RAFRAICHI-FAUX-exp', access_token: 'ACCES-FAUX-exp', access_expire: horloge.t - 1000 })
    const ligne = (etat = 'active') => ({ id, artisan_id: UID_A, fournisseur: 'google_agenda', compte_affiche: null, portees: [], etat,
      motif_erreur: null, verifiee_le: '2026-11-01T00:00:00Z', derniere_synchro: null, expire_le: null, retiree_le: null,
      secret_app: C.chiffrerPour('app', secret, id, envBase), secret_n8n: C.chiffrerPour('n8n', secret, id, envBase) })
    const dd = (g) => ({ env: envBase, fetch: g.fetch, maintenant: () => horloge.t })
    let r
    try { r = await E.jetonUtilisable(ligne(), dd(fgVivant({ rafraichir: 'invalid_grant' }))) } catch { r = null }
    ok(!!r, 'autorisation expirée chez Google : jetonUtilisable ne plante pas')
    ok(!!r && r.utilisable === false && r.motif === 'expiree' && r.patch?.etat === 'expiree', 'autorisation expirée : état « expiree » (l\'écran le dit), aucun jeton rendu')
    ok(!!r && r.alerte?.type === 'connexion_expiree' && r.alerte.connexion_id === id && r.alerte.artisan_id === UID_A, 'autorisation expirée : une alerte, au bon compte')
    ok(!!r && !JSON.stringify(r).includes('RAFRAICHI-FAUX') && !JSON.stringify(r).includes('ACCES-FAUX'), 'l\'issue ne porte aucun jeton')
    try { r = await E.jetonUtilisable(ligne(), dd(fgVivant({ injoignable: true }))) } catch { r = null }
    ok(!!r && r.utilisable === false && r.motif === 'injoignable' && !r.alerte && !r.patch, 'Google injoignable : silence, ni état changé ni alerte, sans plantage')
    try { r = await E.jetonUtilisable(ligne(), dd(fgVivant({ rafraichir: 'panne' }))) } catch { r = null }
    ok(!!r && r.utilisable === false && !r.alerte && !r.patch, 'Google en panne (503) : silence')
    try { r = await E.jetonUtilisable(ligne(), dd(fgVivant({ rafraichir: 'json_casse' }))) } catch { r = null }
    ok(!!r && r.utilisable === false, 'réponse illisible de Google : silence, sans plantage')
    try { r = await E.jetonUtilisable(ligne('expiree'), dd(fgVivant())) } catch { r = null }
    ok(!!r && r.utilisable === false && !r.alerte, 'connexion déjà expirée : silence, pas une alerte de plus')
    try { r = await E.jetonUtilisable({ ...ligne(), secret_app: 'v1.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.AAAA' }, dd(fgVivant())) } catch { r = null }
    ok(!!r && r.utilisable === false && r.patch?.etat === 'erreur' && r.alerte?.type === 'connexion_illisible', 'secret illisible : état « erreur », une alerte, sans plantage')
    const g = fgVivant()
    try { r = await E.jetonUtilisable(ligne(), dd(g)) } catch { r = null }
    ok(!!r && r.utilisable === true && String(r.jeton).startsWith('ACCES-NEUF-'), 'jeton d\'accès échu, rafraîchissement réussi : nouveau jeton')
    ok(!!r && V1.test(r.patch?.secret_app || '') && V1.test(r.patch?.secret_n8n || '') && C.dechiffrerPour('n8n', r.patch.secret_n8n, id, envBase)?.includes(r.jeton), 'rafraîchi : les deux secrets rechiffrés, chacun pour son destinataire')
    const frais = JSON.stringify({ refresh_token: 'RAFRAICHI-FAUX-exp', access_token: 'ACCES-FRAIS', access_expire: horloge.t + 30 * 60_000 })
    const g2 = fgVivant()
    try { r = await E.jetonUtilisable({ ...ligne(), secret_app: C.chiffrerPour('app', frais, id, envBase) }, dd(g2)) } catch { r = null }
    ok(!!r && r.utilisable === true && r.jeton === 'ACCES-FRAIS' && g2.appels.length === 0, 'jeton encore valable : aucun appel à Google')
    const envSansCle = { ...envBase }; delete envSansCle.CANAUX_KEY
    try { r = await E.jetonUtilisable(ligne(), { env: envSansCle, fetch: fgVivant().fetch, maintenant: () => horloge.t }) } catch { r = null }
    ok(!!r && r.utilisable === false, 'clé de l\'app retirée : silence, sans plantage')
  }

  // ── I. Le chiffrement seul ──
  {
    let leve = false
    try { C.chiffrerPour('n8n', 'x', 'ligne', { CANAUX_KEY: envBase.CANAUX_KEY }) } catch { leve = true }
    ok(leve, 'sans clé de n8n : chiffrerPour refuse plutôt que d\'écrire en clair')
    const a = C.chiffrerPour('app', 'même texte', 'L', envBase), b = C.chiffrerPour('app', 'même texte', 'L', envBase)
    ok(a !== b && V1.test(a), 'deux chiffrements du même texte diffèrent (iv aléatoire), format v1')
    const [v, iv, tag, data] = a.split('.')
    const altere = [v, iv, tag, data.slice(0, -2) + (data.endsWith('AA') ? 'BB' : 'AA')].join('.')
    ok(C.dechiffrerPour('app', altere, 'L', envBase) === null, 'un chiffré altéré ne s\'ouvre pas (intégrité GCM)')
  }
}

// Le point d'entrée, en dernier : toutes les constantes ci-dessus sont alors définies.
if (process.argv[2] === '--enfant') await enfant(process.argv[3])
else await parent()
