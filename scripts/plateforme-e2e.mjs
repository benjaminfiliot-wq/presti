// Vérif B1-2 : l'app de conversation de la plateforme (§A2).
import { chromium } from 'playwright'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY
const APP = process.argv[2] || 'https://prestiapp.fr'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const fails = []
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails.push(m) }

const st = Date.now(), slug = `ch-${st}`, email = `ch.${st}@x.fr`
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: 'Test123456!', email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
  id: u.id, email, nom: 'Atelier Vasseur', metier: 'Menuisier', slug, plan: 'business', accent: '#C6853F', theme: 'atelier',
  plateforme_active: true, reponse_auto: false, // manuel → pas de coût IA pendant le test
  services: [{ nom: 'Escaliers sur mesure', description: 'Bois massif' }, { nom: 'Agencement', description: 'Dressings' }],
}) })
console.log('seed', slug)

const browser = await chromium.launch()
try {
  const p = await browser.newPage({ viewport: { width: 1280, height: 860 } })
  const errs = []; p.on('pageerror', (e) => errs.push(String(e.message || e).slice(0, 120)))
  await p.goto(`${APP}/p/${slug}`, { waitUntil: 'load' }); await p.waitForTimeout(2200)

  ok(await p.locator('.pchat-side').count() === 1, 'colonne des conversations présente')
  ok(await p.locator('.pchat-composer textarea').count() === 1, 'composeur présent')
  ok(/Assistant de l/i.test(await p.locator('.pchat-ia').innerText()), 'bandeau de transparence IA affiché')
  const sugg = await p.locator('.pchat-sugg button').allInnerTexts()
  ok(sugg.length >= 2 && sugg.some((s) => /escalier/i.test(s)), `amorces construites sur les vraies prestations (${sugg.slice(0, 2).join(' | ')})`)
  const brut=(await p.content()).toLowerCase(); const sansDomaine=brut.split('prestiapp.fr').join(''); ok(!sansDomaine.includes('presti'), 'white-label : aucune mention de la MARQUE Presti (hors domaine d hebergement)')
  await p.screenshot({ path: `${OUT}/b12-chat-desktop.png` }); console.log('shot desktop')

  // Envoi via une amorce → création du lead + réponse + capture des coordonnées
  await p.locator('.pchat-sugg button').first().click()
  await p.waitForSelector('.pchat-row.them .pchat-bub:not(.typing)', { timeout: 20000 }); await p.waitForTimeout(500)
  ok(await p.locator('.pchat-row.me .pchat-bub').count() >= 1, 'le message du client apparaît dans le fil')
  ok(/envoyé/i.test(await p.locator('.pchat-etat').first().innerText()), 'état du message = envoyé')
  ok(await p.locator('.pchat-capture').count() === 1, 'capture des coordonnées après la 1re réponse')
  ok(await p.locator('.pchat-conv').count() === 1, 'la conversation apparaît dans la colonne')

  // Coordonnées
  await p.fill('.pchat-capture input[placeholder*="Email"]', 'client-chat@example.com')
  await p.getByRole('button', { name: /Être recontacté/i }).click()
  await p.waitForTimeout(2500)
  ok(await p.locator('.pchat-capture').count() === 0, 'capture fermée après envoi des coordonnées')

  const rows = await (await rest(`leads?artisan_id=eq.${u.id}&select=contact,message,ab_variant`)).json()
  ok(rows.length === 1 && rows[0].contact === 'client-chat@example.com', `lead créé avec contact différé (${rows[0]?.contact})`)
  ok(/escalier/i.test(rows[0]?.message || ''), 'le besoin du client est enregistré')
  ok(errs.length === 0, `aucune erreur JS (${errs.slice(0, 2).join(' | ') || 'ok'})`)
  await p.close()

  // Mobile : tiroir
  const m = await browser.newPage({ viewport: { width: 390, height: 800 } })
  await m.goto(`${APP}/p/${slug}`, { waitUntil: 'load' }); await m.waitForTimeout(2000)
  ok(await m.locator('.pchat-burger').isVisible(), 'bouton menu visible sur mobile')
  await m.locator('.pchat-burger').click(); await m.waitForTimeout(600)
  ok(await m.locator('.pchat.open').count() === 1, 'le tiroir des conversations s’ouvre')
  await m.screenshot({ path: `${OUT}/b12-chat-mobile.png` }); console.log('shot mobile')
  await m.close()
} catch (e) { ok(false, 'exception: ' + (e?.message || e)) } finally {
  await browser.close(); await admin(`users/${u.id}`, { method: 'DELETE' })
  console.log('nettoyé —', fails.length ? `❌ ${fails.length} FAIL` : '✅ TOUT PASSE')
  process.exit(fails.length ? 1 : 0)
}
