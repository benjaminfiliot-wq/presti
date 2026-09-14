// scripts/site-hebergement-e2e.mjs — suite e2e de l'hébergement des sites générés (v15 §3.2).
//
// Ce qu'elle prouve :
//   1. site-deposer refuse un dossier sans site.json / juge rouge ; accepte le témoin (--statique : payee, jeton ; complet : generee, scores, verifications) ;
//   2. sans jeton : GET /site-genere/<id>/ → 404 ; avec ?apercu=<jeton> → 200 text/html, noindex, Set-Cookie ; avec cookie seul → 200 ; /styles.css → text/css ; /images/hero.webp → image/webp ; chemin .. → 404 ; faux jeton → 404 ;
//   3. sur un hôte Presti, les liens absolus sont réécrits vers /site-genere/<id>/… ;
//   4. mettre_en_ligne sur commande validee sans dépôt → 409 ; après dépôt → 200, en_ligne, journal site_en_ligne, site_origine = 'commande' ; GET public → 200 Cache-Control public ;
//   5. garde-fous : mettre_en_ligne sur payee → 409 ; rôle lecture → 403 ; GET /api/controle/sites donne apercu à direction, null à lecture.
//
// 0 appel IA, 0 paiement. Comptes `heb-*@presti-test.invalid`, purgés en `finally`.

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { verifierSessionTest } from './lib/connexion-test.mjs'

if (fs.existsSync('.env.local')) {
  for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = (process.env.TEST_BASE || 'https://prestiapp.fr').replace(/\/$/, '')

if (!SB || !SVC || !ANON) {
  console.log('❌ variables Supabase absentes')
  process.exit(1)
}

const RACINE = process.cwd()
const st = crypto.randomBytes(3).toString('hex')
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })
const api = async (chemin, o = {}, jeton, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(`${APP}${chemin}`, {
      ...o,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'presti-site-hebergement-e2e (Chrome; Windows)',
        ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
        ...(o.headers || {}),
      },
    })
    if ((res.status !== 503 && res.status !== 502) || i === retries) return res
    await new Promise((r) => setTimeout(r, 2000))
  }
}
const json = async (r) => ({ status: r.status, headers: r.headers, body: await r.json().catch(() => ({})) })

