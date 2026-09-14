// La validation humaine d'un site généré depuis le Poste de contrôle (prompt v15 §3.2) — suite e2e.
//
// Ce qu'elle prouve :
//   1. GET par la direction liste les commandes payées/générées/validées, jamais les brouillons, avec l'artisan rattaché et le filtre par état ;
//   2. POST valider fait passer generee → validee, pose valide_le et écrit dans journal_direction (site_valide) ;
//   3. POST regenerer exige une consigne (>= 10 signes), repasse generee → payee, incrémente regenerations, efface genere_le/scores/verifications et journalise (site_regeneration) ;
//   4. les erreurs sont bien gérées : transition invalide (409), UUID inconnu (404), format UUID invalide (400), non authentifié (401) ;
//   5. le rôle « lecture » peut lire (GET 200) mais ne peut rien modifier (POST 403).
//
// 0 appel IA, 0 paiement. Comptes `sites-*@presti-test.invalid`, purgés en `finally`. Code 2 si le drapeau est baissé.
//
// Usage : node scripts/controle-sites-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { verifierSessionTest } from './lib/connexion-test.mjs'

if (fs.existsSync('.env.local')) for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.env.TEST_BASE || 'https://prestiapp.fr'

if (!SB || !SVC || !ANON) {
  console.log('❌ variables Supabase absentes')
  process.exit(1)
}

const st = crypto.randomBytes(3).toString('hex')
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })
const api = (chemin, o = {}, jeton) => fetch(`${APP}${chemin}`, {
  ...o,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'presti-sites-e2e (Chrome; Windows)',
    ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
    ...(o.headers || {}),
  },
})
const json = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) })

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

async function creer(nom, { fondateur = false, role = null } = {}) {
  const email = `sites-${nom}-${st}@presti-test.invalid`
  const password = `Si-${crypto.randomBytes(9).toString('base64url')}-1`
  const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  if (!u?.id) throw new Error(`création ${nom} : ${JSON.stringify(u).slice(0, 120)}`)
  comptes.push(u.id)

  const r = await rest('artisans', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: u.id,
      email,
      nom: `Site ${nom}`,
      metier: 'Plomberie',
      slug: `sites-${nom}-${st}`,
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

async function insererCommande({ artisanId, email, etat, scores = null, verifications = null, genereLe = null }) {
  const res = await rest('sites_commandes?select=id', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      artisan_id: artisanId,
      email,
      etat,
      scores,
      verifications,
      genere_le: genereLe,
      metier: 'Plomberie',
      communes: ['Nantes'],
    }),
  })
  const body = await res.json()
  if (!body?.[0]?.id) throw new Error(`Erreur insertion commande ${etat}: ${JSON.stringify(body)}`)
  commandesCrees.push(body[0].id)
  return body[0].id
}

