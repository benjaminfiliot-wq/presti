import { chromium } from 'playwright'
import fs from 'fs'
import { codeEmailSiDemande } from './lib/connexion-test.mjs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY
const APP = process.argv[2] || 'https://prestiapp.fr'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const fails = []; const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails.push(m) }
const st = Date.now(), email = `b5.${st}@x.fr`, pw = 'Test123456!', slug = `b5-${st}`
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Atelier Vasseur', metier: 'Menuisier', slug, plan: 'business', plateforme_active: true, reponse_auto: true }) })
const lead = (await (await rest('leads', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, nom_prospect: 'Marc', contact: 'marc@example.com', message: 'Un escalier', canal: 'formulaire', statut: 'nouveau' }) })).json())[0]
await rest('messages', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: 'Bonjour, un escalier en chêne ?' }) })
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 950 } })
try {
  await p.goto(`${APP}/login`, { waitUntil: 'load' })
  await p.fill('input[type=email]', email); await p.fill('input[type=password]', pw)
  await p.getByRole('button', { name: /Se connecter/i }).click(); await codeEmailSiDemande(p, email); await p.waitForTimeout(3500)
  await p.goto(`${APP}/messages`, { waitUntil: 'load' }); await p.waitForSelector('.inbox-item', { timeout: 15000 })
  await p.locator('.inbox-item').first().click(); await p.waitForTimeout(1200)
  ok(await p.locator('.inbox-model').count() === 0, 'le selecteur de modele a disparu de la boite de reception')
  ok(await p.getByRole('button', { name: /Proposer une reponse|Proposer une réponse/i }).count() === 1, 'l aide a la redaction reste, explicitement declenchee')
  // /profil renvoie vers Ma plateforme
  await p.goto(`${APP}/profil`, { waitUntil: 'load' }); await p.waitForTimeout(2500)
  const html = await p.content()
  ok(/Ma plateforme.{0,40}Intelligence/s.test(html.replace(/<[^>]+>/g, ' ')), 'profil renvoie vers Ma plateforme -> Intelligence')
  ok(!/checked[^>]*reponseAuto/.test(html), 'le reglage de reponse auto n est plus dans profil')
  // la pause est bien dans /plateforme
  await p.goto(`${APP}/plateforme`, { waitUntil: 'load' }); await p.waitForSelector('.pcfg-modes', { timeout: 15000 })
  const txt = (await p.locator('.tool-card').nth(1).innerText())
  ok(/en pause|ouvertes/i.test(txt), 'la mise en pause est desormais dans Ma plateforme')
} catch (e) { ok(false, 'exception: ' + (e?.message || e)) } finally {
  await b.close(); await admin(`users/${u.id}`, { method: 'DELETE' })
  console.log('nettoyé —', fails.length ? `❌ ${fails.length} FAIL` : '✅ TOUT PASSE'); process.exit(fails.length ? 1 : 0)
}