let ok = 0, ko = 0
const T = (n, c, d = '') => {
  if (c) {
    ok++
    console.log(`  ✅ ${n}`)
  } else {
    ko++
    console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`)
  }
}
const fin = (code) => { process.exitCode = code; setTimeout(() => {}, 50) }

const comptes = []
const commandesCrees = []
const dossiersTmp = []

async function creer(nom, { fondateur = false, role = null } = {}) {
  const email = `heb-${nom}-${st}@presti-test.invalid`
  const password = `Hb-${crypto.randomBytes(9).toString('base64url')}-1`
  const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  if (!u?.id) throw new Error(`création ${nom} : ${JSON.stringify(u).slice(0, 120)}`)
  comptes.push(u.id)

  const r = await rest('artisans', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: u.id,
      email,
      nom: `Artisan ${nom}`,
      metier: 'Plomberie',
      slug: `heb-${nom}-${st}`,
      plan: 'gratuit',
      aide_vues: ['visite:console'],
      is_founder: fondateur,
      role_interne: role === 'lecture' ? 'partenaire' : role === 'direction' || fondateur ? 'fondateur' : null,
      est_demo: true,
    }),
  })
  if (!r.ok) throw new Error(`artisans ${nom} : ${r.status}`)

  if (role) {
    await rest('direction_roles', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: u.id, role: role === 'lecture' ? 'lecture' : 'direction' }),
    })
  }

  return { uid: u.id, email, password }
}

async function session(c) {
  const s = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: c.email, password: c.password }),
  })).json()
  if (!s?.access_token) throw new Error(`session ${c.email}`)
  await verifierSessionTest(s.access_token)
  return s.access_token
}

const purgerPlafondsDe = async (...uids) => {
  for (const u of uids) await rest(`limites?cle=in.(reconf:${u},direction:${u},inscription:${u})`, { method: 'DELETE' }).catch(() => {})
}

async function insererCommande({ artisanId, email, etat = 'payee', domaineMode = 'aucun' }) {
  const res = await rest('sites_commandes?select=id', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      artisan_id: artisanId,
      email,
      etat,
      domaine_mode: domaineMode,
      metier: 'Plomberie',
      communes: ['Lyon', 'Villeurbanne', 'Bron', 'Vénissieux'],
      prix_cents: 30000,
      paye_le: new Date().toISOString(),
    }),
  })
  const body = await res.json()
  if (!body?.[0]?.id) throw new Error(`Erreur insertion commande ${etat}: ${JSON.stringify(body)}`)
  commandesCrees.push(body[0].id)
  return body[0].id
}

// ── Générateur de site témoin conforme à scripts/site-qa.mjs ───────────────────
const SOURCE_TEMOIN = path.join(RACINE, 'public', 'sites-demo', 'plombier')

function fabriquerTemoin(dossier) {
  fs.rmSync(dossier, { recursive: true, force: true })
  fs.cpSync(SOURCE_TEMOIN, dossier, { recursive: true })
  // Ajouter images/hero.webp pour couvrir explicitement le test de type MIME d'image
  const hero960 = path.join(dossier, 'images', 'hero-960.webp')
  const heroWebp = path.join(dossier, 'images', 'hero.webp')
  if (fs.existsSync(hero960) && !fs.existsSync(heroWebp)) {
    fs.copyFileSync(hero960, heroWebp)
    const attrF = path.join(dossier, 'attributions.json')
    if (fs.existsSync(attrF)) {
      try {
        const attrs = JSON.parse(fs.readFileSync(attrF, 'utf8'))
        attrs.push({
          fichier: 'images/hero.webp',
          auteur: 'W.carter',
          source: 'https://commons.wikimedia.org/wiki/File:Sink_and_taps_in_the_men%27s_locker_room_6.jpg',
          licence: 'CC BY-SA 4.0',
          legende: 'Installation de robinetterie',
        })
        fs.writeFileSync(attrF, JSON.stringify(attrs, null, 2))
      } catch {}
    }
  }
}

async function purgerStorage(commandeId) {
  try {
    const listRes = await rest(`storage/v1/object/list/sites`, {
      method: 'POST',
      body: JSON.stringify({ prefix: commandeId, limit: 1000 }),
    })
    const objets = await listRes.json()
    if (Array.isArray(objets) && objets.length > 0) {
      const prefixes = objets.map((o) => `${commandeId}/${o.name}`)
      await rest(`storage/v1/object/sites`, {
        method: 'DELETE',
        body: JSON.stringify({ prefixes }),
      })
    }
  } catch {}
}

async function nettoyer() {
  for (const cmdId of commandesCrees) {
    await purgerStorage(cmdId)
    await rest(`sites_commandes?id=eq.${cmdId}`, { method: 'DELETE' }).catch(() => {})
    await rest(`journal_direction?cible_id=eq.${cmdId}`, { method: 'DELETE' }).catch(() => {})
  }
  for (const id of comptes) {
    await rest(`sites_commandes?artisan_id=eq.${id}`, { method: 'DELETE' }).catch(() => {})
    await rest(`direction_roles?user_id=eq.${id}`, { method: 'DELETE' }).catch(() => {})
    await rest(`artisans?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ is_founder: false, role_interne: null }) }).catch(() => {})
    await rest(`journal_direction?acteur_id=eq.${id}`, { method: 'DELETE' }).catch(() => {})
  }
  await purgerPlafondsDe(...comptes)
  for (const id of comptes) {
    await rest('rpc/purger_compte_test', { method: 'POST', body: JSON.stringify({ p_id: id }) }).catch(() => {})
    await admin(`users/${id}`, { method: 'DELETE' }).catch(() => {})
  }
  for (const d of dossiersTmp) {
    try { fs.rmSync(d, { recursive: true, force: true }) } catch {}
  }
}

