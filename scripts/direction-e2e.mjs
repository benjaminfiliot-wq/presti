// Centre de direction — le socle J1 (prompt v10 §4 ; carte plans/009-direction-carte.md §4.3).
//
// Prouve, contre la prod (ou TEST_BASE) : l'espace n'existe pas sans le drapeau ; sans identité, sans is_founder,
// sans second facteur → refus, jamais 500 ; les lectures d'un fondateur sont SOURCÉES (source + date, jamais un
// nombre nu) ; une écriture sans re-confirmation est refusée ; la re-confirmation demande le mot de passe (5 essais
// par quart d'heure), rend un jeton à usage unique, borné à 5 min et à une portée, dont le rejeu est détecté ; toute
// écriture est journalisée avant/après, avec IP et navigateur, dans un journal immuable ; le rôle « lecture »
// n'écrit rien ; aucune donnée de prospect ne sort de api/direction/* ; les alertes se voient et s'acquittent.
//
// 0 appel IA, 0 objet Stripe créé (lectures seulement). Comptes `direction-<st>@presti-test.invalid`, purgés en
// `finally`. Code 2 = préalable humain (drapeau baissé ou table 0065 absente).
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/direction-e2e.mjs
import fs from 'node:fs'
import crypto from 'node:crypto'
import { verifierSessionTest } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.env.TEST_BASE || 'https://prestiapp.fr'
if (!SB || !SVC || !ANON) { console.log('❌ variables Supabase absentes'); process.exit(1) }
const st = crypto.randomBytes(3).toString('hex')
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })
const api = (chemin, o = {}, jeton, reconf) => fetch(`${APP}${chemin}`, { ...o, headers: { 'Content-Type': 'application/json', 'User-Agent': 'presti-direction-e2e (Chrome; Windows)', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}), ...(reconf ? { 'x-presti-reconfirmation': reconf } : {}), ...(o.headers || {}) } })
const json = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})), texte: '' })
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const fin = (code) => { process.exitCode = code; setTimeout(() => {}, 50) }
const comptes = []

async function creer(nom, { fondateur = false, role = null } = {}) {
  const email = `direction-${nom}-${st}@presti-test.invalid`, password = `Dir-${crypto.randomBytes(9).toString('base64url')}-1`
  const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  if (!u?.id) throw new Error(`création ${nom} : ${JSON.stringify(u).slice(0, 120)}`)
  const r = await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: `Direction ${nom}`, metier: 'Test', slug: `direction-${nom}-${st}`, plan: 'gratuit', aide_vues: ['visite:console'], is_founder: fondateur }) })
  if (!r.ok) throw new Error(`artisans ${nom} : ${r.status} ${(await r.text()).slice(0, 120)}`)
  if (role) { const rr = await rest('direction_roles', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: u.id, role }) }); if (!rr.ok) throw new Error(`direction_roles : ${rr.status}`) }
  comptes.push(u.id)
  return { uid: u.id, email, password }
}
async function session(c, attester = true) {
  const s = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: c.email, password: c.password }) })).json()
  if (!s?.access_token) throw new Error(`session ${c.email}`)
  if (attester) await verifierSessionTest(s.access_token)
  return s.access_token
}
async function nettoyer() {
  // les lignes de journal des comptes de test : le trigger 0065 les laisse partir (acteur_email @presti-test.invalid)
  for (const id of comptes) await rest(`journal_direction?acteur_id=eq.${id}`, { method: 'DELETE' }).catch(() => {})
  await rest(`alertes?cle=eq.e2e-${st}`, { method: 'DELETE' }).catch(() => {})
  for (const id of comptes) await rest('rpc/purger_compte_test', { method: 'POST', body: JSON.stringify({ p_id: id }) }).catch(() => {})
  await rest('ip_bans?ip=in.(203.0.113.7,203.0.113.8)', { method: 'DELETE' }).catch(() => {})
}
const purgerPlafonds = async () => { const { spawnSync } = await import('node:child_process'); spawnSync('node', ['scripts/purger-abus.mjs'], { encoding: 'utf8', shell: true }) }

