// §B5 v4 — Test e2e de la messagerie console : l'artisan répond dans un fil, le prospect répond,
// on vérifie la PERSISTANCE (service_role + RLS artisan = ce que voit loadThread) ET la REMISE
// (le prospect retrouve la réponse via /api/conversation). Nettoie ses données.
// Usage : node scripts/messages-e2e.mjs [https://prestiapp.fr]
import fs from 'fs'
import { verifierSessionTest } from './lib/connexion-test.mjs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
// Les aides partagées (connexion-test, etc.) lisent `process.env`, pas cet objet : sans cette
// ligne, leurs URL commencent par « undefined ». On ne remplace jamais une variable déjà posée.
for (const [cle, valeur] of Object.entries(env)) if (!process.env[cle]) process.env[cle] = valeur

const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.argv[2] || 'https://prestiapp.fr'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}, key = SVC) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: key, Authorization: `Bearer ${o.jwt || key}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const fails = []
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails.push(m) }
const signin = async (email, pw) => { const j = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json(); await verifierSessionTest(j.access_token); return j.access_token }
const st = Date.now(), email = `mx.${st}@example.com`, pw = 'Test123456!', slug = `mx-${st}`
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Atelier Test', metier: 'Menuisier', slug, plan: 'business', plateforme_active: true, reponse_auto: false }) })
// lead avec un message entrant du prospect (contact = email pour tester la remise email)
const lead = (await (await rest('leads', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, nom_prospect: 'Client Test', contact: 'client-mx@example.com', message: 'Bonjour, un devis pour un escalier ?', canal: 'formulaire', statut: 'nouveau' }) })).json())[0]
await rest('messages', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: 'Bonjour, un devis pour un escalier ?' }) })
console.log('seed lead', lead.id, '/ token', lead.token)

try {
  const jwt = await signin(email, pw)
  ok(!!jwt, 'artisan connecté (JWT)')

  // 1) L'ARTISAN répond dans le fil (le sens du bug signalé)
  const REP = 'Bonjour, oui bien sûr — je peux passer prendre les mesures cette semaine.'
  const r = await (await fetch(`${APP}/api/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` }, body: JSON.stringify({ action: 'reply', lead_id: lead.id, message: REP }) })).json()
  ok(r.ok === true, `POST /api/messages reply → ok (${JSON.stringify(r).slice(0, 80)})`)

  // 2) PERSISTANCE côté service_role
  const all = await (await rest(`messages?lead_id=eq.${lead.id}&select=sens,contenu,type&order=sent_at.asc`)).json()
  ok(all.some((m) => m.sens === 'out' && m.contenu === REP), 'message artisan persisté (sens=out)')

  // 3) PERSISTANCE vue par la RLS de l'artisan = exactement ce que refetch loadThread() (le message ne doit PAS disparaître)
  const viaRls = await (await rest(`messages?lead_id=eq.${lead.id}&select=sens,contenu&order=sent_at.asc`, { jwt }, ANON)).json()
  ok(Array.isArray(viaRls) && viaRls.some((m) => m.sens === 'out' && m.contenu === REP), `RLS artisan voit sa réponse (loadThread) — ${Array.isArray(viaRls) ? viaRls.length : 'ERR'} msgs`)
  ok(Array.isArray(viaRls) && viaRls.some((m) => m.sens === 'in'), 'RLS artisan voit aussi le message entrant')

  // 4) REMISE au prospect : il retrouve la réponse via /api/conversation (plateforme)
  const conv = await (await fetch(`${APP}/api/conversation?token=${encodeURIComponent(lead.token)}`)).json()
  ok(Array.isArray(conv.messages) && conv.messages.some((m) => m.sens === 'out' && m.contenu === REP), 'prospect retrouve la réponse via /api/conversation (remise plateforme)')

  // 5) statut du lead : « repondu » — l'artisan a parlé en dernier, la balle est chez le prospect.
  //    (« en_discussion » veut dire l'inverse et sert de condition d'ARRÊT aux relances.)
  const [lr] = await (await rest(`leads?id=eq.${lead.id}&select=statut`)).json()
  ok(lr?.statut === 'repondu', `statut passé à repondu (${lr?.statut})`)

  // 6) La grille vend « Relances automatiques » dès l'Essentiel : une réponse à la main les arme.
  const rel = await (await rest(`relances?lead_id=eq.${lead.id}&select=rang,envoyee&order=rang`)).json()
  ok(Array.isArray(rel) && rel.length === 3, `trois relances armées par la réponse manuelle (${Array.isArray(rel) ? rel.length : 'ERR'})`)
} catch (e) { ok(false, 'exception: ' + (e?.message || e)) } finally {
  await admin(`users/${u.id}`, { method: 'DELETE' })
  console.log('nettoyé —', fails.length ? `❌ ${fails.length} FAIL` : '✅ TOUT PASSE')
  process.exit(fails.length ? 1 : 0)
}