async function nettoyer() {
  for (const cmdId of commandesCrees) {
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
}

console.log(`\ncontrole-sites-e2e — ${APP}\n`)

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

  const sondeRoute = await json(await api('/api/controle/sites', {}, jF))
  if (sondeRoute.status === 404 || sondeRoute.status === 503) {
    console.log(`  ⛔ Route /api/controle/sites indisponible (${sondeRoute.status}) — drapeau direction baissé ou non déployée.`)
    fin(2)
    throw new Error('stop')
  }

  const cPayee = await insererCommande({ artisanId: art.uid, email: art.email, etat: 'payee' })
  const cGeneree = await insererCommande({
    artisanId: art.uid,
    email: art.email,
    etat: 'generee',
    scores: { performance: 98, accessibilite: 100, seo: 100, pwa: 90 },
    verifications: { mobile: true, mentions: true },
    genereLe: new Date().toISOString(),
  })
  const cValidee = await insererCommande({ artisanId: art.uid, email: art.email, etat: 'validee' })
  const cBrouillon = await insererCommande({ artisanId: art.uid, email: art.email, etat: 'brouillon' })

  console.log('\n1. GET par la direction liste les commandes, pas les brouillons')
  const resListe = await json(await api('/api/controle/sites', {}, jF))
  T('GET /api/controle/sites répond 200', resListe.status === 200, `HTTP ${resListe.status}`)

  const commandes = resListe.body?.commandes || []
  const trouvePayee = commandes.find((c) => c.id === cPayee)
  const trouveGeneree = commandes.find((c) => c.id === cGeneree)
  const trouveValidee = commandes.find((c) => c.id === cValidee)
  const trouveBrouillon = commandes.find((c) => c.id === cBrouillon)

  T('les 3 commandes de test sont présentes', !!trouvePayee && !!trouveGeneree && !!trouveValidee)
  T('les brouillons ne sortent jamais', !trouveBrouillon)
  T('chaque commande porte son artisan rattaché { id, nom, metier, slug }',
    trouveGeneree?.artisan?.id === art.uid &&
    trouveGeneree?.artisan?.nom === 'Site artisan' &&
    trouveGeneree?.artisan?.metier === 'Plomberie' &&
    !!trouveGeneree?.artisan?.slug
  )

  const resGen = await json(await api('/api/controle/sites?etat=generee', {}, jF))
  T('le filtre ?etat=generee ne renvoie que les commandes générées',
    resGen.status === 200 &&
    (resGen.body?.commandes || []).some((c) => c.id === cGeneree) &&
    !(resGen.body?.commandes || []).some((c) => c.id === cPayee || c.id === cValidee) &&
    (resGen.body?.commandes || []).every((c) => c.etat === 'generee')
  )

  console.log('\n2. POST valider sur une commande générée')
  const resValider = await json(await api(`/api/controle/sites/${cGeneree}`, { method: 'POST', body: JSON.stringify({ action: 'valider' }) }, jF))
  T('POST valider répond 200', resValider.status === 200, `HTTP ${resValider.status} ${JSON.stringify(resValider.body)}`)

  const [dbValidee] = await (await rest(`sites_commandes?id=eq.${cGeneree}&select=etat,valide_le`)).json()
  T('l’état passe à « validee » et valide_le est posé', dbValidee?.etat === 'validee' && !!dbValidee?.valide_le)

  const jrValide = await (await rest(`journal_direction?cible_id=eq.${cGeneree}&action=eq.site_valide&acteur_id=eq.${F.uid}`)).json()
  T('le geste est consigné dans journal_direction (site_valide)', Array.isArray(jrValide) && jrValide.length > 0 && jrValide[0]?.cible_type === 'site_commande')

  console.log('\n3. POST regenerer avec consigne')
  const cGeneree2 = await insererCommande({
    artisanId: art.uid,
    email: art.email,
    etat: 'generee',
    scores: { performance: 80 },
    verifications: { mobile: true },
    genereLe: new Date().toISOString(),
  })

  const resRegSans = await json(await api(`/api/controle/sites/${cGeneree2}`, { method: 'POST', body: JSON.stringify({ action: 'regenerer' }) }, jF))
  T('POST regenerer sans consigne → 400', resRegSans.status === 400, `HTTP ${resRegSans.status}`)

  const resRegTropCourt = await json(await api(`/api/controle/sites/${cGeneree2}`, { method: 'POST', body: JSON.stringify({ action: 'regenerer', consigne: 'court' }) }, jF))
  T('POST regenerer avec consigne < 10 signes → 400', resRegTropCourt.status === 400, `HTTP ${resRegTropCourt.status}`)

  const consigneTexte = 'Revoir les contrastes et ajouter la décennale.'
  const resRegOk = await json(await api(`/api/controle/sites/${cGeneree2}`, { method: 'POST', body: JSON.stringify({ action: 'regenerer', consigne: consigneTexte }) }, jF))
  T('POST regenerer avec consigne valide → 200', resRegOk.status === 200, `HTTP ${resRegOk.status}`)

  const [dbReg] = await (await rest(`sites_commandes?id=eq.${cGeneree2}&select=etat,regenerations,consigne,genere_le,scores,verifications`)).json()
  T('état « payee », regenerations = 1, consigne gardée, scores et genere_le remis à null',
    dbReg?.etat === 'payee' &&
    dbReg?.regenerations === 1 &&
    dbReg?.consigne === consigneTexte &&
    dbReg?.genere_le === null &&
    dbReg?.scores === null &&
    dbReg?.verifications === null
  )

  const jrReg = await (await rest(`journal_direction?cible_id=eq.${cGeneree2}&action=eq.site_regeneration&acteur_id=eq.${F.uid}`)).json()
  T('la régénération est consignée dans journal_direction (site_regeneration)', Array.isArray(jrReg) && jrReg.length > 0 && jrReg[0]?.apres?.consigne === consigneTexte)

  console.log('\n4. Cas d’erreur et sécurité')
  const resValPayee = await json(await api(`/api/controle/sites/${cPayee}`, { method: 'POST', body: JSON.stringify({ action: 'valider' }) }, jF))
  T('valider une commande payee → 409 (transition invalide)', resValPayee.status === 409, `HTTP ${resValPayee.status}`)

  const resValInconnu = await json(await api('/api/controle/sites/00000000-0000-0000-0000-000000000000', { method: 'POST', body: JSON.stringify({ action: 'valider' }) }, jF))
  T('UUID inexistant → 404', resValInconnu.status === 404, `HTTP ${resValInconnu.status}`)

  const resValBadId = await json(await api('/api/controle/sites/abc', { method: 'POST', body: JSON.stringify({ action: 'valider' }) }, jF))
  T('identifiant non-UUID → 400', resValBadId.status === 400, `HTTP ${resValBadId.status}`)

  const resSansAuth = await json(await api(`/api/controle/sites/${cPayee}`, { method: 'POST', body: JSON.stringify({ action: 'valider' }) }))
  T('sans jeton → 401', resSansAuth.status === 401, `HTTP ${resSansAuth.status}`)

  console.log('\n5. Le rôle « lecture »')
  const L = await creer('lecture', { fondateur: true, role: 'lecture' })
  const jL = await session(L)

  const resGetL = await json(await api('/api/controle/sites', {}, jL))
  T('lecture : GET /api/controle/sites → 200', resGetL.status === 200, `HTTP ${resGetL.status}`)

  const resPostL = await json(await api(`/api/controle/sites/${cPayee}`, { method: 'POST', body: JSON.stringify({ action: 'valider' }) }, jL))
  T('lecture : POST /api/controle/sites/<id> → 403 (hors_perimetre)', resPostL.status === 403, `HTTP ${resPostL.status} code=${resPostL.body?.code}`)

} catch (e) {
  if (e?.message !== 'stop') {
    ko++
    console.log('  ❌ exception :', e?.stack?.split('\n').slice(0, 3).join(' | ') || e)
  }
} finally {
  await purgerPlafondsDe(...comptes).catch(() => {})
  await nettoyer()
  console.log(`\n🧹 ${comptes.length} compte(s) de test purgé(s)`)
  if (process.exitCode !== 2) {
    console.log(`\n${ko === 0 ? '✅' : '❌'} controle-sites-e2e : ${ok}/${ok + ko} — ${APP}`)
    fin(ko === 0 ? 0 : 1)
  }
}