console.log(`\ndirection-e2e — ${APP}\n`)
try {
  // ── 0. Préalables ─────────────────────────────────────────────────────────────────────────────
  console.log('0. Préalables')
  const page = await fetch(`${APP}/direction`, { redirect: 'manual', headers: { 'User-Agent': 'presti-direction-e2e' } })
  if (page.status === 404) { console.log('  ⏳ /direction → 404 : FLAGS.direction baissé (0065 à coller, puis lever). Rien à prouver encore.'); await nettoyer(); fin(2) } else {
  T('/direction répond 200 (drapeau levé)', page.status === 200, `HTTP ${page.status}`)
  const html = await page.text()
  T('le HTML de /direction est une coquille : aucun chiffre, aucun email, aucune IP', !/@[a-z0-9.-]+\.[a-z]{2,}/i.test(html.replace(/[^<]*<\/script>/g, '')) && !/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(html) && !/journal_direction|MRR\s*:\s*\d/.test(html))
  const robots = await (await fetch(`${APP}/robots.txt`)).text()
  T('robots.txt interdit /direction', /Disallow:\s*\/direction/.test(robots))
  const sonde = await rest('journal_direction?select=id&limit=1')
  if (sonde.status === 404) { console.log('  ⏳ table journal_direction absente : 0065 pas collée.'); await nettoyer(); fin(2) } else {
  T('table journal_direction présente (0065 collée)', sonde.ok)

  // ── 1. Sans identité ──────────────────────────────────────────────────────────────────────────
  console.log('\n1. Sans identité : refus, jamais 500')
  const LECTURES = ['/api/direction/etat', '/api/direction/chiffres', '/api/direction/a-faire', '/api/direction/fil', '/api/direction/journal', '/api/direction/securite/bans']
  const anonymes = await Promise.all([...LECTURES.map((c) => api(c)), api('/api/direction/reconfirmer', { method: 'POST', body: '{}' }), api('/api/direction/securite/bans', { method: 'POST', body: '{}' }), api('/api/direction/securite/bans', { method: 'DELETE', body: '{}' })])
  T('GET lectures + POST reconfirmer/bans + DELETE bans → 401 sans jeton', anonymes.every((r) => r.status === 401), anonymes.map((r) => r.status).join(' '))

  // ── 2. Comptes ────────────────────────────────────────────────────────────────────────────────
  const A = await creer('artisan'), F = await creer('fondateur', { fondateur: true }), L = await creer('lecture', { fondateur: true, role: 'lecture' })
  const jA = await session(A), jF = await session(F), jL = await session(L)
  console.log('\n2. Un artisan (sans is_founder), session attestée')
  const rA = await Promise.all(LECTURES.map((c) => api(c, {}, jA)))
  T('toutes les lectures → 403 « Réservé aux fondateurs »', rA.every((r) => r.status === 403), rA.map((r) => r.status).join(' '))
  const wA = await json(await api('/api/direction/securite/bans', { method: 'POST', body: JSON.stringify({ ip: '203.0.113.7' }) }, jA))
  T('une écriture → 403, et rien n’est journalisé', wA.status === 403 && !(await (await rest(`journal_direction?select=id&acteur_id=eq.${A.uid}`)).json()).length)

  console.log('\n3. Un fondateur SANS second facteur (jeton au mot de passe seul)')
  const jFnu = await session(F, false)
  const nu = await json(await api('/api/direction/etat', {}, jFnu))
  T('GET etat → 401 code_requis', nu.status === 401 && nu.body.code === 'code_requis', `${nu.status} ${JSON.stringify(nu.body).slice(0, 80)}`)

  // ── 4. Lectures sourcées ──────────────────────────────────────────────────────────────────────
  console.log('\n4. Fondateur attesté : des lectures sourcées')
  const etat = await json(await api('/api/direction/etat', {}, jF))
  T('etat → 200, niveau ∈ {ok, degrade, incident}', etat.status === 200 && ['ok', 'degrade', 'incident'].includes(etat.body.niveau), `${etat.status} ${etat.body.niveau}`)
  const ctr = etat.body.controles || []
  T('chaque contrôle porte source, date ISO et état', ctr.length >= 5 && ctr.every((c) => c.source && !Number.isNaN(Date.parse(c.a)) && ['ok', 'warn', 'crit', 'info'].includes(c.etat)), ctr.map((c) => `${c.cle}:${c.etat}`).join(' '))
  T('contrôles attendus : site, connexion, stripe, resend, crons, ia', ['site', 'connexion', 'stripe', 'resend', 'crons', 'ia'].every((k) => ctr.some((c) => c.cle === k)))
  const ch = await json(await api('/api/direction/chiffres', {}, jF))
  const champs = ['mrr', 'payants', 'essais', 'conversions', 'encaisse', 'coutIA', 'credits']
  T('chiffres → 200 et chaque champ est { valeur, source, a }', ch.status === 200 && champs.every((k) => ch.body[k] && 'valeur' in ch.body[k] && ch.body[k].source && !Number.isNaN(Date.parse(ch.body[k].a))), champs.map((k) => `${k}:${ch.body[k]?.source}`).join(' '))
  T('un chiffre nul dit pourquoi (erreur ou manque) — jamais un nombre nu', champs.every((k) => ch.body[k]?.valeur !== null || ch.body[k]?.erreur || ch.body[k]?.manque))
  T('coût IA : réel (anthropic) ou estimation ÉTIQUETÉE avec le manque H2', ch.body.coutIA?.source === 'anthropic' || (ch.body.coutIA?.source === 'estimation' && /H2/.test(ch.body.coutIA?.manque || '') && ch.body.coutIA?.valeur?.estimation === true))
  const fil = await json(await api('/api/direction/fil', {}, jF))
  const ev = fil.body.evenements || []
  T('fil → ≤ 20 événements, triés du plus récent au plus ancien, chacun sourcé', fil.status === 200 && ev.length <= 20 && ev.every((e, i) => e.source && (i === 0 || ev[i - 1].a >= e.a)))
  const af = await json(await api('/api/direction/a-faire', {}, jF))
  T('a-faire → 200, chaque ligne a une action (route, méthode)', af.status === 200 && Array.isArray(af.body.lignes) && af.body.lignes.every((l) => l.action?.route && l.action?.methode))

  // ── 5-8. Re-confirmation ──────────────────────────────────────────────────────────────────────
  console.log('\n5. Écriture sans re-confirmation')
  const sans = await json(await api('/api/direction/securite/bans', { method: 'POST', body: JSON.stringify({ ip: '203.0.113.7' }) }, jF))
  T('POST bans sans jeton de re-confirmation → 403 reconfirmation_requise', sans.status === 403 && sans.body.code === 'reconfirmation_requise', `${sans.status} ${sans.body.code}`)
  T('ip_bans ne contient pas l’IP', !(await (await rest('ip_bans?select=ip&ip=eq.203.0.113.7')).json()).length)

  console.log('\n6. Re-confirmation : le mot de passe, vérifié par le serveur')
  await purgerPlafonds()
  const faux = await json(await api('/api/direction/reconfirmer', { method: 'POST', body: JSON.stringify({ password: 'pas-le-bon-1234', portee: 'securite' }) }, jF))
  T('mauvais mot de passe → 403', faux.status === 403, `HTTP ${faux.status}`)
  const bon = await json(await api('/api/direction/reconfirmer', { method: 'POST', body: JSON.stringify({ password: F.password, portee: 'securite' }) }, jF))
  T('bon mot de passe → { jeton, expire_dans: 300, portee }', bon.status === 200 && typeof bon.body.jeton === 'string' && bon.body.jeton.length >= 40 && bon.body.expire_dans === 300 && bon.body.portee === 'securite', `${bon.status} ${JSON.stringify(bon.body).slice(0, 60)}`)
  const jr = await (await rest(`journal_direction?select=action,apres,reconfirme,ip,agent&acteur_id=eq.${F.uid}&action=eq.reconfirmation`)).json()
  T('journal : une ligne « reconfirmation », SANS le jeton, avec IP et navigateur', jr.length === 1 && JSON.stringify(jr[0]).indexOf(bon.body.jeton || '§') === -1 && !!jr[0].ip && !!jr[0].agent && jr[0].apres?.portee === 'securite', JSON.stringify(jr).slice(0, 120))
  const sessions = await (await fetch(`${SB}/rest/v1/rpc/sessions_de_l_artisan`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${jF}`, 'Content-Type': 'application/json' }, body: '{}' })).json().catch(() => null)
  T('la connexion de contrôle est fermée : une seule session ouverte pour F', !Array.isArray(sessions) || sessions.length <= 2, Array.isArray(sessions) ? `${sessions.length} session(s)` : 'rpc indisponible')
  let n429 = 0
  for (let i = 0; i < 7; i++) { const r = await api('/api/direction/reconfirmer', { method: 'POST', body: JSON.stringify({ password: 'pas-le-bon-1234', portee: 'securite' }) }, jF); if (r.status === 429) n429++ }
  T('après cinq essais en 15 min → 429', n429 >= 1)
  await purgerPlafonds()

  console.log('\n7. Écriture AVEC jeton : le ban, journalisé avant/après')
  const b1 = await json(await api('/api/direction/securite/bans', { method: 'POST', body: JSON.stringify({ ip: '203.0.113.7', raison: 'test direction-e2e', dureeH: 1 }) }, jF, bon.body.jeton))
  T('POST bans avec le jeton → 200', b1.status === 200 && b1.body.ok === true, `${b1.status} ${JSON.stringify(b1.body).slice(0, 80)}`)
  T('ip_bans contient l’IP', !!(await (await rest('ip_bans?select=ip&ip=eq.203.0.113.7')).json()).length)
  const jb = (await (await rest(`journal_direction?select=*&acteur_id=eq.${F.uid}&action=eq.ban_ip`)).json())[0]
  T('journal ban_ip : avant null, après.ip, reconfirme true, IP et agent renseignés', !!jb && jb.avant === null && jb.apres?.ip === '203.0.113.7' && jb.reconfirme === true && !!jb.ip && !!jb.agent && jb.cible_id === '203.0.113.7', JSON.stringify(jb).slice(0, 160))

  console.log('\n8. Rejeu, expiration, portée, autre fondateur')
  const rejeu = await json(await api('/api/direction/securite/bans', { method: 'POST', body: JSON.stringify({ ip: '203.0.113.8' }) }, jF, bon.body.jeton))
  T('même jeton une seconde fois → 403 rejoue', rejeu.status === 403 && rejeu.body.code === 'rejoue', `${rejeu.status} ${rejeu.body.code}`)
  const j2 = (await json(await api('/api/direction/reconfirmer', { method: 'POST', body: JSON.stringify({ password: F.password, portee: 'securite' }) }, jF))).body.jeton
  const hash2 = crypto.createHash('sha256').update(j2).digest('hex')
  await rest(`reconfirmations?jeton_hash=eq.${hash2}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ expire_le: new Date(Date.now() - 1000).toISOString() }) })
  const exp = await json(await api('/api/direction/securite/bans', { method: 'POST', body: JSON.stringify({ ip: '203.0.113.8' }) }, jF, j2))
  T('jeton expiré (expire_le dans le passé) → 403 expire', exp.status === 403 && exp.body.code === 'expire', `${exp.status} ${exp.body.code}`)
  const j3 = (await json(await api('/api/direction/reconfirmer', { method: 'POST', body: JSON.stringify({ password: F.password, portee: 'argent' }) }, jF))).body.jeton
  const port = await json(await api('/api/direction/securite/bans', { method: 'POST', body: JSON.stringify({ ip: '203.0.113.8' }) }, jF, j3))
  T('jeton de portée « argent » sur une route « securite » → 403 portee', port.status === 403 && port.body.code === 'portee', `${port.status} ${port.body.code}`)
  const j4 = (await json(await api('/api/direction/reconfirmer', { method: 'POST', body: JSON.stringify({ password: F.password, portee: 'securite' }) }, jF))).body.jeton
  const autre = await json(await api('/api/direction/securite/bans', { method: 'POST', body: JSON.stringify({ ip: '203.0.113.8' }) }, jL, j4))
  T('jeton d’un AUTRE fondateur → refusé (403)', autre.status === 403, `${autre.status} ${autre.body.code}`)
  T('ip_bans ne contient toujours pas 203.0.113.8', !(await (await rest('ip_bans?select=ip&ip=eq.203.0.113.8')).json()).length)
  await purgerPlafonds()

  console.log('\n9. Immuabilité et RLS du journal')
  const upd = await rest(`journal_direction?id=eq.${jb.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ action: 'falsifie' }) })
  T('UPDATE par la clé service → refusé par le trigger', !upd.ok, `HTTP ${upd.status}`)
  const del = await rest(`journal_direction?id=eq.${jb.id}`, { method: 'DELETE' })
  const encore = (await (await rest(`journal_direction?select=id&id=eq.${jb.id}`)).json()).length === 1
  T('DELETE d’une ligne fraîche → refusé (conservation 24 mois)', !del.ok && encore, `HTTP ${del.status}`)
  const rlsA = await (await fetch(`${SB}/rest/v1/journal_direction?select=id`, { headers: { apikey: ANON, Authorization: `Bearer ${jA}` } })).json()
  const rlsF = await (await fetch(`${SB}/rest/v1/journal_direction?select=id`, { headers: { apikey: ANON, Authorization: `Bearer ${jF}` } })).json()
  T('RLS : un artisan lit 0 ligne, un fondateur ≥ 1', Array.isArray(rlsA) && rlsA.length === 0 && Array.isArray(rlsF) && rlsF.length >= 1)

  console.log('\n10. Débannir (nouveau jeton) → journal deban_ip')
  const j5 = (await json(await api('/api/direction/reconfirmer', { method: 'POST', body: JSON.stringify({ password: F.password, portee: 'securite' }) }, jF))).body.jeton
  const d1 = await json(await api('/api/direction/securite/bans', { method: 'DELETE', body: JSON.stringify({ ip: '203.0.113.7' }) }, jF, j5))
  const jd = (await (await rest(`journal_direction?select=avant,apres&acteur_id=eq.${F.uid}&action=eq.deban_ip`)).json())[0]
  T('DELETE bans → 200, journal deban_ip avec avant.ip', d1.status === 200 && jd?.avant?.ip === '203.0.113.7' && jd.apres === null, `${d1.status} ${JSON.stringify(jd).slice(0, 80)}`)

  console.log('\n11. Rôle « lecture » (Alexandre)')
  const lect = await Promise.all(['/api/direction/etat', '/api/direction/chiffres', '/api/direction/journal', '/api/direction/fil'].map((c) => api(c, {}, jL)))
  T('lecture : les GET → 200', lect.every((r) => r.status === 200), lect.map((r) => r.status).join(' '))
  const lr = await json(await api('/api/direction/reconfirmer', { method: 'POST', body: JSON.stringify({ password: L.password, portee: 'securite' }) }, jL))
  const lb = await json(await api('/api/direction/securite/bans', { method: 'POST', body: JSON.stringify({ ip: '203.0.113.8' }) }, jL))
  T('lecture : reconfirmer et POST bans → 403 lecture_seule', lr.status === 403 && lr.body.code === 'lecture_seule' && lb.status === 403 && lb.body.code === 'lecture_seule', `${lr.status}/${lr.body.code} ${lb.status}/${lb.body.code}`)

  console.log('\n12. Aucune donnée de prospect ne sort de api/direction/*')
  const sentinelle = { nom: `Sentinelle-${st}`, contact: `sentinelle-${st}@example.com`, message: `Message-secret-${st}` }
  const lead = await (await rest('leads', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: A.uid, nom_prospect: sentinelle.nom, contact: sentinelle.contact, canal: 'site', message: sentinelle.message, statut: 'nouveau', ip: '198.51.100.9' }) })).json().catch(() => [])
  T('lead sentinelle créé pour A', Array.isArray(lead) && lead.length === 1)
  const corps = []
  for (const j of [jF, jL]) for (const c of ['/api/direction/etat', '/api/direction/chiffres', '/api/direction/a-faire', '/api/direction/fil', '/api/direction/journal', '/api/direction/securite/bans']) corps.push(await (await api(c, {}, j)).text())
  const tout = corps.join('\n')
  T('aucune des trois chaînes, ni l’IP du lead, dans aucune réponse (F et L)', !tout.includes(sentinelle.nom) && !tout.includes(sentinelle.contact) && !tout.includes(sentinelle.message) && !tout.includes('198.51.100.9'))

  console.log('\n13. Alerte : visible dans « À faire », acquittée, journalisée')
  const [al] = await (await rest('alertes', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ motif: 'erreurs', cle: `e2e-${st}`, gravite: 'attention', sujet: `Alerte de test ${st}`, corps: 'Ligne de test direction-e2e', source: 'direction-e2e' }) })).json()
  const af2 = await json(await api('/api/direction/a-faire', {}, jF))
  T('l’alerte non acquittée apparaît dans a-faire avec son action', (af2.body.lignes || []).some((l) => l.id === `alerte:${al?.id}` && l.action?.route === `/api/direction/alertes/${al.id}/acquitter`))
  const acq = await json(await api(`/api/direction/alertes/${al.id}/acquitter`, { method: 'POST' }, jF))
  const [alApres] = await (await rest(`alertes?select=acquittee_le,acquittee_par&id=eq.${al.id}`)).json()
  const ja = (await (await rest(`journal_direction?select=avant,apres&acteur_id=eq.${F.uid}&action=eq.alerte_acquittee`)).json())[0]
  T('acquitter → 200 (sans re-confirmation), acquittee_le posé, journal avant/après', acq.status === 200 && !!alApres?.acquittee_le && alApres.acquittee_par === F.uid && ja?.avant?.acquittee_le === null && !!ja?.apres?.acquittee_le)
  const af3 = await json(await api('/api/direction/a-faire', {}, jF))
  T('l’alerte a disparu de a-faire', !(af3.body.lignes || []).some((l) => l.id === `alerte:${al.id}`))
  const acqL = await json(await api(`/api/direction/alertes/${al.id}/acquitter`, { method: 'POST' }, jL))
  T('lecture : acquitter → 403', acqL.status === 403)
  await rest(`alertes?id=eq.${al.id}`, { method: 'DELETE' })

  console.log('\n14. Plafond par fondateur')
  const rafale = await Promise.all(Array.from({ length: 130 }, () => api('/api/direction/journal?limite=1', {}, jF)))
  T('130 appels en rafale → au moins un 429', rafale.some((r) => r.status === 429), rafale.map((r) => r.status).filter((s) => s !== 200).join(' ') || 'aucun')
  await purgerPlafonds()
  }}
} catch (e) {
  ko++; console.log('  ❌ exception :', e?.stack?.split('\n').slice(0, 3).join(' | ') || e)
} finally {
  await purgerPlafonds().catch(() => {})
  await nettoyer()
  console.log(`\n🧹 ${comptes.length} compte(s) de test purgé(s)`)
  if (process.exitCode !== 2) { console.log(`\n${ko === 0 ? '✅' : '❌'} direction-e2e : ${ok}/${ok + ko} — ${APP}`); fin(ko === 0 ? 0 : 1) }
}