console.log(`\nsite-hebergement-e2e — ${APP}\n`)

try {
  console.log('0. Préalables')
  const sondeTable = await rest('sites_commandes?select=id&limit=1')
  if (sondeTable.status === 404) {
    console.log('  ⛔ À faire (Benj) : la table sites_commandes n’existe pas — migration 0088 non collée.')
    fin(2)
    throw new Error('stop')
  }

  const art = await creer('artisan')
  const F = await creer('fondateur', { fondateur: true, role: 'direction' })
  const jF = await session(F)

  const cTest = await insererCommande({ artisanId: art.uid, email: art.email, etat: 'payee' })

  const tmpDossier = fs.mkdtempSync(path.join(os.tmpdir(), 'site-heb-temoin-'))
  dossiersTmp.push(tmpDossier)
  fabriquerTemoin(tmpDossier)

  const tmpInvalide = fs.mkdtempSync(path.join(os.tmpdir(), 'site-heb-invalide-'))
  dossiersTmp.push(tmpInvalide)
  fs.writeFileSync(path.join(tmpInvalide, 'index.html'), '<!doctype html><html><body>Test</body></html>')
  fs.writeFileSync(path.join(tmpInvalide, 'site.json'), '{}')

  console.log('\n1. site-deposer refuse le juge rouge et accepte le témoin')
  const rInvalide = spawnSync(process.execPath, ['scripts/site-deposer.mjs', cTest, tmpInvalide, '--statique'], { encoding: 'utf8' })
  T('site-deposer refuse un dossier invalide (code 1, juge rouge)', rInvalide.status === 1 && /le juge refuse/i.test(rInvalide.stderr || rInvalide.stdout), `code=${rInvalide.status}`)

  const rStatique = spawnSync(process.execPath, ['scripts/site-deposer.mjs', cTest, tmpDossier, '--statique'], { encoding: 'utf8' })
  T('site-deposer --statique accepte le témoin (code 0)', rStatique.status === 0, `code=${rStatique.status} ${(rStatique.stderr || '').slice(0, 100)}`)

  const [dbStatique] = await (await rest(`sites_commandes?id=eq.${cTest}&select=etat,apercu_jeton,scores,verifications`)).json()
  T('avec --statique : commande reste « payee » et apercu_jeton est posé', dbStatique?.etat === 'payee' && typeof dbStatique?.apercu_jeton === 'string' && dbStatique.apercu_jeton.length >= 20)

  const rComplet = spawnSync(process.execPath, ['scripts/site-deposer.mjs', cTest, tmpDossier], { encoding: 'utf8' })
  T('site-deposer complet accepte le témoin (code 0)', rComplet.status === 0, `code=${rComplet.status} ${(rComplet.stderr || '').slice(0, 100)}`)

  const [dbComplet] = await (await rest(`sites_commandes?id=eq.${cTest}&select=etat,apercu_jeton,scores,verifications`)).json()
  const scores = dbComplet?.scores
  const verifs = dbComplet?.verifications
  T('complet : état passe à « generee », scores présents et verifications.blocs présent',
    dbComplet?.etat === 'generee' &&
    !!scores && Object.keys(scores).length >= 4 &&
    Array.isArray(verifs?.blocs) && verifs.blocs.length > 0,
    `scores=${JSON.stringify(scores)} blocs=${verifs?.blocs?.length}`
  )

  const jeton = dbComplet.apercu_jeton

  console.log('\n2. Diffusion privée : sans jeton 404, avec jeton 200, types MIME et cookie')
  const rSansJeton = await fetch(`${APP}/site-genere/${cTest}`)
  T('sans jeton : GET /site-genere/<id> → 404', rSansJeton.status === 404, `HTTP ${rSansJeton.status}`)

  const rAvecJeton = await fetch(`${APP}/site-genere/${cTest}?apercu=${jeton}`, { redirect: 'manual' })
  const setCookie = rAvecJeton.headers.get('set-cookie') || ''
  const nomCookie = `presti_apercu_${cTest.slice(0, 8)}`
  const cookieMatch = setCookie.match(new RegExp(`${nomCookie}=([^;]+)`))
  const cookieVal = cookieMatch ? `${nomCookie}=${cookieMatch[1]}` : ''

  T('avec ?apercu=<jeton> : 200 text/html, noindex, Set-Cookie posé',
    rAvecJeton.status === 200 &&
    (rAvecJeton.headers.get('content-type') || '').includes('text/html') &&
    (rAvecJeton.headers.get('x-robots-tag') || '').includes('noindex') &&
    (rAvecJeton.headers.get('cache-control') || '').includes('no-store') &&
    !!cookieVal,
    `HTTP ${rAvecJeton.status} type=${rAvecJeton.headers.get('content-type')} cookie=${cookieVal}`
  )

  const rAvecCookie = await fetch(`${APP}/site-genere/${cTest}`, {
    headers: { Cookie: cookieVal },
  })
  T('avec le cookie seul : GET /site-genere/<id> → 200', rAvecCookie.status === 200, `HTTP ${rAvecCookie.status}`)

  const rCss = await fetch(`${APP}/site-genere/${cTest}/styles.css`, {
    headers: { Cookie: cookieVal },
  })
  T('/styles.css → 200 text/css', rCss.status === 200 && (rCss.headers.get('content-type') || '').includes('text/css'), `HTTP ${rCss.status} type=${rCss.headers.get('content-type')}`)

  const rWebp = await fetch(`${APP}/site-genere/${cTest}/images/hero.webp`, {
    headers: { Cookie: cookieVal },
  })
  T('/images/hero.webp → 200 image/webp', rWebp.status === 200 && (rWebp.headers.get('content-type') || '').includes('image/webp'), `HTTP ${rWebp.status} type=${rWebp.headers.get('content-type')}`)

  const rTraversee = await fetch(`${APP}/site-genere/${cTest}/../index.html?apercu=${jeton}`)
  T('chemin avec « .. » → 404', rTraversee.status === 404, `HTTP ${rTraversee.status}`)

  const rFauxJeton = await fetch(`${APP}/site-genere/${cTest}?apercu=faux_jeton_invalide`)
  T('jeton erroné → 404', rFauxJeton.status === 404, `HTTP ${rFauxJeton.status}`)

  console.log('\n3. Réécriture des liens HTML sur hôte Presti')
  const htmlApercu = await rAvecCookie.text()
  const aReecriture = htmlApercu.includes(`/site-genere/${cTest}/plombier-lyon/`) || htmlApercu.includes(`/site-genere/${cTest}/`)
  const sansLienNu = !htmlApercu.includes('href="/plombier-lyon/"') && !htmlApercu.includes('src="/images/hero.webp"')
  T('les liens absolus et images portent le préfixe /site-genere/<id>/', aReecriture && sansLienNu, `trouvé=/site-genere/${cTest}/ sansNu=${sansLienNu}`)

  console.log('\n4. Validation et mise en ligne')
  await purgerPlafondsDe(F.uid)
  const cValideeSansDepot = await insererCommande({ artisanId: art.uid, email: art.email, etat: 'validee' })
  const resSansDepot = await json(await api(`/api/controle/sites/${cValideeSansDepot}`, { method: 'POST', body: JSON.stringify({ action: 'mettre_en_ligne' }) }, jF))
  T('mettre_en_ligne sur une commande validée SANS dépôt → 409', resSansDepot.status === 409, `HTTP ${resSansDepot.status}`)

  await rest(`sites_commandes?id=eq.${cTest}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ etat: 'validee', valide_le: new Date().toISOString() }),
  })

  await purgerPlafondsDe(F.uid)
  const resEnLigne = await json(await api(`/api/controle/sites/${cTest}`, { method: 'POST', body: JSON.stringify({ action: 'mettre_en_ligne' }) }, jF))
  T('mettre_en_ligne sur commande déposée et validée → 200', resEnLigne.status === 200 && resEnLigne.body?.ok === true, `HTTP ${resEnLigne.status}`)

  const [dbEnLigne] = await (await rest(`sites_commandes?id=eq.${cTest}&select=etat,en_ligne_le`)).json()
  T('l’état passe à « en_ligne » et en_ligne_le est renseigné', dbEnLigne?.etat === 'en_ligne' && !!dbEnLigne?.en_ligne_le)

  const jrEnLigne = await (await rest(`journal_direction?cible_id=eq.${cTest}&action=eq.site_en_ligne&acteur_id=eq.${F.uid}`)).json()
  T('l’action est consignée dans journal_direction (site_en_ligne)', Array.isArray(jrEnLigne) && jrEnLigne.length > 0)

  const [artEnLigne] = await (await rest(`artisans?id=eq.${art.uid}&select=site_origine`)).json()
  T('artisans.site_origine passe à « commande »', artEnLigne?.site_origine === 'commande', `site_origine=${artEnLigne?.site_origine}`)

  const rPublic = await fetch(`${APP}/site-genere/${cTest}`)
  T('en ligne : GET /site-genere/<id> sans jeton → 200 public',
    rPublic.status === 200 &&
    (rPublic.headers.get('cache-control') || '').includes('public'),
    `HTTP ${rPublic.status} cache=${rPublic.headers.get('cache-control')}`
  )

  console.log('\n5. Garde-fous et droits d’accès')
  const cPayee2 = await insererCommande({ artisanId: art.uid, email: art.email, etat: 'payee' })
  await purgerPlafondsDe(F.uid)
  const resValPayee = await json(await api(`/api/controle/sites/${cPayee2}`, { method: 'POST', body: JSON.stringify({ action: 'mettre_en_ligne' }) }, jF))
  T('mettre_en_ligne sur une commande « payee » → 409', resValPayee.status === 409, `HTTP ${resValPayee.status}`)

  const L = await creer('lecture', { fondateur: true, role: 'lecture' })
  const jL = await session(L)

  const resPostL = await json(await api(`/api/controle/sites/${cTest}`, { method: 'POST', body: JSON.stringify({ action: 'mettre_en_ligne' }) }, jL))
  T('lecture : POST /api/controle/sites/<id> → 403 (hors_perimetre)', resPostL.status === 403, `HTTP ${resPostL.status} code=${resPostL.body?.code}`)

  const resGetF = await json(await api('/api/controle/sites', {}, jF))
  const cmdF = (resGetF.body?.commandes || []).find((c) => c.id === cTest)
  T('direction : GET /api/controle/sites donne le lien d’aperçu', !!cmdF?.apercu && typeof cmdF.apercu === 'string' && cmdF.apercu.includes('apercu='), `apercu=${cmdF?.apercu}`)

  const resGetL = await json(await api('/api/controle/sites', {}, jL))
  const cmdL = (resGetL.body?.commandes || []).find((c) => c.id === cTest)
  T('lecture : GET /api/controle/sites donne apercu = null', cmdL?.apercu === null, `apercu=${cmdL?.apercu}`)

} catch (e) {
  if (e?.message !== 'stop') {
    ko++
    console.log('  ❌ exception :', e?.stack?.split('\n').slice(0, 3).join(' | ') || e)
  }
} finally {
  await purgerPlafondsDe(...comptes).catch(() => {})
  await nettoyer()
  console.log(`\n🧹 ${comptes.length} compte(s) de test purgé(s)`)
  const total = ok + ko
  if (process.exitCode !== 2) {
    console.log(`\n${ko === 0 ? '✅' : '❌'} 014-19 : ${ko === 0 ? 'PASS' : 'FAIL'} — site-hebergement-e2e : ${ok}/${total} — ${APP}`)
    console.log(`${ok} réussis, ${ko} échoués`)
    fin(ko === 0 ? 0 : 1)
  }
}
