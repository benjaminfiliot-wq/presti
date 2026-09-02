import { chromium } from 'playwright'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY
const APP = process.argv[2] || 'https://prestiapp.fr'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const fails = []; const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails.push(m) }
const st = Date.now(), email = `b4.${st}@x.fr`, pw = 'Test123456!', slug = `b4-${st}`
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Atelier Vasseur', metier: 'Menuisier', slug, plan: 'business' }) })
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 950 } })
try {
  await p.goto(`${APP}/login`, { waitUntil: 'load' })
  await p.fill('input[type=email]', email); await p.fill('input[type=password]', pw)
  await p.getByRole('button', { name: /Se connecter/i }).click(); await p.waitForTimeout(3500)
  await p.goto(`${APP}/dashboard`, { waitUntil: 'load' }); await p.waitForTimeout(1500)
  // §C1 menu de profil
  await p.locator('.psh-founder').click(); await p.waitForTimeout(400)
  ok(await p.locator('.psh-menu').count() === 1, 'le menu de profil s ouvre')
  ok((await p.locator('.psh-menu-id').innerText()).includes(email), 'le menu affiche l identite du compte')
  ok(await p.locator('.psh-menu a').count() >= 5, `le menu liste les acces (${await p.locator('.psh-menu a').count()})`)
  await p.screenshot({ path: `${OUT}/b4-menu.png` })
  // §C2 parametres
  await p.goto(`${APP}/parametres`, { waitUntil: 'load' }); await p.waitForSelector('.param-onglets', { timeout: 15000 })
  ok(await p.locator('.param-onglets button').count() === 4, 'la page Parametres a ses onglets')
  await p.fill('input[placeholder="14 chiffres"]', '12345678901234')
  await p.locator('input[placeholder="Ex : AXA"]').fill('AXA')
  await p.locator('input[placeholder="FR76…"]').fill('FR7630006000011234567890189')
  await p.getByRole('button', { name: /^Enregistrer$/ }).click(); await p.waitForSelector('.msg', { timeout: 12000 })
  await p.waitForTimeout(1200)
  const [row] = await (await rest(`artisans?id=eq.${u.id}&select=siret,assurance_nom,iban`)).json()
  ok(row.siret === '12345678901234' && row.assurance_nom === 'AXA' && (row.iban || '').startsWith('FR76'), 'infos legales persistees (SIRET, assurance, IBAN)')
  await p.screenshot({ path: `${OUT}/b4-parametres.png`, fullPage: true })
  // onglet donnees + export
  await p.locator('.param-onglets button', { hasText: 'Données' }).click(); await p.waitForTimeout(500)
  ok(await p.getByRole('button', { name: /Exporter toutes mes donn/i }).count() === 1, 'l export de donnees est proposé')
  const jwt = (await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json()).access_token
  const ex = await fetch(`${APP}/api/donnees/export`, { headers: { Authorization: `Bearer ${jwt}` } })
  const paquet = await ex.json()
  ok(ex.ok && paquet.profil?.slug === slug && Array.isArray(paquet.conversations), 'l export contient bien les donnees du compte')
  ok((ex.headers.get('content-disposition') || '').includes('attachment'), 'l export est servi en telechargement')
} catch (e) { ok(false, 'exception: ' + (e?.message || e)) } finally {
  await b.close(); await admin(`users/${u.id}`, { method: 'DELETE' })
  console.log('nettoyé —', fails.length ? `❌ ${fails.length} FAIL` : '✅ TOUT PASSE'); process.exit(fails.length ? 1 : 0)
}
